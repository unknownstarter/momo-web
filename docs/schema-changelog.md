# DB 스키마 변경 이력 (momo 앱 → momo-web 동기화)

> momo 네이티브 앱(`/Users/noah/momo`)에서 발생한 DB 스키마 변경을 추적합니다.
> 웹 프로젝트에서 해당 테이블/컬럼을 사용할 때 반드시 참조하세요.

---

## 2026-03-25: compat_connections 테이블 추가 (앱 측 생성)

**목적**: 유저가 의도적으로 궁합을 확인한 관계 추적. 앱 batch 데이터와 구분.

### compat_connections 테이블 (신규)

```sql
CREATE TABLE IF NOT EXISTS compat_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_gender text NOT NULL CHECK (user_gender IN ('male', 'female')),
  partner_gender text NOT NULL CHECK (partner_gender IN ('male', 'female')),
  compatibility_id uuid REFERENCES saju_compatibility(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);
ALTER TABLE compat_connections ENABLE ROW LEVEL SECURITY;
```

**RPC**: `fn_record_compat_connection(p_partner_id uuid)` — 직접 INSERT 불가, RPC로만 기록.
- `auth.uid()`로 user_id 자동 설정
- `compatibility_id`는 saju_compatibility에서 양방향 조회하여 자동 매칭
- 성별도 profiles에서 자동 조회
- `ON CONFLICT DO NOTHING` (중복 안전)

**웹에서 사용**:
- `computeCompatibility` 후 RPC 호출 (캐시 히트/미스 모두)
- `fetchCompatibilityList`에서 `compat_connections` 기반 조회 + `saju_compatibility` JOIN

**앱에서 사용 (미래)**: 공유 딥링크 → 궁합 확인 시 동일 RPC 호출

---

## 2026-03-24: saju_compatibility 성별 컬럼 추가 + Edge Function 개편 (앱 측 수행)

**목적**: 웹 궁합 기능 지원 + 소개팅 추천 성별 필터 강화

### saju_compatibility — 성별 컬럼 추가

```sql
ALTER TABLE saju_compatibility
  ADD COLUMN user_gender text NOT NULL CHECK (user_gender IN ('male', 'female')),
  ADD COLUMN partner_gender text NOT NULL CHECK (partner_gender IN ('male', 'female'));
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_gender` | text NOT NULL | 'male' 또는 'female' |
| `partner_gender` | text NOT NULL | 'male' 또는 'female' |

**웹 영향**: upsert 시 반드시 `user_gender`, `partner_gender` 포함. 미포함 시 NOT NULL 제약 위반으로 INSERT 실패.

### generate-match-story Edge Function 개편

- **신규 필수 파라미터**: `myGender`, `partnerGender` (body에 추가)
- **자동 분기**: 이성(male↔female) → romantic 톤, 동성(male↔male, female↔female) → friend 톤
- **점수별 솔직한 톤**: 80+ 진심 축복, 60~79 칭찬+보완점, 40~59 솔직+균형, 39↓ 위트있는 솔직
- `relationshipType` 수동 파라미터 제거 (성별 조합으로 자동 판단)

### generate-daily-recommendations Edge Function 성별 필터 추가

- `fetchCompatibilityCandidates()`에서 partner profiles JOIN + `.eq("profiles.gender", oppositeGender)` 추가
- 기존: `saju_compatibility`에 이성만 있다는 암묵적 가정으로 필터 없음
- 변경: 명시적 성별 필터로 동성 궁합 데이터가 추천에 혼입되지 않도록 방어

---

## 2026-04-08: share_links 실제 적용 + RLS 정책 정비 (앱·웹 공용화)

**배경 (중요)**: 2026-03-13에 문서로만 "SQL Editor에서 실행" 안내가 남아있었고 **실제 Supabase에는 테이블이 생성된 적이 없었음**. 그 결과 `/api/share-url`의 try/catch가 조용히 에러를 삼켜 모든 유저가 폴백 경로(`/share/{암호화토큰}` 긴 URL)만 받고 있었던 버그가 한 달 가까이 방치됨.

