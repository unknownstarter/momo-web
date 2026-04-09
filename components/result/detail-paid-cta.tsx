"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
const PORTONE_STORE_ID = "store-a5abbbc0-936c-404b-9cdd-aaf6dfbacde9";
const PORTONE_CHANNEL_KEY = "channel-key-3ddd52f9-3b5b-4f22-86fe-54c06e6c6003";

interface DetailPaidCtaProps {
  /** 카드 제목. 예: "더 자세한 사주 보기" */
  title: string;
  /** 가격 훅. 예: "궁금하면 오백원!" */
  hook: string;
  /** 설명 문구 */
  description: string;
  /** 결제 상품 식별용. "saju-detail" | "gwansang-detail" */
  productId: string;
  /** true일 때만 실제 결제창 호출. false면 "준비 중" 토스트 (일반 유저용) */
  paymentEnabled?: boolean;
  /** 결제자 이메일 (customer 정보용) */
  userEmail?: string | null;
}

/**
 * 결과 페이지의 유료 전환 CTA.
 *
 * 클릭 시 포트원 V2 SDK를 통해 KG이니시스 결제창 호출.
 * 테스트 모드에서는 실결제 없이 결제창 UI만 확인 가능.
 *
 * 카카오페이·토스페이먼츠 PG 심사에서 결제 진입점 + 이니시스 결제창 노출 확인 용도.
 */
export function DetailPaidCta({
  title,
  hook,
  description,
  productId,
  paymentEnabled = false,
  userEmail = null,
}: DetailPaidCtaProps) {
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleClick = useCallback(async () => {
    if (loading) return;

    // 일반 유저: 결제 비활성 → "준비 중" 토스트
    if (!paymentEnabled) {
      showToast("준비 중입니다. 조금만 기다려주세요!");
      return;
    }

    // PG 심사용 테스트 계정: 실제 이니시스 결제창 호출
    setLoading(true);

    try {
      const PortOne = await import("@portone/browser-sdk/v2");
      const paymentId = `${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: title,
        totalAmount: 500,
        currency: "KRW",
        payMethod: "CARD",
        customer: {
          email: userEmail ?? undefined,
        },
        redirectUrl: typeof window !== "undefined"
          ? `${window.location.origin}/result`
          : undefined,
        productType: "DIGITAL",
      });

      if (!response || response.code === "FAILURE") {
        showToast("결제가 취소되었어요.");
        return;
      }

      // TODO: 서버에서 결제 검증 + 콘텐츠 해금 (후속 작업)
      showToast("결제가 완료되었어요! (테스트)");
    } catch {
      showToast("결제 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [loading, paymentEnabled, title, productId, showToast]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="block w-full rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low text-left active:bg-hanji-secondary transition-colors disabled:opacity-60"
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
