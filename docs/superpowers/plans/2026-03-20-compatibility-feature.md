# 궁합(Compatibility) 기능 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공유 링크를 통한 바이럴 루프를 "사주 결과 구경"에서 "궁합 확인"으로 전환하여, 재공유율과 리텐션을 높인다.

**Architecture:** 기존 `calculate-compatibility` + `generate-match-story` Edge Function을 웹 API Route에서 오케스트레이션하고, 결과 페이지에 궁합 탭 + 공유 페이지에 궁합 유도 바텀시트를 추가한다. Supabase 스키마/RLS/Edge Function 코드 변경 없이 클라이언트 코드만 작성한다.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, Supabase (admin client), Framer Motion

**설계서:** `docs/plans/compatibility-feature.md`

**⚠️ 시작 전 반드시:** `git checkout -b feature/compatibility` 로 feature 브랜치를 먼저 생성할 것.

---

## 참조 문서

- `docs/plans/compatibility-feature.md` — 전체 설계서 (비용, 바이럴 설계 포함)
- `docs/design/design-system.md` — 디자인 토큰
- `CLAUDE.md` — 프로젝트 규칙 (Supabase 변경 금지, 레이아웃 등)

## 디자인 컨셉 — 앱 1:1 매핑

궁합 UI는 Flutter 앱의 디자인을 웹에 1:1로 재현한다.

### 색상 토큰 (이미 tailwind.config.ts에 존재)

| 등급 | 점수 | Tailwind 클래스 | 헥스 |
|------|------|----------------|------|
| 천생연분 | 90~100 | `compat-destined` | `#C27A88` |
| 최고의 인연 | 75~89 | `compat-excellent` | `#C49A7C` |
| 좋은 인연 | 60~74 | `compat-good` | `#A8B0A0` |
| 보통 인연 | 40~59 | `compat-average` | `#959EA2` |
| 도전적 인연 | 0~39 | `compat-average` | `#959EA2` (같은 색) |

### 특수 색상

- `MYSTIC_GLOW` (`#C8B68E`): 천생연분(90+) 전용 글로우. 이미 `lib/result-tokens.ts`와 `tailwind.config.ts`에 정의됨.

### 게이지

앱의 `CompatibilityGauge` (원형 CustomPaint) → 웹에서 **SVG arc + CSS transition**으로 재현.
- 크기: 리스트 카드 56px, 상세 바텀시트 140px
- 12시 방향에서 시계방향 arc
- 1800ms `ease-out` 애니메이션
- 천생연분(90+)이면 `box-shadow: 0 0 32px #C8B68E4D, 0 0 64px #C8B68E26`

### 캐릭터 쌍 표현

앱의 `compatibility_preview_page.dart`: 내 캐릭터 64px 원 + ♥ + 상대 캐릭터 64px 원.
웹에서도 동일하게 구현. CLAUDE.md의 "영역 안 캐릭터 표시 규칙" 준수:
- `rounded-full overflow-hidden flex items-center justify-center`
- `object-contain`, 컨테이너보다 작은 이미지
- 오행 파스텔 배경 + 오행 메인 색 테두리

### AI 스토리 컨테이너

앱에서 `mysticGlow.15` 배경 + 골드 테두리. 웹에서는:
```
border: 1px solid #C8B68E4D
background: #C8B68E0F
border-radius: rounded-card (16px)
padding: p-4
```

---

## 파일 구조

### 신규 파일

| 파일 | 책임 |
|------|------|
| `lib/compatibility.ts` | 궁합 비즈니스 로직: 캐시 조회, Edge Function 호출, 리스트 조회, AI 스토리 폴링. 서버 전용. |
| `app/api/calculate-compatibility/route.ts` | POST — 1:1 궁합 계산 오케스트레이션 (캐시 → Edge Function → DB 저장 → AI 스토리). |
| `app/api/compatibility-list/route.ts` | GET — 내 궁합 목록 반환 (상대 프로필 join). |
| `app/api/compatibility-story/route.ts` | GET — AI 스토리 폴링 전용 경량 API (partnerId → ai_story 필드만 반환). |
| `app/api/og-compat/route.tsx` | GET — 궁합 전용 OG 이미지 생성 (캐릭터 + 점수 + 등급). |
| `components/result/compatibility-tab.tsx` | 결과 페이지 궁합 탭 콘텐츠: 리스트 + 빈 상태 + 공유 CTA. 클라이언트 컴포넌트. |
| `components/result/compatibility-detail-sheet.tsx` | 궁합 상세 바텀시트: 캐릭터 쌍, 게이지, 등급, 강점/도전, AI 스토리 폴링. 클라이언트 컴포넌트. |
| `components/result/compatibility-gauge.tsx` | SVG 원형 게이지: 점수 애니메이션, 등급별 색상, 천생연분 글로우. 클라이언트 컴포넌트. |
| `components/share-compatibility-prompt.tsx` | 공유 페이지 궁합 유도 바텀시트: 2초 후 등장, CTA 분기. 클라이언트 컴포넌트. |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `lib/constants.ts` | `COMPATIBILITY_GRADES` 상수 추가 |
| `lib/result-tokens.ts` | `getCompatColor()` 헬퍼 추가 |
| `lib/analytics.ts` | 궁합 GA 이벤트 5개 추가 |
| `app/result/page.tsx` | 탭 유니온에 `"compatibility"` 추가, `useSearchParams`, sessionStorage 처리, `CompatibilityTab` 렌더링 |
| `app/s/[code]/page.tsx` | 뷰어 세션 확인 + `ShareCompatibilityPrompt` 렌더링 |
| `app/share/[id]/page.tsx` | 동일 |

---

## Task 1: 궁합 상수 & 토큰

**Files:**
- Modify: `lib/constants.ts`
- Modify: `lib/result-tokens.ts`

- [ ] **Step 1: `lib/constants.ts`에 궁합 등급 상수 추가**

파일 맨 아래에 추가:

```typescript
/** 궁합 등급 (앱 CompatibilityGrade 1:1 매핑)
 * ⚠️ 반드시 minScore 내림차순으로 유지할 것! Array.find()가 첫 매칭을 반환하므로
 * 순서가 바뀌면 등급 판정이 깨짐. */
export const COMPATIBILITY_GRADES = [
  { key: "destined", label: "천생연분", description: "하늘이 맺어준 인연이에요", minScore: 90 },
  { key: "excellent", label: "최고의 인연", description: "별이 겹치는 특별한 사이예요", minScore: 75 },
  { key: "good", label: "좋은 인연", description: "함께 성장할 수 있는 관계예요", minScore: 60 },
  { key: "average", label: "보통 인연", description: "알아갈수록 깊어지는 인연이에요", minScore: 40 },
  { key: "challenging", label: "도전적 인연", description: "서로 다르기에 새로운 시각을 배울 수 있어요", minScore: 0 },
] as const;

export type CompatibilityGradeKey = typeof COMPATIBILITY_GRADES[number]["key"];

export function getCompatibilityGrade(score: number) {
  return COMPATIBILITY_GRADES.find((g) => score >= g.minScore) ?? COMPATIBILITY_GRADES[COMPATIBILITY_GRADES.length - 1];
}
```

- [ ] **Step 2: `lib/result-tokens.ts`에 궁합 색상 헬퍼 추가**

파일 맨 아래에 추가:

