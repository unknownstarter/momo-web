# Viral Share Teaser 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공유 링크 클릭 시 바이럴을 유도하는 "연애 유형" 티저 페이지 + 동적 OG 메타/이미지를 구현하여 카카오톡 공유 전환율을 극대화한다.

**Architecture:** 기존 공유 URL(`/s/{code}`, `/share/{token}`)을 티저 페이지로 전환하고, 기존 전체 결과 뷰는 `/detail` 서브라우트로 이동한다. 연애 유형 분류는 기존 DB 데이터(personality_traits, romance_key_points, dominant_element)를 클라이언트에서 조합하는 순수 함수로 구현하며, **Supabase DB 스키마·RLS·Edge Function 변경 없이** 전체가 프론트엔드 코드로만 완성된다.

**Tech Stack:** Next.js 15 App Router, `next/og` (ImageResponse/Satori), Tailwind CSS 4, Pretendard (CDN woff for OG)

---

## Supabase 제약사항 확인

| 항목 | 상태 | 비고 |
|------|------|------|
| DB 스키마 변경 | **없음** | 기존 테이블 읽기만 사용 |
| RLS 정책 변경 | **없음** | admin client(service role)로 기존 RLS 우회 |
| Edge Function 변경 | **없음** | 기존 함수 호출만 (이 피처에서는 호출도 안 함) |
| Storage 정책 변경 | **없음** | 캐릭터 이미지는 `/public`에서 서빙 |
| 신규 테이블 | **없음** | `share_links` 기존 테이블 그대로 사용 |

**데이터 소스 (기존 컬럼, 읽기 전용):**
- `profiles`: `name`, `character_type`, `dominant_element`
- `saju_profiles`: `personality_traits`, `romance_style`, `romance_key_points`, `dominant_element`, `ai_interpretation`
- `gwansang_profiles`: `animal_type_korean`, `animal_modifier`, `charm_keywords`, `headline`

---

## 파일 구조

### 새로 생성하는 파일

| 파일 | 책임 |
|------|------|
| `lib/romance-types.ts` | 연애 유형 10종 정의 + 분류 함수 |
| `lib/share-data.ts` | 공유 페이지 공통 데이터 fetching 헬퍼 (DRY) |
| `components/share-teaser-view.tsx` | 티저 페이지 클라이언트 컴포넌트 |
| `app/s/[code]/detail/page.tsx` | 전체 결과 보기 (기존 ShareResultView 이동) |
| `app/share/[id]/detail/page.tsx` | 전체 결과 보기 (기존 ShareResultView 이동) |
| `app/api/og/route.tsx` | 동적 OG 이미지 생성 (Satori + Pretendard) |

### 수정하는 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/s/[code]/page.tsx` | 기존 전체 결과 → 티저 뷰 렌더링 + `generateMetadata` 추가 |
| `app/share/[id]/page.tsx` | 기존 전체 결과 → 티저 뷰 렌더링 + `generateMetadata` 추가 |
| `lib/analytics.ts` | 티저 페이지 관련 이벤트 추가 |

---

## Task 1: 연애 유형 분류 시스템

**Files:**
- Create: `lib/romance-types.ts`

연애 유형 10종을 정의하고, 기존 DB 데이터에서 결정론적으로 분류하는 순수 함수를 구현한다.

- [ ] **Step 1: `lib/romance-types.ts` 작성**