2026-04-08 이 항목으로 (1) 테이블을 정식 생성하고 (2) 앱·웹 양쪽에서 공용으로 사용 가능하도록 RLS 정책까지 함께 심었음.

### 실제 실행된 마이그레이션 (`20260408_share_links`)

```sql
CREATE TABLE IF NOT EXISTS share_links (
  short_id text PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_share_links_profile_id
  ON share_links(profile_id);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- 본인 profile에 해당하는 share_link만 select (앱/웹 authenticated 공통)
CREATE POLICY "users_select_own_share_link" ON share_links
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- 본인 profile에 해당하는 share_link만 insert (앱/웹 authenticated 공통)
CREATE POLICY "users_insert_own_share_link" ON share_links
  FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `short_id` | text | 8자 영소문자+숫자 코드 (예: a1b2c3d4) |
| `profile_id` | uuid | profiles.id, UNIQUE |
| `created_at` | timestamptz | 생성 시각 |

**동작**: `/api/share-url` 호출 시 profile_id로 기존 short_id 있으면 재사용, 없으면 새로 생성해 `https://도메인/s/{short_id}` 반환. 웹은 service_role로 접근하여 RLS 무관. 앱은 authenticated JWT로 위 정책을 통해 본인 row만 CRUD 가능.

**웹 코드 변경 (`app/api/share-url/route.ts`)**: 기존 try/catch가 모든 에러를 삼키던 버그 수리. 명시적 에러 로깅 + UNIQUE 충돌(동시 요청) 재시도 + short_id PK 충돌(희박) 재시도. 극단적인 DB 접근 장애에서만 레거시 `/share/{token}` 폴백.

**기존 유저 처리**: 2026-04-08 이전에 발급된 `/share/{token}` 긴 URL이 이미 카톡·문자로 배포되어 있을 수 있음. `app/share/[id]/page.tsx` 라우트와 하위 `detail` 경로는 하위호환 유지 목적으로 당분간 유지. 신규 공유는 모두 `/s/{code}`로 발급됨. 향후 충분한 시간 경과 후 레거시 라우트 deprecate 검토.

---

## 2026-03-13: 공유 짧은 링크용 share_links 초안 (실제 미적용 — DEPRECATED)

> ⚠️ **실제 DB에 반영되지 않은 역사적 기록**. 위 2026-04-08 항목 참고.

당시 문서에만 `CREATE TABLE` SQL을 적어두고 "SQL Editor에서 실행" 안내로 끝냈으나 실제 실행이 누락되었음. 코드(`/api/share-url`)는 테이블이 있다는 가정으로 배포되어 조용히 폴백 경로만 타던 상태였음.

---

## 2026-03-09: 이상형 매칭 컬럼 추가

**브랜치**: `feature/ideal-match-section`
**마이그레이션**: `supabase/migrations/20260309000001_ideal_match_columns.sql`

### saju_profiles — `ideal_match` (JSONB)

```sql
ALTER TABLE saju_profiles
  ADD COLUMN IF NOT EXISTS ideal_match jsonb;
```