```typescript
/** 궁합 점수 → 색상 (앱 compatibilityColor 1:1, COMPATIBILITY_GRADES와 동일 기준) */
export function getCompatColor(score: number): string {
  if (score >= 90) return "#C27A88"; // compat-destined
  if (score >= 75) return "#C49A7C"; // compat-excellent
  if (score >= 60) return "#A8B0A0"; // compat-good
  return "#959EA2";                  // compat-average
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/constants.ts lib/result-tokens.ts
git commit -m "feat: 궁합 등급 상수 및 색상 헬퍼 추가"
```

---

## Task 2: GA 이벤트 추가

**Files:**
- Modify: `lib/analytics.ts`

- [ ] **Step 1: 궁합 GA 이벤트 함수 5개 추가**

`lib/analytics.ts` 파일 맨 아래, `export { MEASUREMENT_ID };` 직전에 추가:

```typescript
/** 공유 페이지에서 궁합 바텀시트 노출 */
export function trackViewCompatibilityPrompt(): void {
  trackEvent("view_compatibility_bottomsheet");
}

/** 궁합 CTA 클릭 (공유 페이지) */
export function trackClickCompatibilityCta(): void {
  trackEvent("click_compatibility_cta");
}

/** 결과 페이지 궁합 탭 진입 */
export function trackViewCompatibilityTab(): void {
  trackEvent("view_compatibility_tab");
}

/** 궁합 상세 바텀시트 열림 */
export function trackViewCompatibilityDetail(score: number): void {
  trackEvent("view_compatibility_detail", { score });
}

/** 궁합 결과 공유 */
export function trackShareCompatibilityResult(): void {
  trackEvent("share_compatibility_result");
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/analytics.ts
git commit -m "feat: 궁합 GA 이벤트 트래킹 함수 추가"
```

---

## Task 3: 궁합 비즈니스 로직 (`lib/compatibility.ts`)

**Files:**
- Create: `lib/compatibility.ts`

- [ ] **Step 1: 타입 정의 및 캐시 조회 함수**

`lib/compatibility.ts` 생성:

