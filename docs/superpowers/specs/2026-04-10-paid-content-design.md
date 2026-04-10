# 유료 상세 분석 콘텐츠 설계 (2단계)

**작성일**: 2026-04-10
**리뷰 반영**: 프론트엔드/백엔드/UX/보안/비용 전문가 리뷰 (2026-04-10)
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
| **분량** | 10섹션, 요약 수준 | 13섹션, 각 **400~800자** 심층 |
| **가격** | 무료 | 500원 |
| **AI 모델** | Claude (기존) | **Claude Haiku 4.5** (비용 최적화) |
| **사용처** | 앱 + 웹 공용 | 앱 + 웹 공용 (신규) |

### 전략

- 유료 콘텐츠를 계속 늘려갈 비즈니스 모델
- `paid_content` 테이블은 앱에서도 Key로 구매/열람 가능하도록 공용 설계
- 결제 수단(웹 토스 / 앱 Key)과 콘텐츠 저장은 분리 — 해금 기준은 `paid_content`에 row 존재 여부

---

## 2. product_id 마이그레이션

1단계에서 `saju-detail` / `gwansang-detail`으로 정의했으나 변경.

| 기존 (1단계) | 변경 후 |
|------------|---------|
| `saju-detail` | `paid_saju` |
| `gwansang-detail` | `paid_gwansang` |

**영향 범위 (모두 원자적으로 동시 변경):**
- `lib/constants.ts` — PRODUCTS 키 + id 변경
- `app/result/page.tsx` — productId 참조 + purchasedProducts 체크
- `app/checkout/page.tsx` — query param 값 + paid_content 해금 체크 추가
- `app/api/payment/create-order/route.ts` — PRODUCTS 검증
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
-- Edge Function에서 service_role로만 생성
```

### 3.3 DB 용량 분석

| 유저 수 | 최대 row (유저당 2건) | 총 용량 |
|--------|---------------------|---------|
| 1,000명 | 2,000건 | ~150 MB |
| 10,000명 | 20,000건 | ~1.5 GB |

- paid_saju 1건 ≈ 47 KB, paid_gwansang 1건 ≈ 30 KB
- Supabase Pro 플랜 8 GB 포함 — **10,000명까지 여유**
- PostgreSQL TOAST가 대형 JSONB 자동 압축

### 3.4 앱 영향도: 없음

- 신규 테이블 추가만 — 기존 테이블 수정 없음
- 기존 RLS 정책 변경 없음
- 기존 Edge Function 수정 없음
- 앱 코드에 `paid_content` 참조 없음

---

## 4. 콘텐츠 JSON 구조

### 4.1 paid_saju (13개 영역)

```jsonc
{
  "version": 1,
  "sections": [
    { "id": "personality", "title": "성격과 기질", "body": "400~800자 심층 해석" },
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
      "title": "월별 운세",
      "year": 2026,
      "months": [
        { "month": 1, "title": "1월", "rating": 4, "focus": "재물", "body": "300~500자 상세 운세" },
        { "month": 2, "title": "2월", "rating": 3, "focus": "연애", "body": "..." },
        ...
        { "month": 12, "title": "12월", "rating": 5, "focus": "성장", "body": "..." }
      ]
    }
  ]
}
```

- 12개 주제 섹션 (각 **400~800자**) + 월별 운세 1섹션 (12개월, 각 **300~500자**) = **13개 영역**
- 월별 운세에 `rating`(1~5), `focus`(주력 영역), `body`(상세 해석) 구조화
- `year` 필드는 Edge Function에서 현재 연도를 동적 주입 (하드코딩 금지)

### 4.2 paid_gwansang (13개 영역)

```jsonc
{
  "version": 1,
  "sections": [
    { "id": "forehead", "title": "이마 (천정)", "body": "400~800자 심층 해석" },
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

각 `body`는 **400~800자** (무료 대비 5~10배 분량).

### 4.3 `version` 필드

콘텐츠 구조가 바뀔 때를 대비. 현재 `1`. 앱/웹 클라이언트 파싱 시 `version` 확인 후 렌더링 분기 가능.

---

## 5. AI 모델 & 프롬프트 엔지니어링

### 5.1 모델 선택: Claude Haiku 4.5

| 항목 | Haiku 4.5 | Sonnet | Opus |
|------|-----------|--------|------|
| Input | $1/M tokens | $3/M | $15/M |
| Output | $5/M tokens | $15/M | $75/M |
| paid_saju 원가 | **~86원** | ~270원 | ~1,340원 |
| paid_gwansang 원가 | **~57원** | ~170원 | ~870원 |
| 500원 매출 대비 마진 | **83~88%** | 44~65% | 적자 |

**Haiku로 확정.** 프롬프트 캐싱 적용 시 시스템 프롬프트 90% 할인 → 원가 추가 절감.

### 5.2 프롬프트 설계 원칙

Anthropic 공식 가이드 기반, Haiku 품질 극대화 전략:

**1) XML 태그로 구조화**
```xml
<role>30년 경력의 사주 역학 전문가</role>
<context>고객이 500원을 지불하고 심층 분석을 요청했습니다.</context>
<saju_data>{{사주 데이터 JSON}}</saju_data>
<instructions>각 영역별 400~800자 심층 해석. 구체적이고 실용적인 조언 포함.</instructions>
<output_format>{{JSON 스키마}}</output_format>
```

**2) Few-shot 예제 (3~5개)**
원하는 품질의 실제 출력 예시를 `<examples>` 태그로 제공. Haiku는 예제를 충실히 모방하므로 가장 강력한 품질 보장 수단.

