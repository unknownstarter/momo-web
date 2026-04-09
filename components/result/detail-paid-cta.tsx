"use client";

import { useState, useCallback } from "react";

interface DetailPaidCtaProps {
  title: string;
  hook: string; // 예: "궁금하면 오백원!"
  description: string;
}

/**
 * 결과 페이지의 유료 전환 스캐폴딩 CTA.
 *
 * 사주/관상 각 섹션 아래에 배치되어 "더 자세히 보기" 진입점을 제공한다.
 * 실제 결제 플로우는 후속 작업이며, 현재는 클릭 시 "준비 중" 토스트만 띄운다.
 * 카카오페이 PG 심사에서 결제 진입점 가시성 확보 용도.
 */
export function DetailPaidCta({ title, hook, description }: DetailPaidCtaProps) {
  const [toastVisible, setToastVisible] = useState(false);

  const handleClick = useCallback(() => {
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2000);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="block w-full rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low text-left active:bg-hanji-secondary transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-[12px] text-ink-muted leading-relaxed">
              {description}
            </p>
            <p className="mt-2 text-[13px] font-bold text-brand">{hook}</p>
          </div>
          <svg
            width={16}
            height={16}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
            className="shrink-0 text-ink-muted"
          >
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 bottom-28 -translate-x-1/2 z-[60] pointer-events-none"
        >
          <div className="px-4 py-2.5 rounded-full bg-ink/90 text-hanji text-[13px] font-medium shadow-high whitespace-nowrap">
            준비 중입니다. 조금만 기다려주세요!
          </div>
        </div>
      )}
    </>
  );
}
