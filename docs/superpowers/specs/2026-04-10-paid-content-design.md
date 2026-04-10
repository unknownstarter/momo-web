# 유료 상세 분석 콘텐츠 설계 (2단계)

**작성일**: 2026-04-10
**전제**: 1단계 결제 플로우 & 인프라 완료 (`2026-04-10-payment-flow-design.md`)
**범위**: 유료 콘텐츠 DB, Edge Function, 생성 API, 열람 페이지, CTA 연결, product_id 마이그레이션
**범위 밖**: 앱 인앱결제 연동 (앱 팀이 별도 진행)

---

## 1. 배경

### 무료 vs 유료

| | 무료 (기본) | 유료 (상세) |
|---|---|---|
| **사주** | `saju_profiles` 테이블 | `paid_content` 테이블 (`paid_saju`) |
| **관상** | `gwansang_profiles` 테이블 | `paid_content` 테이블 (`paid_gwansang`) |
| **생성** | 기존 Edge Function | 신규 Edge Function |
| **분량** | 10섹션, 요약 수준 | 13섹션, 각 200~400자 심층 |
| **가격** | 무료 | 500원 |
| **사용처** | 앱 + 웹 공용 | 앱 + 웹 공용 (신규) |

### 전략

- 유료 콘텐츠를 계속 늘려갈 비즈니스 모델
- `paid_content` 테이블은 앱에서도 Key로 구매/열람 가능하도록 공용 설계
- 결제 수단(웹 토스 / 앱 Key)과 콘텐츠 저장은 분리 — 해금 기준은 `paid_content`에 row 존재 여부

---

## 2. product_id 마이그레이션

1단계에서 `saju-detail` / `gwansang-detail`으로 정의했으나, 앱과의 네이밍 일관성을 위해 변경.

| 기존 (1단계) | 변경 후 |
|------------|---------|
| `saju-detail` | `paid_saju` |
| `gwansang-detail` | `paid_gwansang` |

**영향 범위:**
- `lib/constants.ts` — PRODUCTS 키 + id 변경
- `app/result/page.tsx` — productId 참조 변경
- `app/checkout/page.tsx` — query param 값 변경
- `app/api/payment/create-order/route.ts` — PRODUCTS 검증
- `app/api/payment/confirm/route.ts` — 변경 없음 (product_id 직접 참조 안 함)
- `payment_history_web` DB — **데이터 0건이므로 마이그레이션 불필요**
- 앱 — **참조 없음, 영향 0**

---

## 3. DB 설계

### 3.1 신규 테이블: `paid_content`

```sql
CREATE TABLE paid_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  product_id  text NOT NULL,          -- 'paid_saju' | 'paid_gwansang' | 미래 확장
  content     jsonb NOT NULL,          -- 상품별 다른 구조의 콘텐츠
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)          -- 유저당 상품 1개
);
```

### 3.2 RLS 정책

```sql
ALTER TABLE paid_content ENABLE ROW LEVEL SECURITY;

-- 본인 콘텐츠만 조회 (앱 + 웹 공용)
CREATE POLICY "users_select_own_paid_content" ON paid_content
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT는 RLS로 허용하지 않음
-- Edge Function 또는 서버 API에서 service_role로만 생성
```

### 3.3 앱 영향도: 없음

- 신규 테이블 추가만
- 기존 `saju_profiles`, `gwansang_profiles` 수정 없음
- 기존 Edge Function 수정 없음
- 앱 코드에 `paid_content` 참조 없음 — 앱 팀이 연동할 때 SELECT 추가

---

## 4. 콘텐츠 JSON 구조

### 4.1 paid_saju (13개 영역)

```jsonc
{
  "version": 1,
  "sections": [
    { "id": "personality", "title": "성격과 기질", "body": "200~400자 심층 해석" },
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
      "title": "2026년 월별 운세",
      "months": [
        { "month": 1, "title": "1월", "body": "200~300자 해당 월 상세 운세" },
        { "month": 2, "title": "2월", "body": "..." },
        { "month": 3, "title": "3월", "body": "..." },
        { "month": 4, "title": "4월", "body": "..." },
        { "month": 5, "title": "5월", "body": "..." },
        { "month": 6, "title": "6월", "body": "..." },
        { "month": 7, "title": "7월", "body": "..." },
        { "month": 8, "title": "8월", "body": "..." },
        { "month": 9, "title": "9월", "body": "..." },
        { "month": 10, "title": "10월", "body": "..." },
        { "month": 11, "title": "11월", "body": "..." },
        { "month": 12, "title": "12월", "body": "..." }
      ]
    }
  ]
}
```

12개 주제 섹션 + 월별 운세 1섹션(12개월 포함) = **13개 영역**.
월별 운세는 각 200~300자로 아주 자세하게.

### 4.2 paid_gwansang (13개 영역)

