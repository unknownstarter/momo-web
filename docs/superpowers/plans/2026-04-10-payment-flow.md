# 결제 플로우 & 인프라 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토스페이먼츠 결제위젯 기반 결제 플로우 구축 — DB 테이블, 주문 생성/승인 API, checkout 페이지, CTA 변환, 결제 내역, 햄버거 메뉴 통합

**Architecture:** Supabase에 `payment_history_web` 신규 테이블 추가 (기존 테이블 미변경). 서버 API에서 orderId 생성 + 원자적 잠금으로 결제 승인. checkout 페이지는 서버 셸(인증/구매 체크) + 클라이언트 자식(토스 위젯). CTA 카드는 구매 상태에 따라 결제/링크 분기.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (RLS + service_role), 토스페이먼츠 SDK v2, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-10-payment-flow-design.md`

---

## 파일 구조

### 신규 생성
| 파일 | 역할 |
|------|------|
| `app/api/payment/create-order/route.ts` | 주문 생성 API (orderId 서버 생성, pending INSERT, 30분 TTL) |
| `app/checkout/page.tsx` | 서버 컴포넌트 셸 (인증/구매 체크, redirect) |
| `components/checkout/checkout-form.tsx` | 클라이언트 결제 폼 (토스 위젯, 동의, 결제 버튼) |
| `app/payment-history/page.tsx` | 결제 내역 페이지 |

### 수정
| 파일 | 변경 |
|------|------|
| `lib/constants.ts` | `PRODUCTS` 상수 + `ROUTES.CHECKOUT`, `ROUTES.PAYMENT_HISTORY` 추가 |
| `app/api/payment/confirm/route.ts` | 원자적 잠금 + DB 기록 + 소유권 검증 |
| `components/result/detail-paid-cta.tsx` | 인라인 위젯 제거, `purchased` prop, checkout 이동/링크 분기 |
| `components/result/result-menu.tsx` | "결제 내역" 메뉴 항목 추가 |
| `app/result/page.tsx` | ResultMenu 추가 + 구매 상태 조회 + purchased prop 전달 |

---

## Task 1: Supabase 테이블 생성

**Files:**
- Supabase SQL (MCP tool)

- [ ] **Step 1: payment_history_web 테이블 + RLS 생성**

Supabase MCP `execute_sql`로 실행:

```sql
-- 1. 테이블 생성
CREATE TABLE payment_history_web (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  product_id      text NOT NULL,
  order_id        text NOT NULL UNIQUE,
  payment_key     text,
  amount          integer NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz
);

-- 2. 유저당 상품 중복 구매 방지
CREATE UNIQUE INDEX uq_user_product_paid
  ON payment_history_web(user_id, product_id)
  WHERE status = 'paid';

-- 3. CHECK 제약
ALTER TABLE payment_history_web
  ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'paid', 'refunded'));
ALTER TABLE payment_history_web
  ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);

-- 4. RLS
ALTER TABLE payment_history_web ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_payments" ON payment_history_web
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_payments" ON payment_history_web
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
```

- [ ] **Step 2: 테이블 생성 확인**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payment_history_web'
ORDER BY ordinal_position;
```

Expected: 9 columns (id, user_id, product_id, order_id, payment_key, amount, status, created_at, paid_at)

