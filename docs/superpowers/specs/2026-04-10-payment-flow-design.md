# 결제 플로우 & 인프라 설계

**작성일**: 2026-04-10
**리뷰 반영**: 프론트엔드/백엔드/UX/보안 전문가 리뷰 (2026-04-10)
**범위**: 결제 UI 플로우, DB 테이블, 결제 내역, 햄버거 메뉴 통합
**범위 밖**: 유료 상세 분석 콘텐츠 생성 & 열람 페이지 (2단계에서 별도 설계)

---

## 1. 배경

- 웹에서 사주 상세(500원), 관상 상세(500원) 유료 콘텐츠 판매
- PG: 토스페이먼츠 결제위젯 SDK v2
- 유저당 상품별 1회 구매 (최대 2건)
- 앱과 완전 분리 — 앱의 Key 시스템, `purchases`, `user_keys` 등 기존 테이블/정책 일절 미접촉

---

## 2. 유저 플로우

```
/result 페이지
  └ "더 자세한 사주 보기" CTA 클릭
      → [1] /checkout?product=saju-detail 주문 확인 페이지
          주문 상품 요약 카드
          상세 설명 (13개 영역 심층 분석)
          결제 금액: 500원
          ☐ 주문 내용을 확인하였으며, 결제에 동의합니다.
          토스 결제위젯 (즉시 렌더, 체크 전에는 결제 버튼만 disabled)
          → [500원 결제하기] 버튼
      → [2] 결제하기 클릭
          → 서버 API로 pending 레코드 생성 (orderId 서버 생성)
          → 토스 requestPayment 호출
      → [3] 토스 결제 처리
          → 성공: /api/payment/confirm → DB 기록 → /result?payment=success
          → 실패: /result?payment=fail
      → [4] /result에서 해당 CTA가 "상세 분석 보기 →" 링크로 변환

이미 구매한 유저 재방문:
  → /result 로드 시 payment_history_web 조회
  → 구매 완료 상품 → CTA 카드가 "구매 완료 · 상세 분석 보기 →" 링크로 변환
  → /checkout 직접 접근 시 이미 구매 완료 → /result로 리다이렉트 + 토스트

콘텐츠 2단계 완료 전:
  → 결제 기능은 테스트 계정(화이트리스트)에서만 활성화
  → 일반 유저에게는 기존 "준비 중" 토스트 유지
  → 2단계 콘텐츠 페이지 완성 후 전체 공개
```

---

## 3. DB 설계

### 3.1 신규 테이블: `payment_history_web`

```sql
CREATE TABLE payment_history_web (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  product_id      text NOT NULL,        -- 'saju-detail' | 'gwansang-detail'
  order_id        text NOT NULL UNIQUE,  -- 서버 생성 UUID v4
  payment_key     text,                  -- 토스 paymentKey (승인 후 저장)
  amount          integer NOT NULL,      -- 원 단위
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'refunded'
  created_at      timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz           -- 승인 완료 시각
);

-- 유저당 상품 중복 구매 방지 (paid 상태인 것만)
CREATE UNIQUE INDEX uq_user_product_paid
  ON payment_history_web(user_id, product_id)
  WHERE status = 'paid';

-- status 값 제한
ALTER TABLE payment_history_web
  ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'paid', 'refunded'));

-- 금액 양수 제한
ALTER TABLE payment_history_web
  ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);
```

### 3.2 RLS 정책

```sql
ALTER TABLE payment_history_web ENABLE ROW LEVEL SECURITY;

-- 본인 기록만 조회
CREATE POLICY "users_select_own_payments" ON payment_history_web
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 본인 기록만 생성, pending 상태로만 (paid 직접 삽입 방지)
CREATE POLICY "users_insert_own_payments" ON payment_history_web
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- UPDATE는 RLS로 허용하지 않음
-- 결제 승인 API에서 service_role(서버)로 처리
```

### 3.3 앱 영향도: 없음

- 신규 테이블 추가만 — 기존 테이블 수정 없음
- 기존 RLS 정책 변경 없음
- Edge Function 수정 없음
- Storage 정책 변경 없음

