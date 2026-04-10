# 유료 상세 분석 콘텐츠 구현 계획 (2단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결제 완료 유저에게 Haiku AI 기반 13개 영역 심층 분석 콘텐츠를 생성·제공하는 전체 파이프라인 구축

**Architecture:** product_id를 `paid_saju`/`paid_gwansang`으로 마이그레이션 → Supabase `paid_content` 테이블 + 2개 신규 Edge Function(`generate-paid-saju`, `generate-paid-gwansang`) → 웹 API(생성 트리거 + 조회) → 열람 페이지(서버 셸 + 클라이언트 뷰어 + 로딩 + 폴링) → CTA 연결

**Tech Stack:** Next.js 15 App Router, Supabase Edge Functions (Deno), Claude Haiku 4.5, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-10-paid-content-design.md`

---

## 파일 구조

### 신규 생성
| 파일 | 역할 |
|------|------|
| `app/paid/[productId]/page.tsx` | 서버 셸 — 인증/해금 체크, redirect |
| `components/paid/paid-content-view.tsx` | 클라이언트 뷰어 — 생성 트리거 + 폴링 + 렌더링 |
| `components/paid/paid-loading.tsx` | 로딩 연출 — 라이트 스켈레톤 + 단계 메시지 |
| `components/paid/paid-section-card.tsx` | 섹션 카드 컴포넌트 |
| `components/paid/monthly-fortune.tsx` | 월별 운세 컴포넌트 (paid_saju 전용) |
| `app/api/paid-content/generate/route.ts` | 생성 트리거 API (레이트 리밋) |
| `app/api/paid-content/[productId]/route.ts` | 콘텐츠 조회 API |
| `supabase/functions/generate-paid-saju/index.ts` | Edge Function — 사주 심층 분석 |
| `supabase/functions/generate-paid-gwansang/index.ts` | Edge Function — 관상 심층 분석 |

### 수정
| 파일 | 변경 |
|------|------|
| `lib/constants.ts` | PRODUCTS 키: `saju-detail` → `paid_saju`, `gwansang-detail` → `paid_gwansang` |
| `app/result/page.tsx` | productId 변경 + 해금 기준 paid_content 추가 |
| `components/result/detail-paid-cta.tsx` | purchased → `/paid/{productId}` 이동 |
| `app/checkout/page.tsx` | product param 변경 + paid_content 해금 체크 추가 |

---

## Task 1: Supabase `paid_content` 테이블 생성

**Files:**
- Supabase SQL (MCP tool)

- [ ] **Step 1: paid_content 테이블 + RLS 생성**

Supabase MCP `execute_sql`로 실행:

```sql
CREATE TABLE paid_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  product_id  text NOT NULL,
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE paid_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_paid_content" ON paid_content
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

- [ ] **Step 2: 테이블 생성 확인**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'paid_content'
ORDER BY ordinal_position;
```

Expected: 5 columns (id, user_id, product_id, content, created_at)

- [ ] **Step 3: RLS 확인**

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'paid_content';
```

Expected: 1 policy (SELECT)

---

## Task 2: product_id 마이그레이션 (원자적)

**Files:**
- Modify: `lib/constants.ts`
- Modify: `app/result/page.tsx`
- Modify: `app/checkout/page.tsx`
- Modify: `components/result/detail-paid-cta.tsx`

모든 파일을 **한 커밋으로** 동시 변경.

- [ ] **Step 1: lib/constants.ts — PRODUCTS 키 변경**

`lib/constants.ts`에서 PRODUCTS 정의를 아래로 교체:

```typescript
/** 유료 상품 정의 — 금액은 이 상수만이 권위 있는 소스 */
export const PRODUCTS = {
  paid_saju: {
    id: "paid_saju",
    name: "더 자세한 사주 보기",
    amount: 500,
    description: "13가지 영역으로 나누어 사주를 아주 자세히 풀어드려요.",
    shortDescription: "13가지 영역 심층 사주 분석",
  },
  paid_gwansang: {
    id: "paid_gwansang",
    name: "더 자세한 관상 보기",
    amount: 500,
    description: "13가지 영역으로 내 얼굴이 말해주는 것들을 깊이 있게 분석해요.",
    shortDescription: "13가지 영역 심층 관상 분석",
  },
} as const;
```