```typescript
/**
 * 연애 유형 분류 — 기존 사주·관상 데이터에서 10종 라벨 결정.
 * Supabase DB 변경 없이, 클라이언트/서버 양쪽에서 사용 가능한 순수 함수.
 */

export interface RomanceType {
  id: string;
  label: string;       // "안정 추구형"
  subtitle: string;    // "확실하지 않으면 불안한 타입"
  emoji: string;       // "🏠"
}

const ROMANCE_TYPES: RomanceType[] = [
  { id: "passionate-all-in", label: "올인 직진형", subtitle: "한 번 빠지면 끝까지 가는 타입", emoji: "🔥" },
  { id: "emotional-romantic", label: "감성 로맨티스트형", subtitle: "분위기와 감정에 올인하는 타입", emoji: "🌙" },
  { id: "stable-seeker", label: "안정 추구형", subtitle: "확실하지 않으면 불안한 타입", emoji: "🏠" },
  { id: "devoted-carer", label: "헌신 케어형", subtitle: "사랑하는 사람을 끝까지 챙기는 타입", emoji: "💝" },
  { id: "growth-partner", label: "성장 동반자형", subtitle: "함께 성장하는 관계를 꿈꾸는 타입", emoji: "🌱" },
  { id: "soulmate-seeker", label: "소울메이트 추구형", subtitle: "깊은 내면의 연결을 중시하는 타입", emoji: "✨" },
  { id: "cool-tsundere", label: "쿨한 츤데레형", subtitle: "겉은 무심한데 속은 따뜻한 타입", emoji: "😏" },
  { id: "rational-planner", label: "이성적 전략가형", subtitle: "머리로 사랑하는 계획적인 타입", emoji: "🧠" },
  { id: "intuitive-free", label: "직감형 자유영혼", subtitle: "느낌 가는 대로 사랑하는 타입", emoji: "🌊" },
  { id: "adventurous-explorer", label: "모험가형", subtitle: "새로운 경험을 함께할 인연을 찾는 타입", emoji: "🗺️" },
];

/** 오행 → 후보 유형 2개 매핑 (1차 필터) */
const ELEMENT_TYPE_MAP: Record<string, [string, string]> = {
  fire:  ["passionate-all-in", "emotional-romantic"],
  earth: ["stable-seeker", "devoted-carer"],
  wood:  ["growth-partner", "soulmate-seeker"],
  metal: ["cool-tsundere", "rational-planner"],
  water: ["intuitive-free", "adventurous-explorer"],
};

/** 각 유형의 가중 키워드 (personality_traits + romance_key_points + romance_style 텍스트 매칭) */
const TYPE_KEYWORDS: Record<string, string[]> = {
  "passionate-all-in":     ["열정", "적극", "직진", "대담", "강렬", "주도", "솔직", "거침없"],
  "emotional-romantic":    ["감성", "낭만", "예술", "감정", "섬세", "분위기", "감각", "표현"],
  "stable-seeker":         ["안정", "신중", "믿음", "확인", "일관", "꾸준", "책임", "신뢰"],
  "devoted-carer":         ["헌신", "배려", "챙김", "따뜻", "보살", "돌봄", "희생", "다정"],
  "growth-partner":        ["성장", "발전", "응원", "목표", "자극", "동기", "비전", "노력"],
  "soulmate-seeker":       ["이해", "공감", "소통", "교감", "깊이", "내면", "연결", "영혼"],
  "cool-tsundere":         ["독립", "자존", "쿨", "카리스마", "무심", "강한", "주관", "거리"],
  "rational-planner":      ["논리", "계획", "분석", "체계", "이성", "판단", "효율", "명확"],
  "intuitive-free":        ["직관", "자유", "유연", "감각", "즉흥", "본능", "흐름", "느낌"],
  "adventurous-explorer":  ["모험", "경험", "탐구", "호기심", "새로운", "도전", "여행", "발견"],
};

interface ClassifyInput {
  dominantElement?: string | null;
  personalityTraits?: string[] | null;
  romanceKeyPoints?: string[] | null;
  romanceStyle?: string | null;
}

/**
 * 기존 사주·관상 데이터로 연애 유형을 결정론적으로 분류.
 * 1) dominant_element → 후보 2개 선택
 * 2) personality_traits + romance_key_points + romance_style에서 키워드 매칭 점수 계산
 * 3) 점수가 높은 후보 반환 (동점 시 첫 번째)
 */
export function classifyRomanceType(input: ClassifyInput): RomanceType {
  const elKey = normalizeElement(input.dominantElement);
  const candidates = ELEMENT_TYPE_MAP[elKey] ?? ELEMENT_TYPE_MAP.metal;

  // 검색 대상 텍스트 합치기
  const corpus = [
    ...(input.personalityTraits ?? []),
    ...(input.romanceKeyPoints ?? []),
    input.romanceStyle ?? "",
  ].join(" ");

  let bestId = candidates[0];
  let bestScore = 0;

  for (const typeId of candidates) {
    const keywords = TYPE_KEYWORDS[typeId] ?? [];
    const score = keywords.reduce((sum, kw) => sum + (corpus.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestId = typeId;
    }
  }

  return ROMANCE_TYPES.find((t) => t.id === bestId)!;
}

/** dominant_element 한글/영문 → 영문 키 정규화 */
function normalizeElement(el: string | null | undefined): string {
  if (!el) return "metal";
  const s = el.toLowerCase();
  if (s === "목" || s === "wood") return "wood";
  if (s === "화" || s === "fire") return "fire";
  if (s === "토" || s === "earth") return "earth";
  if (s === "금" || s === "metal") return "metal";
  if (s === "수" || s === "water") return "water";
  return "metal";
}

/** ID로 유형 조회 */
export function getRomanceTypeById(id: string): RomanceType | undefined {
  return ROMANCE_TYPES.find((t) => t.id === id);
}

/** 전체 유형 목록 */
export function getAllRomanceTypes(): readonly RomanceType[] {
  return ROMANCE_TYPES;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build 2>&1 | tail -5`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add lib/romance-types.ts
