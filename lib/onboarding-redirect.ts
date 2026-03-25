/**
 * 로그인/재방문 시 어디로 보낼지 결정.
 * 1. 사주·관상 결과 있음 → /result
 * 2. 선택값 제외 필수값 전부 있음 → 스텝 13 (확인)
 * 3. 그 외 → 첫 번째 비어 있는 스텝
 * 선택값(체크 제외): 자기소개(bio), 관심사(interests), 이상형(ideal_type)
 */

export interface ProfileForRedirect {
  saju_profile_id?: string | null;
  name?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  profile_images?: string[] | null;
  height?: number | null;
  occupation?: string | null;
  location?: string | null;
  body_type?: string | null;
  religion?: string | null;
}

const STEP_13 = 13;

/**
 * 프로필 기준으로 리다이렉트 대상 반환.
 * 'result' | 0..13 (온보딩 스텝)
 */
export function getOnboardingStep(profile: ProfileForRedirect | null): number | "result" {
  if (!profile) return 0;

  // 필수 프로필 필드 체크 (step 0~9)
  const nameOk = Boolean(profile.name?.trim() && profile.name.trim().length >= 2 && profile.name.trim().length <= 10);
  if (!nameOk) return 0;
  if (profile.gender == null || profile.gender === "") return 1;
  if (!profile.birth_date?.trim()) return 2;
  // step 3: birth_time 선택 → 비어 있어도 4로 진행
  const hasPhoto = Array.isArray(profile.profile_images) && profile.profile_images.length > 0;
  if (!hasPhoto) return 4;
  const heightOk = profile.height != null && profile.height >= 100 && profile.height <= 250;
  if (!heightOk) return 5;
  if (!profile.occupation?.trim()) return 6;
  if (profile.location == null || profile.location === "") return 7;
  if (profile.body_type == null || profile.body_type === "") return 8;
  if (profile.religion == null || profile.religion === "") return 9;

  // 프로필 필수 필드 모두 채워졌고 + 분석 완료 → 결과 페이지
  // ⚠️ saju_profile_id만으로 판단하지 않음! 프로필이 불완전한 채로 결과 페이지에 가면
  // 앱 매칭풀에 불완전한 프로필이 들어감.
  if (profile.saju_profile_id) return "result";

  // 10, 11, 12 선택값 제외
  return STEP_13;
}