ROUTES에 추가:
```typescript
PAID: "/paid",
```

- [ ] **Step 2: app/result/page.tsx — productId + 해금 기준 변경**

(a) 구매 상태 조회에서 `paid_content`도 함께 조회하도록 변경. 기존 `payment_history_web` 조회 블록 아래에 추가:

```typescript
        // 유료 콘텐츠 해금 상태 조회 (paid_content에 row 있거나 payment_history_web에 paid 있으면 해금)
        const { data: paidContent } = await supabase
          .from("paid_content")
          .select("product_id");

        const paidContentSet = new Set(
          (paidContent ?? []).map((p: { product_id: string }) => p.product_id)
        );

        // purchases(payment_history_web) + paidContent 합집합
        const allPurchased = new Set([
          ...(purchases ?? []).map((p: { product_id: string }) => p.product_id),
          ...paidContentSet,
        ]);

        if (allPurchased.size > 0 && !cancelled) {
          setPurchasedProducts(allPurchased);
        }
```

기존 `setPurchasedProducts(new Set(purchases.map(...)))` 블록을 위 코드로 교체.

(b) DetailPaidCta의 productId를 변경:

```typescript
productId="paid_saju"
purchased={purchasedProducts.has("paid_saju")}
```

```typescript
productId="paid_gwansang"
purchased={purchasedProducts.has("paid_gwansang")}
```

- [ ] **Step 3: app/checkout/page.tsx — product param + paid_content 체크 추가**

`payment_history_web` 체크 아래에 `paid_content` 체크 추가:

```typescript
  // 이미 paid_content에 콘텐츠가 있는 경우도 체크 (앱 Key 구매 유저 대응)
  const { data: existingContent } = await supabaseAdmin
    .from("paid_content")
    .select("id, content")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingContent && JSON.stringify(existingContent.content) !== '{}') {
    redirect(`${ROUTES.RESULT}?payment=already`);
  }
```

- [ ] **Step 4: components/result/detail-paid-cta.tsx — purchased 시 /paid 이동**

`handleClick`에서 purchased 분기 변경:

```typescript
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
```

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 커밋 (원자적)**

```bash
git add lib/constants.ts app/result/page.tsx app/checkout/page.tsx components/result/detail-paid-cta.tsx
git commit -m "feat: product_id 마이그레이션 — saju-detail→paid_saju, gwansang-detail→paid_gwansang + paid_content 해금 체크"
```

---

## Task 3: 콘텐츠 조회 API

**Files:**
- Create: `app/api/paid-content/[productId]/route.ts`