- [ ] **Step 3: RLS 정책 확인**

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'payment_history_web';
```

Expected: 2 policies (SELECT + INSERT)

---

## Task 2: PRODUCTS 상수 + 라우트 추가

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: PRODUCTS 상수와 라우트 추가**

`lib/constants.ts` 하단에 추가:

```typescript
/** 유료 상품 정의 — 금액은 이 상수만이 권위 있는 소스 */
export const PRODUCTS = {
  "saju-detail": {
    id: "saju-detail",
    name: "더 자세한 사주 보기",
    amount: 500,
    description: "13가지 영역으로 나누어 사주를 아주 자세히 풀어드려요.",
    shortDescription: "13가지 영역 심층 사주 분석",
  },
  "gwansang-detail": {
    id: "gwansang-detail",
    name: "더 자세한 관상 보기",
    amount: 500,
    description: "13가지 영역으로 내 얼굴이 말해주는 것들을 깊이 있게 분석해요.",
    shortDescription: "13가지 영역 심층 관상 분석",
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export function isValidProductId(id: string): id is ProductId {
  return id in PRODUCTS;
}
```

`ROUTES` 객체에 추가:

```typescript
CHECKOUT: "/checkout",
PAYMENT_HISTORY: "/payment-history",
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/constants.ts
git commit -m "feat: PRODUCTS 상수 + checkout/payment-history 라우트 추가"
```

---

## Task 3: 주문 생성 API (create-order)

**Files:**
- Create: `app/api/payment/create-order/route.ts`

- [ ] **Step 1: create-order API 작성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { PRODUCTS, isValidProductId } from "@/lib/constants";
import { randomUUID } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. productId 검증
    const body = await request.json();
    const { productId } = body;
    if (!productId || !isValidProductId(productId)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const product = PRODUCTS[productId];

    // 3. 이미 구매 완료 확인
    const { data: paid } = await supabaseAdmin
      .from("payment_history_web")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle();

    if (paid) {
      return NextResponse.json({ error: "Already purchased" }, { status: 409 });
    }

    // 4. 기존 pending 조회 (30분 이내만)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: existingPending } = await supabaseAdmin
      .from("payment_history_web")
      .select("order_id, amount")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "pending")
      .gte("created_at", thirtyMinAgo)
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({
        orderId: existingPending.order_id,
        amount: existingPending.amount,
      });
    }

    // 30분 초과 pending 삭제
    await supabaseAdmin
      .from("payment_history_web")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "pending")
      .lt("created_at", thirtyMinAgo);

    // 5. 신규 생성
    const orderId = randomUUID();
    const { error: insertError } = await supabaseAdmin
      .from("payment_history_web")
      .insert({
        user_id: user.id,
        product_id: productId,
        order_id: orderId,
        amount: product.amount,
        status: "pending",
      });

    if (insertError) {
      console.error("[create-order] INSERT 실패:", insertError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    return NextResponse.json({ orderId, amount: product.amount });
  } catch (error) {
    console.error("[create-order] 서버 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/api/payment/create-order/route.ts
git commit -m "feat: 주문 생성 API — orderId 서버 생성, pending 30분 TTL"
```

---

## Task 4: 결제 승인 API 재작성 (confirm)

**Files:**
- Modify: `app/api/payment/confirm/route.ts`

- [ ] **Step 1: confirm API 재작성**

기존 파일 전체를 아래로 교체:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");

  if (!paymentKey || !orderId) {
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=missing_params", request.url)
    );
  }

  try {
    // 1. 세션에서 user_id 확인
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/result?payment=fail&reason=unauthorized", request.url)
      );
    }

    // 2. 원자적 잠금 + 소유권 검증
    const { data: locked, error: lockError } = await supabaseAdmin
      .from("payment_history_web")
      .update({ status: "processing" })
      .eq("order_id", orderId)
      .eq("status", "pending")
      .eq("user_id", user.id)
      .select("id, amount, product_id")
      .maybeSingle();

    if (lockError || !locked) {
      return NextResponse.redirect(
        new URL("/result?payment=already", request.url)
      );
    }

    // 3. DB의 amount로 토스 승인 API 호출 (클라이언트 amount 무시)
    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: locked.amount,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[payment/confirm] 토스 승인 실패:", error);

      // 실패 → pending 복원 (재시도 허용)
      await supabaseAdmin
        .from("payment_history_web")
        .update({ status: "pending" })
        .eq("id", locked.id);

      return NextResponse.redirect(
        new URL(`/result?payment=fail&reason=${encodeURIComponent(error.code ?? "unknown")}`, request.url)
      );
    }

    // 4. 성공 → paid + paymentKey 저장
    await supabaseAdmin
      .from("payment_history_web")
      .update({
        status: "paid",
        payment_key: paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq("id", locked.id);

    return NextResponse.redirect(
      new URL("/result?payment=success", request.url)
    );
  } catch (error) {
    console.error("[payment/confirm] 서버 오류:", error);
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=server_error", request.url)
    );
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/api/payment/confirm/route.ts
git commit -m "feat: 결제 승인 API — 원자적 잠금 + 소유권 검증 + DB 금액 사용"
```

---

## Task 5: checkout 서버 셸 페이지

**Files:**
- Create: `app/checkout/page.tsx`

- [ ] **Step 1: 서버 컴포넌트 셸 작성**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS, isValidProductId, ROUTES } from "@/lib/constants";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { CheckoutForm } from "@/components/checkout/checkout-form";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CheckoutPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const productId = params.product;

  // 1. 상품 검증
  if (!productId || !isValidProductId(productId)) {
    redirect(ROUTES.RESULT);
  }

  // 2. 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  // 3. 이미 구매 완료 확인
  const { data: paid } = await supabaseAdmin
    .from("payment_history_web")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .eq("status", "paid")
    .maybeSingle();

  if (paid) {
    redirect(`${ROUTES.RESULT}?payment=already`);
  }

  const product = PRODUCTS[productId];

  return (
    <CheckoutForm
      productId={productId}
      productName={product.name}
      productDescription={product.description}
      amount={product.amount}
      userId={user.id}
      userEmail={user.email ?? null}
    />
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: CheckoutForm 미존재로 에러 (Task 6에서 생성)

- [ ] **Step 3: 커밋 (Task 6과 함께)**

---

## Task 6: checkout 클라이언트 폼

**Files:**
- Create: `components/checkout/checkout-form.tsx`

- [ ] **Step 1: CheckoutForm 컴포넌트 작성**

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { MobileContainer } from "@/components/ui/mobile-container";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

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

  // 토스 결제위젯 즉시 렌더
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

      // 2. 토스 결제 요청
      await widgetsRef.current.requestPayment({
        orderId,
        orderName: productName,
        customerEmail: userEmail ?? undefined,
        successUrl: `${window.location.origin}/api/payment/confirm`,
        failUrl: `${window.location.origin}/result?payment=fail`,
      });
    } catch {
      // 사용자 취소 또는 네트워크 에러
      setLoading(false);
    }
  }, [loading, agreed, productId, productName, userEmail, router]);

  const canPay = agreed && widgetReady && !loading;

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col">
      {/* 헤더 */}
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

      {/* 스크롤 콘텐츠 */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 py-6 space-y-6">
          {/* 주문 상품 */}
          <section>
            <h2 className="text-[15px] font-semibold text-ink mb-3">주문 상품</h2>
            <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low">
              <p className="text-[15px] font-semibold text-ink">{productName}</p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                {productDescription}
              </p>
            </div>
          </section>

          {/* 결제 금액 */}
          <section>
            <h2 className="text-[15px] font-semibold text-ink mb-3">결제 금액</h2>
            <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low flex items-center justify-between">
              <span className="text-[15px] text-ink">최종 결제 금액</span>
              <span className="text-[18px] font-bold text-brand">
                {amount.toLocaleString()}원
              </span>
            </div>
          </section>

          {/* 동의 체크박스 */}
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

          {/* 토스 결제수단 위젯 */}
          <div id="payment-method" />

          {/* 토스 약관 위젯 */}
          <div id="agreement" />
        </div>
      </main>

      {/* 하단 고정 CTA */}
      <CtaBar className="shrink-0">
        <button
          type="button"
          onClick={handlePayment}
          disabled={!canPay}
          className="w-full h-[52px] rounded-[14px] bg-brand text-white text-base font-semibold transition-colors active:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "결제 처리 중..." : `${amount.toLocaleString()}원 결제하기`}
        </button>
      </CtaBar>
    </MobileContainer>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/checkout/page.tsx components/checkout/checkout-form.tsx
git commit -m "feat: checkout 페이지 — 서버 셸 + 클라이언트 결제 폼"
```

---

## Task 7: DetailPaidCta 재작성

**Files:**
- Modify: `components/result/detail-paid-cta.tsx`

- [ ] **Step 1: 인라인 위젯 제거, purchased 분기로 재작성**

기존 파일 전체를 아래로 교체:

```typescript
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
      // 2단계 콘텐츠 페이지 완성 전 — 준비 중
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
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: `app/result/page.tsx`에서 제거된 props(amount, userId, userName, userEmail) 관련 에러 예상 → Task 9에서 해결

- [ ] **Step 3: 커밋 (Task 9와 함께)**

---

## Task 8: 결제 내역 페이지

**Files:**
- Create: `app/payment-history/page.tsx`

- [ ] **Step 1: 결제 내역 페이지 작성**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { MobileContainer } from "@/components/ui/mobile-container";
import { PRODUCTS, ROUTES, type ProductId } from "@/lib/constants";
import Link from "next/link";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PaymentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.HOME);
  }

  const { data: payments } = await supabaseAdmin
    .from("payment_history_web")
    .select("id, product_id, amount, status, paid_at, created_at")
    .eq("user_id", user.id)
    .in("status", ["paid", "refunded"])
    .order("created_at", { ascending: false });

  const statusLabel = (s: string) =>
    s === "paid" ? "결제완료" : s === "refunded" ? "환불완료" : s;

  const statusColor = (s: string) =>
    s === "paid" ? "text-brand" : "text-ink-tertiary";

  return (
    <MobileContainer className="min-h-dvh bg-hanji text-ink flex flex-col">
      <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
        <Link
          href={ROUTES.RESULT}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold text-ink">결제 내역</h1>
      </header>

      <main className="flex-1 px-5 py-6">
        {!payments || payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[15px] text-ink-tertiary">아직 결제 내역이 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const product = PRODUCTS[p.product_id as ProductId];
              const date = p.paid_at ?? p.created_at;
              const formatted = new Date(date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-ink">
                      {product?.name ?? p.product_id}
                    </p>
                    <span className={`text-[13px] font-medium ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] text-ink-tertiary">{formatted}</span>
                    <span className="text-[15px] font-bold text-ink">
                      {p.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </MobileContainer>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/payment-history/page.tsx
git commit -m "feat: 결제 내역 페이지"
```

---

## Task 9: /result 페이지 통합 (ResultMenu + 구매 상태 + CTA 변환)

**Files:**
- Modify: `app/result/page.tsx`
- Modify: `components/result/result-menu.tsx`

- [ ] **Step 1: ResultMenu에 "결제 내역" 메뉴 추가**

`components/result/result-menu.tsx`의 settings 시트 내부, "의견 보내기" 버튼 **위에** 추가:

```typescript
<button
  type="button"
  onClick={() => { closeSheet(); window.location.href = "/payment-history"; }}
  className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-hanji-secondary transition-colors text-[15px] text-ink"
>
  결제 내역
</button>
```

- [ ] **Step 2: /result 페이지에 ResultMenu import + 구매 상태 조회 + CTA props 변경**

`app/result/page.tsx` 변경사항:

(a) import 추가:
```typescript
import { ResultMenu } from "@/components/result/result-menu";
```

(b) 상태 추가 (기존 state 선언 근처):
```typescript
const [purchasedProducts, setPurchasedProducts] = useState<Set<string>>(new Set());
```

(c) useEffect 데이터 로드 내부 (user 확인 후)에 구매 상태 조회 추가:
```typescript
// 구매 상태 조회
const { data: purchases } = await supabase
  .from("payment_history_web")
  .select("product_id")
  .eq("status", "paid");

if (purchases && purchases.length > 0) {
  setPurchasedProducts(new Set(purchases.map((p: { product_id: string }) => p.product_id)));
}
```

(d) DetailPaidCta 호출부 props 변경 (기존 amount, userId, userName, userEmail 제거):

사주 CTA:
```typescript
<DetailPaidCta
  title="더 자세한 사주 보기"
  hook="궁금하면 오백원!"
  description="13가지 영역으로 나누어 나의 사주를 아주 자세히 풀어드려요."
  productId="saju-detail"
  purchased={purchasedProducts.has("saju-detail")}
  paymentEnabled={paymentEnabled}
/>
```

관상 CTA:
```typescript
<DetailPaidCta
  title="더 자세한 관상 보기"
  hook="왕이 될 상인가 오백원"
  description="13가지 영역으로 내 얼굴이 말해주는 것들을 깊이 있게 분석해요."
  productId="gwansang-detail"
  purchased={purchasedProducts.has("gwansang-detail")}
  paymentEnabled={paymentEnabled}
/>
```

(e) 페이지 상단 헤더 영역에 ResultMenu 추가 (MatchingHero 위 또는 적절한 위치):

```typescript
<div className="flex justify-end px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
  <ResultMenu />
</div>
```

(f) 결제 결과 토스트 처리 — useEffect에서 URL 쿼리 파라미터 확인:

```typescript
// 결제 결과 토스트
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get("payment");
  if (payment === "success") {
    setToastMessage("결제가 완료되었어요!");
  } else if (payment === "fail") {
    setToastMessage("결제에 실패했어요. 다시 시도해 주세요.");
  } else if (payment === "already") {
    setToastMessage("이미 구매한 상품이에요.");
  }
  // URL에서 payment 파라미터 제거
  if (payment) {
    window.history.replaceState({}, "", "/result");
  }
}, []);
```

참고: toastMessage 상태와 토스트 UI가 이미 없다면 추가 필요. 기존 코드 확인 후 적절히 통합.

- [ ] **Step 3: 타입 체크 + 빌드**

Run: `npx tsc --noEmit && npm run build`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add components/result/detail-paid-cta.tsx components/result/result-menu.tsx app/result/page.tsx
git commit -m "feat: /result 통합 — ResultMenu + 구매 상태 조회 + CTA 변환 + 결제 토스트"
```

---

## Task 10: 최종 빌드 확인 + PR

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, 신규 페이지 (/checkout, /payment-history) 포함

- [ ] **Step 3: 수동 테스트 체크리스트**

- [ ] toss-review 계정 로그인 → /result에 햄버거 메뉴 표시
- [ ] 햄버거 메뉴 → "결제 내역" 클릭 → /payment-history (빈 상태)
- [ ] "더 자세한 사주 보기" CTA 클릭 → /checkout?product=saju-detail
- [ ] checkout: 상품 정보, 금액, 동의 체크박스, 토스 결제위젯 표시
- [ ] 동의 체크 → 결제 버튼 활성화 → 결제 → /result?payment=success
- [ ] CTA가 "구매 완료 · 상세 분석 보기 →" 로 변환
- [ ] 결제 내역에 기록 표시
- [ ] 일반 유저: CTA 클릭 → "준비 중" 토스트

- [ ] **Step 4: feature 브랜치 + PR 생성**

```bash
git checkout -b feature/payment-checkout-flow
git push -u origin feature/payment-checkout-flow
gh pr create --title "feat: 결제 플로우 — checkout + 승인 API + 결제 내역 + 메뉴 통합"
```