**3) 맥락과 동기 부여**
단순 지시 대신 "왜" 이 해석이 중요한지 설명:
- "고객이 유료로 구매한 콘텐츠이므로 무료 분석과 확실히 차별화되어야 합니다"
- "각 영역에서 구체적인 시기, 방향, 조언을 포함해주세요"

**4) 프롬프트 캐싱 활용**
시스템 프롬프트(역할 + 예시 + 출력 형식)는 모든 유저에게 동일 → Anthropic 프롬프트 캐싱으로 입력 비용 90% 절감. 유저별로 다른 부분(사주 데이터)만 새로 전송.

**5) max_tokens 제한**
- paid_saju: `max_tokens = 16000` (12섹션 + 12개월)
- paid_gwansang: `max_tokens = 12000` (13섹션)
- 비용 통제 + 출력 일관성 확보

**6) JSON 출력 강제**
응답 형식을 명시적으로 지정하고, `<output_format>` 태그에 정확한 JSON 스키마 제공. Haiku는 구조가 명확할수록 형식 준수율이 높음.

---

## 6. Edge Function 설계

### 6.1 보안 & 인증 (CRITICAL)

Edge Function은 **반드시 호출자를 인증**해야 함:
- JWT Authorization 헤더에서 `auth.uid()` 추출
- `userId` 파라미터와 JWT의 uid 일치 확인
- 불일치 시 401 반환
- 추가로 `payment_history_web`에서 해당 유저의 paid 기록 **독립 검증** (웹 API의 체크에 의존하지 않음)

### 6.2 멱등성 (CRITICAL) — 예약 row 선점 방식

동시 요청 시 Claude 2중 호출을 방지하기 위해 **예약 row를 먼저 INSERT**:

```
순서:
(1) INSERT INTO paid_content (user_id, product_id, content) VALUES ($1, $2, '{}')
    ON CONFLICT (user_id, product_id) DO NOTHING
    RETURNING id;
(2) 반환값 없음(이미 존재) → SELECT content → 비어있으면 생성 중, 차있으면 완료 → 즉시 반환
(3) 반환값 있음(선점 성공) → Claude 호출 → UPDATE content = 생성된 JSON
```

이렇게 하면:
- 첫 요청이 빈 row를 선점 → Claude 호출은 1번만
- 동시 두 번째 요청은 INSERT 실패 → 기존 row 확인 → 대기/반환
- Claude 실패 시: 빈 row(`content = '{}'`) 남음 → 재방문 시 빈 content 감지 → 재생성 트리거

### 6.3 실패 복구