git commit -m "feat: 연애 유형 10종 분류 시스템 추가 (DB 변경 없음)"
```

---

## Task 2: 공유 데이터 fetching 헬퍼

**Files:**
- Create: `lib/share-data.ts`

`/s/[code]`, `/share/[id]`, 그리고 각각의 `/detail` 서브라우트에서 동일한 데이터 fetching 로직이 중복된다. DRY 원칙으로 공통 함수를 추출한다.

- [ ] **Step 1: `lib/share-data.ts` 작성**

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

/** 공유 페이지에서 노출하는 사주 컬럼 (민감 정보 제외) */
const SAJU_SHARE_COLS =
  "year_pillar,month_pillar,day_pillar,hour_pillar,five_elements,dominant_element,personality_traits,ai_interpretation,yearly_fortune,period_fortunes,romance_style,romance_key_points,ideal_match";

/** 공유 페이지에서 노출하는 관상 컬럼 (민감 정보 제외) */
const GWANSANG_SHARE_COLS =
  "animal_type_korean,animal_modifier,headline,charm_keywords,samjeong,ogwan,personality_summary,romance_summary,romance_key_points,traits,ideal_match_animal_korean,ideal_match_traits,ideal_match_description";

export interface ShareProfile {
  id: string;
  name: string | null;
  character_type: string | null;
  dominant_element: string | null;
  saju_profile_id: string | null;
  gwansang_profile_id: string | null;
}

export interface ShareData {
  profile: ShareProfile;
  sajuProfile: Record<string, unknown> | null;
  gwansangProfile: Record<string, unknown> | null;
}

/**
 * profile_id로 공유에 필요한 데이터를 한번에 조회.
 * admin client 사용 (RLS 우회, 서버 전용).
 * 실패 시 null 반환.
 */
export async function fetchShareData(profileId: string): Promise<ShareData | null> {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, character_type, dominant_element, saju_profile_id, gwansang_profile_id")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) return null;

  let sajuProfile: Record<string, unknown> | null = null;
  let gwansangProfile: Record<string, unknown> | null = null;

  if (profile.saju_profile_id) {
    const { data } = await supabase
      .from("saju_profiles")
      .select(SAJU_SHARE_COLS)
      .eq("id", profile.saju_profile_id)
      .maybeSingle();
    sajuProfile = data;
  }

  if (profile.gwansang_profile_id) {
    const { data } = await supabase
      .from("gwansang_profiles")
      .select(GWANSANG_SHARE_COLS)
      .eq("id", profile.gwansang_profile_id)
      .maybeSingle();
    gwansangProfile = data;
  }

  return { profile: profile as ShareProfile, sajuProfile, gwansangProfile };
}

/**
 * share_links 테이블에서 short_id → profile_id 조회.
 * 못 찾으면 null.
 */
export async function resolveShortCode(code: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("profile_id")
    .eq("short_id", code)
    .maybeSingle();
  if (error || !data?.profile_id) return null;
  return data.profile_id as string;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build 2>&1 | tail -5`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add lib/share-data.ts
