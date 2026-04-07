/**
 * GA4 이벤트 트래킹.
 * 네이밍: view_ (노출), click_ (클릭), start_ (시작), complete_ (완료), share_ (공유)
 * 텍소노미: docs/event-taxonomy.md
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js",
      targetId: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

const MEASUREMENT_ID = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : undefined;

function isEnabled(): boolean {
  return typeof window !== "undefined" && !!MEASUREMENT_ID && typeof window.gtag === "function";
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isEnabled()) return;
  window.gtag!("event", eventName, params ?? {});
}

// ---------------------------------------------------------------------------
// 랜딩 (/)
// ---------------------------------------------------------------------------
export function trackViewMain(): void { trackEvent("view_main"); }
export function trackClickCtaInMain(): void { trackEvent("click_cta_in_main"); }
export function trackViewLoginBottomsheet(): void { trackEvent("view_login_bottomsheet"); }
export function trackStartLogin(): void { trackEvent("start_login"); }

// ---------------------------------------------------------------------------
// 온보딩 (/onboarding)
// ---------------------------------------------------------------------------
export function trackViewOnboardingStep(step: string): void { trackEvent(`view_onboarding_${step}`); }
export function trackClickNextInOnboarding(step: string): void { trackEvent(`click_next_in_onboarding_${step}`); }
export function trackClickStartAnalysis(): void { trackEvent("click_start_analysis"); }
/** Step 3 CTA에서 카카오 로그인 바텀시트가 트리거되는 시점 (Stage 2 신규) */
export function trackClickLoginInOnboardingBirthTime(): void { trackEvent("click_login_in_onboarding_birth_time"); }

// ---------------------------------------------------------------------------
// 분석 로딩 (/result/loading)
// ---------------------------------------------------------------------------
export function trackViewAnalysisLoading(): void { trackEvent("view_analysis_loading"); }
export function trackCompleteAnalysis(): void { trackEvent("complete_analysis"); }

// ---------------------------------------------------------------------------
// 매칭 메인 (/result)
// ---------------------------------------------------------------------------
export function trackViewMatchingMain(): void { trackEvent("view_matching_main"); }
export function trackClickSajuDetail(): void { trackEvent("click_saju_detail"); }
export function trackClickGwansangDetail(): void { trackEvent("click_gwansang_detail"); }
export function trackClickMatchingRegister(): void { trackEvent("click_matching_register"); }
export function trackClickShareInMatching(): void { trackEvent("click_share_in_matching"); }
export function trackClickCompatList(): void { trackEvent("click_compat_list"); }
export function trackClickCompatShare(): void { trackEvent("click_compat_share"); }

// ---------------------------------------------------------------------------
// 사주/관상 상세 (/result/detail)
// ---------------------------------------------------------------------------
export function trackViewResultDetail(): void { trackEvent("view_result_detail"); }
export function trackClickTabSaju(): void { trackEvent("click_tab_saju"); }
export function trackClickTabGwansang(): void { trackEvent("click_tab_gwansang"); }
export function trackClickShareInDetail(): void { trackEvent("click_share_in_detail"); }
export function trackClickBackToMatching(): void { trackEvent("click_back_to_matching"); }

// ---------------------------------------------------------------------------
// 궁합 (/result/compat)
// ---------------------------------------------------------------------------
export function trackViewCompat(): void { trackEvent("view_compat"); }
export function trackViewCompatDetail(score: number): void { trackEvent("view_compat_detail", { score }); }
export function trackShareCompatResult(): void { trackEvent("share_compat_result"); }

// ---------------------------------------------------------------------------
// 전화번호 등록 (/complete)
// ---------------------------------------------------------------------------
export function trackViewPhoneRegister(): void { trackEvent("view_phone_register"); }
export function trackClickSubmitPhone(): void { trackEvent("click_submit_phone"); }
export function trackCompletePhoneRegister(): void { trackEvent("complete_phone_register"); }

// ---------------------------------------------------------------------------
// 공유 티저 (/share, /s)
// ---------------------------------------------------------------------------
export function trackViewShareTeaser(): void { trackEvent("view_share_teaser"); }
export function trackClickDetailInTeaser(): void { trackEvent("click_detail_in_teaser"); }
export function trackClickCtaInTeaser(): void { trackEvent("click_cta_in_teaser"); }
export function trackViewCompatPrompt(): void { trackEvent("view_compat_prompt"); }
export function trackClickCompatCtaInPrompt(): void { trackEvent("click_compat_cta_in_prompt"); }

// ---------------------------------------------------------------------------
// 하위호환 (기존 import 깨지지 않도록)
// ---------------------------------------------------------------------------
/** @deprecated use trackViewMain */
export const trackMainView = trackViewMain;
/** @deprecated use trackClickCtaInMain */
export const trackClickLoginButtonInMain = trackClickCtaInMain;
/** @deprecated use trackViewOnboardingStep("name") */
export const trackViewNickname = () => trackViewOnboardingStep("name");
/** @deprecated use trackClickNextInOnboarding("name") */
export const trackClickNextInNickname = () => trackClickNextInOnboarding("name");
/** @deprecated use trackClickShareInMatching */
export const trackClickShareInResult = trackClickShareInMatching;
/** @deprecated use trackViewCompatPrompt */
export const trackViewCompatibilityPrompt = trackViewCompatPrompt;
/** @deprecated use trackClickCompatCtaInPrompt */
export const trackClickCompatibilityCta = trackClickCompatCtaInPrompt;
/** @deprecated use trackViewCompat */
export const trackViewCompatibilityTab = trackViewCompat;
/** @deprecated use trackViewCompatDetail */
export const trackViewCompatibilityDetail = trackViewCompatDetail;
/** @deprecated use trackShareCompatResult */
export const trackShareCompatibilityResult = trackShareCompatResult;

export { MEASUREMENT_ID };