예약 row 방식에서는 Claude 실패 시 빈 row(`content = '{}'`)가 남음:
- 재방문 시 빈 content 감지 → UPDATE로 재생성 (INSERT 불필요)
- **재생성 횟수 제한**: 빈 row에 `retry_count` 필드 불필요 — generate API의 per-user 레이트 리밋(1분 1회)이 무한 호출 방지
- 모든 생성 경로가 generate API를 경유하므로 서버 셸 직접 트리거 없음 — 레이트 리밋 우회 불가
- Claude 성공 → UPDATE 실패: 3회 재시도 (1s, 2s, 4s 백오프) → 최종 실패 시 에러 반환

### 6.4 `generate-paid-saju`

**신규 Edge Function** (기존 수정 없음)

입력:
```jsonc
{
  "userId": "uuid",
  "sajuProfileId": "uuid"
}
```

처리:
1. JWT에서 `auth.uid()` 추출 + userId 일치 확인
2. `payment_history_web`에서 paid 기록 확인 → 없으면 403 (**결제 검증 최우선**)
3. `paid_content`에 예약 row INSERT ON CONFLICT → 이미 있으면 content 확인
   - content 비어있지 않음(`!= '{}'`) → 이미 생성 완료, `{ success: true }`
   - content 비어있음(`= '{}'`) → 이전 생성 실패, step 5로 진행
   - 새로 INSERT 성공 → step 4로 진행
4. `saju_profiles`에서 사주 데이터 조회 (사주, 오행, 성격 특성, 연애 스타일 등)
5. `profiles`에서 이름, 성별, 생년월일 조회
6. **Claude Haiku 4.5** API 호출 — 구조화된 프롬프트로 13개 영역 심층 분석 생성
7. `paid_content` UPDATE content = 생성된 JSON (예약 row 업데이트)
8. 응답: `{ success: true }`

### 6.5 `generate-paid-gwansang`

**신규 Edge Function** (기존 수정 없음)

입력:
```jsonc
{
  "userId": "uuid",
  "gwansangProfileId": "uuid"
}
```

처리:
1. JWT에서 `auth.uid()` 추출 + userId 일치 확인
2. `payment_history_web`에서 paid 기록 확인 → 없으면 403 (**결제 검증 최우선**)
3. `paid_content`에 예약 row INSERT ON CONFLICT → 이미 있으면 content 확인
   - content 비어있지 않음 → 이미 생성 완료, `{ success: true }`
   - content 비어있음 → 이전 생성 실패, step 5로 진행
   - 새로 INSERT 성공 → step 4로 진행
4. `gwansang_profiles`에서 관상 데이터 조회 (동물상, 삼정, 오관, 성격 5축 등)
5. `profiles`에서 이름, 성별, 프로필 사진 URL 조회
6. **Claude Haiku 4.5** API 호출 — 구조화된 프롬프트로 13개 영역 심층 분석 생성
7. `paid_content` UPDATE content = 생성된 JSON (예약 row 업데이트)
8. 응답: `{ success: true }`

### 6.6 CLAUDE.md 준수

- 기존 6개 Edge Function 수정 **없음**
- `generate-paid-saju`, `generate-paid-gwansang` **완전 신규 생성**
- 기존 테이블 읽기만 (saju_profiles, gwansang_profiles, profiles, payment_history_web)
- 신규 테이블 쓰기만 (paid_content)

---

## 7. 웹 API & 페이지

### 7.1 콘텐츠 생성 트리거 API

**파일**: `app/api/paid-content/generate/route.ts`

```
POST /api/paid-content/generate
Body: { productId: "paid_saju" }

1. 인증 확인 (세션에서 user_id)
2. productId를 PRODUCTS 화이트리스트로 엄격 검증 (['paid_saju', 'paid_gwansang']만 허용)
3. **레이트 리밋 체크** — per-user 1분에 1회 (동일 productId 기준). 초과 시 429 반환.
4. paid_content에 이미 존재 + content 비어있지 않음 → 200 (이미 생성됨)
5. payment_history_web에 paid 기록 확인 → 없으면 403 (미결제)
6. saju_profiles 또는 gwansang_profiles에서 profile ID 조회
7. Edge Function 호출 (supabase.functions.invoke, Authorization 헤더 전달)
8. 응답: { success: true } 또는 에러
```

