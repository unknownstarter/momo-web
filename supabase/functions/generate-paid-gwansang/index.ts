import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `당신은 30년 경력의 관상학 전문가입니다.

<context>
고객이 유료로 구매한 심층 관상 분석 콘텐츠입니다.
무료 분석과 확실히 차별화된, 구체적이고 실용적인 조언을 포함해야 합니다.
각 영역별 400~800자의 상세한 해석을 제공하세요.
</context>

<instructions>
1. 관상의 삼정(상정/중정/하정)과 오관(눈/코/입/귀/얼굴윤곽) 데이터를 기반으로 해석하세요.
2. 추상적인 문구가 아닌, 이 사람의 얼굴 특징에만 해당하는 구체적인 해석을 하세요.
3. 각 섹션은 해당 부위가 나타내는 의미, 강점, 주의점, 실천 조언을 포함하세요.
4. 반드시 아래 JSON 형식으로만 응답하세요.
</instructions>

<output_format>
{
  "version": 1,
  "sections": [
    { "id": "forehead", "title": "이마 (천정)", "body": "400~800자" },
    { "id": "eyebrows", "title": "눈썹 (보수관)", "body": "..." },
    { "id": "eyes", "title": "눈 (감찰관)", "body": "..." },
    { "id": "nose", "title": "코 (심판관)", "body": "..." },
    { "id": "mouth", "title": "입 (출납관)", "body": "..." },
    { "id": "ears", "title": "귀 (채청관)", "body": "..." },
    { "id": "chin", "title": "턱 (지각)", "body": "..." },
    { "id": "face_shape", "title": "얼굴 윤곽", "body": "..." },
    { "id": "personality", "title": "관상으로 본 성격", "body": "..." },
    { "id": "romance", "title": "관상으로 본 연애운", "body": "..." },
    { "id": "career", "title": "관상으로 본 직업운", "body": "..." },
    { "id": "fortune", "title": "관상으로 본 재물운", "body": "..." },
    { "id": "summary", "title": "종합 관상 풀이", "body": "..." }
  ]
}
</output_format>`;

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

    // 4. Claude Haiku 호출
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 12000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `다음 관상 데이터를 기반으로 심층 분석을 JSON으로 생성해주세요.

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
</gwansang_data>`,
        }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error("[generate-paid-gwansang] Claude 실패:", await anthropicRes.text());
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json();
    const textContent = anthropicData.content?.[0]?.text ?? "";

    let parsedContent;
    try {
      parsedContent = JSON.parse(textContent);
    } catch {
      const match = textContent.match(/\{[\s\S]*\}/);
      if (match) { parsedContent = JSON.parse(match[0]); }
      else { throw new Error("Failed to parse AI response as JSON"); }
    }

    // 5. UPDATE paid_content
    await supabaseAdmin
      .from("paid_content").update({ content: parsedContent })
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
