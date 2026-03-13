/**
 * 사주·관상 분석 플로우: Edge Function 호출 후 DB 저장.
 * 기존 함수 시그니처 그대로 사용 (docs/design/onboarding-analysis-flow.md §7).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface ProfileForAnalysis {
  id: string;
  name: string;
  gender: string;
  birth_date: string;
  birth_time: string | null;
  profile_images: string[] | null;
}

export interface RunAnalysisResult {
  ok: boolean;
  error?: string;
}

/**
 * 프로필 기준으로 calculate-saju → generate-saju-insight → generate-gwansang-reading 호출 후
 * saju_profiles, gwansang_profiles INSERT 및 profile 업데이트.
 * accessToken으로 인증된 Supabase 클라이언트 사용.
 */
export async function runAnalysis(
  profile: ProfileForAnalysis,
  accessToken: string
): Promise<RunAnalysisResult> {
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const birthTime = profile.birth_time ? profile.birth_time.slice(0, 5) : undefined;
  const userName = profile.name;
  const genderKo = profile.gender === "male" ? "남성" : "여성";
  const photoUrl = profile.profile_images?.[0] ?? null;

  try {
    const res1 = await supabase.functions.invoke("calculate-saju", {
      body: {
        birthDate: profile.birth_date,
        birthTime: birthTime ?? null,
        isLunar: false,
      },
    });
    if (res1.error) {
      return { ok: false, error: res1.error.message || "사주 계산 실패" };
    }
    const sajuResult = res1.data as Record<string, unknown>;

    const res2 = await supabase.functions.invoke("generate-saju-insight", {
      body: { sajuResult, userName },
    });
    if (res2.error) {
      return { ok: false, error: res2.error.message || "사주 해석 실패" };
    }
    const insight = res2.data as Record<string, unknown>;

    const yearPillar = (sajuResult.yearPillar ?? sajuResult.year_pillar) as { stem?: string; branch?: string };
    const monthPillar = (sajuResult.monthPillar ?? sajuResult.month_pillar) as { stem?: string; branch?: string };
    const dayPillar = (sajuResult.dayPillar ?? sajuResult.day_pillar) as { stem?: string; branch?: string };
    const hourPillar = (sajuResult.hourPillar ?? sajuResult.hour_pillar) as { stem?: string; branch?: string } | null;
    const fiveElements = (sajuResult.fiveElements ?? sajuResult.five_elements) as Record<string, number>;
    const dominantElement = (sajuResult.dominantElement ?? sajuResult.dominant_element) as string;

    const res3 = await supabase.functions.invoke("generate-gwansang-reading", {
      body: {
        photoUrl: photoUrl ?? "",
        sajuData: {
          dominant_element: dominantElement,
          day_stem: dayPillar?.stem ?? "",
          personality_traits: insight.personalityTraits ?? insight.personality_traits ?? [],
        },
        gender: genderKo,
        age: getAgeFromBirthDate(profile.birth_date),
      },
    });
    if (res3.error) {
      return { ok: false, error: res3.error.message || "관상 분석 실패" };
    }
    const gwansang = res3.data as Record<string, unknown>;

    const { data: sajuRow, error: sajuErr } = await supabase
      .from("saju_profiles")
      .upsert({
        user_id: profile.id,
        year_pillar: yearPillar,
        month_pillar: monthPillar,
        day_pillar: dayPillar,
        hour_pillar: hourPillar,
        five_elements: fiveElements,
        dominant_element: dominantElement,
        personality_traits: (insight.personalityTraits ?? insight.personality_traits) ?? [],
        ai_interpretation: (insight.interpretation ?? insight.ai_interpretation) ?? null,
        ideal_match: insight.idealMatch ?? insight.ideal_match ?? null,
        romance_style: (insight.romanceStyle ?? insight.romance_style) ?? null,
        romance_key_points: (insight.romanceKeyPoints ?? insight.romance_key_points) ?? [],
        period_fortunes: insight.periodFortunes ?? insight.period_fortunes ?? null,
        yearly_fortune: insight.yearlyFortune ?? insight.yearly_fortune ?? null,
      }, { onConflict: "user_id" })
      .select("id")
      .single();

    if (sajuErr || !sajuRow) {
      return { ok: false, error: sajuErr?.message ?? "사주 결과 저장 실패" };
    }

    const { data: gwansangRow, error: gwErr } = await supabase
      .from("gwansang_profiles")
      .upsert({
        user_id: profile.id,
        animal_type: (gwansang.animal_type as string) ?? "",
        animal_type_korean: (gwansang.animal_type_korean as string) ?? "",
        animal_modifier: (gwansang.animal_modifier as string) ?? "",
        headline: (gwansang.headline as string) ?? "",
        personality_summary: (gwansang.personality_summary as string) ?? "",
        romance_summary: (gwansang.romance_summary as string) ?? "",
        romance_key_points: (gwansang.romance_key_points as string[]) ?? [],
        charm_keywords: (gwansang.charm_keywords as string[]) ?? [],
        samjeong: (gwansang.samjeong as object) ?? {},
        ogwan: (gwansang.ogwan as object) ?? {},
        traits: (gwansang.traits as object) ?? {},
        saju_synergy: (gwansang.saju_synergy as string) ?? "",
        detailed_reading: (gwansang.detailed_reading as string) ?? null,
        ideal_match_animal: (gwansang.ideal_match_animal as string) ?? null,
        ideal_match_animal_korean: (gwansang.ideal_match_animal_korean as string) ?? null,
        ideal_match_traits: (gwansang.ideal_match_traits as string[]) ?? null,
        ideal_match_description: (gwansang.ideal_match_description as string) ?? null,
        photo_urls: photoUrl ? [photoUrl] : [],
      }, { onConflict: "user_id" })
      .select("id")
      .single();

    if (gwErr || !gwansangRow) {
      return { ok: false, error: gwErr?.message ?? "관상 결과 저장 실패" };
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        saju_profile_id: sajuRow.id,
        gwansang_profile_id: gwansangRow.id,
        is_saju_complete: true,
        is_gwansang_complete: true,
        dominant_element: dominantElement,
        character_type: toCharacterType(insight.characterName ?? insight.character_type),
        animal_type: (gwansang.animal_type as string) ?? null,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (profileErr) {
      return { ok: false, error: profileErr.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "분석 중 오류" };
  }
}

function getAgeFromBirthDate(birthDate: string): number {
  const [y] = birthDate.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  return thisYear - y;
}

/** profiles.character_type CHECK: namuri | bulkkori | heuksuni | soedongi | mulgyeori */
const CHARACTER_NAME_TO_DB: Record<string, string> = {
  나무리: "namuri",
  불꼬리: "bulkkori",
  흑수니: "heuksuni",
  쇠동이: "soedongi",
  물겨리: "mulgyeori",
};

function toCharacterType(value: unknown): string | null {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  return CHARACTER_NAME_TO_DB[trimmed] ?? (["namuri", "bulkkori", "heuksuni", "soedongi", "mulgyeori"].includes(trimmed) ? trimmed : null);
}
