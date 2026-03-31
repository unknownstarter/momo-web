"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

interface MatchingCounterProps {
  accentColor: string;
  isVerified: boolean;
  userCount: number | null;
  onShare: () => void;
  shareUrl: string | null;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (target <= 0 || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

export function MatchingCounter({ accentColor, isVerified, userCount, onShare, shareUrl }: MatchingCounterProps) {
  const animatedCount = useCountUp(userCount ?? 0);

  return (
    <section className="px-5">
      <div
        className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: "#2D2D2D" }}
      >
        {/* 카운터 */}
        {userCount != null && userCount > 0 && (
          <div className="mb-4">
            <p className="text-[13px] font-medium text-white/60">
              지금
            </p>
            <p className="text-[44px] font-bold tabular-nums text-white leading-tight tracking-tight mt-1">
              {animatedCount.toLocaleString()}
              <span className="text-[18px] font-semibold text-white/80 ml-1">명</span>
            </p>
            <p className="text-[14px] font-medium text-white/70 mt-1">
              궁합 매칭을 기다리고 있어요
            </p>
          </div>
        )}

        {/* CTA — 카드 안에 내장 */}
        {isVerified ? (
          <>
            <div className="w-12 h-[1px] bg-white/20 mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-white">매칭 등록 완료!</p>
            <p className="text-[12px] text-white/50 mt-1 mb-4">
              앱 출시 시 가장 먼저 이상형을 매칭해드릴게요
            </p>
            <button
              type="button"
              onClick={onShare}
              disabled={!shareUrl}
              className="w-full py-3 rounded-xl text-[14px] font-semibold bg-white text-ink transition-opacity hover:opacity-90 active:opacity-80"
            >
              친구에게 공유하기
            </button>
          </>
        ) : (
          <>
            <Link href={ROUTES.COMPLETE} className="block">
              <button
                type="button"
                className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-ink transition-opacity hover:opacity-90 active:opacity-80"
                style={{ backgroundColor: accentColor }}
              >
                매칭 등록하기
              </button>
            </Link>
            <p className="text-[11px] text-white/40 mt-3">
              전화번호 인증하면 앱 출시 즉시 매칭돼요
            </p>
          </>
        )}
      </div>
    </section>
  );
}
