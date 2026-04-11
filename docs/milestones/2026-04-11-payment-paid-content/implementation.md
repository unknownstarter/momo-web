# 구현 내역

**작업 기간**: 2026-04-10 ~ 2026-04-11

---

## 1. Supabase DB 변경 (신규 테이블만, 기존 미변경)

### 신규 테이블 1: `payment_history_web`
웹 전용 결제 기록 테이블. 토스페이먼츠 결제 내역 저장.

```sql
CREATE TABLE payment_history_web (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  product_id      text NOT NULL,        -- 'paid_saju' | 'paid_gwansang'
  order_id        text NOT NULL UNIQUE, -- 서버 생성 UUID v4
  payment_key     text,                 -- 토스 paymentKey (승인 후)
  amount          integer NOT NULL,     -- 원 단위
  status          text NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz
);

CREATE UNIQUE INDEX uq_user_product_paid
  ON payment_history_web(user_id, product_id)
  WHERE status = 'paid';

ALTER TABLE payment_history_web
  ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'paid', 'refunded'));
ALTER TABLE payment_history_web
  ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);

-- RLS
CREATE POLICY "users_select_own_payments" ON payment_history_web
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_payments" ON payment_history_web
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
```

### 신규 테이블 2: `paid_content` (앱+웹 공용)
유료 콘텐츠 저장 테이블. JSONB 구조로 향후 상품 확장 가능.

```sql
CREATE TABLE paid_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  product_id  text NOT NULL,          -- 'paid_saju' | 'paid_gwansang' | 미래 확장
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- RLS (앱+웹 공용, SELECT only — INSERT/UPDATE는 service_role로만)
CREATE POLICY "users_select_own_paid_content" ON paid_content
  FOR SELECT TO authenticated USING (user_id = auth.uid());
```

### 기존 함수 수정: `fn_update_matchable`
PG 심사용 테스트 계정을 매칭풀에서 제외하기 위해 수정.

```sql
-- 2026-04-10: 토스페이먼츠 PG 심사용 테스트 계정 제외 추가
IF NEW.auth_id = '2c1b6189-506c-4a48-8d72-d8204fed2551'::uuid THEN
  NEW.is_matchable := false;
  RETURN NEW;
END IF;
```

기존 카카오페이 제외(`bc03ecc4-ee50-429a-b6f9-817186c4ec49`)와 동일 패턴으로 토스 추가. 일반 유저 매칭 로직은 불변.

---

## 2. Supabase Edge Functions

### 신규 Edge Function 1: `generate-paid-saju`
**기존 6개 함수 미변경, 신규 생성.**

입력: `{ userId, sajuProfileId }`
처리:
1. 결제 검증 (`payment_history_web` 에서 paid 확인)
2. 예약 row 선점 (`INSERT ... ON CONFLICT DO NOTHING`)
3. `saju_profiles` + `profiles` 조회
4. Claude Haiku 4.5 호출 (XML 태그 + 시스템 프롬프트)
5. `paid_content` UPDATE (content = 생성된 JSON)

출력 JSON (13개 영역):
- 12개 주제 섹션: personality, wealth, career, romance, marriage, health, relationships, family, academic, travel, advice, summary (각 400~800자)
- 1개 월별 운세: 12개월 (각 300~500자 + rating 1~5 + focus)

### 신규 Edge Function 2: `generate-paid-gwansang`
입력: `{ userId, gwansangProfileId }`
처리 동일. `gwansang_profiles` 조회.

출력 JSON (13개 영역):
- forehead, eyebrows, eyes, nose, mouth, ears, chin, face_shape, personality, romance, career, fortune, summary (각 400~800자)

---

## 3. 웹 파일 변경

