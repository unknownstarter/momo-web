# ~~결제 연동 — 포트원 V2 + 카카오페이 (500원)~~ (DEPRECATED)

> **⚠️ DEPRECATED**: 이 문서는 초기 설계 문서입니다. 포트원/이니시스 → **토스페이먼츠 결제위젯 SDK v2**로 전환 완료.
> 현행 결제 구현은 [`docs/milestones/2026-04-11-payment-paid-content/`](../milestones/2026-04-11-payment-paid-content/README.md) 참조.

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| 결제 금액 | **500원** (사주 + 관상 통합) |
| PG사 | 카카오페이 (1순위), 토스페이 (2순위), 일반 카드 (3순위) |
| 결제 SDK | 포트원(PortOne) V2 |
| 최소 결제금액 | 카카오페이 100원, 토스페이 100원 → **500원 문제 없음** |

---

## 2. 사전 준비

### 필수 계정
1. **포트원 계정** 생성 → [portone.io](https://portone.io)
2. **사업자등록증** 필요 (PG 가맹 심사)
3. 포트원에서 카카오페이 PG 가맹 신청
4. API 키 발급: `V2_API_KEY`, `STORE_ID`, `CHANNEL_KEY`

### 환경변수
```env
NEXT_PUBLIC_PORTONE_STORE_ID=<store-id>
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=<channel-key>
PORTONE_V2_API_SECRET=<v2-api-secret>   # 서버사이드 전용
```

---

## 3. 클라이언트 결제 요청

### 설치
```bash
npm install @portone/browser-sdk
```

### 결제 트리거
```typescript
import PortOne from '@portone/browser-sdk/v2'

async function requestPayment(profileId: string) {
  const paymentId = `momo_${profileId}_${Date.now()}`

  const response = await PortOne.requestPayment({
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
    paymentId,
    orderName: 'momo 사주 & 관상 분석',
    totalAmount: 500,
    currency: 'KRW',
    payMethod: 'EASY_PAY',         // 간편결제 (카카오페이)
    customer: {
      customerId: profileId,
    },
    redirectUrl: `${window.location.origin}/payment/complete`,
  })

  if (response?.code) {
    // 결제 실패
    console.error(response.message)
    return
  }

  // 서버사이드 검증
  await verifyPayment(paymentId)
}
```

---

## 4. 서버사이드 검증

### API Route (`app/api/payment/verify/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { paymentId, profileId } = await request.json()

  // 포트원 API로 결제 상태 확인
  const res = await fetch(
    `https://api.portone.io/v2/payments/${paymentId}`,
    {
      headers: {
        Authorization: `PortOne ${process.env.PORTONE_V2_API_SECRET}`,
      },
    }
  )
  const payment = await res.json()

  // 검증
  if (payment.status !== 'PAID' || payment.amount.total !== 500) {
    return NextResponse.json({ error: '결제 검증 실패' }, { status: 400 })
  }

  // DB에 결제 기록 저장
  const supabase = createServiceClient() // service_role key 사용
  await supabase.from('payments').insert({
    profile_id: profileId,
    transaction_id: paymentId,
    amount: 500,
    status: 'completed',
    payment_method: payment.method?.type || 'EASY_PAY',
  })

  return NextResponse.json({ success: true })
}
```

---

## 5. 결제 UX 흐름

```
온보딩 완료
  → 결제벽 페이지
    ┌─────────────────────────────┐
    │  ✨ 당신의 사주에           │
    │  숨겨진 비밀이 있어요       │
    │                             │
    │  [사주 결과 프리뷰 블러]    │
    │                             │
    │  ~~3,000원~~ 500원          │
    │  런칭 특별가                │
    │                             │
    │  [카카오페이로 결제하기]    │← CTA 버튼
    │                             │
    │  카카오페이 · 토스페이 · 카드│
    └─────────────────────────────┘
  → 카카오페이 결제 (원탭)
  → 서버 검증
  → 분석 로딩 (10초)
  → 결과 페이지
```

---

## 6. 수수료 구조

| 항목 | 비율/금액 | 건당 (500원 기준) |
|------|----------|-----------------|
| PG 수수료 (카카오페이) | ~3.3% | ~17원 |
| 포트원 수수료 | 0.5% | ~3원 |
| VAT (PG 수수료의 10%) | ~0.33% | ~2원 |
| **실수령** | | **~478원** |

---

## 7. 주의사항

- **사업자등록증 없이는 PG 가맹 불가** — 가장 먼저 준비
- 테스트 모드에서 먼저 개발 → 라이브 전환은 심사 완료 후
- 결제 완료 후 **반드시 서버사이드 검증** (클라이언트 응답만 믿지 않음)
- 환불 정책: 결과 미노출 시 전액 환불 (포트원 API `cancel`)
- 결제 실패 시 재시도 UI 제공 (무한 로딩 방지)