### 7.2 콘텐츠 조회 API

**파일**: `app/api/paid-content/[productId]/route.ts`

```
GET /api/paid-content/paid_saju

1. 인증 확인 (세션에서 user_id — query param이 아닌 JWT에서 추출)
2. productId 화이트리스트 검증
3. paid_content에서 해당 user_id + product_id 조회
4. 있으면 200 + content JSON
5. 없으면 404
```

### 7.3 열람 페이지

**파일**: `app/paid/[productId]/page.tsx` (서버 셸) + `components/paid/paid-content-view.tsx` (클라이언트)

서버 셸:
- 인증 체크 (미로그인 → 홈)
- productId 검증
- `paid_content`에서 조회 → 있으면 콘텐츠를 props로 전달 (userId는 전달하지 않음)
- 없으면 → `payment_history_web`에서 paid 확인
  - 미결제 → /result로 redirect
  - 결제됨 → content=null로 전달 (클라이언트에서 생성 트리거, userId는 서버 API가 세션에서 추출)

클라이언트(`PaidContentView`):
```
Props: { productId, content (null이면 생성 필요), productName }
// userId는 props로 내려주지 않음 — API 호출 시 서버가 세션에서 추출

content가 있으면:
  → 바로 렌더링 (13개 섹션 카드)

content가 null이면 (결제됨 + 미생성):
  → 로딩 연출
  → /api/paid-content/generate POST 호출
  → 3초 간격 폴링 (GET /api/paid-content/{productId})
  → 최대 20회 (60초)
  → visibilitychange 이벤트로 탭 비활성 시 폴링 pause, 복귀 시 resume
  → useEffect cleanup에서 반드시 clearInterval (언마운트 시 폴링 정리)
  → 생성 완료 → 콘텐츠 렌더링으로 전환
  → 타임아웃 → "잠시 후 다시 시도해주세요" + 재시도 버튼
```

### 7.4 콘텐츠 렌더링 UI

**라이트 모드** (`bg-hanji text-ink`).

구성:
1. **헤더**: ← 뒤로가기 + 상품명
2. **13개 섹션 카드**: 각 카드 = 타이틀 + body 텍스트
   - `rounded-2xl border-hanji-border bg-hanji-elevated p-4 shadow-low`
   - 섹션 간 `space-y-4`
3. **월별 운세** (paid_saju만): 가로 스크롤 탭 또는 아코디언, rating(1~5) 표시
4. **하단**: "결과 페이지로 돌아가기" 링크

### 7.5 로딩 연출 UI

**라이트 스켈레톤** 방식 사용 (CLAUDE.md 규칙 준수 — 다크는 `/result/loading`만):
- `bg-hanji` 라이트 배경 유지
- 캐릭터 GIF + 단계 메시지 순환
- 스켈레톤 카드 (shimmer 애니메이션)
- 진행 단계: "성격 분석 중..." → "재물운 해석 중..." → "월별 운세 생성 중..." → ...

---

## 8. CTA 연결 변경

### DetailPaidCta 수정

현재 (`purchased=true` 상태):
```typescript
showToast("상세 분석 페이지를 준비 중이에요!");
```

변경 후:
```typescript
router.push(`/paid/${productId}`);
```

### 해금 기준 (3단계 체크)

`/result` 페이지에서:
1. `paid_content`에 row 있음 → `purchased=true` (바로 열람)
2. `paid_content`에 row 없음 + `payment_history_web`에 paid → `purchased=true` (열람 페이지에서 생성 트리거)
3. 둘 다 없음 → `purchased=false` (미구매, checkout으로 이동)

`/checkout` 페이지에서도 `paid_content` 존재 여부 추가 체크 (앱 Key 구매 유저 대응).

---

## 9. 비용 구조

### 9.1 생성 비용 (Haiku 4.5)

| 항목 | paid_saju | paid_gwansang |
|------|-----------|---------------|
| 입력 토큰 (데이터+프롬프트) | ~2,400 | ~3,400 (이미지 포함) |
| 출력 토큰 | ~16,000 | ~10,000 |
| 입력 비용 | $0.0024 | $0.0034 |
| 출력 비용 | $0.08 | $0.05 |
| **원가** | **~$0.08 (약 115원)** | **~$0.05 (약 72원)** |
| 프롬프트 캐싱 적용 시 | ~$0.06 (약 86원) | ~$0.04 (약 57원) |

