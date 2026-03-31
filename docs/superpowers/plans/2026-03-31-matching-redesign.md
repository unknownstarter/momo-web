# 매칭 중심 페이지 재편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/result`를 매칭 중심 메인 페이지로 재편하고, 기존 사주/관상/궁합을 하위 페이지로 분리하여 매칭 전환을 극대화한다.

**Architecture:** 기존 `/result` 페이지 코드를 `/result/detail`로 이동(궁합 탭 제거), 궁합을 `/result/compat`으로 분리, 새 `/result`에 매칭 히어로 + 연애운 요약 + 매칭 카운터 + 궁합 리스트 + 진입점을 배치한다. 랜딩/로딩/공유 페이지의 문구도 "이상형 찾기" 프레이밍으로 변경.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, Supabase, Framer Motion

**스펙 문서:** `docs/superpowers/specs/2026-03-30-web-strategy-redesign.md`

**제외 (별도 플랜):**
- SMS OTP 인증 (`/complete` 리브랜딩) — NHN Cloud 계정 설정 선행 필요
- 게이미피케이션 (순번/초대 보상) — `matching_waitlist` 테이블 생성 선행 필요

---

## 파일 구조

### 신규 생성
| 파일 | 역할 |
|------|------|
| `app/result/page.tsx` | 매칭 중심 메인 페이지 (NEW — 기존 파일은 detail로 이동) |
| `app/result/detail/page.tsx` | 사주 & 관상 상세 (기존 /result 코드 이동, 궁합 탭 제거) |
| `app/result/compat/page.tsx` | 궁합 별도 페이지 (기존 궁합 탭 분리) |
| `components/result/matching-hero.tsx` | 매칭 히어로 섹션 |
| `components/result/saju-romance-card.tsx` | 사주 연애운 요약 카드 |
| `components/result/gwansang-romance-card.tsx` | 관상 연애운 요약 카드 |
| `components/result/matching-counter.tsx` | 매칭 대기 현황 (Phase 1: 정적 문구, 추후 실시간) |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `lib/constants.ts` | `RESULT_DETAIL`, `RESULT_COMPAT` 라우트 추가 |
| `components/share-compatibility-prompt.tsx:70` | `"/result?tab=compatibility"` → `ROUTES.RESULT_COMPAT` |
| `app/page.tsx` | 랜딩 헤드라인/CTA 리프레이밍 |
| `app/result/loading/page.tsx` | 로딩 문구 추가 |
| `components/share-teaser-view.tsx` | 공유 티저 문구 리프레이밍 |

---

## Task 1: 라우트 상수 추가

**Files:**
- Modify: `lib/constants.ts:1-15`

- [ ] **Step 1: 라우트 상수 추가**

```typescript
// lib/constants.ts — ROUTES 객체에 추가
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CALLBACK: "/callback",
  ONBOARDING: "/onboarding",
  RESULT_LOADING: "/result/loading",
  RESULT: "/result",
  RESULT_DETAIL: "/result/detail",   // NEW
  RESULT_COMPAT: "/result/compat",   // NEW
  COMPLETE: "/complete",
  PENDING_DELETION: "/pending-deletion",
  TERMS: "/terms",
  PRIVACY: "/privacy",
} as const;
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/constants.ts
git commit -m "feat: RESULT_DETAIL, RESULT_COMPAT 라우트 상수 추가"
```

---

## Task 2: 기존 /result 코드를 /result/detail로 이동

기존 `app/result/page.tsx`의 사주/관상 결과 페이지를 `app/result/detail/page.tsx`로 이동한다. 궁합 탭을 제거하고, 상단에 뒤로가기 네비게이션을 추가한다.

**Files:**
- Create: `app/result/detail/page.tsx`
- Delete (후속 Task에서 새 파일로 대체): `app/result/page.tsx`는 Task 5에서 새로 작성

- [ ] **Step 1: detail 디렉토리 생성 및 파일 복사**

```bash
mkdir -p app/result/detail
cp app/result/page.tsx app/result/detail/page.tsx
```

- [ ] **Step 2: detail 페이지에서 궁합 관련 코드 제거**

`app/result/detail/page.tsx`에서 다음을 변경:

1. 궁합 관련 import 제거:
```typescript
// 삭제할 import
import { CompatibilityTab } from "@/components/result/compatibility-tab";
```

