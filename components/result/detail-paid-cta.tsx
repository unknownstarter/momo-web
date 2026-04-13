"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface DetailPaidCtaProps {
  title: string;
  hook: string;
  description: string;
  productId: string;
  purchased?: boolean;
  paymentEnabled?: boolean;
}

export function DetailPaidCta({
  title,
  hook,
  description,
  productId,
  purchased = false,
  paymentEnabled = false,
}: DetailPaidCtaProps) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleClick = useCallback(() => {
    if (purchased) {
      router.push(`/paid/${productId}`);
      return;
    }
    if (!paymentEnabled) {
      showToast("준비 중입니다. 조금만 기다려주세요!");
      return;
    }
    router.push(`${ROUTES.CHECKOUT}?product=${productId}`);
  }, [purchased, paymentEnabled, productId, router, showToast]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`block w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
          purchased
            ? "border border-hanji-border bg-hanji-elevated shadow-low"
            : "border border-[#E8DFC8] bg-[#FDFAF3] shadow-md"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {purchased ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-brand/15 text-brand text-[11px] font-semibold">
                    구매 완료
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-muted leading-relaxed">
                  상세 분석 보기 →
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold text-ink">{title}</p>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-[#F5C518] text-[#1D1E23] text-[10px] font-extrabold tracking-wide">
                    BEST
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-muted leading-relaxed">
                  {description}
                </p>
                <p className="mt-3 text-[15px] font-bold text-[#B8860B]">{hook}</p>
              </>
            )}
          </div>
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            purchased ? "bg-hanji-secondary" : "bg-[#2D2D2D]"
          }`}>
            <svg
              width={14}
              height={14}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className={purchased ? "text-ink-muted" : "text-white"}
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        {!purchased && (
          <p className="mt-3 text-[10px] text-ink-tertiary">
            결제 시{" "}
            <Link
              href="/refund-policy"
              onClick={(e) => e.stopPropagation()}
              className="underline underline-offset-2 hover:text-ink-muted"
            >
              환불정책
            </Link>
            에 동의하는 것으로 간주합니다.
          </p>
        )}
      </button>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 bottom-28 -translate-x-1/2 z-[60] pointer-events-none"
        >
          <div className="px-4 py-2.5 rounded-full bg-ink/90 text-hanji text-[13px] font-medium shadow-high whitespace-nowrap">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}
