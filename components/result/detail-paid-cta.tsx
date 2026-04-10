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
      showToast("상세 분석 페이지를 준비 중이에요!");
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
        className="block w-full rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low text-left active:bg-hanji-secondary transition-colors"
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
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-[12px] text-ink-muted leading-relaxed">
                  {description}
                </p>
                <p className="mt-2 text-[13px] font-bold text-brand">{hook}</p>
              </>
            )}
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
        {!purchased && (
          <p className="mt-2 text-[10px] text-ink-tertiary">
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
