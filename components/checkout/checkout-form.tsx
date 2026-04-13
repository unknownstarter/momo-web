"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { MobileContainer } from "@/components/ui/mobile-container";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

/** 모바일 브라우저 감지 */
function isMobile() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

interface CheckoutFormProps {
  productId: string;
  productName: string;
  productDescription: string;
  amount: number;
  userId: string;
  userEmail: string | null;
}

export function CheckoutForm({
  productId,
  productName,
  productDescription,
  amount,
  userId,
  userEmail,
}: CheckoutFormProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        if (destroyed) return;

        const widgets = tossPayments.widgets({ customerKey: userId });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: "KRW", value: amount });
        if (destroyed) return;

        await widgets.renderPaymentMethods({
          selector: "#payment-method",
        });
        if (destroyed) return;

        await widgets.renderAgreement({
          selector: "#agreement",
        });
        if (destroyed) return;

        setWidgetReady(true);
      } catch (err) {
        console.error("[checkout] 결제 위젯 로드 실패:", err);
      }
    })();

    return () => {
      destroyed = true;
      widgetsRef.current = null;
      setWidgetReady(false);
    };
  }, [userId, amount]);

  const handlePayment = useCallback(async () => {
    if (loading || !widgetsRef.current || !agreed) return;
    setLoading(true);

    try {
      // 1. 서버에서 orderId 생성
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          router.push(`${ROUTES.RESULT}?payment=already`);
          return;
        }
        throw new Error(err.error ?? "주문 생성 실패");
      }

      const { orderId } = await res.json();

      if (isMobile()) {
        // 모바일: Redirect 방식 (앱 이동 때문에 Promise 불가)
        await widgetsRef.current.requestPayment({
          orderId,
          orderName: productName,
          customerEmail: userEmail ?? undefined,
          successUrl: `${window.location.origin}/api/payment/confirm`,
          failUrl: `${window.location.origin}/result?payment=fail`,
        });
      } else {
        // PC: Promise 방식 (결과를 직접 받아서 서버에 승인 요청)
        const result = await widgetsRef.current.requestPayment({
          orderId,
          orderName: productName,
          customerEmail: userEmail ?? undefined,
        });

        // 결제 성공 → 서버에서 승인 처리
        // confirm API 호출 (redirect: "manual"로 자동 리다이렉트 방지)
        const confirmRes = await fetch(
          `/api/payment/confirm?paymentKey=${encodeURIComponent(result.paymentKey)}&orderId=${encodeURIComponent(result.orderId)}&amount=${result.amount.value}`,
          { redirect: "manual" }
        );

        // 3xx redirect 응답에서 Location 헤더 추출하여 이동
        if (confirmRes.status >= 300 && confirmRes.status < 400) {
          const location = confirmRes.headers.get("Location");
          if (location) {
            window.location.href = location;
            return;
          }
        }
        // 정상 완료 시 result로 이동
        router.push(`${ROUTES.RESULT}?payment=success`);
      }
    } catch (err: unknown) {
      // 사용자 취소 또는 결제 실패
      const errorCode = (err as { code?: string })?.code;
      if (errorCode === "USER_CANCEL") {
        // 사용자가 직접 취소 — 조용히 처리
        setLoading(false);
        return;
      }
      console.error("[checkout] 결제 실패:", err);
      router.push(`${ROUTES.RESULT}?payment=fail`);
    }
  }, [loading, agreed, productId, productName, userEmail, router]);

  const canPay = agreed && widgetReady && !loading;

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col">
      <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-ink">주문 확인 및 결제</h1>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 py-6 space-y-6">
          <section>
            <h2 className="text-[15px] font-semibold text-ink mb-3">주문 상품</h2>
            <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low">
              <p className="text-[15px] font-semibold text-ink">{productName}</p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                {productDescription}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-ink mb-3">결제 금액</h2>
            <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low flex items-center justify-between">
              <span className="text-[15px] text-ink">최종 결제 금액</span>
              <span className="text-[18px] font-bold text-ink">
                {amount.toLocaleString()}원
              </span>
            </div>
          </section>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-hanji-border text-brand focus:ring-brand accent-[#A8C8E8]"
            />
            <span className="text-[13px] text-ink-muted leading-relaxed">
              위 주문 내용을 확인하였으며,{" "}
              <Link href="/refund-policy" className="underline underline-offset-2" target="_blank">
                환불정책
              </Link>
              에 동의하고 결제를 진행합니다.
            </span>
          </label>

          {/* 토스 결제위젯 */}
          <div id="payment-method" className="-mx-5" />
          <div id="agreement" className="-mx-5" />
        </div>
      </main>

      <CtaBar className="shrink-0">
        <button
          type="button"
          onClick={handlePayment}
          disabled={!canPay}
          className="w-full h-[52px] rounded-[14px] bg-[#2D2D2D] text-white text-base font-semibold transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "결제 처리 중..." : `${amount.toLocaleString()}원 결제하기`}
        </button>
      </CtaBar>
    </MobileContainer>
  );
}