2. 궁합 관련 상태 제거 (ResultPageInner 함수 내):
```typescript
// 삭제할 상태
const [compatPartnerId, setCompatPartnerId] = useState<string | null>(null);
```

3. 초기 탭 결정 로직에서 `compatibility` 제거 — 항상 사주 탭으로 시작:
```typescript
const [tab, setTab] = useState<"saju" | "gwansang">(() => {
  if (typeof window === "undefined") return "saju";
  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "gwansang") return "gwansang";
  return "saju";
});
```

4. `momo_compat_partner` sessionStorage/쿠키 관련 useEffect 전체 제거 (기존 176~190번 줄의 searchParams useEffect)

5. 탭바에서 궁합 탭 버튼 제거 — 사주/관상 2탭만 남김

6. 궁합 탭 콘텐츠 영역 제거:
```tsx
// 삭제할 부분
<div className={tab === "compatibility" ? "pb-12" : "hidden"}>
  <CompatibilityTab ... />
</div>
```

7. 상단에 뒤로가기 네비게이션 추가 (기존 ResultMenu 옆에):
```tsx
// 앱바 영역을 수정
<div className="flex items-center justify-between px-3 pt-2">
  <button
    type="button"
    onClick={() => router.push(ROUTES.RESULT)}
    className="flex items-center gap-1 text-sm text-ink-muted py-2 px-1"
  >
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    돌아가기
  </button>
  <ResultMenu />
</div>
```

8. 하단 CTA를 매칭 메인으로 복귀하는 버튼으로 변경:
```tsx
<CtaBar className="shrink-0">
  <Link href={ROUTES.RESULT} className="block">
    <Button size="lg" className="w-full" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
      이상형 매칭 보러가기
    </Button>
  </Link>
  <Button variant="outline" size="md" className="w-full mt-4" onClick={handleShare} disabled={!shareUrl}>
    {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
  </Button>
</CtaBar>
```

9. `ROUTES` import에 `RESULT_DETAIL` 추가하지 않아도 됨 (이 파일에서는 `ROUTES.RESULT`만 사용)

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/result/detail/page.tsx
git commit -m "feat: /result/detail 페이지 생성 — 사주/관상 2탭 (궁합 제거)"
```

---

## Task 3: 궁합 별도 페이지 생성 (/result/compat)

기존 궁합 탭의 로직(compat partner 읽기, CompatibilityTab 렌더링)을 별도 페이지로 분리한다.

**Files:**
- Create: `app/result/compat/page.tsx`
- Modify: `components/share-compatibility-prompt.tsx:70`

- [ ] **Step 1: 궁합 페이지 작성**

```tsx
// app/result/compat/page.tsx
"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";
import {
  elementKey,
  ELEMENT_COLORS,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";
import { CompatibilityTab } from "@/components/result/compatibility-tab";

export default function CompatPage() {
  return (
    <Suspense>
      <CompatPageInner />
    </Suspense>
  );
}

function CompatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<{
    name: string | null;
    character_type: string | null;
    dominant_element: string | null;
    profile_images: string[] | null;
  } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [compatPartnerId, setCompatPartnerId] = useState<string | null>(null);

  // 프로필 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("name, character_type, dominant_element, profile_images")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!cancelled && profileRow) setProfile(profileRow);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 공유 URL 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/share-url");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data.url) setShareUrl(data.url);
    })();
    return () => { cancelled = true; };
  }, []);

  // momo_compat_partner 읽기 + 클리어 (기존 /result에서 이전)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const partnerId = sessionStorage.getItem("momo_compat_partner")
      || document.cookie.match(/momo_compat_partner=([^;]+)/)?.[1]
      || null;
    if (partnerId) {
      setCompatPartnerId(partnerId);
      sessionStorage.removeItem("momo_compat_partner");
      document.cookie = "momo_compat_partner=;max-age=0;path=/";
    }
  }, [searchParams]);

  const nickname = profile?.name ?? "";
  const dominantEl = profile?.dominant_element ?? null;
  const effectiveCharacterType = profile?.character_type ?? getCharacterTypeFromElement(dominantEl) ?? "namuri";
  const myProfileImage = profile?.profile_images?.[0] ?? null;

  if (dataLoading) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center">
        <p className="text-sm text-ink-muted">불러오는 중...</p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
        {/* 앱바 */}
        <div className="flex items-center justify-between px-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(ROUTES.RESULT)}
            className="flex items-center gap-1 text-sm text-ink-muted py-2 px-1"
          >
            <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            돌아가기
          </button>
        </div>

        <div className="px-5 pt-4 pb-8">
          <CompatibilityTab
            referralPartnerId={compatPartnerId}
            myName={nickname}
            myCharacterType={effectiveCharacterType}
            myDominantElement={dominantEl}
            myProfileImage={myProfileImage}
            shareUrl={shareUrl}
          />
        </div>
      </div>

      <CtaBar className="shrink-0">
        <Link href={ROUTES.RESULT} className="block">
          <Button size="lg" className="w-full">
            이상형 매칭 보러가기
          </Button>
        </Link>
      </CtaBar>
    </MobileContainer>
  );
}
```

- [ ] **Step 2: ShareCompatibilityPrompt 경로 수정**

`components/share-compatibility-prompt.tsx` 70번 줄:

수정 전:
```typescript
router.push("/result?tab=compatibility");
```

수정 후:
```typescript
router.push(ROUTES.RESULT_COMPAT);
```

파일 상단에 `ROUTES` import 추가:
```typescript
import { ROUTES } from "@/lib/constants";
```

기존 import 확인 — `ROUTES`가 이미 import되어 있지 않은지 확인. 없으면 추가.

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/result/compat/page.tsx components/share-compatibility-prompt.tsx
git commit -m "feat: /result/compat 궁합 별도 페이지 + ShareCompatibilityPrompt 경로 수정"
```

