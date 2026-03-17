import { createAdminClient } from "@/lib/supabase/admin";

/** 공유 페이지에서 노출하는 사주 컬럼 (민감 정보 제외) */
const SAJU_SHARE_COLS =
  "year_pillar,month_pillar,day_pillar,hour_pillar,five_elements,dominant_element,personality_traits,ai_interpretation,yearly_fortune,period_fortunes,romance_style,romance_key_points,ideal_match";

/** 공유 페이지에서 노출하는 관상 컬럼 (민감 정보 제외) */
const GWANSANG_SHARE_COLS =
  "animal_type_korean,animal_modifier,headline,charm_keywords,samjeong,ogwan,personality_summary,romance_summary,romance_key_points,traits,ideal_match_animal_korean,ideal_match_traits,ideal_match_description";

export interface ShareProfile {
  id: string;
  name: string | null;
  character_type: string | null;
  dominant_element: string | null;
  saju_profile_id: string | null;
  gwansang_profile_id: string | null;
}

export interface ShareData {
  profile: ShareProfile;
  sajuProfile: Record<string, unknown> | null;
  gwansangProfile: Record<string, unknown> | null;
}

/**
 * profile_id로 공유에 필요한 데이터를 한번에 조회.
 * admin client 사용 (RLS 우회, 서버 전용).
 * 실패 시 null 반환.
 */
export async function fetchShareData(profileId: string): Promise<ShareData | null> {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, character_type, dominant_element, saju_profile_id, gwansang_profile_id")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) return null;

  let sajuProfile: Record<string, unknown> | null = null;
  let gwansangProfile: Record<string, unknown> | null = null;

  if (profile.saju_profile_id) {
    const { data } = await supabase
      .from("saju_profiles")
      .select(SAJU_SHARE_COLS)
      .eq("id", profile.saju_profile_id)
      .maybeSingle();
    sajuProfile = data;
  }

  if (profile.gwansang_profile_id) {
    const { data } = await supabase
      .from("gwansang_profiles")
      .select(GWANSANG_SHARE_COLS)
      .eq("id", profile.gwansang_profile_id)
      .maybeSingle();
    gwansangProfile = data;
  }

  return { profile: profile as ShareProfile, sajuProfile, gwansangProfile };
}

/**
 * share_links 테이블에서 short_id → profile_id 조회.
 * 못 찾으면 null.
 */
export async function resolveShortCode(code: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("profile_id")
    .eq("short_id", code)
    .maybeSingle();
  if (error || !data?.profile_id) return null;
  return data.profile_id as string;
}