```typescript
/**
 * 궁합 비즈니스 로직 — 서버 전용.
 * Supabase admin client로 saju_compatibility 테이블 읽기/쓰기.
 * Edge Function 호출 오케스트레이션.
 */
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------
export interface CompatibilityResult {
  id: string;
  partnerId: string;
  partnerName: string | null;
  partnerCharacterType: string | null;
  partnerDominantElement: string | null;
  partnerGender: string | null;
  myGender: string | null;
  score: number;
  fiveElementScore: number | null;
  dayPillarScore: number | null;
  overallAnalysis: string | null;
  strengths: string[];
  challenges: string[];
  advice: string | null;
  aiStory: string | null;
  relationType: "friend" | "romantic";
  calculatedAt: string | null;
}

interface SajuForCompat {
  yearPillar: { stem: string; branch: string };
  monthPillar: { stem: string; branch: string };
  dayPillar: { stem: string; branch: string };
  hourPillar: { stem: string; branch: string } | null;
  fiveElements: Record<string, number>;
  dominantElement: string | null;
}

// ---------------------------------------------------------------------------
// 캐시 조회 (양방향)
// ---------------------------------------------------------------------------
export async function fetchCachedCompatibility(
  myProfileId: string,
  partnerProfileId: string,
): Promise<CompatibilityResult | null> {
  const supabase = createAdminClient();

  // 양방향 조회: (me, partner) OR (partner, me)
  const { data } = await supabase
    .from("saju_compatibility")
    .select("*")
    .or(
      `and(user_id.eq.${myProfileId},partner_id.eq.${partnerProfileId}),and(user_id.eq.${partnerProfileId},partner_id.eq.${myProfileId})`,
    )
    .maybeSingle();

  if (!data) return null;

  // user_id 기준으로 내/상대 매핑 (⚠️ 성별은 테이블에 내장 — profiles JOIN 불필요)
  const iAmUser = data.user_id === myProfileId;
  const partnerId = iAmUser ? data.partner_id : data.user_id;
  const myGender: string | null = iAmUser ? data.user_gender : data.partner_gender;
  const partnerGender: string | null = iAmUser ? data.partner_gender : data.user_gender;

  // 상대방 프로필 조회 (이름, 캐릭터, 오행만 — 성별은 테이블에서 이미 확보)
  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("name, character_type, dominant_element")
    .eq("id", partnerId)
    .maybeSingle();

  return {
    id: data.id,
    partnerId,
    partnerName: partnerProfile?.name ?? null,
    partnerCharacterType: partnerProfile?.character_type ?? null,
    partnerDominantElement: partnerProfile?.dominant_element ?? null,
    partnerGender,
    myGender,
    score: data.total_score ?? 0,
    fiveElementScore: data.five_element_score ?? null,
    dayPillarScore: data.day_pillar_score ?? null,
    overallAnalysis: data.overall_analysis ?? null,
    strengths: data.strengths ?? [],
    challenges: data.challenges ?? [],
    advice: data.advice ?? null,
    aiStory: data.ai_story ?? null,
    // ⚠️ 성별 누락 시 안전 폴백: "friend" (romantic → AI 스토리 호출 방지)
    relationType: myGender && partnerGender && myGender !== partnerGender ? "romantic" : "friend",
    calculatedAt: data.calculated_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// 사주 데이터 조회 (궁합 계산용)
// ---------------------------------------------------------------------------
async function fetchSajuForCompat(profileId: string): Promise<SajuForCompat | null> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("saju_profile_id, dominant_element")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.saju_profile_id) return null;

  const { data: saju } = await supabase
    .from("saju_profiles")
    .select("year_pillar, month_pillar, day_pillar, hour_pillar, five_elements, dominant_element")
    .eq("id", profile.saju_profile_id)
    .maybeSingle();

  if (!saju) return null;

  const toPillar = (p: unknown) => {
    const obj = p as Record<string, string> | null;
    return obj ? { stem: obj.stem ?? obj.heavenlyStem ?? "", branch: obj.branch ?? obj.earthlyBranch ?? "" } : null;
  };

  const yp = toPillar(saju.year_pillar);
  const mp = toPillar(saju.month_pillar);
  const dp = toPillar(saju.day_pillar);
  if (!yp || !mp || !dp) return null;

  return {
    yearPillar: yp,
    monthPillar: mp,
    dayPillar: dp,
    hourPillar: toPillar(saju.hour_pillar),
    fiveElements: (saju.five_elements as Record<string, number>) ?? {},
    dominantElement: saju.dominant_element ?? profile.dominant_element ?? null,
  };
}

// ---------------------------------------------------------------------------
// 궁합 계산 + 저장
// ---------------------------------------------------------------------------
export async function computeCompatibility(
  myProfileId: string,
  partnerProfileId: string,
  accessToken: string,
): Promise<CompatibilityResult | null> {
  // 1. 캐시 확인 (가장 빈번한 케이스 — 빠르게 반환)
  const cached = await fetchCachedCompatibility(myProfileId, partnerProfileId);
  if (cached) return cached;

  // 2. 양쪽 프로필 조회 (성별은 upsert에 필수, 이름은 match-story에 필요)
  const supabase = createAdminClient();
  const { data: profilePair } = await supabase
    .from("profiles")
    .select("id, name, gender")
    .in("id", [myProfileId, partnerProfileId]);

  const myProfileData = profilePair?.find((p) => p.id === myProfileId);
  const partnerProfileData = profilePair?.find((p) => p.id === partnerProfileId);

  // ⚠️ gender가 없으면 upsert 시 NOT NULL 제약 위반 → 조기 종료
  if (!myProfileData?.gender || !partnerProfileData?.gender) return null;

  // 3. 양쪽 사주 조회
  const [mySaju, partnerSaju] = await Promise.all([
    fetchSajuForCompat(myProfileId),
    fetchSajuForCompat(partnerProfileId),
  ]);
  if (!mySaju || !partnerSaju) return null;

  // 4. calculate-compatibility Edge Function 호출
  const { data: calcResult, error: calcError } = await supabase.functions.invoke(
    "calculate-compatibility",
    {
      body: { mySaju, partnerSaju },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (calcError || !calcResult) return null;

  // 5. saju_compatibility 테이블에 upsert (⚠️ user_gender, partner_gender 필수!)
  const row = {
    user_id: myProfileId,
    partner_id: partnerProfileId,
    user_gender: myProfileData.gender,
    partner_gender: partnerProfileData.gender,
    total_score: calcResult.score,
    five_element_score: calcResult.fiveElementScore,
    day_pillar_score: calcResult.dayPillarScore,
    overall_analysis: calcResult.overallAnalysis,
    strengths: calcResult.strengths,
    challenges: calcResult.challenges,
    advice: calcResult.advice,
    calculated_at: calcResult.calculatedAt,
  };

  await supabase
    .from("saju_compatibility")
    .upsert(row, { onConflict: "user_id,partner_id" })
    .select("id")
    .maybeSingle();

  // 6. generate-match-story 호출 — 이성(연인 궁합)만!
  // ⚠️ 동성(친구 궁합)에서는 절대 호출 금지.
  // generate-match-story 시스템 프롬프트가 "로맨틱한 톤"으로 고정되어 있어
  // 동성 간에 "운명적 인연..." 텍스트가 나오면 부적절함.
  const isOppositeGender = myProfileData.gender !== partnerProfileData.gender;

  if (isOppositeGender) {
    supabase.functions
      .invoke("generate-match-story", {
        body: {
          userId: myProfileId,
          partnerId: partnerProfileId,
          myName: myProfileData.name ?? "나",
          partnerName: partnerProfileData.name ?? "상대방",
          mySaju: {
            dayPillar: mySaju.dayPillar,
            fiveElements: mySaju.fiveElements,
            dominantElement: mySaju.dominantElement,
          },
          partnerSaju: {
            dayPillar: partnerSaju.dayPillar,
            fiveElements: partnerSaju.fiveElements,
            dominantElement: partnerSaju.dominantElement,
          },
          score: calcResult.score,
          strengths: calcResult.strengths,
          challenges: calcResult.challenges,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .catch(() => {});
  }

  // 7. 결과 직접 구성 (⚠️ fetchCachedCompatibility 재호출 금지 — profiles 이중 쿼리 방지)
  // 이 시점에서 필요한 데이터를 이미 모두 보유:
  // - 점수/분석: calcResult
  // - 성별: myProfileData, partnerProfileData
  // - 이름: myProfileData.name, partnerProfileData.name
  // 캐릭터/오행은 profiles에서 추가 조회 필요 (이 정보만 1회 쿼리)
  const { data: partnerDetail } = await supabase
    .from("profiles")
    .select("character_type, dominant_element")
    .eq("id", partnerProfileId)
    .maybeSingle();

  return {
    id: "", // upsert 결과에서 가져올 수 있지만, 리스트 재조회 시 채워짐
    partnerId: partnerProfileId,
    partnerName: partnerProfileData.name ?? null,
    partnerCharacterType: partnerDetail?.character_type ?? null,
    partnerDominantElement: partnerDetail?.dominant_element ?? null,
    partnerGender: partnerProfileData.gender,
    myGender: myProfileData.gender,
    score: calcResult.score ?? 0,
    fiveElementScore: calcResult.fiveElementScore ?? null,
    dayPillarScore: calcResult.dayPillarScore ?? null,
    overallAnalysis: calcResult.overallAnalysis ?? null,
    strengths: calcResult.strengths ?? [],
    challenges: calcResult.challenges ?? [],
    advice: calcResult.advice ?? null,
    aiStory: null, // fire-and-forget이므로 첫 반환은 항상 null
    relationType: isOppositeGender ? "romantic" : "friend",
    calculatedAt: calcResult.calculatedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// 궁합 리스트 조회
// ---------------------------------------------------------------------------
export async function fetchCompatibilityList(
  myProfileId: string,
): Promise<CompatibilityResult[]> {
  const supabase = createAdminClient();

  // 내가 user_id 또는 partner_id인 모든 궁합 조회
  const { data } = await supabase
    .from("saju_compatibility")
    .select("*")
    .or(`user_id.eq.${myProfileId},partner_id.eq.${myProfileId}`)
    .order("total_score", { ascending: false });

  if (!data || data.length === 0) return [];

  // 상대방 profile_id 수집
  const partnerIds = data.map((d) =>
    d.user_id === myProfileId ? d.partner_id : d.user_id,
  );

  // 상대방 프로필 배치 조회 (이름, 캐릭터, 오행만 — 성별은 테이블에서 이미 확보)
  const { data: partners } = await supabase
    .from("profiles")
    .select("id, name, character_type, dominant_element")
    .in("id", partnerIds);

  const partnerMap = new Map(
    (partners ?? []).map((p) => [p.id, p]),
  );

  return data.map((d) => {
    // user_id 기준으로 내/상대 매핑 (⚠️ 성별은 테이블에 내장)
    const iAmUser = d.user_id === myProfileId;
    const partnerId = iAmUser ? d.partner_id : d.user_id;
    const myGender: string | null = iAmUser ? d.user_gender : d.partner_gender;
    const partnerGender: string | null = iAmUser ? d.partner_gender : d.user_gender;
    const partner = partnerMap.get(partnerId);

    return {
      id: d.id,
      partnerId,
      partnerName: partner?.name ?? null,
      partnerCharacterType: partner?.character_type ?? null,
      partnerDominantElement: partner?.dominant_element ?? null,
      partnerGender,
      myGender,
      score: d.total_score ?? 0,
      fiveElementScore: d.five_element_score ?? null,
      dayPillarScore: d.day_pillar_score ?? null,
      overallAnalysis: d.overall_analysis ?? null,
      strengths: d.strengths ?? [],
      challenges: d.challenges ?? [],
      advice: d.advice ?? null,
      aiStory: d.ai_story ?? null,
      // ⚠️ 성별 누락 시 안전 폴백: "friend" (romantic → AI 스토리 호출 방지)
    relationType: myGender && partnerGender && myGender !== partnerGender ? "romantic" : "friend",
      calculatedAt: d.calculated_at ?? null,
    };
  });
}
```

- [ ] **Step 2: AI 스토리 폴링 함수 추가**

파일 맨 아래에 추가:

```typescript
// ---------------------------------------------------------------------------
// AI 스토리 폴링 (경량 — 바텀시트에서 사용)
// ---------------------------------------------------------------------------
export async function fetchCompatibilityAiStory(
  myProfileId: string,
  partnerProfileId: string,
): Promise<{ aiStory: string | null }> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("saju_compatibility")
    .select("ai_story")
    .or(
      `and(user_id.eq.${myProfileId},partner_id.eq.${partnerProfileId}),and(user_id.eq.${partnerProfileId},partner_id.eq.${myProfileId})`,
    )
    .maybeSingle();

  return { aiStory: data?.ai_story ?? null };
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/compatibility.ts
git commit -m "feat: 궁합 비즈니스 로직 모듈 추가 (캐시, 계산, 리스트, AI 스토리 폴링)"
```