git commit -m "refactor: 공유 데이터 fetching 로직을 share-data.ts로 추출"
```

---

## Task 3: 티저 페이지 컴포넌트

**Files:**
- Create: `components/share-teaser-view.tsx`

공유 링크 최초 랜딩 페이지. 연애 유형 라벨 + 캐릭터 + 키워드만 보여주고 호기심을 유발한다.

- [ ] **Step 1: `components/share-teaser-view.tsx` 작성**

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import {
  elementKey,
  ELEMENT_COLORS,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";
import { classifyRomanceType, type RomanceType } from "@/lib/romance-types";

interface ShareTeaserViewProps {
  profileName: string;
  dominantElement?: string | null;
  characterType?: string | null;
  personalityTraits?: string[] | null;
  romanceStyle?: string | null;
  romanceKeyPoints?: string[] | null;
  charmKeywords?: string[] | null;
  animalTypeKorean?: string | null;
  animalModifier?: string | null;
  /** 자세히 보기 링크 (예: /s/{code}/detail) */
  detailHref: string;
}

export function ShareTeaserView({
  profileName,
  dominantElement,
  characterType,
  personalityTraits,
  romanceStyle,
  romanceKeyPoints,
  charmKeywords,
  animalTypeKorean,
  animalModifier,
  detailHref,
}: ShareTeaserViewProps) {
  const elKey = elementKey(dominantElement);
  const colors = ELEMENT_COLORS[elKey] ?? ELEMENT_COLORS.metal;
  const effectiveChar = characterType ?? getCharacterTypeFromElement(dominantElement) ?? "namuri";

  const romanceType: RomanceType = classifyRomanceType({
    dominantElement,
    personalityTraits,
    romanceKeyPoints,
    romanceStyle,
  });

  // 키워드 태그: charm_keywords 우선, 없으면 personality_traits에서 최대 3개
  const tags = (charmKeywords?.length ? charmKeywords : personalityTraits)?.slice(0, 3) ?? [];

  // 티저 텍스트: romance_style 첫 2줄 또는 50자
  const teaserText = romanceStyle
    ? romanceStyle.split("\n")[0].slice(0, 80) + (romanceStyle.length > 80 ? "…" : "")
    : null;

  const animalLabel = animalTypeKorean
    ? [animalModifier, animalTypeKorean].filter(Boolean).join(" ") + "상"
    : null;

  return (
    <MobileContainer className="min-h-dvh bg-hanji flex flex-col">
      {/* 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-10 pb-4 flex flex-col items-center">
        {/* 헤드라인 */}
        <p className="text-ink-muted text-sm">{profileName}님은 연애할 때</p>
        <h1 className="mt-1 text-[26px] font-extrabold text-ink text-center leading-tight">
          {romanceType.emoji} {"\u2018"}{romanceType.label}{"\u2019"}
        </h1>
        <p className="mt-2 text-sm text-ink-tertiary text-center">
          {romanceType.subtitle}
        </p>

        {/* 캐릭터 카드 */}
        <div
          className="mt-8 w-full max-w-[320px] rounded-3xl border-2 p-6 flex flex-col items-center"
          style={{
            borderColor: `${colors.main}33`,
            background: `linear-gradient(180deg, ${colors.pastel}66 0%, #FEFCF900 100%)`,
          }}
        >
          {/* 캐릭터 원형 아바타 */}
          <div
            className="w-28 h-28 rounded-full border-[3px] overflow-hidden flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${colors.pastel} 0%, ${colors.pastel}4D 100%)`,
              borderColor: `${colors.main}4D`,
            }}
          >
            <Image
              src={`/images/characters/${effectiveChar}/default.png`}
              alt=""
              width={80}
              height={80}
              className="object-contain"
              unoptimized
            />
          </div>

          {/* 뱃지 Row */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {animalLabel && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${colors.main}1F`, color: colors.main }}
              >
                {animalLabel}
              </span>
            )}
          </div>

          {/* 키워드 태그 */}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-2xl text-[13px] font-medium border"
                  style={{
                    borderColor: `${colors.main}4D`,
                    backgroundColor: `${colors.main}0F`,
                    color: "var(--ink, #2D2D2D)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 티저 텍스트 + 페이드 */}
          {teaserText && (
            <div className="mt-5 w-full relative">
              <p className="text-sm text-ink leading-relaxed text-center">
                {teaserText}
              </p>
              <div
                className="absolute bottom-0 left-0 right-0 h-6"
                style={{
                  background: `linear-gradient(transparent, ${colors.pastel}66)`,
                }}
              />
            </div>
          )}
        </div>

        {/* 사주·관상 더 보기 유도 */}
        <p className="mt-6 text-xs text-ink-tertiary text-center">
          사주와 관상 분석 결과가 더 궁금하다면?
        </p>
      </div>

      {/* CTA 하단 고정 */}
      <CtaBar className="shrink-0">
        <Link href={detailHref} className="block w-full">
          <Button size="lg" className="w-full" style={{ backgroundColor: colors.main, borderColor: colors.main }}>
            자세히 보기
          </Button>
        </Link>
        <Link href="/" className="block w-full mt-3">
          <Button variant="outline" size="md" className="w-full">
            나도 사주·관상 보기
          </Button>
        </Link>
      </CtaBar>
    </MobileContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build 2>&1 | tail -5`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add components/share-teaser-view.tsx
git commit -m "feat: 공유 티저 페이지 컴포넌트 추가"
```

---

## Task 4: 공유 라우트 재구성

**Files:**
- Create: `app/s/[code]/detail/page.tsx`
- Create: `app/share/[id]/detail/page.tsx`
- Modify: `app/s/[code]/page.tsx`
- Modify: `app/share/[id]/page.tsx`

기존 공유 URL을 티저 페이지로 전환하고, 전체 결과 보기를 `/detail` 서브라우트로 이동한다.

- [ ] **Step 1: `app/s/[code]/detail/page.tsx` 생성 (기존 전체 결과 뷰)**

```typescript
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ShareResultView } from "@/components/share-result-view";
import { resolveShortCode, fetchShareData } from "@/lib/share-data";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ShortShareDetailPage({ params }: Props) {
  const { code } = await params;
  const profileId = await resolveShortCode(code);

  if (!profileId) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">잘못된 링크예요</p>
          <p className="mt-2 text-ink text-sm">링크가 만료되었거나 올바르지 않아요.</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">나도 사주 보러 가기</Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  const data = await fetchShareData(profileId);

  if (!data) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">결과를 찾을 수 없어요</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">나도 사주 보러 가기</Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  return (
    <ShareResultView
      profileName={data.profile.name ?? "친구"}
      profile={{ character_type: data.profile.character_type, dominant_element: data.profile.dominant_element }}
      sajuProfile={data.sajuProfile}
      gwansangProfile={data.gwansangProfile}
    />
  );
}
```

- [ ] **Step 2: `app/share/[id]/detail/page.tsx` 생성 (동일 구조, 토큰 방식)**

```typescript
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { decodeShareToken } from "@/lib/share-token";
import { ShareResultView } from "@/components/share-result-view";
import { fetchShareData } from "@/lib/share-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShareDetailPage({ params }: Props) {
  const { id: token } = await params;
  const profileId = decodeShareToken(token);

  if (!profileId) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">잘못된 링크예요</p>
          <p className="mt-2 text-ink text-sm">링크가 만료되었거나 올바르지 않아요.</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">나도 사주 보러 가기</Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  const data = await fetchShareData(profileId);

  if (!data) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">결과를 찾을 수 없어요</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">나도 사주 보러 가기</Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  return (
    <ShareResultView
      profileName={data.profile.name ?? "친구"}
      profile={{ character_type: data.profile.character_type, dominant_element: data.profile.dominant_element }}
      sajuProfile={data.sajuProfile}
      gwansangProfile={data.gwansangProfile}
    />
  );
}
```

- [ ] **Step 3: `app/s/[code]/page.tsx`를 티저 페이지로 변경**

기존 코드를 전부 교체. `fetchShareData` + `ShareTeaserView` 사용.

```typescript
import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ShareTeaserView } from "@/components/share-teaser-view";
import { resolveShortCode, fetchShareData } from "@/lib/share-data";
import { classifyRomanceType } from "@/lib/romance-types";