- [ ] **Step 1: 조회 API 작성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isValidProductId } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!isValidProductId(productId)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("paid_content")
      .select("content, created_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 빈 content(예약 row)는 아직 생성 중
    if (!data.content || JSON.stringify(data.content) === '{}') {
      return NextResponse.json({ error: "Generating" }, { status: 202 });
    }

    return NextResponse.json({ content: data.content, createdAt: data.created_at });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add app/api/paid-content/[productId]/route.ts
git commit -m "feat: 유료 콘텐츠 조회 API — 빈 content(202) / 완료(200) / 미존재(404)"
```

---

## Task 4: 콘텐츠 생성 트리거 API

**Files:**
- Create: `app/api/paid-content/generate/route.ts`

- [ ] **Step 1: 생성 트리거 API 작성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { PRODUCTS, isValidProductId } from "@/lib/constants";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 간단 레이트 리밋: per-user per-product, 메모리 기반
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1분

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

    // 3. 레이트 리밋
    const rateLimitKey = `${user.id}:${productId}`;
    const lastCall = rateLimitMap.get(rateLimitKey) ?? 0;
    if (Date.now() - lastCall < RATE_LIMIT_MS) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    rateLimitMap.set(rateLimitKey, Date.now());

    // 4. paid_content 이미 존재 + content 비어있지 않음 → 이미 생성됨
    const { data: existing } = await supabaseAdmin
      .from("paid_content")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing && JSON.stringify(existing.content) !== '{}') {
      return NextResponse.json({ success: true, status: "already_generated" });
    }

    // 5. 결제 확인
    const { data: payment } = await supabaseAdmin
      .from("payment_history_web")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ error: "Payment required" }, { status: 403 });
    }

    // 6. profile ID 조회
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, saju_profile_id, gwansang_profile_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const edgeFunctionName = productId === "paid_saju"
      ? "generate-paid-saju"
      : "generate-paid-gwansang";

    const edgeFunctionBody = productId === "paid_saju"
      ? { userId: user.id, sajuProfileId: profile.saju_profile_id }
      : { userId: user.id, gwansangProfileId: profile.gwansang_profile_id };

    // 7. Edge Function 호출
    const { error: fnError } = await supabaseAdmin.functions.invoke(
      edgeFunctionName,
      {
        body: edgeFunctionBody,
        headers: {
          Authorization: request.headers.get("Authorization") ?? "",
        },
      }
    );

    if (fnError) {
      console.error(`[paid-content/generate] Edge Function 실패:`, fnError);
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[paid-content/generate] 서버 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add app/api/paid-content/generate/route.ts
git commit -m "feat: 유료 콘텐츠 생성 트리거 API — 레이트 리밋 + 결제 검증 + Edge Function 호출"
```

---

## Task 5: 열람 페이지 — 서버 셸

**Files:**
- Create: `app/paid/[productId]/page.tsx`

- [ ] **Step 1: 서버 셸 작성**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PRODUCTS, isValidProductId, ROUTES } from "@/lib/constants";
import { PaidContentView } from "@/components/paid/paid-content-view";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PaidPageProps {
  params: Promise<{ productId: string }>;
}

