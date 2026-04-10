import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `당신은 30년 경력의 사주 역학 전문가입니다.

<context>
고객이 유료로 구매한 심층 사주 분석 콘텐츠입니다.
무료 분석과 확실히 차별화된, 구체적이고 실용적인 조언을 포함해야 합니다.
각 영역별 400~800자의 상세한 해석을 제공하세요.
월별 운세는 각 300~500자로 구체적인 시기, 방향, 조언을 포함하세요.
</context>

<instructions>
1. 사주팔자(연주, 월주, 일주, 시주)와 오행 분포를 기반으로 해석하세요.
2. 추상적인 문구가 아닌, 이 사주에만 해당하는 구체적인 해석을 하세요.
3. 각 섹션은 해당 영역의 강점, 주의점, 실천 조언을 포함하세요.
4. 월별 운세는 해당 월의 천간지지 흐름과 사주의 관계를 기반으로 하세요.
5. 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
</instructions>

<output_format>
{
  "version": 1,
  "sections": [
    { "id": "personality", "title": "성격과 기질", "body": "400~800자" },
    { "id": "wealth", "title": "재물운", "body": "..." },
    { "id": "career", "title": "직업운", "body": "..." },
    { "id": "romance", "title": "연애운", "body": "..." },
    { "id": "marriage", "title": "결혼운", "body": "..." },
    { "id": "health", "title": "건강운", "body": "..." },
    { "id": "relationships", "title": "대인관계", "body": "..." },
    { "id": "family", "title": "가정운", "body": "..." },
    { "id": "academic", "title": "학업/시험운", "body": "..." },
    { "id": "travel", "title": "이동/해외운", "body": "..." },
    { "id": "advice", "title": "사주가 알려주는 조언", "body": "..." },
    { "id": "summary", "title": "종합 풀이", "body": "..." },
    {
      "id": "monthly_fortune",
      "title": "YEAR년 월별 운세",
      "year": YEAR,
      "months": [
        { "month": 1, "title": "1월", "rating": 1-5, "focus": "주력영역", "body": "300~500자" },
        { "month": 2, "title": "2월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 3, "title": "3월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 4, "title": "4월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 5, "title": "5월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 6, "title": "6월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 7, "title": "7월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 8, "title": "8월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 9, "title": "9월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 10, "title": "10월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 11, "title": "11월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        { "month": 12, "title": "12월", "rating": 1-5, "focus": "주력영역", "body": "..." }
      ]
    }
  ]
}
</output_format>`;

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
    const prompt = SYSTEM_PROMPT.replaceAll("YEAR", String(currentYear));

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
        max_tokens: 16000,
        system: prompt,
        messages: [{
          role: "user",
          content: `다음 사주 데이터를 기반으로 심층 분석을 JSON으로 생성해주세요.

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
</saju_data>`,
        }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error("[generate-paid-saju] Claude 실패:", await anthropicRes.text());
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