```jsonc
{
  "version": 1,
  "sections": [
    { "id": "forehead", "title": "이마 (천정)", "body": "200~400자 심층 해석" },
    { "id": "eyebrows", "title": "눈썹 (보수관)", "body": "..." },
    { "id": "eyes", "title": "눈 (감찰관)", "body": "..." },
    { "id": "nose", "title": "코 (심판관)", "body": "..." },
    { "id": "mouth", "title": "입 (출납관)", "body": "..." },
    { "id": "ears", "title": "귀 (채청관)", "body": "..." },
    { "id": "chin", "title": "턱 (지각)", "body": "..." },
    { "id": "face_shape", "title": "얼굴 윤곽", "body": "..." },
    { "id": "personality", "title": "관상으로 본 성격", "body": "..." },
    { "id": "romance", "title": "관상으로 본 연애운", "body": "..." },
    { "id": "career", "title": "관상으로 본 직업운", "body": "..." },
    { "id": "fortune", "title": "관상으로 본 재물운", "body": "..." },
    { "id": "summary", "title": "종합 관상 풀이", "body": "..." }
  ]
}
```

각 `body`는 200~400자 수준의 상세 해석 (무료 대비 3~5배 분량).

### 4.3 `version` 필드

콘텐츠 구조가 바뀔 때를 대비한 버전 필드. 현재는 `1`. 앱/웹 클라이언트가 파싱 시 `version`을 확인하고 렌더링 분기 가능.

---

## 5. Edge Function 설계

### 5.1 `generate-paid-saju`

**신규 Edge Function** (기존 수정 없음)

입력:
```jsonc
{
  "userId": "uuid",         // auth.users.id
  "sajuProfileId": "uuid"   // saju_profiles.id
}
```

처리:
1. `saju_profiles`에서 사주 데이터 조회 (사주, 오행, 성격 특성, 연애 스타일 등)
2. `profiles`에서 이름, 성별, 생년월일 조회
3. Claude API 호출 — 사주 데이터를 입력으로 13개 영역 심층 분석 생성
   - 시스템 프롬프트: 전문 사주 역학가 역할, 사주팔자 기반 심층 해석
   - 각 섹션 200~400자, 월별 운세는 각 200~300자
   - 응답 형식: 위 4.1 JSON 구조 강제
4. `paid_content`에 INSERT (`product_id = 'paid_saju'`, `content = 생성된 JSON`)

출력:
```jsonc
{ "success": true }
// 또는
{ "error": "에러 메시지" }
```

예상 소요 시간: 30~60초 (Claude API 호출 — 긴 출력)

### 5.2 `generate-paid-gwansang`

**신규 Edge Function** (기존 수정 없음)

입력:
```jsonc
{
  "userId": "uuid",
  "gwansangProfileId": "uuid"
}
```

처리:
1. `gwansang_profiles`에서 관상 데이터 조회 (동물상, 삼정, 오관, 성격 5축 등)
2. `profiles`에서 이름, 성별, 프로필 사진 URL 조회
3. Claude Vision API 호출 — 관상 데이터 + 사진을 입력으로 13개 영역 심층 분석 생성
   - 시스템 프롬프트: 전문 관상학자 역할, 얼굴 특징 기반 심층 해석
   - 각 섹션 200~400자
   - 응답 형식: 위 4.2 JSON 구조 강제
4. `paid_content`에 INSERT (`product_id = 'paid_gwansang'`, `content = 생성된 JSON`)

출력: 동일 (`{ success: true }` 또는 에러)

예상 소요 시간: 30~60초

### 5.3 CLAUDE.md 준수

- 기존 6개 Edge Function 수정 **없음**
- `generate-paid-saju`, `generate-paid-gwansang` **완전 신규 생성**
- 기존 테이블 읽기만 (saju_profiles, gwansang_profiles, profiles)
- 신규 테이블 쓰기만 (paid_content)

---

## 6. 웹 API & 페이지

### 6.1 콘텐츠 생성 트리거 API

**파일**: `app/api/paid-content/generate/route.ts`

```
POST /api/paid-content/generate
Body: { productId: "paid_saju" }

1. 인증 확인
2. productId 검증
3. paid_content에 이미 존재하는지 확인 → 있으면 200 (이미 생성됨)
4. payment_history_web에 paid 기록 있는지 확인 → 없으면 403 (미결제)
5. saju_profiles 또는 gwansang_profiles에서 profile ID 조회
6. Edge Function 호출 (supabase.functions.invoke)
7. 응답: { success: true } 또는 에러
```

### 6.2 콘텐츠 조회 API

**파일**: `app/api/paid-content/[productId]/route.ts`

```
GET /api/paid-content/paid_saju

1. 인증 확인
2. paid_content에서 해당 user_id + product_id 조회
3. 있으면 200 + content JSON
4. 없으면 404
```

### 6.3 열람 페이지

**파일**: `app/paid/[productId]/page.tsx` (서버 셸) + `components/paid/paid-content-view.tsx` (클라이언트)

서버 셸:
- 인증 체크 (미로그인 → 홈)
- productId 검증
- `paid_content`에서 조회 → 있으면 콘텐츠 + userId 전달
- 없으면 → `payment_history_web`에서 paid 확인
  - 미결제 → /result로 redirect
  - 결제됨 → 빈 콘텐츠 + userId 전달 (클라이언트에서 생성 트리거)

