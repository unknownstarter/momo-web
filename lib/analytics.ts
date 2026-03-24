/**
 * GA4 이벤트 트래킹. NEXT_PUBLIC_GA_MEASUREMENT_ID 설정 시에만 동작.
 * 이벤트명: snake_case.
 *
 * 등록 이벤트:
 * - main_view                 랜딩(/) 노출
 * - click_login_button_in_main 메인 CTA '내 인연 찾기' 클릭
 * - view_login_bottomsheet    로그인 바텀시트 노출
 * - start_login               카카오 로그인 시작
 * - view_nickname             온보딩 닉네임(이름) 스텝 노출
 * - click_next_in_nickname    온보딩 닉네임 스텝에서 '다음' 클릭
 * - click_share_in_result     결과 페이지 '친구에게 공유하기' 클릭
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

/** 랜딩(메인) 페이지 노출 */
export function trackMainView(): void {
  trackEvent("main_view");
}

/** 메인 CTA '내 인연 찾기' 클릭 */
export function trackClickLoginButtonInMain(): void {
  trackEvent("click_login_button_in_main");
}

/** 로그인 바텀시트 노출 */
export function trackViewLoginBottomsheet(): void {
  trackEvent("view_login_bottomsheet");
}

/** 카카오 로그인 시작(리다이렉트 직전) */
export function trackStartLogin(): void {
  trackEvent("start_login");
}

/** 온보딩 닉네임(이름) 스텝 노출 */
export function trackViewNickname(): void {
  trackEvent("view_nickname");
}

/** 온보딩 닉네임 스텝에서 '다음' 클릭 */
export function trackClickNextInNickname(): void {
  trackEvent("click_next_in_nickname");
}

/** 결과 페이지에서 '친구에게 공유하기' 클릭 */
export function trackClickShareInResult(): void {
  trackEvent("click_share_in_result");
}

/** 공유 티저 페이지 노출 */
export function trackViewShareTeaser(): void {
  trackEvent("view_share_teaser");
}

/** 티저에서 '자세히 보기' 클릭 */
export function trackClickDetailInTeaser(): void {
  trackEvent("click_detail_in_teaser");
}

/** 티저에서 '나도 사주·관상 보기' 클릭 */
export function trackClickCtaInTeaser(): void {
  trackEvent("click_cta_in_teaser");
}

/** 공유 페이지에서 궁합 바텀시트 노출 */
export function trackViewCompatibilityPrompt(): void {
  trackEvent("view_compatibility_bottomsheet");
}

/** 궁합 CTA 클릭 (공유 페이지) */
export function trackClickCompatibilityCta(): void {
  trackEvent("click_compatibility_cta");
}

/** 결과 페이지 궁합 탭 진입 */
export function trackViewCompatibilityTab(): void {
  trackEvent("view_compatibility_tab");
}

/** 궁합 상세 바텀시트 열림 */
export function trackViewCompatibilityDetail(score: number): void {
  trackEvent("view_compatibility_detail", { score });
}

/** 궁합 결과 공유 */
export function trackShareCompatibilityResult(): void {
  trackEvent("share_compatibility_result");
}

export { MEASUREMENT_ID };