---

## 4. 보안 설계

### 4.1 가격 무결성

- 상품 정가는 `lib/constants.ts`의 `PRODUCTS` 상수에서 관리 (서버 권위)
- pending INSERT 시 서버 API에서 `PRODUCTS[productId].amount`로 금액 결정
- 결제 승인 API에서 DB의 `amount`만 사용, 클라이언트 query param `amount` 무시
- 토스 승인 API에도 DB에서 조회한 금액만 전달

### 4.2 동시성 방어 (더블 컨펌 방지)

```sql
-- 결제 승인 API의 첫 단계: 원자적 잠금
UPDATE payment_history_web
SET status = 'processing'
WHERE order_id = $1 AND status = 'pending'
RETURNING *;
-- 반환값 없으면 → 이미 처리됨, 즉시 abort
-- 반환값 있으면 → 토스 승인 API 호출 진행
-- 토스 성공 → status = 'paid'
-- 토스 실패 → status = 'pending' 복원 (재시도 허용)
```

### 4.3 orderId 서버 생성

- 클라이언트에서 orderId 생성하지 않음 (예측 가능성 차단)
- `/api/payment/create-order` 서버 API에서 `crypto.randomUUID()` 생성
- 결제 승인 시 orderId의 소유권(user_id) 검증

### 4.4 pending 레코드 정리

- 생성 후 30분 경과한 pending 레코드는 만료 처리
- `/checkout` 진입 시 기존 pending 있으면 재사용 (새로 만들지 않음)

---

## 5. 페이지 & 컴포넌트

### 5.1 주문 확인 & 결제 페이지

**파일**: `app/checkout/page.tsx` (클라이언트 컴포넌트)

구성 (위에서 아래):
1. **헤더**: ← 뒤로가기 + "주문 확인 및 결제"
2. **주문 상품 카드**: 상품명 + 간략 설명 (rounded-2xl, bg-hanji-elevated)
3. **상세 설명 카드**: "13가지 영역으로 나누어 사주를 아주 자세히 풀어드려요" + 영역 목록
4. **결제 금액 카드**: "최종 결제 금액" + 500원
5. **동의 체크박스**: "☐ 위 주문 내용을 확인하였으며, 결제에 동의합니다."
6. **토스 결제위젯 영역**: 즉시 렌더링 (결제수단 + 약관)
7. **CTA 하단 고정**: [500원 결제하기] (체크 완료 전 disabled, 결제 중 로딩 상태)

진입 시:
- `product` 쿼리 파라미터로 상품 식별
- 로그인 확인 (미로그인 → 랜딩으로)
- 이미 구매 완료 상태 → /result로 리다이렉트 + "이미 구매한 상품이에요" 토스트

결제 요청 시:
1. 결제 버튼 disabled + 로딩 표시 (더블클릭 방지)
2. `/api/payment/create-order` 호출 → orderId 수신 (서버 생성)
3. `widgets.requestPayment()` 호출 (successUrl, failUrl 포함)

### 5.2 주문 생성 API (신규)

**파일**: `app/api/payment/create-order/route.ts`

```
POST /api/payment/create-order
Body: { productId: "saju-detail" }

1. 인증 확인 (세션에서 user_id)
2. productId가 PRODUCTS에 존재하는지 검증
3. 이미 paid 상태인 기록 있는지 확인 → 있으면 409 Conflict
4. 기존 pending 레코드 있으면 재사용 (orderId 반환)
5. 없으면 신규 생성: orderId = crypto.randomUUID(), amount = PRODUCTS[productId].amount
6. 응답: { orderId, amount }
```

### 5.3 결제 승인 API (기존 수정)

**파일**: `app/api/payment/confirm/route.ts`

```
GET /api/payment/confirm?paymentKey=...&orderId=...&amount=...

1. orderId로 원자적 잠금: UPDATE status='processing' WHERE status='pending' RETURNING *
2. 반환 없으면 → /result?payment=already 리다이렉트
3. DB의 amount로 토스 승인 API 호출 (query param amount 무시)
4. 성공 → UPDATE: status='paid', payment_key=..., paid_at=now()
5. 실패 → UPDATE: status='pending' 복원 (재시도 허용)
6. /result?payment=success 또는 /result?payment=fail 리다이렉트
```

