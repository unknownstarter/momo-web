"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

interface DetailPaidCtaProps {
  /** 카드 제목. 예: "더 자세한 사주 보기" */
  title: string;
  /** 가격 훅. 예: "궁금하면 오백원!" */
  hook: string;
  /** 설명 문구 */
  description: string;
  /** 결제 상품 식별용. "saju-detail" | "gwansang-detail" */
  productId: string;
  /** 결제 금액 (원) */
  amount?: number;
  /** true일 때만 실제 결제 호출. false면 "준비 중" 토스트 */
  paymentEnabled?: boolean;
  /** 결제자 auth UUID (customerKey용) */
  userId?: string | null;
  /** 결제자 이름 */
  userName?: string | null;
  /** 결제자 이메일 */
  userEmail?: string | null;
}

/**
 * 결과 페이지의 유료 전환 CTA.
 *
 * 토스페이먼츠 결제위젯 SDK v2를 사용하여
 * 카카오페이·네이버페이·토스페이·카드 등 결제수단을 페이지 내에 임베드.
 */
export function DetailPaidCta({
  title,
  hook,
  description,
  productId,
  amount = 500,
  paymentEnabled = false,
  userId = null,
  userName = null,
  userEmail = null,
}: DetailPaidCtaProps) {
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // 결제위젯 초기화 & 렌더링
  useEffect(() => {
    if (!showWidget || !paymentEnabled) return;

    let destroyed = false;

    (async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        if (destroyed) return;

        const customerKey = userId ?? `guest_${Date.now()}`;
        const widgets = tossPayments.widgets({ customerKey });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: "KRW", value: amount });
        if (destroyed) return;

        await widgets.renderPaymentMethods({
          selector: `#payment-method-${productId}`,
        });
        if (destroyed) return;

        await widgets.renderAgreement({
          selector: `#agreement-${productId}`,
        });
        if (destroyed) return;

        setWidgetReady(true);
      } catch {
        if (!destroyed) {
          showToast("결제 위젯을 불러오지 못했어요. 다시 시도해 주세요.");
          setShowWidget(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      widgetsRef.current = null;
      setWidgetReady(false);
    };
  }, [showWidget, paymentEnabled, userId, amount, productId, showToast]);

  const handleCardClick = useCallback(() => {
    if (!paymentEnabled) {
      showToast("준비 중입니다. 조금만 기다려주세요!");
      return;
    }
    setShowWidget(true);
  }, [paymentEnabled, showToast]);

  const handlePayment = useCallback(async () => {
    if (loading || !widgetsRef.current) return;
    setLoading(true);

    try {
      const orderId = `${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await widgetsRef.current.requestPayment({
        orderId,
        orderName: title,
        customerName: userName ?? undefined,
        customerEmail: userEmail ?? undefined,
        successUrl: `${window.location.origin}/api/payment/confirm`,
        failUrl: `${window.location.origin}/result?payment=fail`,
      });
    } catch {
      showToast("결제가 취소되었어요.");
    } finally {
      setLoading(false);
    }
  }, [loading, productId, title, userName, userEmail, showToast]);

  return (
    <>
      {/* 펼치기 전: 기존 CTA 카드 */}
      {!showWidget && (
        <button
          type="button"
          onClick={handleCardClick}
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
      )}

      {/* 펼친 후: 토스 결제위젯 */}
      {showWidget && (
        <div className="rounded-2xl border border-hanji-border bg-hanji-elevated shadow-low overflow-hidden">
          {/* 상품 정보 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-hanji-border">
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-[12px] text-ink-muted mt-0.5">{description}</p>
            </div>
            <p className="text-base font-bold text-brand shrink-0">
              {amount.toLocaleString()}원
            </p>
          </div>

          {/* 결제수단 위젯 */}
          <div id={`payment-method-${productId}`} />

          {/* 약관 위젯 */}
          <div id={`agreement-${productId}`} />

          {/* 결제 버튼 */}
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={handlePayment}
              disabled={loading || !widgetReady}
              className="w-full rounded-xl bg-brand py-3.5 text-[15px] font-semibold text-white transition-colors active:bg-brand/90 disabled:opacity-50"
            >
              {loading
                ? "결제 처리 중..."
                : `${amount.toLocaleString()}원 결제하기`}
            </button>
          </div>

          {/* 접기 버튼 */}
          <button
            type="button"
            onClick={() => setShowWidget(false)}
            className="w-full py-3 text-[12px] text-ink-muted border-t border-hanji-border hover:bg-hanji-secondary transition-colors"
          >
            접기
          </button>
        </div>
      )}

      {/* 토스트 */}
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