**JSONB 구조:**
```json
{
  "element": "wood",
  "dayStem": "기",
  "dayStemHanja": "己",
  "traits": ["포용력 있는", "현실적인", "안정 추구"],
  "description": "갑목의 이상적인 파트너는 기토..."
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `element` | string | 이상형의 대표 오행 (wood/fire/earth/metal/water) |
| `dayStem` | string | 천간합 파트너 일간 한글 (갑/을/병/정/무/기/경/신/임/계) |
| `dayStemHanja` | string | 천간합 파트너 일간 한자 (甲/乙/丙/丁/戊/己/庚/辛/壬/癸) |
| `traits` | string[] | 이상형 성격 키워드 3개 |
| `description` | string | 이상형 설명 (명리학 근거, 2~3문장) |

**생성 원리:**
- **천간합(天干合)**: 일간 기준 자연 짝궁 (갑↔기, 을↔경, 병↔신, 정↔임, 무↔계)
- **용신(用神)**: 사주에서 가장 약한 오행을 보완해줄 수 있는 파트너

### gwansang_profiles — 이상형 관상 4컬럼

```sql
ALTER TABLE gwansang_profiles
  ADD COLUMN IF NOT EXISTS ideal_match_animal text,
  ADD COLUMN IF NOT EXISTS ideal_match_animal_korean text,
  ADD COLUMN IF NOT EXISTS ideal_match_traits text[],
  ADD COLUMN IF NOT EXISTS ideal_match_description text;
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `ideal_match_animal` | text | 이상형 동물상 영어 키 (예: "dog", "deer") |
| `ideal_match_animal_korean` | text | 이상형 동물상 한글 (예: "강아지", "사슴") |
| `ideal_match_traits` | text[] | 이상형 성격 키워드 3개 (PostgreSQL 배열) |
| `ideal_match_description` | text | 이상형 관상 설명 (관상학 근거, 2~3문장) |

**생성 원리:**
- **상보적 동물상**: 본인과 다른 동물상 (같은 동물상 금지)
- **삼정/오관 보완**: 관상학적으로 부족한 부분을 채워주는 이목구비 특성

### Edge Function 응답 변경

**`generate-saju-insight`** — 응답에 `idealMatch` 객체 추가:
```typescript
interface SajuInsightResponse {
  // ... 기존 필드 ...
  idealMatch: {
    element: string
    dayStem: string
    dayStemHanja: string
    traits: string[]
    description: string
  }
}
```

**`generate-gwansang-reading`** — 응답에 4개 필드 추가:
```typescript
interface GwansangReadingResponse {
  // ... 기존 필드 ...
  ideal_match_animal: string
  ideal_match_animal_korean: string
  ideal_match_traits: string[]
  ideal_match_description: string
}
```

### 웹 결과 페이지 반영 시 참고

사주 결과 페이지에서 이상형 섹션 표시:
```typescript
// saju_profiles에서 ideal_match JSONB 읽기
const idealMatch = sajuProfile.ideal_match as {
  element: string
  dayStem: string
  dayStemHanja: string
  traits: string[]
  description: string
} | null

if (idealMatch) {
  // 천간합 파트너 배지: `${idealMatch.dayStem}(${idealMatch.dayStemHanja})`
  // 키워드 칩: idealMatch.traits.map(...)
  // 설명: idealMatch.description
}
```

관상 결과 페이지에서 이상형 섹션 표시:
```typescript
// gwansang_profiles에서 개별 컬럼 읽기
const {
  ideal_match_animal,
  ideal_match_animal_korean,
  ideal_match_traits,
  ideal_match_description,
} = gwansangProfile

if (ideal_match_description) {
  // 동물상 배지: `${ideal_match_animal_korean}상`
  // 키워드 칩: ideal_match_traits.map(...)
  // 설명: ideal_match_description
}
```

### UI 디자인 참고 (Flutter 구현 기준)

**사주 이상형 섹션:**
- 섹션 제목: "잘 맞는 이상형의 사주"
- 카드 내부: 하트 아이콘 + 천간합 파트너 일간(한글/한자) 배지
- 키워드 칩 3개 (outlined, rounded)
- 설명 텍스트 (opacity 0.8)

**관상 이상형 섹션:**
- 섹션 제목: "잘 맞는 이상형의 관상" (mysticGlow 색상)
- 동물상 배지 ("강아지상" 등)
- 키워드 칩 3개
- 설명 텍스트

두 섹션 모두 결과 페이지의 **마지막 분석 섹션** (액션 버튼 바로 위)에 위치.