클라이언트(`PaidContentView`):
```
Props: { productId, content (null이면 생성 필요), userId, productName }

content가 있으면:
  → 바로 렌더링 (13개 섹션 카드)

content가 null이면 (결제됨 + 미생성):
  → 로딩 연출 (다크 배경, 캐릭터 GIF, 단계 메시지)
  → /api/paid-content/generate POST 호출
  → 3초 간격 폴링 (GET /api/paid-content/{productId})
  → 최대 20회 (60초)
  → 생성 완료 → 콘텐츠 렌더링으로 전환
  → 타임아웃 → "잠시 후 다시 시도해주세요" + 재시도 버튼
```

### 6.4 콘텐츠 렌더링 UI

라이트 모드 (`bg-hanji text-ink`). 로딩 연출만 다크.

구성:
1. **헤더**: ← 뒤로가기 + 상품명
2. **13개 섹션 카드**: 각 카드 = 타이틀 + body 텍스트
   - `rounded-2xl border-hanji-border bg-hanji-elevated p-4 shadow-low`
   - 섹션 간 `space-y-4`
3. **월별 운세** (paid_saju만): 12개월 탭 또는 아코디언
4. **하단**: "결과 페이지로 돌아가기" 링크

### 6.5 로딩 연출 UI

기존 `/result/loading` 패턴과 동일:
- **다크 배경** (`bg-ink-bg`) — CLAUDE.md 규칙: 분석 로딩만 다크
- 캐릭터 GIF (`/images/characters/loading_spinner.gif`)
- 단계 메시지 순환: "성격 분석 중..." → "재물운 해석 중..." → "월별 운세 생성 중..." → ...
- 진행 바 또는 단계 인디케이터

---

## 7. CTA 연결 변경

### DetailPaidCta 수정

현재 (`purchased=true` 상태):
```typescript
showToast("상세 분석 페이지를 준비 중이에요!");
```

변경 후:
```typescript
router.push(`/paid/${productId}`);
```

### 해금 기준 변경

현재: `payment_history_web`에서 `status='paid'` 체크
변경: `paid_content`에 row 존재 여부로 체크

이유: 결제 수단(웹 토스 / 앱 Key)과 무관하게, 콘텐츠가 있으면 해금.

단, 결제는 됐지만 콘텐츠 미생성 상태(결제 직후)도 처리해야 하므로:
- `paid_content`에 row 있음 → 바로 열람
- `paid_content`에 row 없음 + `payment_history_web`에 paid → 열람 페이지에서 생성 트리거
- 둘 다 없음 → 미구매, checkout으로 이동

---

## 8. 파일 변경 요약

### 신규 생성
| 파일 | 역할 |
|------|------|
| `app/paid/[productId]/page.tsx` | 서버 셸 (인증/해금 체크) |
| `components/paid/paid-content-view.tsx` | 클라이언트 뷰어 (생성 트리거 + 폴링 + 렌더링) |
| `components/paid/paid-loading.tsx` | 로딩 연출 (다크 배경 + 단계 메시지) |
| `components/paid/paid-section-card.tsx` | 섹션 카드 컴포넌트 |
| `components/paid/monthly-fortune.tsx` | 월별 운세 컴포넌트 (paid_saju 전용) |
| `app/api/paid-content/generate/route.ts` | 생성 트리거 API |
| `app/api/paid-content/[productId]/route.ts` | 콘텐츠 조회 API |
| Supabase: `generate-paid-saju` Edge Function | 사주 심층 분석 AI 생성 |
| Supabase: `generate-paid-gwansang` Edge Function | 관상 심층 분석 AI 생성 |

### 수정
| 파일 | 변경 |
|------|------|
| `lib/constants.ts` | product_id: `saju-detail` → `paid_saju`, `gwansang-detail` → `paid_gwansang` |
| `app/result/page.tsx` | productId 참조 변경 + 해금 기준을 paid_content로 변경 |
| `components/result/detail-paid-cta.tsx` | purchased 클릭 → `/paid/{productId}` 이동 |
| `app/checkout/page.tsx` | product query param 값 변경 |
| `components/checkout/checkout-form.tsx` | 변경 없음 (productId는 props로 받으므로) |

### Supabase (신규만)
- `paid_content` 테이블 생성 + RLS (SELECT only)
- Edge Function 2개 신규 생성

### 미변경 (앱 보호)
- `saju_profiles`, `gwansang_profiles` — 읽기만
- 기존 6개 Edge Function — 수정 없음
- `purchases`, `user_keys`, `key_transactions` — 미접촉
- Storage 정책 — 변경 없음

---

## 9. Edge Function 생성 시 주의

- Edge Function은 Supabase Dashboard 또는 CLI로 배포
- 웹 코드와 별도 배포 사이클
- 환경변수: `ANTHROPIC_API_KEY` (Claude API 키) — Supabase Edge Function 환경에 설정 필요
- 기존 `generate-saju-insight`가 이미 Claude를 사용하므로, 동일한 API 키/패턴 재사용 가능