---

## Task 4: 매칭 메인 컴포넌트 작성

매칭 히어로, 사주 연애운 카드, 관상 연애운 카드, 매칭 카운터 컴포넌트를 작성한다.

**Files:**
- Create: `components/result/matching-hero.tsx`
- Create: `components/result/saju-romance-card.tsx`
- Create: `components/result/gwansang-romance-card.tsx`
- Create: `components/result/matching-counter.tsx`

- [ ] **Step 1: 매칭 히어로 컴포넌트**

```tsx
// components/result/matching-hero.tsx
"use client";

import Image from "next/image";
import {
  ELEMENT_COLORS,
  ELEMENT_KOREAN,
  elementKey,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";

interface MatchingHeroProps {
  nickname: string;
  profileImage: string | null;
  characterType: string | null;
  dominantElement: string | null;
  romanceTypeLabel: string | null;
  idealMatchDescription: string | null;
  idealMatchElement: string | null;
  animalTypeKorean: string | null;
  animalModifier: string | null;
}

export function MatchingHero({
  nickname,
  profileImage,
  characterType,
  dominantElement,
  romanceTypeLabel,
  idealMatchDescription,
  idealMatchElement,
  animalTypeKorean,
  animalModifier,
}: MatchingHeroProps) {
  const userElKey = elementKey(dominantElement);
  const userColors = ELEMENT_COLORS[userElKey];
  const userChar = characterType ?? getCharacterTypeFromElement(dominantElement) ?? "namuri";

  const idealElKey = elementKey(idealMatchElement);
  const idealColors = ELEMENT_COLORS[idealElKey];
  const idealChar = getCharacterTypeFromElement(idealMatchElement);

  const animalLabel = animalTypeKorean
    ? [animalModifier, animalTypeKorean].filter(Boolean).join(" ") + "상"
    : null;

  return (
    <section className="relative overflow-hidden px-5 pt-8 pb-6">
      {/* 배경 오브 — 오행색 1개, 은은하게 */}
      <div
        className="absolute -top-16 -left-12 w-[160px] h-[160px] rounded-full pointer-events-none"
        style={{
          backgroundColor: userColors.pastel,
          filter: "blur(50px)",
          opacity: 0.12,
        }}
      />

      <div className="relative">
        {/* 오버라인 */}
        <p className="text-[11px] font-medium tracking-[0.2px] text-ink-tertiary text-center">
          사주 & 관상 분석 결과
        </p>

        {/* 타이틀 */}
        <h1 className="mt-3 text-center">
          <span className="block text-[28px] font-bold leading-[1.25] tracking-[-0.6px] text-ink">
            {nickname}님의
          </span>
          <span
            className="block text-[28px] font-bold leading-[1.25] tracking-[-0.6px]"
            style={{ color: userColors.main }}
          >
            이상형을 찾았어요!
          </span>
        </h1>

        {/* 연애 유형 서브라인 */}
        {romanceTypeLabel && (
          <p className="mt-2 text-[14px] text-ink-muted text-center leading-relaxed">
            {romanceTypeLabel}
          </p>
        )}

        {/* 유저 - 이상형 마주보기 */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {/* 유저 아바타 */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-[76px] h-[76px] rounded-full border-2 overflow-hidden flex items-center justify-center shadow-low"
              style={{
                backgroundColor: profileImage ? undefined : userColors.pastel,
                borderColor: `${userColors.main}4D`,
              }}
            >
              {profileImage ? (
                <Image src={profileImage} alt="" width={76} height={76} className="object-cover w-full h-full" unoptimized />
              ) : (
                <Image src={`/images/characters/${userChar}/default.png`} alt="" width={48} height={48} className="object-contain" unoptimized />
              )}
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: `${userColors.main}1F`, color: userColors.main }}
            >
              본성 {ELEMENT_KOREAN[userElKey]}
            </span>
          </div>

          {/* 연결 장식 */}
          <div className="flex items-center gap-1 -mt-6">
            <div className="w-5 border-t border-dashed border-ink-tertiary/40" />
            <span className="text-[#F2D0D5] text-sm">&#9829;</span>
            <div className="w-5 border-t border-dashed border-ink-tertiary/40" />
          </div>

          {/* 이상형 캐릭터 */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-[76px] h-[76px] rounded-full border-2 overflow-hidden flex items-center justify-center shadow-low"
              style={{
                backgroundColor: idealColors.pastel,
                borderColor: `${idealColors.main}4D`,
              }}
            >
              <Image src={`/images/characters/${idealChar}/default.png`} alt="" width={48} height={48} className="object-contain" unoptimized />
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: `${idealColors.main}1F`, color: idealColors.main }}
            >
              이상형 {ELEMENT_KOREAN[idealElKey]}
            </span>
          </div>
        </div>

        {/* 요약 카드 */}
        {idealMatchDescription && (
          <div className="mt-5 mx-auto max-w-[320px] px-4 py-3 rounded-2xl bg-hanji-elevated border border-hanji-border shadow-low text-center">
            <p className="text-[13px] text-ink leading-relaxed">
              {idealMatchDescription.slice(0, 80)}
              {idealMatchDescription.length > 80 ? "..." : ""}
            </p>
          </div>
        )}

        {/* 배지 */}
        {animalLabel && (
          <div className="mt-3 flex justify-center">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-brand/15 text-ink">
              {animalLabel}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 사주 연애운 요약 카드**

```tsx
// components/result/saju-romance-card.tsx
"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface SajuRomanceCardProps {
  romanceStyle: string | null;
  romanceKeyPoints: string[] | null;
  accentColor: string;
}

