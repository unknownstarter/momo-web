"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LegalLinks } from "@/components/ui/legal-links";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import {
  trackClickLoginButtonInMain,
  trackViewLoginBottomsheet,
  trackStartLogin,
} from "@/lib/analytics";

/** 버튼 안에 쓰는 작은 스피너 */
function ButtonSpinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0"
      aria-hidden
    />
  );
}

/**
 * 랜딩 CTA 클릭 시 바텀시트로 카카오 로그인 유도.
 * 카카오 OAuth → /callback → 프로필 유무에 따라 /onboarding 또는 /result.
 * 인연 찾기 한 번 누르면 스피너 표시·비활성화, 시트 닫거나 로그인 끝날 때까지 연타 방지.
 */
export function LandingLoginSheet() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const openSheet = useCallback(() => {
    trackClickLoginButtonInMain();
    setSheetOpen(true);
    trackViewLoginBottomsheet();
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setKakaoLoading(false);
  }, []);

  const handleKakaoStart = async () => {
    trackStartLogin();
    setKakaoLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}${ROUTES.CALLBACK}` : undefined,
      },
    });
    if (error) {
      setKakaoLoading(false);
      return;
    }
    // 성공 시 카카오로 리다이렉트되므로 loading 상태 유지 (연타 방지)
  };

  const ctaBusy = sheetOpen;

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        disabled={ctaBusy}
        className="w-full h-[52px] rounded-xl bg-ink text-white text-[15px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
      >
        {ctaBusy ? (
          <>
            <ButtonSpinner />
            <span>연결 중…</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-white/[0.15] text-[11px] font-medium px-2 py-0.5 rounded-full">무료</span>
              <span>사주와 관상보고 이상형 찾기</span>
            </span>
          </>
        )}
      </button>
      <BottomSheet open={sheetOpen} onClose={closeSheet}>
        {/* 모모 로고 + 안내 문구 */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <Image
            src="/images/momo_logo_1024.png"
            alt="모모"
            width={72}
            height={72}
            className="object-contain rounded-2xl"
            unoptimized
          />
          <p className="mt-4 text-ink text-[16px] font-medium leading-relaxed">
            시작하려면 로그인해 주세요
          </p>
        </div>

        {/* 카카오 로그인 버튼 */}
        <button
          type="button"
          className="w-full h-[52px] rounded-xl bg-[#FEE500] text-[#191600] text-[15px] font-semibold hover:brightness-[0.97] active:brightness-[0.93] transition-all disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2 mt-5"
          onClick={handleKakaoStart}
          disabled={kakaoLoading}
        >
          {kakaoLoading ? (
            <>
              <span className="inline-block w-4 h-4 rounded-full border-2 border-[#3C1E1E] border-t-transparent animate-spin shrink-0" aria-hidden />
              <span>연결 중…</span>
            </>
          ) : (
            <>
              <Image
                src="/images/kakao_logo.svg"
                alt=""
                width={18}
                height={18}
                className="shrink-0"
                unoptimized
              />
              <span>카카오로 시작하기</span>
            </>
          )}
        </button>

        <div className="mt-6 pt-4 pb-6 border-t border-hanji-border">
          <LegalLinks />
        </div>
      </BottomSheet>
    </>
  );
}
