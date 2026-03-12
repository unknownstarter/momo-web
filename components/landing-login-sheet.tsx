"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ROUTES } from "@/lib/constants";

/**
 * 랜딩 CTA 클릭 시 바텀시트로 카카오 로그인 유도.
 * 현재: "카카오로 시작하기" 클릭 시 시트 닫고 /onboarding 이동 (바이패스).
 * 연동 후: signInWithOAuth({ provider: 'kakao' }) 후 콜백에서 리다이렉트.
 */
export function LandingLoginSheet() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleKakaoStart = () => {
    setSheetOpen(false);
    router.push(ROUTES.ONBOARDING);
    // TODO: supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: origin + '/callback' } })
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-6 w-full h-[52px] rounded-[14px] bg-[#2D2D2D] text-white text-base font-medium hover:opacity-90 active:opacity-80"
      >
        사주 & 관상 보기
      </button>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <p className="text-ink text-[15px] font-medium mt-2">
          시작하려면 로그인해 주세요.
        </p>
        <Button
          size="lg"
          className="w-full mt-6"
          onClick={handleKakaoStart}
        >
          카카오로 시작하기
        </Button>
        <p className="mt-6 text-center text-xs text-ink-tertiary">
          <Link href="/terms" className="underline hover:text-ink-muted">
            이용약관
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-ink-muted">
            개인정보처리방침
          </Link>
        </p>
      </BottomSheet>
    </>
  );
}
