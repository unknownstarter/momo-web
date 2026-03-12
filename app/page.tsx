import { MobileContainer } from "@/components/ui/mobile-container";
import { LandingLoginSheet } from "@/components/landing-login-sheet";

export default function HomePage() {
  return (
    <MobileContainer fillViewport={false} className="flex flex-1 min-h-0 flex-col bg-hanji">
      <main className="flex-1 flex min-h-0 flex-col items-start justify-center py-6 w-full">
        {/* 로딩 캐릭터 GIF — 친근한 첫인상 (중앙 정렬) */}
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-hanji-border bg-hanji-secondary shadow-low shrink-0 mb-6 flex items-center justify-center self-center">
          <img
            src="/images/characters/loading_spinner.gif"
            alt=""
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-left text-2xl font-bold text-ink leading-tight tracking-tight">
          momo
        </h1>
        <p className="mt-2 text-left text-ink-muted text-sm font-medium">
          사주가 알고 있는 나의 인연
        </p>

        {/* 핵심 메시지: 좋은 사람 → 딱 맞는 인연 */}
        <div className="mt-6 w-full space-y-3">
          <p className="text-left text-ink text-[15px] leading-relaxed font-medium">
            좋은 사람이 아니라,
            <br />
            <span className="text-ink font-semibold">나와 궁합이 맞는 인연</span>을 만나세요.
          </p>
          <p className="text-left text-ink-muted text-sm leading-relaxed">
            사주와 관상으로 한 번에.
          </p>
        </div>

        {/* 가치 제안 3줄 — 난잡하지 않게 */}
        <ul className="mt-6 w-full space-y-2 text-sm text-ink-secondary" aria-label="서비스 특징">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-element-wood shrink-0" aria-hidden />
            <span>사주 기반 <strong className="text-ink font-medium">궁합 점수</strong>로 맞춤 매칭</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-element-fire shrink-0" aria-hidden />
            <span><strong className="text-ink font-medium">관상(동물상)</strong>까지 반영한 매칭</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-element-water shrink-0" aria-hidden />
            <span>딱 맞는 인연만 골라서 소개</span>
          </li>
        </ul>

        {/* CTA 클릭 시 바텀시트로 카카오 로그인 (PD 권장: 별도 로그인 페이지 없이 한 번에) */}
        <LandingLoginSheet />
      </main>
    </MobileContainer>
  );
}
