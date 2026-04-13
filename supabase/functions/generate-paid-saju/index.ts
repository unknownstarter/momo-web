import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 섹션 메타 — Claude는 body 텍스트만 생성, 나머지는 코드에서 조립
const SECTION_KEYS = [
  "personality", "wealth", "career", "romance", "marriage", "health",
  "relationships", "family", "academic", "travel", "advice", "summary",
] as const;

const SECTION_TITLES: Record<string, string> = {
  personality: "성격과 기질", wealth: "재물운", career: "직업운",
  romance: "연애운", marriage: "결혼운", health: "건강운",
  relationships: "대인관계", family: "가정운", academic: "학업/시험운",
  travel: "이동/해외운", advice: "사주가 알려주는 조언", summary: "종합 풀이",
};

const SYSTEM_PROMPT = `당신은 30년 경력의 사주 역학 전문가입니다.

<context>
고객이 990원을 지불한 유료 심층 사주 분석입니다.
무료 분석과 확실히 차별화되어야 합니다.
이 사주에만 해당하는 구체적인 해석과 실용적 조언을 포함하세요.
</context>

<instructions>
1. 사주팔자와 오행 분포를 기반으로 각 영역을 해석하세요.
2. 추상적 문구 금지. 이 사주의 구체적인 특성에 맞춘 해석만 하세요.
3. 각 영역: 강점, 주의점, 실천 조언을 포함. 400~800자.
4. 월별 운세: 해당 월 천간지지와 사주 관계 기반. 각 월 300~500자 + rating(1~5) + focus(주력영역 한 단어).
5. 반드시 아래 JSON 형식으로만 응답. 다른 텍스트 금지.
</instructions>

<output_format>
{
  "personality": "400~800자",
  "wealth": "...",
  "career": "...",
  "romance": "...",
  "marriage": "...",
  "health": "...",
  "relationships": "...",
  "family": "...",
  "academic": "...",
  "travel": "...",
  "advice": "...",
  "summary": "...",
  "m1": {"r":1-5,"f":"주력영역","b":"300~500자"},
  "m2": {"r":1-5,"f":"주력영역","b":"..."},
  "m3": {"r":1-5,"f":"...","b":"..."},
  "m4": {"r":1-5,"f":"...","b":"..."},
  "m5": {"r":1-5,"f":"...","b":"..."},
  "m6": {"r":1-5,"f":"...","b":"..."},
  "m7": {"r":1-5,"f":"...","b":"..."},
  "m8": {"r":1-5,"f":"...","b":"..."},
  "m9": {"r":1-5,"f":"...","b":"..."},
  "m10": {"r":1-5,"f":"...","b":"..."},
  "m11": {"r":1-5,"f":"...","b":"..."},
  "m12": {"r":1-5,"f":"...","b":"..."}
}
</output_format>`;

/** Claude API 호출 + 429 재시도 (최대 3회, 백오프 10s/20s/40s) */
async function callClaude(system: string, userMessage: string): Promise<string> {
  const delays = [0, 10_000, 20_000, 40_000];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      console.log(`[generate-paid-saju] 재시도 ${attempt}회, ${delays[attempt] / 1000}초 대기`);
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
        max_tokens: 12000,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text ?? "";
    }

    if (res.status === 429 && attempt < delays.length - 1) {
      console.warn(`[generate-paid-saju] 429 Rate Limit, 재시도 예정`);
      continue;
    }

    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  throw new Error("Claude API 최대 재시도 초과");
}

/** Claude 응답에서 JSON 파싱 (코드 블록 안에 있어도 추출) */
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
function expandContent(raw: Record<string, unknown>, year: number) {
  const sections = SECTION_KEYS.map((key) => ({
    id: key,
    title: SECTION_TITLES[key],
    body: (raw[key] as string) ?? "",
  }));

  // 월별 운세 조립
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mData = raw[`m${m}`] as { r?: number; f?: string; b?: string } | undefined;
    months.push({
      month: m,
      title: `${m}월`,
      rating: mData?.r ?? 3,
      focus: mData?.f ?? "",
      body: mData?.b ?? "",
    });
  }

  sections.push({
    id: "monthly_fortune",
    title: `${year}년 월별 운세`,
    body: "",
    ...{ year, months },
  });

  return { version: 1, sections };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, sajuProfileId } = await req.json();

    // 1. 결제 검증 (최우선)
    const { data: payment } = await supabaseAdmin
      .from("payment_history_web").select("id")
      .eq("user_id", userId).eq("product_id", "paid_saju").eq("status", "paid").maybeSingle();

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. 예약 row 선점
    const { data: inserted } = await supabaseAdmin
      .from("paid_content").insert({ user_id: userId, product_id: "paid_saju", content: {} })
      .select("id").maybeSingle();

    if (!inserted) {
      const { data: existing } = await supabaseAdmin
        .from("paid_content").select("id, content")
        .eq("user_id", userId).eq("product_id", "paid_saju").maybeSingle();

      if (existing && JSON.stringify(existing.content) !== '{}') {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. 사주 데이터 조회
    const { data: sajuProfile } = await supabaseAdmin
      .from("saju_profiles").select("*").eq("id", sajuProfileId).single();

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("name, gender, birth_date").eq("auth_id", userId).single();

    if (!sajuProfile || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentYear = new Date().getFullYear();
    const systemPrompt = SYSTEM_PROMPT.replaceAll("YEAR", String(currentYear));

    // 4. Claude Sonnet 호출 (재시도 백오프 포함)
    const textContent = await callClaude(systemPrompt, `다음 사주 데이터를 기반으로 심층 분석을 JSON으로 생성해주세요.

<user_info>
이름: ${profile.name}
성별: ${profile.gender}
생년월일: ${profile.birth_date}
</user_info>

<saju_data>
연주: ${JSON.stringify(sajuProfile.year_pillar)}
월주: ${JSON.stringify(sajuProfile.month_pillar)}
일주: ${JSON.stringify(sajuProfile.day_pillar)}
시주: ${JSON.stringify(sajuProfile.hour_pillar)}
오행: ${JSON.stringify(sajuProfile.five_elements)}
주요원소: ${sajuProfile.dominant_element}
성격특성: ${JSON.stringify(sajuProfile.personality_traits)}
연애스타일: ${sajuProfile.romance_style}
</saju_data>`);

    const raw = parseJsonResponse(textContent);
    const finalContent = expandContent(raw, currentYear);

    // 5. UPDATE paid_content
    await supabaseAdmin
      .from("paid_content").update({ content: finalContent })
      .eq("user_id", userId).eq("product_id", "paid_saju");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-paid-saju] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
