import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SECTION_KEYS = [
  "forehead", "eyebrows", "eyes", "nose", "mouth", "ears",
  "chin", "face_shape", "personality", "romance", "career", "fortune", "summary",
] as const;

const SECTION_TITLES: Record<string, string> = {
  forehead: "이마 (천정)", eyebrows: "눈썹 (보수관)", eyes: "눈 (감찰관)",
  nose: "코 (심판관)", mouth: "입 (출납관)", ears: "귀 (채청관)",
  chin: "턱 (지각)", face_shape: "얼굴 윤곽",
  personality: "관상으로 본 성격", romance: "관상으로 본 연애운",
  career: "관상으로 본 직업운", fortune: "관상으로 본 재물운",
  summary: "종합 관상 풀이",
};

const SYSTEM_PROMPT = `당신은 30년 경력의 관상학 전문가입니다.

<context>
고객이 990원을 지불한 유료 심층 관상 분석입니다.
무료 분석과 확실히 차별화되어야 합니다.
이 사람의 얼굴 특징에만 해당하는 구체적인 해석과 실용적 조언을 포함하세요.
</context>

<instructions>
1. 관상의 삼정(상정/중정/하정)과 오관(눈/코/입/귀/얼굴윤곽) 데이터를 기반으로 해석하세요.
2. 추상적 문구 금지. 이 사람의 구체적 특징에 맞춘 해석만 하세요.
3. 각 영역: 해당 부위의 의미, 강점, 주의점, 실천 조언 포함. 400~800자.
4. 반드시 아래 JSON 형식으로만 응답. 다른 텍스트 금지.
</instructions>

<output_format>
{
  "forehead": "400~800자",
  "eyebrows": "...",
  "eyes": "...",
  "nose": "...",
  "mouth": "...",
  "ears": "...",
  "chin": "...",
  "face_shape": "...",
  "personality": "...",
  "romance": "...",
  "career": "...",
  "fortune": "...",
  "summary": "..."
}
</output_format>`;

/** Claude API 호출 + 429 재시도 (최대 3회, 백오프 10s/20s/40s) */
async function callClaude(system: string, userMessage: string): Promise<string> {
  const delays = [0, 10_000, 20_000, 40_000];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      console.log(`[generate-paid-gwansang] 재시도 ${attempt}회, ${delays[attempt] / 1000}초 대기`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 10000,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text ?? "";
    }

    if (res.status === 429 && attempt < delays.length - 1) {
      console.warn(`[generate-paid-gwansang] 429 Rate Limit, 재시도 예정`);
      continue;
    }

    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  throw new Error("Claude API 최대 재시도 초과");
}

/** Claude 응답에서 JSON 파싱 */
function parseJsonResponse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response as JSON");
  }
}

/** 축약 JSON → 표준 paid_content 구조로 변환 */
function expandContent(raw: Record<string, string>) {
  const sections = SECTION_KEYS.map((key) => ({
    id: key,
    title: SECTION_TITLES[key],
    body: raw[key] ?? "",
  }));
  return { version: 1, sections };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, gwansangProfileId } = await req.json();

    // 1. 결제 검증 (최우선)
    const { data: payment } = await supabaseAdmin
      .from("payment_history_web").select("id")
      .eq("user_id", userId).eq("product_id", "paid_gwansang").eq("status", "paid").maybeSingle();

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. 예약 row 선점
    const { data: inserted } = await supabaseAdmin
      .from("paid_content").insert({ user_id: userId, product_id: "paid_gwansang", content: {} })
      .select("id").maybeSingle();

    if (!inserted) {
      const { data: existing } = await supabaseAdmin
        .from("paid_content").select("id, content")
        .eq("user_id", userId).eq("product_id", "paid_gwansang").maybeSingle();

      if (existing && JSON.stringify(existing.content) !== '{}') {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. 관상 데이터 조회
    const { data: gwansangProfile } = await supabaseAdmin
      .from("gwansang_profiles").select("*").eq("id", gwansangProfileId).single();

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("name, gender").eq("auth_id", userId).single();

    if (!gwansangProfile || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Claude Sonnet 호출 (재시도 백오프 포함)
    const textContent = await callClaude(SYSTEM_PROMPT, `다음 관상 데이터를 기반으로 심층 분석을 JSON으로 생성해주세요.

<user_info>
이름: ${profile.name}
성별: ${profile.gender}
</user_info>

<gwansang_data>
동물상: ${gwansangProfile.animal_type_korean} (${gwansangProfile.animal_modifier})
삼정_상정: ${gwansangProfile.samjeong?.upper}
삼정_중정: ${gwansangProfile.samjeong?.middle}
삼정_하정: ${gwansangProfile.samjeong?.lower}
오관_눈: ${gwansangProfile.ogwan?.눈}
오관_코: ${gwansangProfile.ogwan?.코}
오관_입: ${gwansangProfile.ogwan?.입}
오관_귀: ${gwansangProfile.ogwan?.귀}
오관_윤곽: ${gwansangProfile.ogwan?.얼굴윤곽}
성격요약: ${gwansangProfile.personality_summary}
매력키워드: ${JSON.stringify(gwansangProfile.charm_keywords)}
</gwansang_data>`);

    const raw = parseJsonResponse(textContent);
    const finalContent = expandContent(raw);

    // 5. UPDATE paid_content
    await supabaseAdmin
      .from("paid_content").update({ content: finalContent })
      .eq("user_id", userId).eq("product_id", "paid_gwansang");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-paid-gwansang] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