export function SajuRomanceCard({ romanceStyle, romanceKeyPoints, accentColor }: SajuRomanceCardProps) {
  if (!romanceStyle && !romanceKeyPoints?.length) return null;

  return (
    <section className="px-5">
      <div className="rounded-2xl p-5 bg-hanji-elevated border border-hanji-border shadow-low">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}1F` }}
          >
            <span className="text-sm" style={{ color: accentColor }}>&#21340;</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">사주 연애운</p>
            <p className="text-[11px] text-ink-tertiary mt-0.5">사주팔자 기반 연애 성향</p>
          </div>
        </div>

        {romanceStyle && (
          <p className="mt-4 text-[14px] text-ink leading-relaxed line-clamp-3">
            {romanceStyle}
          </p>
        )}

        {romanceKeyPoints?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {romanceKeyPoints.slice(0, 3).map((point, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium border"
                style={{ borderColor: `${accentColor}33`, color: accentColor }}
              >
                {point}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={`${ROUTES.RESULT_DETAIL}?tab=saju`}
          className="mt-4 flex items-center justify-between text-[13px] font-medium text-ink-muted"
        >
          <span>사주 자세히 보기</span>
          <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 관상 연애운 요약 카드**

```tsx
// components/result/gwansang-romance-card.tsx
"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface GwansangRomanceCardProps {
  animalTypeKorean: string | null;
  animalModifier: string | null;
  romanceSummary: string | null;
  charmKeywords: string[] | null;
}

