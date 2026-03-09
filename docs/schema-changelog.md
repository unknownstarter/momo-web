# DB 스키마 변경 이력 (momo 앱 → momo-web 동기화)

> momo 네이티브 앱(`/Users/noah/momo`)에서 발생한 DB 스키마 변경을 추적합니다.
> 웹 프로젝트에서 해당 테이블/컬럼을 사용할 때 반드시 참조하세요.

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