### 5.4 CTA 변환 (detail-paid-cta.tsx 재작성)

기존 인라인 토스 위젯 코드 **전체 제거**. 단순한 CTA 카드로 변환:

- `purchased=false` → 클릭 시 `/checkout?product={productId}` 이동
- `purchased=true` → "구매 완료 · 상세 분석 보기 →" 링크 표시
  - 2단계 콘텐츠 페이지 완성 전: "곧 오픈됩니다" + 비활성
  - 2단계 완성 후: 유료 콘텐츠 페이지 링크

### 5.5 결제 내역 페이지

**파일**: `app/payment-history/page.tsx`

- `payment_history_web`에서 본인 기록 조회
- 리스트: 상품명, 결제일, 금액, 상태(결제완료/환불)
- 빈 상태: "아직 결제 내역이 없어요"
- 디자인: 기존 디자인 시스템 (bg-hanji, 카드 리스트)

### 5.6 햄버거 메뉴 확장

**파일**: `components/result/result-menu.tsx` 수정

변경:
- `/result` 페이지에도 `ResultMenu` 추가 (현재 `/result/detail`에만 있음)
- 메뉴 항목 순서:
  1. **결제 내역** ← 신규 (→ `/payment-history`)
  2. 의견 보내기 (기존)
  3. 로그아웃 (기존)
  4. 회원 탈퇴 (기존)

---

## 6. 상품 정의

| product_id | 상품명 | 금액 | 설명 |
|------------|--------|------|------|
| `saju-detail` | 더 자세한 사주 보기 | 500원 | 13가지 영역 심층 사주 분석 |
| `gwansang-detail` | 더 자세한 관상 보기 | 500원 | 13가지 영역 심층 관상 분석 |

상품 정보는 코드 상수로 관리 (`lib/constants.ts`에 `PRODUCTS` 추가).
**금액은 이 상수만이 권위 있는 소스** — DB INSERT, 토스 승인 모두 여기서 참조.

---

## 7. 디자인 원칙

- 모바일 고정 레이아웃 (`max-w-[430px]`) 유지
- 라이트 모드 (`bg-hanji text-ink`) — 다크는 로딩 페이지만
- CTA 하단 고정 (`shrink-0`)
- 카드: `rounded-2xl border-hanji-border bg-hanji-elevated p-4 shadow-low`
- 버튼: `bg-brand text-white rounded-xl py-3.5`
- 간격: `px-5` (페이지), `p-4` (카드 내부), 섹션 간 `space-y-6`
- 체크박스: brand 컬러 활용
- 토스 결제위젯: 즉시 렌더, 동의 체크 전에는 결제 버튼만 disabled

---

## 8. 파일 변경 요약

### 신규 생성
- `app/checkout/page.tsx` — 주문 확인 & 결제 페이지
- `app/api/payment/create-order/route.ts` — 주문 생성 API (orderId 서버 생성)
- `app/payment-history/page.tsx` — 결제 내역 페이지

### 수정
- `app/api/payment/confirm/route.ts` — 원자적 잠금 + DB 금액 사용 + 소유권 검증
- `app/result/page.tsx` — ResultMenu 추가 + 구매 상태 조회 + CTA 변환
- `components/result/detail-paid-cta.tsx` — 인라인 위젯 제거, purchased prop 추가, 링크/checkout 분기
- `components/result/result-menu.tsx` — "결제 내역" 메뉴 항목 추가
- `lib/constants.ts` — PRODUCTS 상수 추가

### Supabase (신규만)
- `payment_history_web` 테이블 생성 (CHECK 제약 포함)
- RLS 정책 2개 (SELECT, INSERT with status='pending' 강제)

### 미변경 (앱 보호)
- 기존 테이블 (profiles, saju_profiles, gwansang_profiles, purchases, user_keys 등)
- 기존 RLS 정책
- Edge Function
- Storage 정책
