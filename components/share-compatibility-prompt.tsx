"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  elementKey,
  ELEMENT_COLORS,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";
import {
  trackViewCompatibilityPrompt,
  trackClickCompatibilityCta,
} from "@/lib/analytics";

interface ShareCompatibilityPromptProps {
  sharedProfileId: string;
  sharedUserName: string;
  sharedDominantElement: string | null;
  sharedCharacterType: string | null;
  viewerStatus: "has_result" | "logged_in" | "anonymous";
}

export function ShareCompatibilityPrompt({
  sharedProfileId,
  sharedUserName,
  sharedDominantElement,
  sharedCharacterType,
  viewerStatus,
}: ShareCompatibilityPromptProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const elKey = elementKey(sharedDominantElement);
  const colors = ELEMENT_COLORS[elKey] ?? ELEMENT_COLORS.metal;
  const effectiveChar =
    sharedCharacterType ??
    getCharacterTypeFromElement(sharedDominantElement) ??
    "namuri";

  // 마운트 시: sessionStorage + 쿠키에 partner 저장, 2초 후 바텀시트 열기
  useEffect(() => {
    try {
      sessionStorage.setItem("momo_compat_partner", sharedProfileId);
    } catch {
      // sessionStorage 사용 불가 시 무시
    }
    // 쿠키 병행 (7일 만료)
    document.cookie = `momo_compat_partner=${encodeURIComponent(sharedProfileId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    const timer = setTimeout(() => {
      setOpen(true);
      trackViewCompatibilityPrompt();
    }, 2000);

    return () => clearTimeout(timer);
  }, [sharedProfileId]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleCompatibilityCta = useCallback(() => {
    trackClickCompatibilityCta();
    if (viewerStatus === "has_result") {
      router.push("/result?tab=compatibility");
    } else if (viewerStatus === "logged_in") {
      router.push("/result/loading");
    } else {
      router.push("/");
    }
  }, [viewerStatus, router]);

  const handleSajuCta = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <BottomSheet open={open} onClose={handleClose} showCloseButton>
      <div className="flex flex-col items-center text-center pt-2 pb-2">
        {/* 캐릭터 + 물음표 */}
        <div className="flex items-center gap-3">
          {/* A의 캐릭터 원형 */}
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center"
            style={{
              backgroundColor: colors.pastel,
              borderColor: `${colors.main}4D`,
            }}
          >
            <Image
              src={`/images/characters/${effectiveChar}/default.png`}
              alt={`${sharedUserName}의 캐릭터`}
              width={40}
              height={40}
              className="object-contain"
              unoptimized
            />
          </div>
          {/* 물음표 아이콘 */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-hanji-border flex items-center justify-center bg-hanji-secondary">
            <span className="text-2xl text-ink-tertiary font-bold">?</span>
          </div>
        </div>

        {/* 텍스트 */}
        <h3
          className="mt-5 text-lg font-bold text-ink"
          style={{ letterSpacing: "-0.02em" }}
        >
          {sharedUserName}님과 나의 궁합은 몇 점일까?
        </h3>
        <p
          className="mt-1.5 text-[14px] text-ink-secondary"
          style={{ letterSpacing: "-0.01em" }}
        >
          사주로 보는 우리의 궁합을 확인해보세요
        </p>

        {/* 1차 CTA */}
        <Button
          size="lg"
          className="w-full mt-6"
          onClick={handleCompatibilityCta}
        >
          궁합 보기
        </Button>

        {/* 2차 링크 */}
        <button
          type="button"
          onClick={handleSajuCta}
          className="mt-3 text-[13px] text-ink-tertiary underline underline-offset-2"
        >
          나도 사주·관상 보기
        </button>
      </div>
    </BottomSheet>
  );
}