export function GwansangRomanceCard({
  animalTypeKorean,
  animalModifier,
  romanceSummary,
  charmKeywords,
}: GwansangRomanceCardProps) {
  if (!romanceSummary && !charmKeywords?.length) return null;

  const animalLabel = animalTypeKorean
    ? [animalModifier, animalTypeKorean].filter(Boolean).join(" ") + "상"
    : null;

  return (
    <section className="px-5">
      <div className="rounded-2xl p-5 bg-hanji-elevated border border-hanji-border shadow-low">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand/15">
            <span className="text-sm text-brand">&#30456;</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">관상 연애운</p>
            {animalLabel && (
              <p className="text-[11px] text-ink-tertiary mt-0.5">{animalLabel}의 연애</p>
            )}
          </div>
        </div>

        {romanceSummary && (
          <p className="mt-4 text-[14px] text-ink leading-relaxed line-clamp-3">
            {romanceSummary}
          </p>
        )}

        {charmKeywords?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {charmKeywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-brand/30 text-brand"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={`${ROUTES.RESULT_DETAIL}?tab=gwansang`}
          className="mt-4 flex items-center justify-between text-[13px] font-medium text-ink-muted"
        >
          <span>관상 자세히 보기</span>
          <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 매칭 카운터 컴포넌트**

Phase 1에서는 정적 문구. `matching_waitlist` 테이블이 생기면 실제 데이터로 교체.

```tsx
// components/result/matching-counter.tsx
"use client";

interface MatchingCounterProps {
  accentColor: string;
  isVerified: boolean;
}

export function MatchingCounter({ accentColor, isVerified }: MatchingCounterProps) {
  if (isVerified) {
    return (
      <section className="px-5">
        <div
          className="rounded-2xl p-5 text-center border shadow-low"
          style={{
            backgroundColor: `${accentColor}08`,
            borderColor: `${accentColor}1F`,
          }}
        >
          <p className="text-[15px] font-semibold text-ink">매칭 등록 완료!</p>
          <p className="mt-2 text-[13px] text-ink-muted leading-relaxed">
            앱 출시 시 가장 먼저 이상형을 매칭해드릴게요.
            <br />
            친구에게 공유하면 더 빨리 매칭돼요!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5">
      <div
        className="rounded-2xl p-5 text-center border shadow-low"
        style={{
          backgroundColor: `${accentColor}08`,
          borderColor: `${accentColor}1F`,
        }}
      >
        <p className="text-[11px] font-medium text-ink-tertiary">모모가 찾은 당신의 이상형</p>
        <p className="mt-2 text-[15px] font-semibold text-ink">
          전화번호 인증하면
          <br />
          앱 출시 즉시 매칭해드려요!
        </p>
        <p className="mt-2 text-[12px] text-ink-muted">
          지금 등록하면 가장 먼저 매칭 대상이 돼요
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add components/result/matching-hero.tsx components/result/saju-romance-card.tsx components/result/gwansang-romance-card.tsx components/result/matching-counter.tsx
git commit -m "feat: 매칭 메인 컴포넌트 4종 — 히어로, 사주/관상 연애운, 카운터"
```

---

## Task 5: 새 /result 매칭 메인 페이지 작성

기존 `/result/page.tsx`를 삭제하고, 매칭 중심 메인 페이지로 새로 작성한다.

**Files:**
- Replace: `app/result/page.tsx` (기존 코드는 Task 2에서 detail로 복사 완료)

- [ ] **Step 1: 새 매칭 메인 페이지 작성**

```tsx
// app/result/page.tsx — 매칭 중심 메인 (NEW)
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";
import {
  elementKey,
  ELEMENT_COLORS,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";
import { classifyRomanceType } from "@/lib/romance-types";
import { MatchingHero } from "@/components/result/matching-hero";
import { SajuRomanceCard } from "@/components/result/saju-romance-card";
import { GwansangRomanceCard } from "@/components/result/gwansang-romance-card";
import { MatchingCounter } from "@/components/result/matching-counter";
import { trackClickShareInResult } from "@/lib/analytics";

interface ProfileRow {
  name: string | null;
  character_type: string | null;
  dominant_element: string | null;
  profile_images: string[] | null;
  is_phone_verified: boolean | null;
}

interface SajuProfileRow {
  dominant_element: string;
  personality_traits: string[] | null;
  romance_style: string | null;
  romance_key_points: string[] | null;
  ideal_match: { description?: string; traits?: string[] } | null;
}

interface GwansangProfileRow {
  animal_type_korean: string;
  animal_modifier: string;
  romance_summary: string;
  charm_keywords: string[] | null;
  ideal_match_animal_korean: string | null;
}

export default function MatchingMainPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sajuProfile, setSajuProfile] = useState<SajuProfileRow | null>(null);
  const [gwansangProfile, setGwansangProfile] = useState<GwansangProfileRow | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [compatList, setCompatList] = useState<unknown[]>([]);

  // 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("name, character_type, dominant_element, profile_images, is_phone_verified, saju_profile_id, gwansang_profile_id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!profileRow || cancelled) { setDataLoading(false); return; }
        setProfile({
          name: profileRow.name,
          character_type: profileRow.character_type,
          dominant_element: profileRow.dominant_element ?? null,
          profile_images: profileRow.profile_images,
          is_phone_verified: profileRow.is_phone_verified ?? false,
        });
        if (profileRow.saju_profile_id) {
          const { data: saju } = await supabase
            .from("saju_profiles")
            .select("dominant_element, personality_traits, romance_style, romance_key_points, ideal_match")
            .eq("id", profileRow.saju_profile_id)
            .maybeSingle();
          if (!cancelled && saju) setSajuProfile(saju as SajuProfileRow);
        }
        if (profileRow.gwansang_profile_id) {
          const { data: gwansang } = await supabase
            .from("gwansang_profiles")
            .select("animal_type_korean, animal_modifier, romance_summary, charm_keywords, ideal_match_animal_korean")
            .eq("id", profileRow.gwansang_profile_id)
            .maybeSingle();
          if (!cancelled && gwansang) setGwansangProfile(gwansang as GwansangProfileRow);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 공유 URL
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/share-url");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data.url) setShareUrl(data.url);
    })();
    return () => { cancelled = true; };
  }, []);

  // 궁합 리스트 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/compatibility-list");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json.ok && Array.isArray(json.data)) setCompatList(json.data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // 미완료 유저 리다이렉트
  useEffect(() => {
    if (!dataLoading && !profile) {
      let cancelled = false;
      (async () => {
        const res = await fetch("/api/onboarding-step", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) { router.replace(ROUTES.HOME); return; }
        const data = await res.json();
        if (cancelled) return;
        const step = data.step === "result" ? 0 : Number(data.step);
        if (Number.isNaN(step) || step < 0) { router.replace(ROUTES.HOME); return; }
        router.replace(`${ROUTES.ONBOARDING}?step=${step}`);
      })();
      return () => { cancelled = true; };
    }
  }, [dataLoading, profile, router]);

  // 파생 값
  const nickname = profile?.name ?? "";
  const dominantEl = profile?.dominant_element ?? sajuProfile?.dominant_element ?? null;
  const elKey = elementKey(dominantEl);
  const accentColor = ELEMENT_COLORS[elKey]?.main ?? ELEMENT_COLORS.metal.main;
  const isVerified = profile?.is_phone_verified === true;

  const romanceType = classifyRomanceType({
    dominantElement: dominantEl,
    personalityTraits: sajuProfile?.personality_traits ?? null,
    romanceKeyPoints: sajuProfile?.romance_key_points ?? null,
    romanceStyle: sajuProfile?.romance_style ?? null,
  });

  const idealMatch = sajuProfile?.ideal_match;
  const idealElement = idealMatch?.traits
    ? guessElementFromTraits(idealMatch.traits)
    : null;

  const handleShare = async () => {
    if (!shareUrl || typeof window === "undefined") return;
    trackClickShareInResult();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${nickname}님의 이상형 결과`, url: shareUrl });
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt("링크를 복사해 주세요:", shareUrl);
    }
  };

  if (dataLoading || (!profile && !dataLoading)) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center">
        <p className="text-ink-muted text-sm">{dataLoading ? "불러오는 중..." : "이동 중..."}</p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
        {/* 히어로 */}
        <MatchingHero
          nickname={nickname}
          profileImage={profile?.profile_images?.[0] ?? null}
          characterType={profile?.character_type ?? null}
          dominantElement={dominantEl}
          romanceTypeLabel={romanceType.subtitle}
          idealMatchDescription={idealMatch?.description ?? null}
          idealMatchElement={idealElement}
          animalTypeKorean={gwansangProfile?.animal_type_korean ?? null}
          animalModifier={gwansangProfile?.animal_modifier ?? null}
        />

        <div className="space-y-4 pb-8">
          {/* 사주 연애운 */}
          <SajuRomanceCard
            romanceStyle={sajuProfile?.romance_style ?? null}
            romanceKeyPoints={sajuProfile?.romance_key_points ?? null}
            accentColor={accentColor}
          />

          {/* 관상 연애운 */}
          <GwansangRomanceCard
            animalTypeKorean={gwansangProfile?.animal_type_korean ?? null}
            animalModifier={gwansangProfile?.animal_modifier ?? null}
            romanceSummary={gwansangProfile?.romance_summary ?? null}
            charmKeywords={gwansangProfile?.charm_keywords ?? null}
          />

          {/* 매칭 카운터 */}
          <MatchingCounter
            accentColor={accentColor}
            isVerified={isVerified}
          />

          {/* 궁합 리스트 / 공유 CTA */}
          <section className="px-5">
            {compatList.length > 0 ? (
              <div>
                <p className="text-xs text-ink-muted mb-3">궁합 본 친구 ({compatList.length}명)</p>
                <Link
                  href={ROUTES.RESULT_COMPAT}
                  className="block rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low active:bg-hanji-secondary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">궁합 결과 보기</span>
                    <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleShare}
                className="w-full rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low text-center active:bg-hanji-secondary transition-colors"
              >
                <p className="text-sm font-medium text-ink">친구와 궁합 보기</p>
                <p className="mt-1 text-[12px] text-ink-muted">링크를 공유하면 사주 궁합을 알 수 있어요</p>
              </button>
            )}
          </section>
        </div>
      </div>

      {/* CTA */}
      <CtaBar className="shrink-0">
        {isVerified ? (
          <Button size="lg" className="w-full" onClick={handleShare}>
            {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
          </Button>
        ) : (
          <>
            <Link href={ROUTES.COMPLETE} className="block">
              <Button size="lg" className="w-full" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                매칭 등록하기
              </Button>
            </Link>
            <Button variant="outline" size="md" className="w-full mt-4" onClick={handleShare} disabled={!shareUrl}>
              {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
            </Button>
          </>
        )}
      </CtaBar>
    </MobileContainer>
  );
}

