"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

/**
 * 랜딩 CTA 클릭 시 바텀시트로 카카오 로그인 유도.
 * 카카오 OAuth → /callback → 프로필 유무에 따라 /onboarding 또는 /result.
 */
export function LandingLoginSheet() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKakaoStart = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}${ROUTES.CALLBACK}` : undefined,
      },
    });
    setLoading(false);
    setSheetOpen(false);
    if (error) {
      return;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="w-full h-[52px] rounded-xl bg-ink text-white text-[15px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity"
      >
        내 인연 찾기
      </button>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {/* 귀여움: 캐릭터 작게 + 미니멀 문구만 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-hanji bg-hanji-secondary shrink-0 flex items-center justify-center">
            <Image
              src="/images/characters/mulgyeori/expressions/love.png"
              alt=""
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
          </div>
          <p className="text-ink text-[15px] leading-relaxed">
            시작하려면 로그인해 주세요.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full mt-6"
          onClick={handleKakaoStart}
          disabled={loading}
        >
          {loading ? "연결 중…" : "카카오로 시작하기"}
        </Button>
        <div className="mt-6 pt-4 pb-6 border-t border-hanji-border flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm">
          <Link
            href="/terms"
            className="text-ink-muted underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded px-1 -mx-1"
          >
            이용약관
          </Link>
          <span className="text-ink-tertiary select-none" aria-hidden>
            ·
          </span>
          <Link
            href="/privacy"
            className="text-ink-muted underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded px-1 -mx-1"
          >
            개인정보처리방침
          </Link>
        </div>
      </BottomSheet>
    </>
  );
}
