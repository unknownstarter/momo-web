"use client";

import { useState, useEffect } from "react";

interface MatchingCounterProps {
  accentColor: string;
  isVerified: boolean;
}

export function MatchingCounter({ accentColor, isVerified }: MatchingCounterProps) {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/matching-stats");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json.ok) setUserCount(json.count);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (isVerified) {
    return (
      <section className="px-5">
        <div
          className="rounded-2xl p-5 text-center border shadow-low"
          style={{
            backgroundColor: `${accentColor}08`,
            borderColor: `${accentColor}1F`,
          }}
        >
          <p className="text-[15px] font-semibold text-ink">매칭 등록 완료!</p>
          <p className="mt-2 text-[13px] text-ink-muted leading-relaxed">
            앱 출시 시 가장 먼저 이상형을 매칭해드릴게요.
            <br />
            친구에게 공유하면 더 빨리 매칭돼요!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5">
      <div
        className="rounded-2xl p-5 text-center border shadow-low"
        style={{
          backgroundColor: `${accentColor}08`,
          borderColor: `${accentColor}1F`,
        }}
      >
        {userCount != null && userCount > 0 && (
          <p className="text-[11px] font-medium text-ink-tertiary mb-2">
            지금까지 {userCount}명이 이상형을 찾았어요
          </p>
        )}
        <p className="text-[15px] font-semibold text-ink">
          전화번호 인증하면
          <br />
          앱 출시 즉시 매칭해드려요!
        </p>
        <p className="mt-2 text-[12px] text-ink-muted">
          지금 등록하면 가장 먼저 매칭 대상이 돼요
        </p>
      </div>
    </section>
  );
}
