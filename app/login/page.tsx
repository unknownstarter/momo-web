import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileContainer } from "@/components/ui/mobile-container";
import { CtaBar } from "@/components/ui/cta-bar";
import { LegalLinks } from "@/components/ui/legal-links";
import { ROUTES } from "@/lib/constants";

/**
 * 로그인 전용 화면 (앱 2.1·web-flow 기준).
 * 현재: 카카오 버튼 클릭 시 온보딩으로 이동 (인증 바이패스).
 * 연동 후: signInWithOAuth({ provider: 'kakao' }) → /callback → /onboarding 또는 /result
 */
export default function LoginPage() {
  return (
    <MobileContainer fillViewport={false} className="flex flex-1 min-h-0 flex-col bg-hanji">
      <main className="flex-1 flex min-h-0 flex-col w-full">
        <div className="flex-1 min-h-0 flex flex-col items-start w-full px-5 pt-8 pb-8">
          <h1 className="text-left text-2xl font-bold text-ink leading-tight tracking-tight">
            momo
          </h1>
          <p className="mt-2 text-left text-ink-muted text-sm font-medium">
            사주가 알고 있는 나의 인연
          </p>
          <p className="mt-8 text-left text-ink text-[15px] leading-relaxed">
            시작하려면 로그인해 주세요.
          </p>
          <div className="mt-8 w-full">
            <LegalLinks
              className="flex items-center justify-center gap-x-1 text-xs"
              linkClassName="text-ink-tertiary underline underline-offset-2 hover:text-ink-muted"
            />
          </div>
        </div>
        <CtaBar>
          <Link href={ROUTES.ONBOARDING} className="block w-full">
            <Button size="lg" className="w-full" variant="primary">
              카카오로 시작하기
            </Button>
          </Link>
        </CtaBar>
      </main>
    </MobileContainer>
  );
}
