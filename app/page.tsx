import { MobileContainer } from "@/components/ui/mobile-container";
import { CtaBar } from "@/components/ui/cta-bar";
import { LandingLoginSheet } from "@/components/landing-login-sheet";
import { LandingCharacterBanner } from "@/components/landing-character-banner";

/**
 * 랜딩 — CTA는 항상 화면 하단 고정, 콘텐츠만 스크롤. design-system: 모든 스크린 CTA 하단 고정.
 */
export default function HomePage() {
  return (
    <MobileContainer fillViewport={false} className="h-full min-h-0 flex flex-col bg-hanji w-full min-w-0 overflow-hidden">
      <main className="flex-1 min-h-0 flex flex-col w-full min-w-0 overflow-hidden">
        {/* 스크롤 영역: CTA 제외한 콘텐츠만 */}
        <div className="flex-1 min-h-0 overflow-auto flex flex-col w-full min-w-0 px-4 pt-8 pb-12 sm:px-5">
          <div className="flex flex-col min-h-full w-full">
          {/* 섹션 1: 브랜드 — 상단 고정 */}
          <section className="w-full shrink-0" aria-label="브랜드">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-hanji-border bg-element-water-pastel shadow-low shrink-0 flex items-center justify-center ring-2 ring-white/50">
                <img
                  src="/images/characters/loading_spinner.gif"
                  alt=""
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg font-bold text-ink tracking-tight">momo</p>
                <p className="text-xs text-ink-muted mt-1">사주가 알고 있는 나의 인연</p>
              </div>
            </div>
          </section>

          {/* 섹션 2: 훅 — 위(브랜드)와 아래(해답+배너)의 세로 중단에 위치 */}
          <section className="w-full flex-1 flex flex-col justify-center min-h-[120px]" aria-label="소개">
            <h1 className="text-left text-[22px] font-bold text-ink leading-snug tracking-tight">
              좋은 사람은 많은데,
              <br />
              나랑 결이 맞는 사람은 어디 있을까요?
            </h1>
          </section>

          <section className="w-full shrink-0 mb-6" aria-label="해답">
            <p className="text-left text-[15px] text-ink leading-relaxed">
              사주가 이미 알고 있었어요.
            </p>
            <p className="mt-2 text-left text-sm text-ink-muted leading-relaxed">
              비슷하게 생기면 잘 산다더라. 사주·관상 보면 잘 맞는 인연을 알려줘요.
            </p>
          </section>

          {/* 배너 영역 — 해답(위)와 하단 여백의 세로 중단에 배치 */}
          <div className="w-full flex-1 flex flex-col justify-center min-h-[240px]">
            <LandingCharacterBanner />
          </div>
          </div>
        </div>

        {/* CTA — 항상 화면 하단 고정 (shrink-0) */}
        <CtaBar className="shrink-0">
          <LandingLoginSheet />
        </CtaBar>
      </main>
    </MobileContainer>
  );
}