### 신규 생성 파일
| 파일 | 역할 |
|------|------|
| `app/api/payment/create-order/route.ts` | 주문 생성 API (orderId 서버 생성, 30분 TTL) |
| `app/api/paid-content/generate/route.ts` | 콘텐츠 생성 트리거 (레이트 리밋 + 결제 검증) |
| `app/api/paid-content/[productId]/route.ts` | 콘텐츠 조회 (200/202/404) |
| `app/checkout/page.tsx` | 주문 확인 서버 셸 (인증/구매 체크) |
| `components/checkout/checkout-form.tsx` | 결제 폼 클라이언트 (토스 위젯) |
| `app/payment-history/page.tsx` | 결제 내역 페이지 |
| `app/paid/[productId]/page.tsx` | 유료 콘텐츠 열람 서버 셸 |
| `components/paid/paid-content-view.tsx` | 클라이언트 뷰어 (폴링 + 렌더링) |
| `components/paid/paid-loading.tsx` | 로딩 연출 (단계 메시지) |
| `components/paid/paid-section-card.tsx` | 섹션 카드 |
| `components/paid/monthly-fortune.tsx` | 월별 운세 (가로 스크롤 탭) |
| `supabase/functions/generate-paid-saju/index.ts` | Edge Function (참조용) |
| `supabase/functions/generate-paid-gwansang/index.ts` | Edge Function (참조용) |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `lib/constants.ts` | PRODUCTS (paid_saju, paid_gwansang) + ROUTES (CHECKOUT, PAYMENT_HISTORY, PAID) |
| `app/api/payment/confirm/route.ts` | 원자적 잠금 + DB 금액 사용 + 소유권 검증 |
| `app/result/page.tsx` | ResultMenu + 구매 상태 조회 (payment_history_web + paid_content 합집합) |
| `components/result/detail-paid-cta.tsx` | 인라인 위젯 제거, purchased → /paid/{productId} |
| `components/result/result-menu.tsx` | "결제 내역" 메뉴 항목 추가 |
| `app/test-login/page.tsx` | toss-review 계정 주석 추가 |
| `tsconfig.json` | supabase/functions 제외 (Deno 런타임) |
| `package.json` | `@portone/browser-sdk` 제거, `@tosspayments/tosspayments-sdk` 추가 |

---

## 4. API 엔드포인트 요약

| 엔드포인트 | 메서드 | 역할 |
|-----------|-------|------|
| `/api/payment/create-order` | POST | 주문 생성 (orderId 서버 생성) |
| `/api/payment/confirm` | GET | 토스 결제 승인 (리다이렉트 콜백) |
| `/api/paid-content/generate` | POST | 유료 콘텐츠 생성 트리거 (레이트 리밋) |
| `/api/paid-content/[productId]` | GET | 유료 콘텐츠 조회 (200/202/404) |

---

## 5. 페이지 플로우

```
/result
  └ "더 자세한 사주 보기" 클릭
    → /checkout?product=paid_saju (서버 인증/구매 체크)
      → 토스 결제위젯 (카카오/네이버/토스페이/카드)
      → 결제 성공 → /api/payment/confirm
        → DB 기록 + 토스 승인 API
        → /result?payment=success
    → CTA "구매 완료 · 상세 분석 보기 →" 변환
    → 클릭 → /paid/paid_saju
      → 서버 셸: paid_content 조회
        → 있음: 바로 렌더링 (13개 섹션)
        → 없음 + paid: 클라이언트에서 생성 트리거
          → /api/paid-content/generate POST
          → Edge Function 호출 (Claude Haiku)
          → 3초 간격 폴링 (최대 60초)
          → 완료 → 렌더링
```

---

## 6. 테스트 계정

| 이메일 | 비밀번호 | 용도 |
|--------|---------|------|
| kakaopay-review@dropdown.xyz | MoMo-KP-Test-2026!x9Hq | 카카오페이 PG 심사 |
| toss-review@dropdown.xyz | MoMo-TP-Test-2026!k7Rw | 토스페이먼츠 PG 심사 |
| hh109a@gmail.com | (노아 OAuth) | 개발자 테스트 |

모든 테스트 계정은 `fn_update_matchable` 트리거에서 매칭풀 제외.

---

## 7. 환경 변수

### Vercel
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` — 토스페이먼츠 결제위젯 클라이언트 키 (test_gck_...)
- `TOSS_SECRET_KEY` — 토스페이먼츠 시크릿 키 (test_gsk_...)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (서버 전용)
- 기존 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 유지

### Supabase Edge Functions
- `ANTHROPIC_API_KEY` — Claude API 키 (신규 Edge Function 2개용)
- 기존 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 유지