interface Props {
  params: Promise<{ code: string }>;
}

/** generateMetadata + page 간 DB 쿼리 중복 방지 (React cache) */
const getShareDataByCode = cache(async (code: string) => {
  const profileId = await resolveShortCode(code);
  if (!profileId) return null;
  return fetchShareData(profileId);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await getShareDataByCode(code);
  if (!data) return {};

  const name = data.profile.name ?? "친구";
  const romanceType = classifyRomanceType({
    dominantElement: data.profile.dominant_element ?? (data.sajuProfile?.dominant_element as string | null),
    personalityTraits: data.sajuProfile?.personality_traits as string[] | null,
    romanceKeyPoints: data.sajuProfile?.romance_key_points as string[] | null,
    romanceStyle: data.sajuProfile?.romance_style as string | null,
  });

  const title = `${name}님은 연애할 때 '${romanceType.label}'이래요 ${romanceType.emoji}`;
  const description = `${romanceType.subtitle} — 나도 내 연애 유형 알아보기`;

  const ogImageUrl = `/api/og?name=${encodeURIComponent(name)}&type=${encodeURIComponent(romanceType.label)}&emoji=${encodeURIComponent(romanceType.emoji)}&element=${encodeURIComponent(data.profile.dominant_element ?? "metal")}&character=${encodeURIComponent(data.profile.character_type ?? "namuri")}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImageUrl], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
  };
}

export default async function ShortSharePage({ params }: Props) {
  const { code } = await params;
  const data = await getShareDataByCode(code);

  if (!data) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">잘못된 링크예요</p>
          <p className="mt-2 text-ink text-sm">링크가 만료되었거나 올바르지 않아요.</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">나도 사주 보러 가기</Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  return (
    <ShareTeaserView
      profileName={data.profile.name ?? "친구"}
      dominantElement={data.profile.dominant_element}
      characterType={data.profile.character_type}
      personalityTraits={data.sajuProfile?.personality_traits as string[] | null}
      romanceStyle={data.sajuProfile?.romance_style as string | null}
      romanceKeyPoints={data.sajuProfile?.romance_key_points as string[] | null}
      charmKeywords={data.gwansangProfile?.charm_keywords as string[] | null}
      animalTypeKorean={data.gwansangProfile?.animal_type_korean as string | null}
      animalModifier={data.gwansangProfile?.animal_modifier as string | null}
      detailHref={`/s/${code}/detail`}
    />
  );
}
```

- [ ] **Step 4: `app/share/[id]/page.tsx`를 티저 페이지로 변경 (동일 구조, 토큰 방식)**

기존 코드를 전부 교체. `/s/[code]`와 동일한 패턴, `decodeShareToken` 사용.

```typescript
import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ShareTeaserView } from "@/components/share-teaser-view";
import { decodeShareToken } from "@/lib/share-token";
import { fetchShareData } from "@/lib/share-data";
import { classifyRomanceType } from "@/lib/romance-types";

interface Props {
  params: Promise<{ id: string }>;
}

/** generateMetadata + page 간 DB 쿼리 중복 방지 (React cache) */
const getShareDataByToken = cache(async (token: string) => {
  const profileId = decodeShareToken(token);
  if (!profileId) return null;
  return fetchShareData(profileId);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: token } = await params;
  const data = await getShareDataByToken(token);
  if (!data) return {};

  const name = data.profile.name ?? "친구";
  const romanceType = classifyRomanceType({
    dominantElement: data.profile.dominant_element ?? (data.sajuProfile?.dominant_element as string | null),
    personalityTraits: data.sajuProfile?.personality_traits as string[] | null,
    romanceKeyPoints: data.sajuProfile?.romance_key_points as string[] | null,
    romanceStyle: data.sajuProfile?.romance_style as string | null,
  });

  const title = `${name}님은 연애할 때 '${romanceType.label}'이래요 ${romanceType.emoji}`;
  const description = `${romanceType.subtitle} — 나도 내 연애 유형 알아보기`;

  const ogImageUrl = `/api/og?name=${encodeURIComponent(name)}&type=${encodeURIComponent(romanceType.label)}&emoji=${encodeURIComponent(romanceType.emoji)}&element=${encodeURIComponent(data.profile.dominant_element ?? "metal")}&character=${encodeURIComponent(data.profile.character_type ?? "namuri")}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImageUrl], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
  };
}