---

## Task 4: API Routes

**Files:**
- Create: `app/api/calculate-compatibility/route.ts`
- Create: `app/api/compatibility-list/route.ts`
- Create: `app/api/compatibility-story/route.ts`

- [ ] **Step 1: POST `/api/calculate-compatibility`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCompatibility } from "@/lib/compatibility";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partnerProfileId } = await req.json();
    if (!partnerProfileId || typeof partnerProfileId !== "string") {
      return NextResponse.json({ error: "partnerProfileId required" }, { status: 400 });
    }

    // 자기 자신과의 궁합 방지
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!myProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (myProfile.id === partnerProfileId) {
      return NextResponse.json({ error: "Cannot calculate compatibility with yourself" }, { status: 400 });
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? "";

    const result = await computeCompatibility(myProfile.id, partnerProfileId, accessToken);
    if (!result) {
      return NextResponse.json({ error: "Compatibility calculation failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: result });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: GET `/api/compatibility-list`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCompatibilityList } from "@/lib/compatibility";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!myProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const list = await fetchCompatibilityList(myProfile.id);
    return NextResponse.json({ ok: true, data: list });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: GET `/api/compatibility-story` (AI 스토리 폴링 전용)**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCompatibilityAiStory } from "@/lib/compatibility";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!myProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const result = await fetchCompatibilityAiStory(myProfile.id, partnerId);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/calculate-compatibility/route.ts app/api/compatibility-list/route.ts app/api/compatibility-story/route.ts
git commit -m "feat: 궁합 API 라우트 추가 (계산, 리스트, AI 스토리 폴링)"
```

---

## Task 5: 원형 게이지 컴포넌트

**Files:**
- Create: `components/result/compatibility-gauge.tsx`

- [ ] **Step 1: SVG 원형 게이지 구현**

앱의 `CompatibilityGauge` (CustomPaint)를 SVG arc + CSS transition으로 재현.

```typescript
"use client";

import { useEffect, useState } from "react";
import { getCompatColor } from "@/lib/result-tokens";
import { getCompatibilityGrade } from "@/lib/constants";

interface CompatibilityGaugeProps {
  score: number;
  size?: number; // px, default 140
  showLabel?: boolean; // 등급 라벨 표시
}

export function CompatibilityGauge({ score, size = 140, showLabel = true }: CompatibilityGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // 마운트 후 requestAnimationFrame으로 트리거
    const raf = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const color = getCompatColor(score);
  const grade = getCompatibilityGrade(score);
  const isDestined = score >= 90;

  // SVG arc 계산
  const strokeWidth = size * 0.06;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const trackOffset = circumference; // 전체 원
  const arcOffset = circumference - progress;

  const fontSize = size * 0.28;
  const labelSize = size * 0.10;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{
        width: size,
        height: size,
        ...(isDestined
          ? { filter: `drop-shadow(0 0 32px #C8B68E4D) drop-shadow(0 0 64px #C8B68E26)` }
          : {}),
      }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* 트랙 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-ink/[0.06]"
          strokeDasharray={circumference}
          strokeDashoffset={0}
        />
        {/* 프로그레스 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={arcOffset}
          style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-ink"
          style={{ fontSize, lineHeight: 1 }}
        >
          {animatedScore}
        </span>
        {showLabel && (
          <span
            className="font-medium mt-1"
            style={{ fontSize: labelSize, color }}
          >
            {grade.label}
          </span>
        )}
      </div>
    </div>
  );
}
```

Note: `animatedScore`는 숫자 카운트 애니메이션이 아니라 SVG arc 애니메이션을 트리거하기 위한 값. 숫자 자체는 즉시 표시하되, arc가 1.8초 동안 채워지는 효과.

- [ ] **Step 2: 커밋**

```bash
git add components/result/compatibility-gauge.tsx
git commit -m "feat: 궁합 원형 게이지 SVG 컴포넌트 추가"
```

---

## Task 6: 궁합 상세 바텀시트

**Files:**
- Create: `components/result/compatibility-detail-sheet.tsx`

- [ ] **Step 1: 바텀시트 구현**

앱의 `CompatibilityPreviewPage`를 웹 `BottomSheet` 기반으로 재현.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CompatibilityGauge } from "@/components/result/compatibility-gauge";
import { SajuCard } from "@/components/result/saju-card";
import { getCompatibilityGrade } from "@/lib/constants";
import { getCompatColor, ELEMENT_COLORS, elementKey, getCharacterTypeFromElement, MYSTIC_GLOW } from "@/lib/result-tokens";
import type { CompatibilityResult } from "@/lib/compatibility";
import { trackShareCompatibilityResult } from "@/lib/analytics";

const AI_STORY_POLL_INTERVAL = 5000; // 5초
const AI_STORY_POLL_MAX = 3;         // 최대 3회 (15초)

interface CompatibilityDetailSheetProps {
  open: boolean;
  onClose: () => void;
  compatibility: CompatibilityResult;
  myName: string;
  myCharacterType: string | null;
  myDominantElement: string | null;
  shareUrl?: string | null;
  cachedAiStory: string | null;
  onStoryLoaded: (partnerId: string, story: string) => void;
}

export function CompatibilityDetailSheet({
  open,
  onClose,
  compatibility: c,
  myName,
  myCharacterType,
  myDominantElement,
  shareUrl,
  cachedAiStory,
  onStoryLoaded,
}: CompatibilityDetailSheetProps) {
  const grade = getCompatibilityGrade(c.score);
  const color = getCompatColor(c.score);
  const isDestined = c.score >= 90;

  const myElKey = elementKey(myDominantElement);
  const partnerElKey = elementKey(c.partnerDominantElement);
  const myChar = myCharacterType ?? getCharacterTypeFromElement(myDominantElement);
  const partnerChar = c.partnerCharacterType ?? getCharacterTypeFromElement(c.partnerDominantElement);

  const handleShare = async () => {
    trackShareCompatibilityResult();
    const text = `${myName}님과 ${c.partnerName ?? "친구"}님의 사주 궁합: ${c.score}점 - ${grade.label}!`;
    const url = shareUrl ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} showCloseButton>
      <div className="flex flex-col items-center space-y-6">
        {/* 캐릭터 쌍 */}
        <div className="flex items-center gap-3">
          <CharacterCircle element={myElKey} characterType={myChar} size={64} />
          <span className="text-2xl">♥</span>
          <CharacterCircle element={partnerElKey} characterType={partnerChar} size={64} />
        </div>

        {/* 이름 */}
        <p className="text-sm text-ink-muted">
          {myName} & {c.partnerName ?? "친구"}
        </p>

        {/* 관계 유형 배지 */}
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          {c.relationType === "friend" ? "친구 궁합" : "연인 궁합"}
        </span>

        {/* 게이지 */}
        <CompatibilityGauge score={c.score} size={140} />

        {/* 등급 설명 */}
        <p className="text-sm text-ink-muted text-center">{grade.description}</p>

        {/* 서브스코어 */}
        {(c.fiveElementScore != null || c.dayPillarScore != null) && (
          <div className="flex gap-4 w-full">
            {c.fiveElementScore != null && (
              <SajuCard variant="flat" className="flex-1 text-center">
                <p className="text-xs text-ink-muted mb-1">오행 궁합</p>
                <p className="text-lg font-bold" style={{ color }}>{c.fiveElementScore}<span className="text-xs font-normal text-ink-muted">/100</span></p>
              </SajuCard>
            )}
            {c.dayPillarScore != null && (
              <SajuCard variant="flat" className="flex-1 text-center">
                <p className="text-xs text-ink-muted mb-1">일주 궁합</p>
                <p className="text-lg font-bold" style={{ color }}>{c.dayPillarScore}<span className="text-xs font-normal text-ink-muted">/100</span></p>
              </SajuCard>
            )}
          </div>
        )}

        {/* 강점 */}
        {c.strengths.length > 0 && (
          <div className="w-full">
            <p className="text-sm font-semibold text-ink mb-2">이런 점이 잘 맞아요</p>
            <div className="space-y-2">
              {c.strengths.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                  <span className="shrink-0 mt-0.5" style={{ color }}>•</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 도전 */}
        {c.challenges.length > 0 && (
          <div className="w-full">
            <p className="text-sm font-semibold text-ink mb-2">함께 노력하면 좋은 점</p>
            <div className="space-y-2">
              {c.challenges.slice(0, 3).map((ch, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                  <span className="shrink-0 mt-0.5 text-ink-tertiary">•</span>
                  <span>{ch}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI 인연 스토리 — 이성(연인 궁합)만 표시 + 하이브리드 폴링 */}
        {/* 동성(친구 궁합)은 generate-match-story를 호출하지 않으므로 aiStory가 항상 null */}
        {c.relationType === "romantic" && (
          <AiStorySection
            aiStory={cachedAiStory ?? c.aiStory}
            partnerId={c.partnerId}
            onStoryLoaded={onStoryLoaded}
          />
        )}

        {/* 공유 버튼 */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-button text-sm font-semibold text-white"
          style={{ backgroundColor: isDestined ? MYSTIC_GLOW : color }}
        >
          이 궁합 결과 공유하기
        </button>
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// AI 인연 스토리 섹션 (하이브리드 폴링)
// ---------------------------------------------------------------------------
function AiStorySection({
  aiStory: initialStory,
  partnerId,
  onStoryLoaded,
}: {
  aiStory: string | null;
  partnerId: string;
  onStoryLoaded: (partnerId: string, story: string) => void;
}) {
  const [story, setStory] = useState<string | null>(initialStory);
  const [pollCount, setPollCount] = useState(0);
  const [pollFailed, setPollFailed] = useState(false);

  // initialStory가 바뀌면 (다른 궁합 열 때 or 캐시에서 복원 시) 리셋
  useEffect(() => {
    setStory(initialStory);
    // 이미 스토리가 있으면 폴링 불필요 (캐시 복원 케이스)
    if (initialStory) {
      setPollCount(AI_STORY_POLL_MAX); // 폴링 방지
      setPollFailed(false);
    } else {
      setPollCount(0);
      setPollFailed(false);
    }
  }, [initialStory, partnerId]);

  // 폴링: story가 null이고 아직 최대 횟수 미만일 때
  useEffect(() => {
    if (story !== null) return;
    if (pollCount >= AI_STORY_POLL_MAX) {
      setPollFailed(true);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/compatibility-story?partnerId=${partnerId}`);
        const json = await res.json();
        if (json.ok && json.aiStory) {
          setStory(json.aiStory);
          onStoryLoaded(partnerId, json.aiStory); // 부모에게 캐시 알림
        } else {
          setPollCount((c) => c + 1);
        }
      } catch {
        setPollCount((c) => c + 1);
      }
    }, AI_STORY_POLL_INTERVAL);

    return () => clearTimeout(timer);
  }, [story, pollCount, partnerId, onStoryLoaded]);

  const handleRetry = () => {
    setPollCount(0);
    setPollFailed(false);
  };

  // 스토리 도착 → fade-in 표시
  if (story) {
    return (
      <div
        className="w-full rounded-card p-4 animate-in fade-in duration-500"
        style={{
          border: `1px solid ${MYSTIC_GLOW}4D`,
          backgroundColor: `${MYSTIC_GLOW}0F`,
        }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: MYSTIC_GLOW }}>인연 스토리</p>
        <p className="text-sm text-ink leading-relaxed">{story}</p>
      </div>
    );
  }

  // 폴링 실패 → 재시도 버튼
  if (pollFailed) {
    return (
      <div className="w-full flex flex-col items-center gap-2 py-3">
        <p className="text-sm text-ink-muted">잠시 후 다시 확인해보세요</p>
        <button
          type="button"
          onClick={handleRetry}
          className="text-xs text-ink-muted underline hover:text-ink transition-colors"
        >
          다시 확인하기
        </button>
      </div>
    );
  }

  // 폴링 중 → 분석 로딩 GIF (분석 로딩 페이지와 동일 에셋)
  return (
    <div className="w-full flex flex-col items-center gap-2 py-4">
      <img
        src="/images/characters/loading_spinner.gif"
        alt=""
        width={80}
        height={80}
        className="w-20 h-20 object-contain"
      />
      <p className="text-sm text-ink-muted">인연 스토리를 만들고 있어요...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 캐릭터 원형 (재사용 내부 컴포넌트)
// ---------------------------------------------------------------------------
function CharacterCircle({ element, characterType, size }: { element: string; characterType: string; size: number }) {
  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.metal;
  const imgSize = Math.round(size * 0.65);
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: colors.pastel,
        border: `2px solid ${colors.main}4D`,
      }}
    >
      <Image
        src={`/images/characters/${characterType}/default.png`}
        alt=""
        width={imgSize}
        height={imgSize}
        className="object-contain"
        unoptimized
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/result/compatibility-detail-sheet.tsx
git commit -m "feat: 궁합 상세 바텀시트 컴포넌트 추가"
```

---

## Task 7: 궁합 탭 컴포넌트

**Files:**
- Create: `components/result/compatibility-tab.tsx`

- [ ] **Step 1: 궁합 탭 구현**

리스트 + 빈 상태 + 자동 궁합 계산 + 상세 바텀시트 연결.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { SajuCard } from "@/components/result/saju-card";
import { CompatibilityGauge } from "@/components/result/compatibility-gauge";
import { CompatibilityDetailSheet } from "@/components/result/compatibility-detail-sheet";
import { getCompatColor, ELEMENT_COLORS, elementKey, getCharacterTypeFromElement } from "@/lib/result-tokens";
import { getCompatibilityGrade } from "@/lib/constants";
import { trackViewCompatibilityTab, trackViewCompatibilityDetail } from "@/lib/analytics";
import type { CompatibilityResult } from "@/lib/compatibility";

interface CompatibilityTabProps {
  referralPartnerId: string | null;
  myName: string;
  myCharacterType: string | null;
  myDominantElement: string | null;
  shareUrl: string | null;
}

export function CompatibilityTab({
  referralPartnerId,
  myName,
  myCharacterType,
  myDominantElement,
  shareUrl,
}: CompatibilityTabProps) {
  const [list, setList] = useState<CompatibilityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompatibilityResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  // AI 스토리 캐시 — 폴링으로 받은 스토리를 바텀시트 재오픈 시에도 유지
  // key: partnerId, value: aiStory
  const [storyCacheMap, setStoryCacheMap] = useState<Record<string, string>>({});

  const onStoryLoaded = useCallback((partnerId: string, story: string) => {
    setStoryCacheMap((prev) => ({ ...prev, [partnerId]: story }));
  }, []);

  // GA 트래킹
  useEffect(() => {
    trackViewCompatibilityTab();
  }, []);

  // 리스트 로드
  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/compatibility-list");
      const json = await res.json();
      if (json.ok) setList(json.data ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // 레퍼럴 파트너 자동 궁합 계산
  useEffect(() => {
    if (!referralPartnerId || calculating) return;

    // 이미 리스트에 있으면 바로 열기
    const existing = list.find((c) => c.partnerId === referralPartnerId);
    if (existing) {
      setSelected(existing);
      return;
    }

    if (!loading) {
      setCalculating(true);
      fetch("/api/calculate-compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerProfileId: referralPartnerId }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.ok && json.data) {
            setSelected(json.data);
            loadList(); // 리스트 새로고침
          }
        })
        .catch(() => {})
        .finally(() => setCalculating(false));
    }
  }, [referralPartnerId, list, loading, calculating, loadList]);

  const handleShare = async () => {
    const url = shareUrl ?? window.location.href;
    const text = "나랑 사주 궁합 몇 점인지 확인해봐!";
    if (navigator.share) {
      try { await navigator.share({ text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  if (loading || calculating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="animate-spin w-6 h-6 border-2 border-ink-tertiary border-t-transparent rounded-full" />
        <p className="text-sm text-ink-muted mt-3">
          {calculating ? "궁합을 계산하고 있어요..." : "불러오는 중..."}
        </p>
      </div>
    );
  }

  // 빈 상태
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex -space-x-2 mb-4">
          <CharacterBubble element={elementKey(myDominantElement)} characterType={myCharacterType ?? getCharacterTypeFromElement(myDominantElement)} />
          <CharacterBubble element="metal" characterType="soedongi" />
        </div>
        <p className="text-ink font-semibold">아직 궁합 본 친구가 없어요</p>
        <p className="text-sm text-ink-muted mt-1">
          친구에게 링크를 공유하면 궁합을 볼 수 있어요!
        </p>
        <button
          type="button"
          onClick={handleShare}
          className="mt-6 px-6 py-3 rounded-button text-sm font-semibold text-white bg-ink"
        >
          궁합 요청 링크 공유하기
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-ink-muted">궁합 본 친구 ({list.length}명)</p>
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            className="w-full text-left active:scale-[0.98] transition-transform"
            onClick={() => {
              trackViewCompatibilityDetail(c.score);
              setSelected(c);
            }}
          >
            <CompatibilityListCard compatibility={c} />
          </button>
        ))}
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 mt-2 rounded-button border border-hanji-border text-sm font-medium text-ink-muted hover:bg-hanji-secondary transition-colors"
        >
          + 다른 친구와도 궁합 보기
        </button>
      </div>

      {selected && (
        <CompatibilityDetailSheet
          open={!!selected}
          onClose={() => setSelected(null)}
          compatibility={selected}
          myName={myName}
          myCharacterType={myCharacterType}
          myDominantElement={myDominantElement}
          shareUrl={shareUrl}
          cachedAiStory={storyCacheMap[selected.partnerId] ?? null}
          onStoryLoaded={onStoryLoaded}
        />
      )}
    </>
  );
}

// 리스트 카드
function CompatibilityListCard({ compatibility: c }: { compatibility: CompatibilityResult }) {
  const color = getCompatColor(c.score);
  const grade = getCompatibilityGrade(c.score);
  const elKey = elementKey(c.partnerDominantElement);
  const charType = c.partnerCharacterType ?? getCharacterTypeFromElement(c.partnerDominantElement);
  const colors = ELEMENT_COLORS[elKey] ?? ELEMENT_COLORS.metal;

  return (
    <SajuCard variant="elevated" className="flex items-center gap-3">
      {/* 미니 게이지 */}
      <div className="shrink-0">
        <CompatibilityGauge score={c.score} size={56} showLabel={false} />
      </div>
      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: colors.pastel, border: `1px solid ${colors.main}4D` }}
          >
            <Image
              src={`/images/characters/${charType}/default.png`}
              alt="" width={16} height={16}
              className="object-contain" unoptimized
            />
          </div>
          <span className="text-sm font-semibold text-ink truncate">{c.partnerName ?? "친구"}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            {c.relationType === "friend" ? "친구" : "연인"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg font-bold" style={{ color }}>{c.score}점</span>
          <span className="text-xs text-ink-muted">{grade.label}</span>
        </div>
        {c.overallAnalysis && (
          <p className="text-xs text-ink-muted mt-0.5 truncate">{c.overallAnalysis}</p>
        )}
      </div>
      {/* 화살표 */}
      <svg className="w-4 h-4 text-ink-tertiary shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SajuCard>
  );
}

// 빈 상태 캐릭터 버블
function CharacterBubble({ element, characterType }: { element: string; characterType: string }) {
  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.metal;
  return (
    <div
      className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2"
      style={{ background: colors.pastel, borderColor: `${colors.main}4D` }}
    >
      <Image src={`/images/characters/${characterType}/default.png`} alt="" width={28} height={28} className="object-contain" unoptimized />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/result/compatibility-tab.tsx
git commit -m "feat: 궁합 탭 컴포넌트 추가 (리스트, 빈상태, 자동계산)"
```

---

## Task 8: 결과 페이지에 궁합 탭 통합

**Files:**
- Modify: `app/result/page.tsx`

- [ ] **Step 1: 탭 유니온 확장 + import 추가**

`app/result/page.tsx` 상단 import에 추가:

```typescript
import { CompatibilityTab } from "@/components/result/compatibility-tab";
```

`useSearchParams` import 추가:

```typescript
import { useRouter, useSearchParams } from "next/navigation";
```

- [ ] **Step 2: 상태 변경**

라인 78의 탭 상태를 확장:

```typescript
const [tab, setTab] = useState<"saju" | "gwansang" | "compatibility">("saju");
```

기존 `useEffect` 뒤에 추가:

```typescript
const searchParams = useSearchParams();

// 궁합 레퍼럴 처리
const [compatPartnerId, setCompatPartnerId] = useState<string | null>(null);

useEffect(() => {
  if (typeof window === "undefined") return;
  // URL ?tab=compatibility 처리
  if (searchParams.get("tab") === "compatibility") {
    setTab("compatibility");
  }
  // sessionStorage + cookie 폴백에서 레퍼럴 파트너 복원
  const partnerId = sessionStorage.getItem("momo_compat_partner")
    || document.cookie.match(/momo_compat_partner=([^;]+)/)?.[1]
    || null;
  if (partnerId) {
    setCompatPartnerId(partnerId);
    setTab("compatibility");
    sessionStorage.removeItem("momo_compat_partner");
    document.cookie = "momo_compat_partner=;max-age=0;path=/";
  }
}, [searchParams]);
```

- [ ] **Step 3: 탭바에 "궁합" 버튼 추가**

기존 관상 탭 버튼 뒤에 추가 (TabBar `<div className="flex">` 안에):

```tsx
<button
  type="button"
  onClick={() => setTab("compatibility")}
  className={`flex-1 py-3 text-[15px] font-semibold border-b-2 transition-colors ${
    tab === "compatibility" ? "text-ink" : "text-ink-tertiary border-transparent"
  }`}
  style={tab === "compatibility" ? { borderColor: accentColor } : undefined}
>
  궁합
  <span className="ml-1 align-top text-[10px] font-bold px-1.5 py-[1px] rounded-full bg-[#C94A3F]/15 text-[#C94A3F]">New</span>
</button>
```

- [ ] **Step 4: 궁합 탭 콘텐츠 렌더링**

기존 `{tab === "gwansang" && gwansangProfile && (...)}` 블록 뒤에 추가:

```tsx
{tab === "compatibility" && (
  <div className="pb-12">
    <CompatibilityTab
      referralPartnerId={compatPartnerId}
      myName={nickname}
      myCharacterType={effectiveCharacterType}
      myDominantElement={dominantEl}
      shareUrl={shareUrl}
    />
  </div>
)}
```

- [ ] **Step 5: 관상 탭에서 New 뱃지 제거** (궁합 탭으로 이동했으므로)

기존 관상 탭 버튼에서 `<span className="ml-1 align-top...">New</span>` 부분 제거.

- [ ] **Step 6: 커밋**

```bash
git add app/result/page.tsx
git commit -m "feat: 결과 페이지에 궁합 탭 통합 (레퍼럴 자동 계산 포함)"
```

---

## Task 9: 공유 페이지 궁합 유도 바텀시트

**Files:**
- Create: `components/share-compatibility-prompt.tsx`
- Modify: `app/s/[code]/page.tsx`
- Modify: `app/share/[id]/page.tsx`

- [ ] **Step 1: `ShareCompatibilityPrompt` 컴포넌트 생성**

```typescript
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ELEMENT_COLORS, elementKey, getCharacterTypeFromElement } from "@/lib/result-tokens";
import { trackViewCompatibilityPrompt, trackClickCompatibilityCta } from "@/lib/analytics";

interface ShareCompatibilityPromptProps {
  sharedProfileId: string;
  sharedUserName: string;
  sharedDominantElement: string | null;
  sharedCharacterType: string | null;
  /** 현재 뷰어의 상태 (Server Component에서 판단) */
  viewerStatus: "has_result" | "logged_in" | "anonymous";
}

export function ShareCompatibilityPrompt({
  sharedProfileId,
  sharedUserName,
  sharedDominantElement,
  sharedCharacterType,
  viewerStatus,
}: ShareCompatibilityPromptProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 마운트 시 sessionStorage에 레퍼럴 저장
  useEffect(() => {
    sessionStorage.setItem("momo_compat_partner", sharedProfileId);
    // 쿠키도 병행 (사파리 InPrivate 대비)
    document.cookie = `momo_compat_partner=${sharedProfileId};max-age=3600;path=/;SameSite=Lax`;
  }, [sharedProfileId]);

  // 2초 후 바텀시트 등장
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(true);
      trackViewCompatibilityPrompt();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleCta = () => {
    trackClickCompatibilityCta();
    setOpen(false);
    if (viewerStatus === "has_result") {
      router.push("/result?tab=compatibility");
    } else if (viewerStatus === "logged_in") {
      router.push("/result/loading");
    } else {
      router.push("/");
    }
  };

  const elKey = elementKey(sharedDominantElement);
  const charType = sharedCharacterType ?? getCharacterTypeFromElement(sharedDominantElement);
  const colors = ELEMENT_COLORS[elKey] ?? ELEMENT_COLORS.metal;

  return (
    <BottomSheet open={open} onClose={() => setOpen(false)} showHandle>
      <div className="flex flex-col items-center pt-2 pb-2">
        {/* 캐릭터 + ? */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: colors.pastel, border: `2px solid ${colors.main}4D` }}
          >
            <Image
              src={`/images/characters/${charType}/default.png`}
              alt="" width={40} height={40}
              className="object-contain" unoptimized
            />
          </div>
          <span className="text-3xl font-bold text-ink-tertiary">?</span>
        </div>

        <p className="text-lg font-semibold text-ink text-center">
          {sharedUserName}님과 나의<br />궁합은 몇 점일까?
        </p>
        <p className="text-sm text-ink-muted mt-2 text-center">
          사주로 보는 우리의 궁합을 확인해보세요
        </p>

        <Button
          size="lg"
          className="w-full mt-6"
          onClick={handleCta}
        >
          궁합 보기
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            router.push("/");
          }}
          className="mt-3 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          나도 사주·관상 보기
        </button>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: `app/s/[code]/page.tsx` 수정**

공유 페이지에 뷰어 상태 확인 로직 + `ShareCompatibilityPrompt` 추가.

import 추가:

```typescript
import { createClient } from "@/lib/supabase/server";
import { ShareCompatibilityPrompt } from "@/components/share-compatibility-prompt";
```

`ShortSharePage` 함수 안에서 data 확인 후, return 직전에 뷰어 상태 확인:

```typescript
// 뷰어 상태 확인 (세션 기반)
let viewerStatus: "has_result" | "logged_in" | "anonymous" = "anonymous";
try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("is_saju_complete")
      .eq("auth_id", user.id)
      .maybeSingle();
    viewerStatus = viewerProfile?.is_saju_complete ? "has_result" : "logged_in";
  }
} catch {}
```

기존 return의 `<ShareTeaserView ... />` 를 Fragment로 감싸고 뒤에 추가:

```tsx
return (
  <>
    <ShareTeaserView ... />
    <ShareCompatibilityPrompt
      sharedProfileId={data.profile.id}
      sharedUserName={data.profile.name ?? "친구"}
      sharedDominantElement={data.profile.dominant_element}
      sharedCharacterType={data.profile.character_type}
      viewerStatus={viewerStatus}
    />
  </>
);
```

- [ ] **Step 3: `app/share/[id]/page.tsx`에도 동일 적용**

`/share/[id]/page.tsx`에도 동일한 패턴으로 `ShareCompatibilityPrompt` 추가. 뷰어 상태 확인 로직 동일.

- [ ] **Step 4: 커밋**

```bash
git add components/share-compatibility-prompt.tsx app/s/[code]/page.tsx app/share/[id]/page.tsx
git commit -m "feat: 공유 페이지 궁합 유도 바텀시트 추가 (2초 후 등장)"
```

---

## Task 10: 궁합 전용 OG 이미지

**Files:**
- Create: `app/api/og-compat/route.tsx`

- [ ] **Step 1: OG 이미지 엔드포인트 구현**

기존 `/api/og/route.tsx`와 동일한 폰트 캐싱/캐릭터 렌더링 패턴, 궁합 전용 레이아웃.

```typescript
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// 오행 색상 (result-tokens.ts와 동일)
const ELEMENT_COLORS: Record<string, { main: string; pastel: string }> = {
  wood: { main: "#6B9B6B", pastel: "#E8F0E8" },
  fire: { main: "#C75B5B", pastel: "#F5E0E0" },
  earth: { main: "#B8956B", pastel: "#F0E8D8" },
  metal: { main: "#8B8B9B", pastel: "#E8E8F0" },
  water: { main: "#5B7B9B", pastel: "#D8E8F0" },
};

// 글로벌 싱글톤 폰트 캐싱 (기존 /api/og와 동일 패턴)
const g = globalThis as typeof globalThis & { _pretendardFont?: Promise<ArrayBuffer> };

function getFontData(): Promise<ArrayBuffer> {
  if (!g._pretendardFont) {
    g._pretendardFont = fetch(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        g._pretendardFont = undefined;
        throw err;
      });
  }
  return g._pretendardFont;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const name = searchParams.get("name") ?? "친구";
  const score = Math.min(100, Math.max(0, parseInt(searchParams.get("score") ?? "75", 10) || 75));
  const grade = searchParams.get("grade") ?? "좋은 인연";
  const element = searchParams.get("element") ?? "metal";
  const character = searchParams.get("character") ?? "namuri";

  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.metal;
  const characterUrl = `${origin}/images/characters/${character}/default.png`;

  let fontData: ArrayBuffer;
  try {
    fontData = await getFontData();
  } catch {
    return new Response("Font loading failed", { status: 500 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${colors.pastel} 0%, #F7F3EE 100%)`,
          fontFamily: "Pretendard",
        }}
      >
        {/* 캐릭터 */}
        <div style={{
          width: 180, height: 180, borderRadius: "50%",
          background: "white",
          border: `4px solid ${colors.main}4D`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 48,
        }}>
          <img src={characterUrl} alt="" width={120} height={120} style={{ objectFit: "contain" }} />
        </div>

        {/* 텍스트 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 28, color: "#6B6B6B" }}>
            {name}님과의 사주 궁합
          </span>
          <span style={{ fontSize: 72, fontWeight: 700, color: colors.main, marginTop: 8 }}>
            {score}점
          </span>
          <span style={{ fontSize: 28, color: colors.main, marginTop: 4 }}>
            {grade}
          </span>
          <span style={{ fontSize: 20, color: "#999", marginTop: 24 }}>
            모모 사주
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Pretendard", data: fontData, weight: 700, style: "normal" }],
    },
  );
}
```

- [ ] **Step 2: 궁합 상세 시트 공유 시 OG URL 생성**

`CompatibilityDetailSheet`의 `handleShare()` 함수에서 공유 URL에 OG 파라미터 포함:

```typescript
const ogUrl = `/api/og-compat?name=${encodeURIComponent(c.partnerName ?? "친구")}&score=${c.score}&grade=${encodeURIComponent(grade.label)}&element=${elementKey(myDominantElement)}&character=${myCharacterType ?? "namuri"}`;
```

> Note: 실제 카카오톡 공유에서 OG 이미지가 반영되려면, 공유되는 URL의 HTML `<meta property="og:image">` 태그가 이 OG 엔드포인트를 가리켜야 함. 궁합 전용 공유 페이지(`/compat/[id]`)가 필요할 수 있으며, 이는 향후 확장 사항.

- [ ] **Step 3: 커밋**

```bash
git add app/api/og-compat/route.tsx
git commit -m "feat: 궁합 전용 OG 이미지 엔드포인트 추가"
```

---

## Task 11: 통합 검증 & PR

- [ ] **Step 1: 로컬 빌드 확인**

```bash
npm run build
```

빌드 에러 없는지 확인. 타입 에러가 있으면 수정.

- [ ] **Step 2: 로컬 개발 서버에서 확인**

```bash
npm run dev
```

확인 체크리스트:

**기본 동작:**
- `/result` 페이지에 사주/관상/궁합 3개 탭 표시되는지
- 궁합 탭에서 빈 상태 UI + "궁합 요청 링크 공유하기" CTA 동작하는지
- `/s/{code}` 페이지에서 2초 후 궁합 바텀시트 등장하는지
- 바텀시트 dismiss 동작하는지

**DB 스키마 호환성 (⚠️ CRITICAL):**
- `POST /api/calculate-compatibility` 호출 시 `user_gender`, `partner_gender`가 upsert에 포함되는지
- 동성 궁합 저장 시 NOT NULL 제약 위반 없는지
- 캐시 조회 시 `data.user_gender`/`data.partner_gender`로 relationType 올바르게 판정되는지

**AI 스토리 폴링:**
- 이성 궁합 상세 시트에서 로딩 GIF 표시 → 5초 간격 폴링 → 스토리 도착 시 fade-in
- 3회 실패 후 "잠시 후 다시 확인해보세요" + 재시도 버튼
- 동성 궁합에서는 AI 스토리 섹션 자체가 안 보이는지

**OG 이미지:**
- `/api/og-compat?name=테스트&score=85&grade=최고의인연&element=wood&character=namuri` 접속 시 이미지 생성 확인
- 캐릭터 + 점수 + 등급이 올바르게 표시되는지

**사이드이펙트 검증:**
- 기존 사주/관상 탭이 정상 동작하는지 (궁합 탭 추가로 인한 영향 없음)
- 기존 공유 페이지 기능이 정상 동작하는지 (궁합 바텀시트 추가로 인한 영향 없음)
- 기존 `/api/og` 엔드포인트가 정상 동작하는지 (별도 엔드포인트로 분리했으므로 영향 없음)

- [ ] **Step 3: 원격 푸시**

(⚠️ feature 브랜치는 Task 1 전에 이미 생성되어 있어야 함)

```bash
git push -u origin feature/compatibility
```

- [ ] **Step 4: GitHub PR 생성**

```bash
gh pr create --title "feat: 궁합 기능 추가 (공유 바이럴 강화)" --body "$(cat <<'EOF'
## Summary
- 공유 페이지에 궁합 유도 바텀시트 추가 (2초 후 자동 등장)
- 결과 페이지에 궁합 탭 추가 (리스트 + 상세 바텀시트)
- calculate-compatibility + generate-match-story Edge Function 연동
- 점수별 원형 게이지, 등급 라벨, AI 인연 스토리 표시 (하이브리드 폴링)
- 동성=친구 궁합, 이성=연인 궁합 자동 분기
- 궁합 전용 OG 이미지 (`/api/og-compat`)
- Supabase 스키마/RLS/Edge Function 변경 없음
- ⚠️ saju_compatibility 테이블의 user_gender/partner_gender NOT NULL 반영

## Design
- 앱 Flutter 디자인 1:1 매핑 (색상, 게이지, 캐릭터 쌍, AI 스토리 컨테이너)
- 기존 디자인 시스템 토큰 활용 (compat-*, element-*, MYSTIC_GLOW)
- AI 스토리 로딩 시 분석 로딩 GIF 재사용

## Test plan
- [ ] 공유 페이지 랜딩 → 2초 후 궁합 바텀시트 등장 확인
- [ ] 비회원 → "궁합 보기" → 랜딩 → 로그인 → 온보딩 → 결과 → 궁합 탭 자동 활성화
- [ ] 기존 회원 → "궁합 보기" → /result?tab=compatibility → 궁합 자동 계산
- [ ] 궁합 리스트 항목 클릭 → 상세 바텀시트 (게이지, 강점, 도전, AI 스토리)
- [ ] 이성 궁합: AI 스토리 폴링 (로딩 GIF → 5초 간격 → fade-in)
- [ ] 동성 궁합: AI 스토리 섹션 미표시
- [ ] 빈 상태에서 "궁합 요청 링크 공유하기" 동작 확인
- [ ] 천생연분(90+) 케이스에서 글로우 효과 확인
- [ ] `/api/og-compat` OG 이미지 생성 확인
- [ ] 기존 사주/관상 탭 정상 동작 (사이드이펙트 없음)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Vercel Preview 배포 확인 후 main 머지**

PR에서 Vercel Preview URL로 동작 확인 → squash merge → Vercel Production 배포 완료 확인.

**⚠️ 절대 fast-forward 머지 금지. PR 머지로만 main에 합류.**