// 이상형 traits에서 오행 추측 (간단한 키워드 매칭)
function guessElementFromTraits(traits: string[]): string | null {
  const text = traits.join(" ");
  if (/물|차분|깊|공감|유연|감성/.test(text)) return "water";
  if (/나무|성장|활발|따뜻|배려/.test(text)) return "wood";
  if (/불|열정|솔직|에너지|적극/.test(text)) return "fire";
  if (/흙|안정|믿|든든|포용/.test(text)) return "earth";
  if (/쇠|단단|독립|냉철|명확/.test(text)) return "metal";
  return null;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 로컬 확인**

Run: `npm run dev`
- `/result` 접속 → 매칭 히어로 + 연애운 카드 + 매칭 카운터 표시 확인
- "사주 자세히 보기" → `/result/detail?tab=saju` 이동 확인
- "관상 자세히 보기" → `/result/detail?tab=gwansang` 이동 확인
- `/result/detail`에서 "돌아가기" → `/result` 복귀 확인
- 궁합 없을 때 "친구와 궁합 보기" CTA 표시 확인

- [ ] **Step 4: 커밋**

```bash
git add app/result/page.tsx
git commit -m "feat: /result 매칭 중심 메인 페이지 — 히어로 + 연애운 요약 + 카운터"
```

---

## Task 6: 랜딩/로딩/공유 문구 리프레이밍

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/result/loading/page.tsx`
- Modify: `components/share-teaser-view.tsx`

- [ ] **Step 1: 랜딩 페이지 리프레이밍**

`app/page.tsx`에서 문구 변경:

헤드라인 (57~60번 줄):
```tsx
// 수정 전
<h1 className="text-left text-[22px] font-bold text-ink leading-snug tracking-tight">
  좋은 사람은 많은데,
  <br />
  나랑 결이 딱 맞는 사람은 누굴까?
</h1>

// 수정 후
<h1 className="text-left text-[22px] font-bold text-ink leading-snug tracking-tight">
  사주랑 관상으로
  <br />
  내 이상형 찾기
</h1>
```

서브 텍스트 (65~70번 줄):
```tsx
// 수정 전
<p className="text-left text-[15px] text-ink leading-relaxed">
  사주가 이미 알고 있었어요.
</p>
<p className="mt-2 text-left text-sm text-ink-muted leading-relaxed">
  비슷하게 생기면 잘 산다더라. 사주·관상 보면 잘 맞는 인연을 알려줘요.
</p>

// 수정 후
<p className="text-left text-[15px] text-ink leading-relaxed">
  모모가 찾아줄게요.
</p>
<p className="mt-2 text-left text-sm text-ink-muted leading-relaxed">
  사주와 관상으로 나의 연애 유형과 딱 맞는 이상형을 알려줘요.
</p>
```

브랜드 서브텍스트 (42번 줄):
```tsx
// 수정 전
<p className="text-xs text-ink-muted mt-1">사주가 알고 있는 나의 인연</p>

// 수정 후
<p className="text-xs text-ink-muted mt-1">사주랑 관상으로 내 이상형 찾기</p>
```

- [ ] **Step 2: 로딩 페이지 문구 추가**

`app/result/loading/page.tsx`에서 로딩 메시지에 이상형 관련 문구 추가. 파일 내 `LOADING_MESSAGES` 또는 `_phases` 배열을 찾아 마지막에 추가:

```tsx
// 기존 로딩 메시지 배열의 마지막 항목 뒤에 추가
"이상형도 함께 찾아볼게요!"
```

(실제 배열 구조는 파일에 따라 다를 수 있으므로, 기존 패턴을 따라 추가)

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/page.tsx app/result/loading/page.tsx
git commit -m "feat: 랜딩/로딩 문구 리프레이밍 — 이상형 찾기 중심"
```

---

## Task 7: 최종 통합 확인 및 정리

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx tsc --noEmit && npm run build`
Expected: 빌드 성공

- [ ] **Step 2: 전체 플로우 확인**

```
/ (랜딩) → "사주랑 관상으로 내 이상형 찾기" 확인
  → 카카오 로그인 → 온보딩 → 분석 로딩
  → /result (매칭 메인) — 히어로 + 연애운 카드 + 카운터 확인
  → "사주 자세히 보기" → /result/detail?tab=saju 확인
  → "관상 자세히 보기" → /result/detail?tab=gwansang 확인
  → 뒤로가기 → /result 복귀 확인
  → "궁합 보기" or "친구와 궁합 보기" → /result/compat 확인
  → 뒤로가기 → /result 복귀 확인
  → "매칭 등록하기" → /complete 이동 확인
```

- [ ] **Step 3: 공유 링크 플로우 확인**

```
/share/[id] → 공유 티저 → 2초 후 궁합 바텀시트
  → "궁합 보기" 클릭 → /result/compat 이동 확인 (기존 /result?tab=compatibility 대신)
```

- [ ] **Step 4: CLAUDE.md 업데이트**

`CLAUDE.md`의 Architecture 섹션과 User Flow 섹션에 새 사이트맵 반영. `is_phone_verified` 규칙은 SMS OTP 구현 시 변경 (이번 플랜 범위 밖).

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "docs: CLAUDE.md 사이트맵 업데이트 — 매칭 중심 페이지 재편 반영"
```

---

## 제외된 후속 작업 (별도 플랜 필요)

| 작업 | 선행 조건 | 예상 플랜 |
|------|----------|----------|
| SMS OTP 인증 (`/complete` 리브랜딩) | NHN Cloud 계정 + API 키 | `2026-04-XX-sms-otp.md` |
| 게이미피케이션 (순번/초대 보상) | `matching_waitlist` 테이블 (앱 백엔드 생성) | `2026-04-XX-gamification.md` |
| 매칭 카운터 실시간화 | `matching_waitlist` 테이블 | 게이미피케이션 플랜에 포함 |
| 인스타 스토리 카드 | 디자인 확정 | `2026-04-XX-insta-card.md` |
