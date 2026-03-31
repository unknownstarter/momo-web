"use client";

import { useState, useEffect, useRef } from "react";

interface MatchingCounterProps {
  accentColor: string;
  isVerified: boolean;
  userCount: number | null;
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
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

export function MatchingCounter({ accentColor, isVerified, userCount }: MatchingCounterProps) {
  const animatedCount = useCountUp(userCount ?? 0);

  return (
    <section className="px-5">
      <div
        className="rounded-2xl p-5 border shadow-low"
        style={{
          backgroundColor: `${accentColor}08`,
          borderColor: `${accentColor}1F`,
        }}
      >
        {userCount != null && userCount > 0 && (
          <div className="text-center mb-4">
            <p className="text-[36px] font-bold tabular-nums text-ink tracking-tight">
              {animatedCount.toLocaleString()}
              <span className="text-[15px] font-semibold text-ink-secondary ml-1">명</span>
            </p>
            <p className="text-[13px] text-ink-muted mt-1">
              궁합 매칭을 기다리고 있어요
            </p>
          </div>
        )}

        <div className="text-center">
          {isVerified ? (
            <>
              <p className="text-[15px] font-semibold text-ink">매칭 등록 완료!</p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                앱 출시 시 가장 먼저 이상형을 매칭해드릴게요
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-ink">
                전화번호 인증하면 앱 출시 즉시 매칭!
              </p>
              <p className="mt-1 text-[12px] text-ink-muted">
                지금 등록하면 가장 먼저 매칭 대상이 돼요
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
