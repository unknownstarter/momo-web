# 궁합 기능 설계서

> **작성일**: 2026-03-20
> **상태**: 구현 완료 (2026-03-24 PR #3 MERGED)
> **목적**: 바이럴 루프 강화 + 리텐션 개선 — 공유받은 유저가 "관계 기반 궁금증"으로 전환·재공유하도록 유도

---

## 1. 배경 및 문제 정의

### 현재 바이럴 퍼널

```
A 결과 → "공유하기"(2순위 CTA) → B 공유 티저 → "나도 해보기" → 회원가입 → 결과 → 끝
```

### 끊기는 3곳

| 지점 | 원인 |
|------|------|
| A의 공유 동기 | "보여주기" 외 이유 없음. 공유가 2순위 CTA |
| B의 전환 동기 | A의 "남 얘기" 구경 후 "나도 해볼까?" 호기심뿐. A와의 관계 기반 궁금증 0 |
| B의 재공유 동기 | 결과 받아도 재공유할 새로운 이유 없음 |

### 해결 방향

**"보여주기" → "관계 확인하기"**로 공유 동기 전환.
궁합(동성=친구 궁합, 이성=연인 궁합)을 통해 양방향 관계 동기를 생성한다.

---

## 2. 기존 인프라 (Supabase 변경 없음)

### Edge Function (2개 순차 호출)

| 함수 | 역할 | AI 사용 | 모델 | 1회 비용 |
|------|------|---------|------|----------|
| `calculate-compatibility` | 점수 계산 + 템플릿 문구 | **없음 (순수 알고리즘)** | - | ~0원 |
| `generate-match-story` | **개인화된 인연 스토리텔링** | **있음** | Claude 4.5 Haiku | **~3원** |

#### `calculate-compatibility` — 순수 알고리즘

- 두 사람의 사주 데이터(`mySaju`, `partnerSaju`)를 받아 수학 연산으로 0~100점 궁합 계산
- 성별 필터 없음 → **동성 궁합도 계산 가능**
- `strengths[]`, `challenges[]`, `overallAnalysis`, `advice`는 **조건별 고정 문구 선택** (AI 아님)
  - 예: "오행이 잘 맞아요. 서로를 살려 주는 조합이에요." (fiveElementScore >= 65일 때)
  - 예: "서로 다른 성향이 있어요. 의견이 엇갈릴 때 대화로 풀어보세요." (일지 충일 때)
  - `advice`는 항상 동일: "서로의 차이를 인정하고, 말로 풀어보세요..."
- **개인화된 스토리텔링이 아닌 템플릿 문구이므로 밋밋할 수 있음**
- `aiStory`는 항상 `null` 반환 (이 함수에서는 생성하지 않음)

#### `generate-match-story` — AI 스토리텔링 (Claude 4.5 Haiku)

- **이 함수가 진짜 개인화된 스토리텔링을 담당**
- 두 사람 이름, 일간, 오행 분포, 궁합 점수, 강점/도전을 Claude에게 전달
- **200~350자 개인화된 인연 내러티브** 생성 (시적이고 따뜻한 톤)
  - 예: "갑목의 따뜻한 기운과 경금의 단단함이 만나, 서로를 성장시키는 인연..."
- 결과를 `saju_compatibility.ai_story` 컬럼에 캐시 → **같은 쌍은 재호출 없음** (비용 1회만)
- 입력: `{ userId, partnerId, myName, partnerName, mySaju, partnerSaju, score, strengths, challenges }`
- 출력: `{ aiStory: string }`
- 비용: 입력 ~1,000 토큰 + 출력 ~400 토큰 = **~3원/건**

> **⚠️ 설계 결정 필요**: 템플릿만(0원) vs AI 스토리 포함(~3원/건). 섹션 7 비용 프로젝션 참고.

### `calculate-compatibility` 입출력

```typescript
// 입력
POST body: {
  mySaju: {
    yearPillar: { stem, branch },
    monthPillar: { stem, branch },
    dayPillar: { stem, branch },
    hourPillar?: { stem, branch },
    fiveElements: { wood, fire, earth, metal, water },
    dominantElement?: string
  },
  partnerSaju: { /* 동일 구조 */ }
}

// 출력
{
  score: number,              // 종합 0~100
  fiveElementScore: number,    // 오행 서브스코어
  dayPillarScore: number,      // 일주 서브스코어
  overallAnalysis: string,     // 한줄 해석 (고정 템플릿 4종 중 1개)
  strengths: string[],         // 강점 (조건별 고정 문구 ~7종 중 매칭, 최대 4개)
  challenges: string[],        // 도전 (조건별 고정 문구 ~4종 중 매칭, 최대 4개)
  advice: string,              // 조언 (항상 동일 고정 문장)
  aiStory: null,               // ← null! 별도 generate-match-story 호출 필요
  calculatedAt: string
}
```

### `generate-match-story` 입출력

```typescript
// 입력
POST body: {
  userId: string,           // DB 캐시용
  partnerId: string,        // DB 캐시용
  myName: string,
  partnerName: string,
  mySaju: { dayPillar, fiveElements, dominantElement, strongestElement? },
  partnerSaju: { /* 동일 */ },
  score: number,
  strengths: string[],
  challenges: string[]
}

// 출력
{ aiStory: string }  // 200~350자 개인화된 인연 스토리
// + saju_compatibility.ai_story에 자동 캐시 (is_detailed = true)
```

### 점수 알고리즘

```
종합 = 일주(40%) + 오행(35%) + 연월시주(20%) + 보정(5점)

일주: 기저 50 + 천간합(+10) + 지지육합(+8) + 삼합(+6) - 충(-5) - 형(-3) - 파/해(-2)
오행: 기저 50 + 상생(+8/회) - 상극(최대-8)
연월시: 10 + clamp(쌍별 합산, -10, +10)
```

### `saju_compatibility` 테이블 (2026-03-24 앱 측 스키마 업데이트 반영)

> **⚠️ BREAKING CHANGE**: 앱에서 `user_gender`, `partner_gender` NOT NULL 컬럼 추가.
> 웹에서 INSERT/UPSERT 시 반드시 포함해야 함. 미포함 시 NOT NULL 제약으로 INSERT 실패.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | |
| `user_id` | uuid → profiles.id | 나 |
| `partner_id` | uuid → profiles.id | 상대 |
| `user_gender` | text NOT NULL | **신규** — 'male' 또는 'female' |
| `partner_gender` | text NOT NULL | **신규** — 'male' 또는 'female' |
| `total_score` | int (0~100) | 종합 점수 |
| `five_element_score` | int | 오행 서브스코어 |
| `day_pillar_score` | int | 일주 서브스코어 |
| `overall_analysis` | text | 한줄 해석 |
| `strengths` | text[] | 강점 배열 |
| `challenges` | text[] | 도전 배열 |
| `advice` | text | 조언 |
| `ai_story` | text | AI 스토리 (nullable) |
| `is_detailed` | boolean | 상세 여부 |
| `calculated_at` | timestamptz | |
| UNIQUE | (user_id, partner_id) | |

**성별 컬럼 활용 이점:**
- `relationType` 판정 시 profiles 테이블 JOIN 불필요 (성별이 궁합 레코드에 내장)
- 캐시 조회 시 프로필 쿼리 1~2회 절약 → 응답 속도 개선
- 앱의 추천 파이프라인에서 `.eq("user_gender", oppositeGender)` 필터 가능

---

## 3. 유저 플로우

### 플로우 A: B가 이미 결과 있는 회원

```
B가 /s/{code} 랜딩
  → ShareTeaserView 표시 (A의 연애 유형·캐릭터)
  → 2초 후 바텀시트 등장
    ┌──────────────────────────────┐
    │  [A 캐릭터]  [?]             │
    │  "{A이름}님과 나의 궁합은      │
    │   몇 점일까?"                │
    │                              │
    │  [궁합 보기]       ← 1차 CTA  │
    │  [나도 사주·관상 보기] ← 2차   │
    └──────────────────────────────┘
  → "궁합 보기" 클릭
  → /result?tab=compatibility 이동
  → 자동으로 A와의 궁합 계산 (캐시 있으면 즉시 반환)
  → 궁합 상세 바텀시트 자동 오픈
```

### 플로우 B: B가 비회원

```
B가 /s/{code} 랜딩
  → sessionStorage.setItem("momo_compat_partner", A의 profile_id)
  → 바텀시트 → "궁합 보기" 클릭
  → "/" (랜딩) → 카카오 로그인 → 온보딩(14스텝) → 분석 로딩 → /result
  → /result 마운트 시 sessionStorage에서 partner_id 복원
  → 자동으로 궁합 탭 활성화 + A와의 궁합 계산
  → 궁합 상세 바텀시트 자동 오픈
```

> **컨텍스트 유지**: 카카오 OAuth는 같은 탭에서 리다이렉트되므로 sessionStorage 유지됨.
> 사파리 InPrivate 대비 쿠키 병행 저장 고려.

### 플로우 C: 결과 페이지에서 직접 궁합 탭

```
/result → [사주] [관상] [궁합(New)] 탭 클릭
  → 기존 궁합 리스트 표시 (점수 내림차순)
  → 항목 클릭 → 궁합 상세 바텀시트
  → 0명이면 빈 상태 + "친구에게 궁합 요청하기" CTA
```

---

## 4. 화면 설계

### 4-1. 공유 티저 궁합 바텀시트 (`ShareCompatibilityPrompt`)

- 트리거: 페이지 로드 후 **2초** (dismiss 가능)
- A의 캐릭터 이미지 + "?" 아이콘
- "{A이름}님과 나의 궁합은 몇 점일까?"
- 1차 CTA: "궁합 보기" (B 상태에 따라 분기)
  - B 결과 있음 → `/result?tab=compatibility`
  - B 로그인만 → `/result/loading` (분석 후 궁합)
  - B 비회원 → `/` (랜딩, 로그인 후 플로우)
- 2차 CTA: "나도 사주·관상 보기" (기존과 동일)
- B의 상태는 Server Component에서 세션 확인 후 prop으로 전달

### 4-2. 결과 페이지 궁합 탭 (`CompatibilityTab`)

```
┌─────────────────────────────┐
│ 궁합 본 친구 (N명)           │
│                             │
│ ┌─────────────────────────┐ │
│ │ [캐릭터] 민수  친구 궁합   │ │
│ │ 85점  ████████░░         │ │
│ │ "서로의 부족한 점을..."    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ [캐릭터] 지은  연인 궁합   │ │
│ │ 72점  ███████░░░         │ │
│ │ "전반적으로 균형..."      │ │
│ └─────────────────────────┘ │
│                             │
│ ─── 또는 (0명 빈 상태) ───   │
│                             │
│ [캐릭터 두 마리 일러스트]     │
│ "아직 궁합 본 친구가 없어요"  │
│ "링크를 공유하면 궁합을       │
│  볼 수 있어요!"             │
│                             │
│ [궁합 요청 링크 공유하기] CTA │
└─────────────────────────────┘
```

- 점수 내림차순 정렬
- 동성 = "친구 궁합" 라벨, 이성 = "연인 궁합" 라벨
- 점수 색상: tailwind config의 기존 compat 토큰 활용
  - 90+: `compat-destined`, 75~89: `compat-excellent`, 60~74: `compat-good`, ~59: `compat-average`

### 4-3. 궁합 상세 바텀시트 (`CompatibilityDetailSheet`)

```
┌──────────────────────────────┐
│ [X]                          │
│                              │
│  [내 캐릭터] ♥ [상대 캐릭터]   │
│  나 & {상대이름}              │
│                              │
│  궁합 85점                    │
│  ○○○○○○○○○░  (원형 게이지)    │
│  "최고의 인연"                │
│  친구 궁합 / 연인 궁합         │
│                              │
│  ── 오행 궁합 ──              │
│  90/100                      │
│  "서로의 목-화 조합이..."      │
│                              │
│  ── 일주 궁합 ──              │
│  80/100                      │
│  "갑목일주와 경금일주는..."     │
│                              │
│  ── 강점 ──                  │
│  • "서로 부족한 기운을 채워줌"  │
│  • "감정 표현이 자연스러움"    │
│                              │
│  ── 도전 ──                  │
│  • "결정 방식의 차이"          │
│                              │
│  ── 조언 ──                  │
│  "감정 표현을 서로..."         │
│                              │
│  [이 궁합 결과 공유하기]       │
└──────────────────────────────┘
```

- 점수 등급:
  - 90+ "천생연분" (destined)
  - 75~89 "최고의 인연" (excellent)
  - 60~74 "좋은 인연" (good)
  - 40~59 "보통 인연" (average)
  - ~39 "도전적 인연" (challenging) — 긍정 프레이밍
- 낮은 점수일수록 "다른 친구와도 궁합 보기" CTA 강조

### 4-4. AI 스토리 하이브리드 폴링 (이성: 인연 스토리 / 동성: 케미 분석)

`generate-match-story`는 fire-and-forget 호출이므로, 궁합 계산 직후에는 `aiStory`가 항상 `null`.
상세 바텀시트에서 **하이브리드 폴링**으로 자연스럽게 스토리를 로딩한다.

```
바텀시트 열림
  → relationType === "romantic" && aiStory === null?
  → YES:
    ┌──────────────────────────────┐
    │  [분석 로딩 GIF 🎞️]           │
    │  "인연 스토리를 만들고 있어요..." │
    └──────────────────────────────┘
    → 5초 간격으로 GET /api/compatibility-story?partnerId=X 폴링
    → 최대 3회 (15초)
    → ai_story 도착 시: fade-in 전환으로 스토리 표시
    → 3회 실패 시: "잠시 후 다시 확인해보세요" + 수동 새로고침 버튼
  → NO (이미 있음):
    → 즉시 스토리 표시
```

- 로딩 GIF: `/images/characters/loading_spinner.gif` (분석 로딩 페이지와 동일)
- 폴링 엔드포인트: `GET /api/compatibility-story?partnerId=X` (ai_story 필드만 경량 조회)

### 4-5. 궁합 OG 이미지

궁합 결과를 공유할 때 카카오톡 등에서 표시되는 OG 이미지.
**공유하는 사람(내)의 주요 오행 캐릭터**를 기반으로 생성.

```
┌─────────────── 1200×630px ───────────────┐
│                                           │
│  [내 캐릭터]                              │
│                                           │
│  "민수님과의 사주 궁합"                     │
│  85점 — 최고의 인연                        │
│                                           │
│  모모 사주                                │
└───────────────────────────────────────────┘
```

- 엔드포인트: `GET /api/og-compat?name=민수&score=85&grade=최고의인연&element=wood&character=namuri`
- 색상: 공유자의 오행 `main` + `pastel` 조합
- 캐릭터: 공유자의 캐릭터 (기존 `/api/og`와 동일 패턴)

---

## 5. 기술 아키텍처

### 신규 파일 (9개)

| 파일 | 역할 | 서버/클라이언트 |
|------|------|----------------|
| `lib/compatibility.ts` | 궁합 비즈니스 로직 (캐시 조회, Edge Function 호출, 리스트 조회, AI 스토리 조회) | 서버 전용 |
| `app/api/calculate-compatibility/route.ts` | 1:1 궁합 계산 API | 서버 |
| `app/api/compatibility-list/route.ts` | 내 궁합 목록 API | 서버 |
| `app/api/compatibility-story/route.ts` | AI 스토리 폴링 전용 경량 API | 서버 |
| `app/api/og-compat/route.tsx` | 궁합 전용 OG 이미지 생성 | 서버 |
| `components/share-compatibility-prompt.tsx` | 공유 티저 궁합 바텀시트 | 클라이언트 |
| `components/result/compatibility-tab.tsx` | 결과 페이지 궁합 탭 | 클라이언트 |
| `components/result/compatibility-detail-sheet.tsx` | 궁합 상세 바텀시트 (AI 스토리 폴링 포함) | 클라이언트 |
| `components/result/compatibility-gauge.tsx` | SVG 원형 게이지 | 클라이언트 |

### 수정 파일 (6개)

| 파일 | 변경 내용 |
|------|----------|
| `app/result/page.tsx` | 탭 유니온 `"compatibility"` 추가, `useSearchParams` + sessionStorage 처리 |
| `app/s/[code]/page.tsx` | 세션 확인 + `ShareCompatibilityPrompt` 렌더링 |
| `app/share/[id]/page.tsx` | 동일 |
| `lib/constants.ts` | `COMPATIBILITY_GRADES` 상수 추가 |
| `lib/result-tokens.ts` | `getCompatColor()` 헬퍼 추가 |
| `lib/analytics.ts` | 궁합 GA 이벤트 5개 추가 |

### 데이터 플로우

```
[궁합 계산 요청]
  → POST /api/calculate-compatibility { partnerProfileId }
  → 인증 확인 (createClient 서버)
  → admin 클라이언트로:
    1. 내 profiles 조회 (id, gender)
    2. 상대 profiles 조회 (id, gender)
    3. saju_compatibility 캐시 확인 (user_id/partner_id 양방향)
    4. 캐시 있으면 즉시 반환 (⚠️ user_gender/partner_gender가 레코드에 내장)
    5. 양쪽 saju_profiles 조회
    6. calculate-compatibility Edge Function 호출
    7. saju_compatibility upsert (⚠️ user_gender, partner_gender 필수 포함!)
    8. 이성이면 generate-match-story fire-and-forget 호출
  → { ok: true, data: CompatibilityResult }

[궁합 리스트 조회]
  → GET /api/compatibility-list
  → admin 클라이언트로:
    1. saju_compatibility WHERE user_id = me OR partner_id = me
    2. user_gender/partner_gender로 relationType 즉시 판정 (JOIN 불필요)
    3. 상대 profiles JOIN (name, character_type, dominant_element만 — gender 제외)
  → CompatibilityResult[]

[AI 스토리 폴링]
  → GET /api/compatibility-story?partnerId=X
  → admin 클라이언트로:
    1. saju_compatibility 캐시 조회 (양방향)
    2. ai_story 필드만 반환
  → { aiStory: string | null }
```

### 레퍼럴 컨텍스트 유지 메커니즘

```
공유 티저 페이지:
  → sessionStorage.setItem("momo_compat_partner", profileId)
  → (보조) document.cookie = "momo_compat_partner={profileId};max-age=3600;path=/"

결과 페이지 마운트 시:
  → const partnerId = sessionStorage.getItem("momo_compat_partner")
                    || getCookie("momo_compat_partner")
  → partnerId 있으면:
    1. 궁합 탭 자동 활성화
    2. 궁합 계산 자동 시작
    3. 완료 후 sessionStorage/cookie 클리어
```

### RLS 우회 전략

`saju_compatibility` 테이블은 RLS 정책 수정 불가.
→ `lib/supabase/admin.ts`의 `createAdminClient()` (service role) 사용.
→ `lib/share-data.ts`와 동일한 기존 패턴.

---

## 6. 바이럴 루프 설계

### AS-IS (일방향, 1회성)

```
A 공유 → B 구경 → 끝
```

### TO-BE (양방향, 체인)

```
A "궁합 요청" → B 분석 완료 → A-B 궁합 확인
  → B "궁합 요청" → C 분석 완료 → B-C 궁합 확인
  → A 재방문 → 궁합 탭에 B 추가됨 (리텐션)
  → 단톡방 공유 시 1:N 동시 전환
```

### 공유 동기 체인

| 단계 | 동기 | 메시지 |
|------|------|--------|
| 1차 (A→B) | "우리 궁합 확인" | "나랑 사주 궁합 몇 점인지 확인해봐!" |
| 2차 (B→C) | "비교·수집" | "너도 해봐! 나는 민수랑 85점 나왔어" |
| 궁합 결과 공유 | "자랑·놀람" | "우리 궁합 85점이래! 천생연분이라네 ㅋㅋ" |

### 동성 궁합이 초기 바이럴의 핵심

| 구분 | 동성 (친구 궁합) | 이성 (연인 궁합) |
|------|----------------|----------------|
| 공유 허들 | 낮음 (부담 없음) | 높음 ("관심 있어?" 오해) |
| 공유 채널 | **단톡방 (1:N)** | 1:1 DM |
| 바이럴 계수 | 높음 | 낮음 |
| 리텐션 기여 | 중간 | 높음 (앱 전환 동기) |
| 프레이밍 | "베프 궁합", "케미 점수" | "연인 궁합", "인연 점수" |

---

## 7. 비용 프로젝션

### 현재 유저당 비용 (이미 발생 중)

| 항목 | 모델 | 1회 비용 |
|------|------|----------|
| `generate-saju-insight` | Claude 4.5 Haiku | ~20원 ($0.015) |
| `generate-gwansang-reading` | Claude Sonnet 4.6 Vision | ~80원 ($0.060) |
| **합계** | | **~100원/유저** |

### 궁합 기능 추가 시 유저당 추가 비용

| 항목 | 모델 | 1회 비용 | 비고 |
|------|------|----------|------|
| `calculate-compatibility` | 없음 (순수 알고리즘) | ~0원 | 점수 + 템플릿 문구 |
| `generate-match-story` | **Claude 4.5 Haiku** | **~3원** | **개인화된 인연 스토리** |
| Supabase DB read/write | - | 무시 가능 | Free tier 내 |

**궁합 점수 계산 자체**는 AI 없이 0원이지만, **의미 있는 스토리텔링**을 보여주려면 `generate-match-story` 호출이 필요하고 건당 ~3원이 발생합니다. 단, **같은 쌍은 DB 캐시** 되므로 최초 1회만 과금됩니다.

> ⚠️ `calculate-compatibility`의 `strengths[]`, `challenges[]`, `overallAnalysis`는 **조건별 고정 문구 선택**이므로 개인화 수준이 낮습니다. (예: "오행이 잘 맞아요", "서로 다른 성향이 있어요" 등 ~7종 중 선택). 단, 문구가 **성별 중립적**이므로 동성/이성 모두 자연스럽게 사용 가능.
> 반면 `generate-match-story`의 `aiStory`는 두 사람의 이름, 일간, 오행 조합을 구체적으로 언급하는 **진짜 개인화된 내러티브**입니다.

> **⚠️ 동성/이성 분기**
> 2026-03-24 업데이트: Edge Function이 myGender/partnerGender로 romantic/friend 자동 분기. 동성도 호출하며, 위트있고 솔직한 친구 톤으로 생성.
>
> | 구분 | `calculate-compatibility` | `generate-match-story` | AI 스토리 표시 | 비용 |
> |------|--------------------------|----------------------|--------------|------|
> | **이성 (연인 궁합)** | 호출 | **호출** | 로맨틱 인연 스토리 표시 | ~3원 |
> | **동성 (친구 궁합)** | 호출 | **호출** | **케미 분석 표시** | **~3원** |

### 시나리오별 비용 프로젝션

#### 전제 조건
- 기존: 유저당 100원 (사주 해석 + 관상 분석, 1회성)
- 궁합: 유저당 궁합 횟수 = 평균 3~5회 예상 (친구 N명과 궁합)
- `generate-match-story` 호출 여부에 따라 분기

#### 시나리오 1: AI 스토리 미사용 (calculate-compatibility만)

| 유저 수 | 기존 비용 (사주+관상) | 궁합 추가 비용 | 총 비용 |
|---------|---------------------|---------------|---------|
| 1,000명 | 100,000원 | **0원** | 100,000원 |
| 5,000명 | 500,000원 | **0원** | 500,000원 |
| 10,000명 | 1,000,000원 | **0원** | 1,000,000원 |
| 50,000명 | 5,000,000원 | **0원** | 5,000,000원 |

#### 시나리오 2: AI 스토리 사용 (generate-match-story 포함)

| 유저 수 | 기존 비용 | 궁합 추가 비용 (유저당 5회 × 3원) | 총 비용 | 증가율 |
|---------|----------|--------------------------------|---------|--------|
| 1,000명 | 100,000원 | 15,000원 | 115,000원 | +15% |
| 5,000명 | 500,000원 | 75,000원 | 575,000원 | +15% |
| 10,000명 | 1,000,000원 | 150,000원 | 1,150,000원 | +15% |
| 50,000명 | 5,000,000원 | 750,000원 | 5,750,000원 | +15% |

#### 시나리오 3: 바이럴 성공으로 유저 폭증 시

궁합 기능이 바이럴을 성공적으로 만든다면, **유저 수 자체가 증가**하여 기존 사주+관상 비용이 주요 비용 동인이 됩니다.

| 유저 수 | 사주+관상 (100원/명) | 궁합 스토리 (15원/명) | Supabase Pro ($25/월) | 총 월 비용 |
|---------|---------------------|---------------------|----------------------|-----------|
| 1,000명/월 | 100,000원 | 15,000원 | 33,000원 | ~150,000원 |
| 10,000명/월 | 1,000,000원 | 150,000원 | 33,000원 | ~1,200,000원 |
| 50,000명/월 | 5,000,000원 | 750,000원 | 33,000원 | ~5,800,000원 |
| 100,000명/월 | 10,000,000원 | 1,500,000원 | 33,000원 | ~11,500,000원 |

### 비용 최적화 방안

| 방안 | 절감 효과 | 난이도 |
|------|----------|--------|
| **AI 스토리 미사용** (점수+템플릿 텍스트만) | 궁합 추가 비용 0원 | 즉시 |
| **사주 해석 모델 다운그레이드** (Haiku → 자체 템플릿) | 사주 20원 → 0원 | 높음 (품질 저하) |
| **관상 분석 모델 다운그레이드** (Sonnet → Haiku Vision) | 관상 80원 → ~25원 | 중간 (품질 확인 필요) |
| **캐싱 강화** (동일 사주 조합 캐시) | 중복 호출 제거 | 낮음 |
| **궁합 횟수 제한** (유저당 일 N회) | 비용 상한 설정 | 낮음 |

### 비용 임계점 & 결제 도입 기준

| 월 유저 수 | 예상 월 비용 | 판단 |
|-----------|-------------|------|
| ~5,000명 | ~60만원 | 감당 가능 |
| ~10,000명 | ~120만원 | 주의 필요 |
| ~30,000명 | ~350만원 | **결제 도입 검토 시점** |
| ~50,000명+ | ~580만원+ | 결제 필수 |

**주요 비용 동인은 기존 사주+관상 분석(100원/명)입니다.**
궁합 AI 스토리를 포함해도 기존 대비 +15% 수준이며, 같은 쌍은 DB 캐시되므로 재호출 비용 없음.
궁합 점수만 보여주고 AI 스토리 없이 가면 추가 비용 0원.

---

## 8. 결제 도입 시 고려사항 (비용 임계 초과 시)

> 현재 웹은 무료 플로우. 비용이 감당 안 될 경우에만 검토.

### 결제 가능 지점

| 지점 | 방식 | 유저 영향 |
|------|------|----------|
| 관상 분석 | 사주는 무료, 관상은 유료 (가장 비싼 항목 차단) | 중간 |
| AI 스토리 궁합 | 기본 점수 무료, AI 스토리텔링은 유료 | 낮음 |
| 궁합 횟수 제한 | 1일 3회 무료, 이후 유료 | 낮음 |
| 상세 해석 유료화 | 요약은 무료, 전체 AI 해석은 유료 | 높음 |

### 권장 순서
1. 먼저 **AI 스토리 없이** 런칭 (비용 0원 추가)
2. 바이럴 반응 확인
3. 유저 3만 명 이상 시 관상 분석 유료화 또는 모델 다운그레이드 검토
4. 궁합 AI 스토리는 유료 프리미엄으로 도입 가능

---

## 9. 리스크 및 완화

| 리스크 | 완화 방안 |
|--------|----------|
| 비회원 B의 17~18스텝 이탈 | 온보딩 중간에 "{A이름}님과 궁합 기다리는 중!" 리마인더 |
| 궁합 점수가 낮으면 실망 | 긍정 프레이밍 ("도전적 인연 — 서로 성장시키는 관계") + "다른 친구와도 비교" 유도 |
| 프라이버시 | 사주 원국 비노출, 궁합 점수+분석 텍스트만 공유 |
| 사파리 InPrivate sessionStorage 소실 | 쿠키 병행 저장 |
| 스팸성 공유 | 분석 완료된 유저 간에만 궁합 계산 가능 (자연적 제한) |

---

## 10. GA 이벤트 추가

| 이벤트 | 시점 |
|--------|------|
| `view_compatibility_bottomsheet` | 공유 티저에서 궁합 바텀시트 노출 |
| `click_compatibility_cta` | 궁합 CTA 클릭 |
| `view_compatibility_tab` | 결과 페이지 궁합 탭 진입 |
| `view_compatibility_detail` | 궁합 상세 바텀시트 열림 |
| `share_compatibility_result` | 궁합 결과 공유 |

---

## 11. 구현 순서 (Phase)

> **구현 플랜 매핑**: Phase N = 구현 플랜(`docs/superpowers/plans/2026-03-20-compatibility-feature.md`) Task N+0.
> Phase 3 = Task 3+4 (비즈니스 로직 + API Routes를 하나의 Phase로 묶음).

| Phase | 작업 | 구현 플랜 Task | 바이럴 영향 | 비용 영향 |
|-------|------|---------------|-----------|----------|
| **1** | 궁합 상수 & 토큰 (`COMPATIBILITY_GRADES`, `getCompatColor`) | Task 1 | - | 0원 |
| **2** | GA 이벤트 추가 (5개) | Task 2 | 측정 | 0원 |
| **3** | 데이터 레이어 (`lib/compatibility.ts` + API 3개: 계산, 리스트, AI 스토리 폴링) | Task 3+4 | - | 0원 |
| **4** | 원형 게이지 SVG 컴포넌트 | Task 5 | - | 0원 |
| **5** | 궁합 상세 바텀시트 (AI 스토리 하이브리드 폴링 + 로딩 GIF 포함) | Task 6 | 높음 | ~3원/건 (이성 AI 스토리) |
| **6** | 궁합 탭 컴포넌트 (리스트 + 빈 상태) | Task 7 | 높음 | 0원 |
| **7** | 결과 페이지에 궁합 탭 통합 (레퍼럴 자동 계산 포함) | Task 8 | 높음 | 0원 |
| **8** | 공유 티저 궁합 바텀시트 + sessionStorage 컨텍스트 | Task 9 | 매우 높음 | 0원 |
| **9** | 궁합 전용 OG 이미지 (`/api/og-compat`) | Task 10 | 중간 (공유 클릭률) | 0원 |
| **10** | 통합 검증 & PR | Task 11 | - | - |

---

## 12. A/B 테스트 포인트

| 테스트 | 변수 A | 변수 B | 측정 지표 |
|--------|--------|--------|-----------|
| 바텀시트 타이밍 | 2초 자동 | 인라인 CTA | 전환율 |
| 공유 메시지 | "사주 보기" (현재) | "궁합 보기" | 클릭률 |
| CTA 순서 | 앱알림 1순위 (현재) | 궁합 1순위 | 공유율 |
| 궁합 탭 위치 | 3번째 (사주-관상-궁합) | 1번째 (궁합-사주-관상) | 탭 진입률 |