export default async function PaidPage({ params }: PaidPageProps) {
  const { productId } = await params;

  if (!isValidProductId(productId)) {
    redirect(ROUTES.RESULT);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  // paid_content 조회
  const { data: paidContent } = await supabaseAdmin
    .from("paid_content")
    .select("content")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  const hasContent = paidContent
    && paidContent.content
    && JSON.stringify(paidContent.content) !== '{}';

  // 콘텐츠도 없고 결제도 안 됨 → /result로
  if (!hasContent) {
    const { data: payment } = await supabaseAdmin
      .from("payment_history_web")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle();

    if (!payment) {
      redirect(ROUTES.RESULT);
    }
  }

  const product = PRODUCTS[productId];

  return (
    <PaidContentView
      productId={productId}
      productName={product.name}
      content={hasContent ? paidContent!.content : null}
    />
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PaidContentView 미존재로 에러 (Task 6에서 생성)

- [ ] **Step 3: 커밋 (Task 6~8과 함께)**

---

## Task 6: 로딩 연출 컴포넌트

**Files:**
- Create: `components/paid/paid-loading.tsx`

- [ ] **Step 1: 로딩 컴포넌트 작성**

```typescript
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const SAJU_STEPS = [
  "성격과 기질을 분석하고 있어요",
  "재물운을 해석하고 있어요",
  "직업운을 살펴보고 있어요",
  "연애운을 풀고 있어요",
  "건강운을 확인하고 있어요",
  "대인관계를 살펴보고 있어요",
  "월별 운세를 작성하고 있어요",
  "종합 풀이를 마무리하고 있어요",
];

const GWANSANG_STEPS = [
  "이마의 천정을 살피고 있어요",
  "눈과 눈썹을 분석하고 있어요",
  "코의 재물운을 해석하고 있어요",
  "입과 귀를 살펴보고 있어요",
  "얼굴 윤곽을 읽고 있어요",
  "관상으로 본 성격을 풀고 있어요",
  "관상으로 본 운세를 정리하고 있어요",
  "종합 관상 풀이를 마무리하고 있어요",
];

interface PaidLoadingProps {
  productId: string;
}

export function PaidLoading({ productId }: PaidLoadingProps) {
  const steps = productId === "paid_saju" ? SAJU_STEPS : GWANSANG_STEPS;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <Image
        src="/images/characters/loading_spinner.gif"
        alt=""
        width={120}
        height={120}
        unoptimized
      />
      <p className="mt-6 text-[15px] font-semibold text-ink text-center">
        심층 분석 중이에요
      </p>
      <p className="mt-2 text-[13px] text-ink-muted text-center animate-pulse">
        {steps[stepIndex]}
      </p>
      <div className="mt-6 w-48 h-1 bg-hanji-border rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-[4000ms] ease-linear"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋 (Task 7, 8과 함께)**

---

## Task 7: 섹션 카드 + 월별 운세 컴포넌트

**Files:**
- Create: `components/paid/paid-section-card.tsx`
- Create: `components/paid/monthly-fortune.tsx`

- [ ] **Step 1: 섹션 카드 작성**

```typescript
interface PaidSectionCardProps {
  title: string;
  body: string;
}

export function PaidSectionCard({ title, body }: PaidSectionCardProps) {
  return (
    <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] text-ink-muted leading-relaxed whitespace-pre-wrap">
        {body}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 월별 운세 작성**

```typescript
"use client";

import { useState } from "react";

interface MonthData {
  month: number;
  title: string;
  rating?: number;
  focus?: string;
  body: string;
}

interface MonthlyFortuneProps {
  year: number;
  months: MonthData[];
}

export function MonthlyFortune({ year, months }: MonthlyFortuneProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() === year ? now.getMonth() + 1 : 1;
  });

  const current = months.find((m) => m.month === selectedMonth) ?? months[0];

  return (
    <div className="rounded-2xl border border-hanji-border bg-hanji-elevated shadow-low overflow-hidden">
      <div className="p-4 pb-3">
        <h3 className="text-[15px] font-semibold text-ink">{year}년 월별 운세</h3>
      </div>

      {/* 월 탭 — 가로 스크롤 */}
      <div className="flex overflow-x-auto gap-1 px-4 pb-3 scrollbar-hide">
        {months.map((m) => (
          <button
            key={m.month}
            type="button"
            onClick={() => setSelectedMonth(m.month)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              selectedMonth === m.month
                ? "bg-brand text-white"
                : "bg-hanji-secondary text-ink-muted hover:bg-hanji-border"
            }`}
          >
            {m.title}
          </button>
        ))}
      </div>

      {/* 선택된 월 상세 */}
      <div className="px-4 pb-4">
        {current.rating != null && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] text-ink-muted">운세 등급</span>
            <span className="text-[13px] font-semibold text-brand">
              {"★".repeat(current.rating)}{"☆".repeat(5 - current.rating)}
            </span>
            {current.focus && (
              <span className="px-1.5 py-0.5 rounded-md bg-brand/15 text-brand text-[11px] font-semibold">
                {current.focus}
              </span>
            )}
          </div>
        )}
        <p className="text-[14px] text-ink-muted leading-relaxed whitespace-pre-wrap">
          {current.body}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋 (Task 8과 함께)**

---

## Task 8: PaidContentView 클라이언트 뷰어

**Files:**
- Create: `components/paid/paid-content-view.tsx`

- [ ] **Step 1: PaidContentView 작성**