### 9.2 손익

| | 매출 | 원가 (캐싱 후) | PG 수수료 (3.5%) | **순이익** | **마진** |
|---|------|--------------|----------------|-----------|---------|
| paid_saju | 500원 | 86원 | 18원 | **396원** | **79%** |
| paid_gwansang | 500원 | 57원 | 18원 | **425원** | **85%** |

### 9.3 Edge Function 동시 실행

- Supabase Free: 동시 2개 → 트래픽 증가 시 병목
- Supabase Pro: 동시 100개 → **10,000명 수준까지 여유**
- 각 호출 30~60초 → 동시 100개면 분당 100~200건 처리 가능

---

## 10. 파일 변경 요약

### 신규 생성
| 파일 | 역할 |
|------|------|
| `app/paid/[productId]/page.tsx` | 서버 셸 (인증/해금 체크) |
| `components/paid/paid-content-view.tsx` | 클라이언트 뷰어 (생성 트리거 + 폴링 + 렌더링) |
| `components/paid/paid-loading.tsx` | 로딩 연출 (라이트 스켈레톤 + 단계 메시지) |
| `components/paid/paid-section-card.tsx` | 섹션 카드 컴포넌트 |
| `components/paid/monthly-fortune.tsx` | 월별 운세 컴포넌트 (paid_saju 전용) |
| `app/api/paid-content/generate/route.ts` | 생성 트리거 API (레이트 리밋 포함) |
| `app/api/paid-content/[productId]/route.ts` | 콘텐츠 조회 API |
| Supabase: `generate-paid-saju` Edge Function | 사주 심층 분석 (Haiku 4.5) |
| Supabase: `generate-paid-gwansang` Edge Function | 관상 심층 분석 (Haiku 4.5) |

### 수정
| 파일 | 변경 |
|------|------|
| `lib/constants.ts` | product_id: `saju-detail` → `paid_saju`, `gwansang-detail` → `paid_gwansang` |
| `app/result/page.tsx` | productId 변경 + 해금 기준을 paid_content 기반으로 변경 |
| `components/result/detail-paid-cta.tsx` | purchased 클릭 → `/paid/{productId}` 이동 |
| `app/checkout/page.tsx` | product query param 변경 + paid_content 해금 체크 추가 |

### Supabase (신규만)
- `paid_content` 테이블 생성 + RLS (SELECT only, INSERT 없음)
- Edge Function 2개 신규 생성 (JWT 인증 + 멱등성 + 실패 복구)

### 미변경 (앱 보호)
- `saju_profiles`, `gwansang_profiles` — 읽기만
- 기존 6개 Edge Function — 수정 없음
- `purchases`, `user_keys`, `key_transactions` — 미접촉
- Storage 정책 — 변경 없음

---

## 11. 보안 참고

- Edge Function은 **반드시 JWT 인증** — 외부 호출 차단
- Edge Function 내부에서 **payment 독립 검증** — 웹 API 체크에 의존하지 않음
- generate API에 **per-user 레이트 리밋** — Claude API 비용 남용 방지
- 조회 API에서 **user_id는 세션(JWT)에서만 추출** — query param 신뢰 금지
- `ANTHROPIC_API_KEY`는 Supabase Edge Function 환경변수에만 저장 — 클라이언트 노출 없음
- 재생성 필요 시 service_role로 DELETE + INSERT (클라이언트 UPDATE 불가)

---

## 12. Edge Function 배포 주의

- Supabase Dashboard 또는 CLI(`supabase functions deploy`)로 배포
- 웹 코드와 별도 배포 사이클
- 환경변수: `ANTHROPIC_API_KEY` — Supabase Edge Function 환경에 설정 필요
- 기존 `generate-saju-insight`가 이미 Claude를 사용하므로 동일 API 키 재사용 가능
- Haiku 모델 ID: `claude-haiku-4-5-20251001`