export default async function SharePage({ params }: Props) {
  const { id: token } = await params;
  const data = await getShareDataByToken(token);

  if (!data) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">잘못된 링크예요</p>
          <p className="mt-2 text-ink text-sm">링크가 만료되었거나 올바르지 않아요.</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">나도 사주 보러 가기</Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  return (
    <ShareTeaserView
      profileName={data.profile.name ?? "친구"}
      dominantElement={data.profile.dominant_element}
      characterType={data.profile.character_type}
      personalityTraits={data.sajuProfile?.personality_traits as string[] | null}
      romanceStyle={data.sajuProfile?.romance_style as string | null}
      romanceKeyPoints={data.sajuProfile?.romance_key_points as string[] | null}
      charmKeywords={data.gwansangProfile?.charm_keywords as string[] | null}
      animalTypeKorean={data.gwansangProfile?.animal_type_korean as string | null}
      animalModifier={data.gwansangProfile?.animal_modifier as string | null}
      detailHref={`/share/${token}/detail`}
    />
  );
}
```

- [ ] **Step 5: 빌드 확인**

Run: `npx next build 2>&1 | tail -10`
Expected: 빌드 성공. `/s/[code]`, `/s/[code]/detail`, `/share/[id]`, `/share/[id]/detail` 4개 라우트 모두 존재.

- [ ] **Step 6: 커밋**

```bash
git add app/s/ app/share/
git commit -m "feat: 공유 링크를 티저 페이지로 전환, 전체 결과는 /detail 서브라우트로 이동"
```

---

## Task 5: 동적 OG 이미지

**Files:**
- Create: `app/api/og/route.tsx`

Satori + `next/og`로 공유 시 카카오톡 미리보기에 보이는 1200×630 이미지를 동적 생성한다.

- [ ] **Step 1: `app/api/og/route.tsx` 작성**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

/** 오행별 색상 (result-tokens.ts와 동일) */
const ELEMENT_COLORS: Record<string, { main: string; pastel: string }> = {
  wood: { main: "#8FB89A", pastel: "#D4E4D7" },
  fire: { main: "#D4918E", pastel: "#F0D4D2" },
  earth: { main: "#C8B68E", pastel: "#E8DFC8" },
  metal: { main: "#B8BCC0", pastel: "#E0E2E4" },
  water: { main: "#89B0CB", pastel: "#C8DBEA" },
};

function normalizeElement(el: string): string {
  const s = el.toLowerCase();
  if (s === "목" || s === "wood") return "wood";
  if (s === "화" || s === "fire") return "fire";
  if (s === "토" || s === "earth") return "earth";
  if (s === "금" || s === "metal") return "metal";
  if (s === "수" || s === "water") return "water";
  return "metal";
}

// Pretendard Bold (jsDelivr CDN). 실패 시 재시도 가능하도록 lazy singleton.
let fontPromise: Promise<ArrayBuffer> | null = null;
function getFontData(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = fetch(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.woff"
    ).then((res) => {
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
      return res.arrayBuffer();
    }).catch((err) => {
      fontPromise = null; // 다음 요청에서 재시도 허용
      throw err;
    });
  }
  return fontPromise;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "친구";
  const typeLabel = searchParams.get("type") ?? "매력적인";
  const emoji = searchParams.get("emoji") ?? "✨";
  const element = normalizeElement(searchParams.get("element") ?? "metal");
  const character = searchParams.get("character") ?? "namuri";

  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.metal;

  // origin 추출 (캐릭터 이미지 절대 URL 용)
  const origin = new URL(request.url).origin;
  const characterUrl = `${origin}/images/characters/${character}/default.png`;

  let font: ArrayBuffer;
  try {
    font = await getFontData();
  } catch {
    // 폰트 로드 실패 시 폰트 없이 렌더링 (시스템 폰트 폴백)
    font = new ArrayBuffer(0);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F3EE",
          fontFamily: "Pretendard, sans-serif",
        }}
      >
        {/* 배경 그라데이션 장식 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at 50% 30%, ${colors.pastel}99 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* 메인 콘텐츠 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          {/* 캐릭터 원형 아바타 */}
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              border: `4px solid ${colors.main}66`,
              background: `radial-gradient(circle, ${colors.pastel} 0%, ${colors.pastel}4D 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterUrl}
              alt=""
              width={140}
              height={140}
              style={{ objectFit: "contain" }}
            />
          </div>

          {/* 이름 */}
          <p
            style={{
              marginTop: 28,
              fontSize: 24,
              color: "#6B6B6B",
              fontWeight: 700,
            }}
          >
            {name}님은 연애할 때
          </p>

          {/* 유형 라벨 */}
          <p
            style={{
              marginTop: 8,
              fontSize: 48,
              fontWeight: 800,
              color: "#2D2D2D",
              lineHeight: 1.2,
            }}
          >
            {emoji} {"\u2018"}{typeLabel}{"\u2019"}
          </p>

          {/* CTA 유도 */}
          <div
            style={{
              marginTop: 32,
              padding: "12px 32px",
              borderRadius: 999,
              backgroundColor: `${colors.main}22`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <p style={{ fontSize: 20, color: colors.main, fontWeight: 700 }}>
              나도 내 연애 유형 알아보기 →
            </p>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font.byteLength > 0
        ? [{ name: "Pretendard", data: font, style: "normal" as const, weight: 700 as const }]
        : [],
    }
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx next build 2>&1 | tail -10`
Expected: 빌드 성공. `/api/og` 라우트가 Edge Function으로 빌드됨.

- [ ] **Step 3: 로컬 테스트**

Run: `npx next dev &` 후 브라우저에서 `http://localhost:3000/api/og?name=테스트&type=올인직진형&emoji=🔥&element=fire&character=bulkkori` 접속.
Expected: 1200×630 PNG 이미지가 렌더링됨. 캐릭터 + 유형 라벨 표시.

- [ ] **Step 4: 커밋**

```bash
git add app/api/og/
git commit -m "feat: 동적 OG 이미지 생성 API 추가 (Satori + Pretendard)"
```

---

## Task 6: 애널리틱스 이벤트

**Files:**
- Modify: `lib/analytics.ts`
- Modify: `components/share-teaser-view.tsx`

티저 페이지 노출과 CTA 클릭을 추적한다.

- [ ] **Step 1: `lib/analytics.ts`에 이벤트 추가**

기존 파일 하단에 추가:

```typescript
/** 공유 티저 페이지 노출 */
export function trackViewShareTeaser(): void {
  trackEvent("view_share_teaser");
}

/** 티저에서 '자세히 보기' 클릭 */
export function trackClickDetailInTeaser(): void {
  trackEvent("click_detail_in_teaser");
}

/** 티저에서 '나도 사주·관상 보기' 클릭 */
export function trackClickCtaInTeaser(): void {
  trackEvent("click_cta_in_teaser");
}
```

- [ ] **Step 2: `components/share-teaser-view.tsx`에 트래킹 연결**

컴포넌트 상단에 import 추가:
```typescript
import { trackViewShareTeaser, trackClickDetailInTeaser, trackClickCtaInTeaser } from "@/lib/analytics";
import { useEffect } from "react";
```

컴포넌트 본문에 useEffect 추가 (return 문 바로 위):
```typescript
useEffect(() => { trackViewShareTeaser(); }, []);
```

"자세히 보기" Link에 onClick 추가:
```typescript
<Link href={detailHref} className="block w-full" onClick={trackClickDetailInTeaser}>
```

"나도 사주·관상 보기" Link에 onClick 추가:
```typescript
<Link href="/" className="block w-full mt-3" onClick={trackClickCtaInTeaser}>
```

- [ ] **Step 3: 빌드 확인**

Run: `npx next build 2>&1 | tail -5`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add lib/analytics.ts components/share-teaser-view.tsx
git commit -m "feat: 공유 티저 페이지 GA4 이벤트 트래킹 추가"
```

---

## 최종 검증

- [ ] **전체 빌드 확인**: `npx next build` 에러 없이 통과
- [ ] **라우트 확인**: 빌드 출력에서 아래 라우트 존재 확인
  - `/s/[code]` (티저)
  - `/s/[code]/detail` (전체 결과)
  - `/share/[id]` (티저)
  - `/share/[id]/detail` (전체 결과)
  - `/api/og` (OG 이미지)
- [ ] **로컬 테스트**: `npx next dev` → 기존 공유 링크로 접속 → 티저 페이지 노출 → "자세히 보기" → 기존 전체 결과 표시

---

## 플로우 요약

```
[결과 페이지] → "친구에게 공유하기" 클릭
  → /api/share-url (기존, 변경 없음) → /s/{code} URL 생성
  → 카카오톡 공유

[카카오톡 미리보기]
  og:title  = "{이름}님은 연애할 때 '{유형}'이래요 🔥"
  og:image  = /api/og?name=...&type=...&element=... (동적 이미지)

[수신자 클릭] → /s/{code} (티저 페이지)
  ├─ "자세히 보기" → /s/{code}/detail (기존 전체 결과)
  └─ "나도 사주·관상 보기" → / (랜딩 → 카카오 로그인 → 온보딩)
```