```typescript
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { ROUTES } from "@/lib/constants";
import { PaidLoading } from "@/components/paid/paid-loading";
import { PaidSectionCard } from "@/components/paid/paid-section-card";
import { MonthlyFortune } from "@/components/paid/monthly-fortune";

interface Section {
  id: string;
  title: string;
  body?: string;
  year?: number;
  months?: Array<{
    month: number;
    title: string;
    rating?: number;
    focus?: string;
    body: string;
  }>;
}

interface PaidContentData {
  version: number;
  sections: Section[];
}

interface PaidContentViewProps {
  productId: string;
  productName: string;
  content: PaidContentData | null;
}

export function PaidContentView({
  productId,
  productName,
  content: initialContent,
}: PaidContentViewProps) {
  const router = useRouter();
  const [content, setContent] = useState<PaidContentData | null>(initialContent);
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const generationTriggeredRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // 생성 트리거 + 폴링
  useEffect(() => {
    if (initialContent || generationTriggeredRef.current) return;
    generationTriggeredRef.current = true;

    let destroyed = false;

    (async () => {
      // 생성 트리거
      try {
        await fetch("/api/paid-content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      } catch {
        // 생성 실패해도 폴링으로 확인
      }

      if (destroyed) return;

      // 폴링 시작
      const poll = async () => {
        try {
          const res = await fetch(`/api/paid-content/${productId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.content) {
              setContent(data.content);
              setLoading(false);
              stopPolling();
              return;
            }
          }
        } catch {
          // 네트워크 에러 — 계속 폴링
        }

        pollCountRef.current += 1;
        if (pollCountRef.current >= 20) {
          setError("분석 생성에 시간이 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
          setLoading(false);
          stopPolling();
        }
      };

      pollRef.current = setInterval(poll, 3000);
    })();

    // 탭 전환 시 폴링 pause/resume
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else if (!content && pollCountRef.current < 20) {
        pollRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/paid-content/${productId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                setContent(data.content);
                setLoading(false);
                stopPolling();
                return;
              }
            }
          } catch { /* continue */ }
          pollCountRef.current += 1;
          if (pollCountRef.current >= 20) {
            setError("분석 생성에 시간이 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
            setLoading(false);
            stopPolling();
          }
        }, 3000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      destroyed = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initialContent, productId, content, stopPolling]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    pollCountRef.current = 0;
    generationTriggeredRef.current = false;
  };

  return (
    <MobileContainer className="min-h-dvh bg-hanji text-ink flex flex-col">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
        <button
          type="button"
          onClick={() => router.push(ROUTES.RESULT)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-ink">{productName}</h1>
      </header>

      {/* 로딩 */}
      {loading && <PaidLoading productId={productId} />}

      {/* 에러 */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <p className="text-[15px] text-ink-muted text-center">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 px-6 py-2.5 rounded-xl bg-brand text-white text-[14px] font-semibold"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 콘텐츠 */}
      {content && !loading && (
        <main className="flex-1 overflow-y-auto">
          <div className="px-5 py-6 space-y-4">
            {content.sections.map((section) => {
              if (section.id === "monthly_fortune" && section.months) {
                return (
                  <MonthlyFortune
                    key={section.id}
                    year={section.year ?? new Date().getFullYear()}
                    months={section.months}
                  />
                );
              }
              return (
                <PaidSectionCard
                  key={section.id}
                  title={section.title}
                  body={section.body ?? ""}
                />
              );
            })}
          </div>

          {/* 하단 링크 */}
          <div className="px-5 pb-8">
            <button
              type="button"
              onClick={() => router.push(ROUTES.RESULT)}
              className="w-full py-3 text-[13px] text-ink-muted text-center hover:text-ink transition-colors"
            >
              결과 페이지로 돌아가기
            </button>
          </div>
        </main>
      )}
    </MobileContainer>
  );
}
```

- [ ] **Step 2: 타입 체크 + 빌드**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 3: 커밋**

```bash
git add app/paid/ components/paid/
git commit -m "feat: 유료 콘텐츠 열람 페이지 — 서버 셸 + 클라이언트 뷰어 + 로딩 + 폴링 + 섹션 카드 + 월별 운세"
```

---

## Task 9: Edge Function — generate-paid-saju

**Files:**
- Create: `supabase/functions/generate-paid-saju/index.ts`

**배포**: Supabase Dashboard 또는 `supabase functions deploy generate-paid-saju`

- [ ] **Step 1: Edge Function 작성**

이 파일은 Supabase Edge Function으로 배포. momo-web 레포에 참조용으로 보관:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `당신은 30년 경력의 사주 역학 전문가입니다.

<context>
고객이 유료로 구매한 심층 사주 분석 콘텐츠입니다.
무료 분석과 확실히 차별화된, 구체적이고 실용적인 조언을 포함해야 합니다.
각 영역별 400~800자의 상세한 해석을 제공하세요.
월별 운세는 각 300~500자로 구체적인 시기, 방향, 조언을 포함하세요.
</context>

<instructions>
1. 사주팔자(연주, 월주, 일주, 시주)와 오행 분포를 기반으로 해석하세요.
2. 추상적인 문구가 아닌, 이 사주에만 해당하는 구체적인 해석을 하세요.
3. 각 섹션은 해당 영역의 강점, 주의점, 실천 조언을 포함하세요.
4. 월별 운세는 해당 월의 천간지지 흐름과 사주의 관계를 기반으로 하세요.
5. 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
</instructions>

<output_format>
{
  "version": 1,
  "sections": [
    { "id": "personality", "title": "성격과 기질", "body": "..." },
    { "id": "wealth", "title": "재물운", "body": "..." },
    { "id": "career", "title": "직업운", "body": "..." },
    { "id": "romance", "title": "연애운", "body": "..." },
    { "id": "marriage", "title": "결혼운", "body": "..." },
    { "id": "health", "title": "건강운", "body": "..." },
    { "id": "relationships", "title": "대인관계", "body": "..." },
    { "id": "family", "title": "가정운", "body": "..." },
    { "id": "academic", "title": "학업/시험운", "body": "..." },
    { "id": "travel", "title": "이동/해외운", "body": "..." },
    { "id": "advice", "title": "사주가 알려주는 조언", "body": "..." },
    { "id": "summary", "title": "종합 풀이", "body": "..." },
    {
      "id": "monthly_fortune",
      "title": "YEAR년 월별 운세",
      "year": YEAR,
      "months": [
        { "month": 1, "title": "1월", "rating": 1-5, "focus": "주력영역", "body": "..." },
        ...
        { "month": 12, "title": "12월", "rating": 1-5, "focus": "주력영역", "body": "..." }
      ]
    }
  ]
}
</output_format>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, sajuProfileId } = await req.json();

    // 1. JWT 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. 결제 검증
    const { data: payment } = await supabaseAdmin
      .from("payment_history_web")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", "paid_saju")
      .eq("status", "paid")
      .maybeSingle();

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. 예약 row 선점
    const { data: inserted } = await supabaseAdmin
      .from("paid_content")
      .insert({ user_id: userId, product_id: "paid_saju", content: {} })
      .select("id")
      .maybeSingle();

    if (!inserted) {
      // 이미 존재 — content 확인
      const { data: existing } = await supabaseAdmin
        .from("paid_content")
        .select("id, content")
        .eq("user_id", userId)
        .eq("product_id", "paid_saju")
        .maybeSingle();

      if (existing && JSON.stringify(existing.content) !== '{}') {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 빈 row → 이전 실패, 아래에서 재생성
    }

    // 4. 사주 데이터 조회
    const { data: sajuProfile } = await supabaseAdmin
      .from("saju_profiles")
      .select("*")
      .eq("id", sajuProfileId)
      .single();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, gender, birth_date")
      .eq("auth_id", userId)
      .single();

    if (!sajuProfile || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentYear = new Date().getFullYear();
    const prompt = SYSTEM_PROMPT.replaceAll("YEAR", String(currentYear));

    // 5. Claude Haiku 호출
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 16000,
        system: prompt,
        messages: [{
          role: "user",
          content: `다음 사주 데이터를 기반으로 심층 분석을 JSON으로 생성해주세요.

<user_info>
이름: ${profile.name}
성별: ${profile.gender}
생년월일: ${profile.birth_date}
</user_info>

<saju_data>
연주: ${JSON.stringify(sajuProfile.year_pillar)}
월주: ${JSON.stringify(sajuProfile.month_pillar)}
일주: ${JSON.stringify(sajuProfile.day_pillar)}
시주: ${JSON.stringify(sajuProfile.hour_pillar)}
오행: ${JSON.stringify(sajuProfile.five_elements)}
주요원소: ${sajuProfile.dominant_element}
성격특성: ${JSON.stringify(sajuProfile.personality_traits)}
연애스타일: ${sajuProfile.romance_style}
</saju_data>`
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error("[generate-paid-saju] Claude 실패:", err);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json();
    const textContent = anthropicData.content?.[0]?.text ?? "";

    // JSON 파싱
    let parsedContent;
    try {
      parsedContent = JSON.parse(textContent);
    } catch {
      // JSON 블록 추출 시도
      const match = textContent.match(/\{[\s\S]*\}/);
      if (match) {
        parsedContent = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // 6. paid_content UPDATE (예약 row 업데이트)
    const rowId = inserted?.id;
    if (rowId) {
      await supabaseAdmin
        .from("paid_content")
        .update({ content: parsedContent })
        .eq("id", rowId);
    } else {
      await supabaseAdmin
        .from("paid_content")
        .update({ content: parsedContent })
        .eq("user_id", userId)
        .eq("product_id", "paid_saju");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-paid-saju] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Supabase에 배포**

```bash
supabase functions deploy generate-paid-saju
```

또는 Supabase Dashboard → Edge Functions → New Function에서 배포.

환경변수 확인: `ANTHROPIC_API_KEY` 설정 필요.

- [ ] **Step 3: 커밋 (참조용)**

```bash
git add supabase/functions/generate-paid-saju/
git commit -m "feat: Edge Function generate-paid-saju — Haiku 4.5 사주 심층 분석"
```

---

## Task 10: Edge Function — generate-paid-gwansang

**Files:**
- Create: `supabase/functions/generate-paid-gwansang/index.ts`

- [ ] **Step 1: Edge Function 작성**

`generate-paid-saju`와 동일 구조이되:
- `product_id = "paid_gwansang"`
- `gwansang_profiles`에서 데이터 조회 (동물상, 삼정, 오관, 성격 5축)
- 프롬프트: 관상학 전문가 역할, 13개 영역 (이마/눈썹/눈/코/입/귀/턱/얼굴윤곽/성격/연애/직업/재물/종합)
- `max_tokens = 12000`
- 월별 운세 없음

시스템 프롬프트:

```
당신은 30년 경력의 관상학 전문가입니다.

<context>
고객이 유료로 구매한 심층 관상 분석 콘텐츠입니다.
무료 분석과 확실히 차별화된, 구체적이고 실용적인 조언을 포함해야 합니다.
각 영역별 400~800자의 상세한 해석을 제공하세요.
</context>

<instructions>
1. 관상의 삼정(상정/중정/하정)과 오관(눈/코/입/귀/얼굴윤곽) 데이터를 기반으로 해석하세요.
2. 추상적인 문구가 아닌, 이 사람의 얼굴 특징에만 해당하는 구체적인 해석을 하세요.
3. 각 섹션은 해당 부위가 나타내는 의미, 강점, 주의점, 실천 조언을 포함하세요.
4. 반드시 아래 JSON 형식으로만 응답하세요.
</instructions>
```

출력 형식은 spec의 4.2절 paid_gwansang JSON 구조와 동일.

(구현 코드는 generate-paid-saju를 복사 후 위 차이점만 변경)

- [ ] **Step 2: Supabase에 배포**

- [ ] **Step 3: 커밋**

```bash
git add supabase/functions/generate-paid-gwansang/
git commit -m "feat: Edge Function generate-paid-gwansang — Haiku 4.5 관상 심층 분석"
```

---

## Task 11: 최종 빌드 확인 + PR

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: /paid/[productId], /api/paid-content/* 포함

- [ ] **Step 3: 수동 테스트 체크리스트**

- [ ] toss-review 계정으로 로그인
- [ ] "더 자세한 사주 보기" CTA가 `paid_saju` productId 사용 확인
- [ ] /checkout?product=paid_saju 정상 표시
- [ ] 결제 성공 후 CTA "구매 완료" 뱃지 + 클릭 → /paid/paid_saju 이동
- [ ] /paid/paid_saju: 로딩 연출 → 콘텐츠 생성 → 13개 섹션 표시
- [ ] 월별 운세: 현재 월 기본 선택 + 탭 전환 + rating/focus 표시
- [ ] 재방문 시 즉시 콘텐츠 표시 (재생성 없음)
- [ ] 미결제 유저: /paid/paid_saju 직접 접근 → /result 리다이렉트
- [ ] 일반 유저: "준비 중" 토스트 유지

- [ ] **Step 4: feature 브랜치 + PR 생성**

```bash
git checkout -b feature/paid-content
git push -u origin feature/paid-content
gh pr create --title "feat: 유료 상세 분석 콘텐츠 (2단계)"
```
