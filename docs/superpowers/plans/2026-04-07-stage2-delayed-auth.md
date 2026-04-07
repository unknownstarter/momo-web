# Stage 2: 로그인 뒤로 이동 (Delayed Auth Onboarding) 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오 로그인 트리거를 온보딩 첫 화면(Step 0)에서 **생시 입력 직후(Step 3 CTA)** 로 이동하여, 사용자가 닉네임/성별/생년월일/생시 4개를 이미 입력한 sunk cost 상태에서 로그인을 요청한다. 이로써 카카오 로그인 시작자의 약 61% profiles INSERT 누수를 구조적으로 해결한다.

**Architecture:** `/onboarding` 라우트를 비로그인 접근 가능하게 수정한다. Step 0~3는 anon 상태에서 진행되며, 각 입력값은 `sessionStorage`에 저장된다. Step 3 "다음" CTA 위치에는 비로그인일 때만 기존 `LandingLoginSheet` 컴포넌트가 렌더되어 카카오 OAuth를 트리거한다. OAuth 왕복 후 `/onboarding` 첫 마운트가 sessionStorage를 복원해 Step 4(사진)부터 시작한다. **분석 호출 타이밍, profiles INSERT 시점, 앱 공유 자원(DB/RLS/Edge Function/Storage)은 1바이트도 변경하지 않는다.**

**Tech Stack:** Next.js 15 App Router, React 19 client/server 컴포넌트, Supabase SSR, 기존 `LandingLoginSheet` 컴포넌트 (props 추가만)

**Spec:** `docs/superpowers/specs/2026-04-07-delayed-auth-onboarding.md`

**Stage 1 의존성:** Stage 1 (#24, 환영 캐릭터)이 이미 main에 머지됨. 본 plan은 Stage 1을 그대로 유지하면서 추가 변경만 함.

**절대 금지 (재확인):**
- DB 스키마, RLS, Edge Function, Storage 정책 — **0 변경**
- `lib/analysis.ts`, `app/api/run-analysis/route.ts`, `app/result/loading/page.tsx` — **0 변경** (분석 타이밍 그대로)
- `app/api/onboarding-step/route.ts` — **0 변경**
- 공유 페이지 4개 파일 (`share-teaser-view.tsx`, `share-result-view.tsx`, `share-compatibility-prompt.tsx`, `app/share/[id]/page.tsx`) — **0 변경**
- `lib/onboarding-redirect.ts` 의 `getOnboardingStep()` 시그니처 — **0 변경** (재사용만)

---

## File Structure

### Modify
| 파일 | 변경 요지 |
|---|---|
| `app/onboarding/page.tsx` | (1) useEffect: 비로그인 redirect 제거 + saju 완료자 /result redirect + sessionStorage 복원 + isLoggedIn state 추가. (2) Step 0~3 `goNext` 직전에 sessionStorage 저장. (3) handleStep4Submit 성공 후 sessionStorage clear. (4) Step 3 CtaBar 블록에 isLoggedIn 분기 추가 → 비로그인이면 `<LandingLoginSheet>` 렌더 |
| `components/landing-login-sheet.tsx` | props 3개 추가: `ctaText?`, `ctaBadge?`, `onBeforeLogin?`. 카카오 버튼 하단에 "로그인 시 약관 동의 간주" 작은 회색 글씨 추가 |
| `app/page.tsx` | 랜딩 CTA를 `<LandingLoginSheet />`에서 `<Link href="/onboarding">` Button으로 교체 |
| `lib/analytics.ts` | 신규 이벤트 함수 1개 추가: `trackClickLoginInOnboardingBirthTime()` |

### Create
| 파일 | 책임 |
|---|---|
| (없음) | 모든 변경은 기존 파일 수정 |

### Delete
| 파일 | 이유 |
|---|---|
| (없음) | dead route `/login` 정리는 본 PR 범위 외 (별도 이터레이션) |

### 변경 없음 (재확인 — 절대 건드리지 말 것)
- `lib/analysis.ts`, `app/api/run-analysis/route.ts`, `app/result/loading/page.tsx`
- `app/api/onboarding-step/route.ts`, `app/callback/route.ts`
- `lib/onboarding-redirect.ts` (재사용만)
- `components/share-*.tsx`, `app/share/**`, `app/s/**`
- `app/login/page.tsx` (dead route, 별도 정리)

---

## sessionStorage 정책

- **키:** `momo_pre_onboarding`
- **형식:** `{ "name": string, "gender": "male"|"female"|null, "birthDate": string, "birthTime": string|null, "savedAt": ISO8601 }`
- **TTL:** 24시간 (`savedAt` 기준 클라이언트 만료 체크)
- **저장 시점:** Step 0/1/2/3에서 `goNext` 호출 직전
- **복원 시점:** `/onboarding` 첫 마운트, 로그인 됐는데 `profile.name` 없을 때 (방금 카카오 로그인 후)
- **삭제 시점:** `handleStep4Submit` profiles INSERT/UPDATE 성공 직후

**Race condition 방지:** sessionStorage가 살아있어도 `profile.name`이 이미 있으면 (재입력 케이스) sessionStorage 무시하고 DB profile 우선.

---

## Tasks

### Task 1: lib/analytics.ts — 신규 이벤트 함수 추가

**Files:**
- Modify: `lib/analytics.ts:39-44` (온보딩 섹션)

- [ ] **Step 1: 함수 추가**

`lib/analytics.ts`의 온보딩 섹션 마지막(현재 `trackClickStartAnalysis` 정의 직후, line ~44)에 추가:

```typescript
/** Step 3 CTA에서 카카오 로그인 바텀시트가 트리거되는 시점 (Stage 2 신규) */
export function trackClickLoginInOnboardingBirthTime(): void {
  trackEvent("click_login_in_onboarding_birth_time");
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/analytics.ts
git commit -m "feat(analytics): Stage 2 카카오 로그인 트리거 이벤트 추가"
```

---

### Task 2: components/landing-login-sheet.tsx — props 추가 + 약관 동의 글씨

**Files:**
- Modify: `components/landing-login-sheet.tsx`

기존 컴포넌트는 랜딩 페이지 전용이었으나, Stage 2에서는 `/onboarding` Step 3에서도 재사용된다. 동작은 동일하되 텍스트와 OAuth 직전 콜백을 prop으로 받는다.

- [ ] **Step 1: props 인터페이스 추가**

`components/landing-login-sheet.tsx`의 컴포넌트 정의 직전(현재 `export function LandingLoginSheet()` 위)에 추가:

```typescript
interface LandingLoginSheetProps {
  /** 트리거 버튼 텍스트. 기본값: "관상과 사주로 연애운 확인하기" */
  ctaText?: string;
  /** 버튼 안 배지 텍스트. 기본값: "무료". 빈 문자열이면 배지 숨김 */
  ctaBadge?: string;
  /** 카카오 OAuth 호출 "직전"에 동기 실행되는 훅. sessionStorage 저장 등 */
  onBeforeLogin?: () => void;
}
```

- [ ] **Step 2: 함수 시그니처 + 기본값**

```typescript
export function LandingLoginSheet({
  ctaText = "관상과 사주로 연애운 확인하기",
  ctaBadge = "무료",
  onBeforeLogin,
}: LandingLoginSheetProps = {}) {
```

- [ ] **Step 3: handleKakaoStart에 onBeforeLogin 훅 호출 추가**

기존 `handleKakaoStart` 함수의 첫 줄(현재 `trackStartLogin();` 다음)에 추가:

```typescript
const handleKakaoStart = async () => {
  trackStartLogin();
  // OAuth 호출 직전 동기 훅 (Stage 2: /onboarding Step 3에서 sessionStorage 저장)
  try {
    onBeforeLogin?.();
  } catch {
    // 훅 실패는 OAuth 진행을 막지 않음
  }
  setKakaoLoading(true);
  // ... 이하 기존 코드 그대로
};
```

- [ ] **Step 4: 트리거 버튼 텍스트 prop화**

기존 트리거 버튼 JSX (현재 `<span>관상과 사주로 연애운 확인하기</span>` 부분)를 다음으로 교체:

```tsx
<span className="inline-flex items-center gap-1.5">
  {ctaBadge && (
    <span className="bg-white/[0.15] text-[11px] font-medium px-2 py-0.5 rounded-full">
      {ctaBadge}
    </span>
  )}
  <span>{ctaText}</span>
</span>
```

- [ ] **Step 5: 카카오 버튼 하단에 약관 동의 간주 글씨 추가**

`<BottomSheet>` 안 카카오 버튼(`<button ... onClick={handleKakaoStart}>`) **직후, 기존 LegalLinks 위**에 다음 블록 추가:

```tsx
<p className="mt-3 text-center text-[11px] text-ink-tertiary leading-relaxed">
  로그인 시,{" "}
  <a
    href="/privacy"
    className="underline underline-offset-2 hover:text-ink-secondary"
  >
    개인정보처리방침
  </a>
  과{" "}
  <a
    href="/terms"
    className="underline underline-offset-2 hover:text-ink-secondary"
  >
    서비스 이용약관
  </a>
  에 동의하는 것으로 간주합니다
</p>
```

- [ ] **Step 6: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음. 기존 `app/page.tsx`에서 `<LandingLoginSheet />` (props 없이) 호출하던 게 그대로 동작 (모든 prop이 optional + 기본값).

- [ ] **Step 7: 커밋**

```bash
git add components/landing-login-sheet.tsx
git commit -m "feat(login-sheet): props 추가(ctaText/ctaBadge/onBeforeLogin) + 약관 동의 간주 글씨 추가"
```

---

### Task 3: app/onboarding/page.tsx — useEffect 재작성 (anon 허용)

**Files:**
- Modify: `app/onboarding/page.tsx:127-195` (useEffect)

이번 Task는 useEffect만 수정. Step JSX와 handleStep4Submit은 별도 Task에서 처리.

- [ ] **Step 1: isLoggedIn state 추가**

`OnboardingContent` 함수 안 useState 선언부 (현재 line ~85-90)에 추가:

```typescript
const [step, setStep] = useState(0);
const [form, setForm] = useState<OnboardingFormData>(initialForm);
const [submitError, setSubmitError] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);
const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);  // ← 추가
const stepInitialized = useRef(false);
```

`useState<boolean>(false)`로 시작 — 첫 렌더에서는 anon 가정. useEffect 종료 후 실제 값으로 업데이트.

- [ ] **Step 2: useEffect 본문 교체**

`app/onboarding/page.tsx`의 useEffect (현재 line 127~190 부근, 안에서 supabase.auth.getUser를 호출하는 블록) 전체를 다음으로 교체:

```tsx
useEffect(() => {
  (async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    if (stepInitialized.current) return;
    stepInitialized.current = true;

    // sessionStorage 복원 헬퍼
    const loadFromSession = (): Partial<OnboardingFormData> | null => {
      try {
        const raw = sessionStorage.getItem("momo_pre_onboarding");
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
          name?: string;
          gender?: "male" | "female" | null;
          birthDate?: string;
          birthTime?: string | null;
          savedAt?: string;
        };
        if (parsed.savedAt) {
          const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
          if (ageMs > 24 * 60 * 60 * 1000) {
            sessionStorage.removeItem("momo_pre_onboarding");
            return null;
          }
        }
        return {
          name: parsed.name ?? "",
          gender: parsed.gender ?? null,
          birthDate: parsed.birthDate ?? "",
          birthTime: parsed.birthTime ?? null,
        };
      } catch {
        return null;
      }
    };

    // ─────────────────────────────────────────────────────────────
    // 분기 1: 비로그인 (anon) — Step 0~3 진행
    // ─────────────────────────────────────────────────────────────
    if (!user) {
      // sessionStorage에 진행 중 데이터 있으면 form 복원
      const restored = loadFromSession();
      if (restored) {
        setForm((f) => ({ ...f, ...restored }));
      }
      // URL ?step= 파라미터: 0~3만 허용. 4 이상이면 0으로 강제.
      const stepParam = searchParams.get("step");
      let targetStep = stepParam !== null ? parseInt(stepParam, 10) : 0;
      if (Number.isNaN(targetStep) || targetStep < 0 || targetStep > 3) {
        targetStep = 0;
      }
      setStep(targetStep);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 분기 2: 로그인 + 기존 profile 있음 (재방문 회원)
    // ─────────────────────────────────────────────────────────────
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("name, gender, birth_date, birth_time, profile_images, height, occupation, location, body_type, religion, bio, interests, ideal_type, saju_profile_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profileRow?.name) {
      // 2a: 사주·관상 결과 있으면 /result로 직행
      const target = getOnboardingStep(profileRow);
      if (target === "result") {
        router.replace(ROUTES.RESULT);
        return;
      }

      // 2b: 필수 정보 일부 누락 → 해당 step으로 form 채우고 이동
      const stepParam = searchParams.get("step");
      let targetStep = stepParam !== null ? parseInt(stepParam, 10) : NaN;
      if (Number.isNaN(targetStep) || targetStep < 0 || targetStep >= ONBOARDING_STEP_COUNT) {
        targetStep = typeof target === "number" ? target : 0;
      }
      const birthTime = profileRow.birth_time
        ? String(profileRow.birth_time).replace(/:00$/, "") ?? null
        : null;
      setForm({
        name: profileRow.name ?? "",
        gender: (profileRow.gender as "male" | "female") ?? null,
        birthDate: profileRow.birth_date ?? "",
        birthTime,
        photoPreview: Array.isArray(profileRow.profile_images) && profileRow.profile_images[0]
          ? profileRow.profile_images[0]
          : null,
        photoFile: null,
        height: profileRow.height != null ? String(profileRow.height) : "",
        occupation: profileRow.occupation ?? "",
        location: profileRow.location ?? null,
        bodyType: profileRow.body_type ?? null,
        religion: profileRow.religion ?? null,
        bio: profileRow.bio ?? "",
        interests: Array.isArray(profileRow.interests) ? profileRow.interests : [],
        idealType: profileRow.ideal_type ?? "",
      });
      setStep(targetStep);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 분기 3: 로그인 + profile 없음 (방금 카카오 로그인 후)
    // ─────────────────────────────────────────────────────────────
    const restored = loadFromSession();
    if (restored?.name) {
      // sessionStorage에 Stage 2 입력값 있음 → 복원 + Step 4(사진)부터
      setForm((f) => ({ ...f, ...restored }));
      setStep(4);
      return;
    }

    // 분기 4 (fallback): 로그인은 했는데 profile도 sessionStorage도 없음
    // → 정상 흐름이 아님. Step 0부터 다시 시작.
    setStep(0);
  })();
}, [router, searchParams]);
```

- [ ] **Step 3: getOnboardingStep import 확인**

`app/onboarding/page.tsx` 상단 import에 `getOnboardingStep`이 없으면 추가:

```typescript
import { getOnboardingStep } from "@/lib/onboarding-redirect";
```

- [ ] **Step 4: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add app/onboarding/page.tsx
git commit -m "feat(onboarding): useEffect 재작성 — anon 허용 + saju 완료자 /result + sessionStorage 복원"
```

---

### Task 4: app/onboarding/page.tsx — sessionStorage 저장 + clear 로직

**Files:**
- Modify: `app/onboarding/page.tsx` (goNext 함수, handleStep4Submit)

- [ ] **Step 1: persistPreOnboardingToSession 헬퍼 추가**

`OnboardingContent` 함수 안 (useEffect 다음, goNext 위에) 추가:

```tsx
/** Step 0~3 입력값을 sessionStorage에 저장 (Stage 2: 카카오 OAuth 왕복용) */
const persistPreOnboardingToSession = useCallback(() => {
  try {
    sessionStorage.setItem(
      "momo_pre_onboarding",
      JSON.stringify({
        name: form.name,
        gender: form.gender,
        birthDate: form.birthDate,
        birthTime: form.birthTime,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // private mode 등에서는 무시
  }
}, [form.name, form.gender, form.birthDate, form.birthTime]);
```

`useCallback` import가 없으면 추가: `import { useState, useCallback, useEffect, useRef, Suspense } from "react";`

- [ ] **Step 2: goNext에서 Step 0~3 진행 시 sessionStorage 저장**

`goNext` 함수 (현재 line ~94-102 부근)를 다음으로 교체:

```tsx
const goNext = useCallback(() => {
  const name = STEP_NAMES[step];
  if (name) trackClickNextInOnboarding(name);
  // Stage 2: Step 0~3 진행 시 sessionStorage 백업 (anon 카카오 OAuth 왕복용)
  if (step <= 3) {
    persistPreOnboardingToSession();
  }
  if (step < ONBOARDING_STEP_COUNT - 1) {
    let next = step + 1;
    while (SKIP_STEPS.has(next) && next < ONBOARDING_STEP_COUNT - 1) next++;
    setStep(next);
  }
}, [step, persistPreOnboardingToSession]);
```

- [ ] **Step 3: handleStep4Submit 성공 후 sessionStorage clear**

`handleStep4Submit` 함수 끝부분 (현재 `goNext()` 호출 직전, 약 line ~261)에 추가:

```tsx
// Stage 2: pre-onboarding sessionStorage 정리 (Step 4 INSERT 성공 후)
try {
  sessionStorage.removeItem("momo_pre_onboarding");
} catch {
  // 무시
}

setSubmitting(false);
goNext();
```

- [ ] **Step 4: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add app/onboarding/page.tsx
git commit -m "feat(onboarding): Step 0~3 sessionStorage 저장 + Step 4 성공 시 clear"
```

---

### Task 5: app/onboarding/page.tsx — Step 3 CTA에 LandingLoginSheet 분기 추가

**Files:**
- Modify: `app/onboarding/page.tsx:858-864` (Step 3 CtaBar 블록)

- [ ] **Step 1: LandingLoginSheet import 추가**

`app/onboarding/page.tsx` 상단 import 영역에 추가:

```typescript
import { LandingLoginSheet } from "@/components/landing-login-sheet";
import { trackClickLoginInOnboardingBirthTime } from "@/lib/analytics";
```

기존 `import { ... } from "@/lib/analytics";` 블록이 이미 있으면 거기에 `trackClickLoginInOnboardingBirthTime` 추가.

- [ ] **Step 2: Step 3 CtaBar 블록 교체**

기존 (line ~858-864):

```tsx
{step === 3 && (
  <CtaBar>
    <Button size="lg" className="w-full" onClick={goNext}>
      다음
    </Button>
  </CtaBar>
)}
```

다음으로 교체:

```tsx
{step === 3 && (
  <CtaBar>
    {isLoggedIn ? (
      // 로그인 상태: 기존처럼 그냥 다음 (Step 4 사진으로)
      <Button size="lg" className="w-full" onClick={goNext}>
        다음
      </Button>
    ) : (
      // 비로그인: 카카오 로그인 바텀시트 트리거
      // OAuth 호출 직전에 sessionStorage에 form 저장
      <LandingLoginSheet
        ctaText="사주 결과 보기"
        ctaBadge=""
        onBeforeLogin={() => {
          trackClickLoginInOnboardingBirthTime();
          persistPreOnboardingToSession();
        }}
      />
    )}
  </CtaBar>
)}
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 수동 동작 확인 (개발 서버)**

```
1. npm run dev
2. 시크릿 창에서 http://localhost:3001/onboarding?step=0 접속
3. Step 0~3 진행 (닉네임 → 성별 → 생일 → 생시)
4. Step 3에서 CTA 버튼 텍스트가 "사주 결과 보기"인지 확인
5. CTA 클릭 → 카카오 로그인 바텀시트 슬라이드업
6. 바텀시트 안 카카오 버튼 하단에 "로그인 시, [개인정보처리방침]과 [서비스 이용약관]에 동의하는 것으로 간주합니다" 회색 글씨 보임 확인
```

(아직 카카오 OAuth는 실제로 누르지 말 것 — 다음 task들 끝난 후 통합 테스트)

- [ ] **Step 5: 커밋**

```bash
git add app/onboarding/page.tsx
git commit -m "feat(onboarding): Step 3 CTA에 카카오 로그인 바텀시트 분기 추가"
```

---

### Task 6: app/page.tsx — 랜딩 CTA를 /onboarding Link로 교체

**Files:**
- Modify: `app/page.tsx`

랜딩 페이지의 CTA가 `LandingLoginSheet`(바텀시트)를 열던 동작을, `/onboarding` 닉네임 화면으로 직접 이동하도록 변경. `LandingLoginSheet` 컴포넌트 자체는 Step 3에서 사용되므로 삭제하지 않음.

- [ ] **Step 1: import 변경**

`app/page.tsx` 상단:

```tsx
import Link from "next/link";
// ... 기존 import들
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
```

`LandingLoginSheet` import는 **제거**.

- [ ] **Step 2: CtaBar 안 JSX 교체**

기존 (line ~134-136):

```tsx
<CtaBar className="shrink-0">
  <LandingLoginSheet />
</CtaBar>
```

다음으로 교체:

```tsx
<CtaBar className="shrink-0">
  <Link href={ROUTES.ONBOARDING} className="block w-full">
    <Button size="lg" className="w-full">
      <span className="inline-flex items-center gap-1.5">
        <span className="bg-white/[0.15] text-[11px] font-medium px-2 py-0.5 rounded-full">
          무료
        </span>
        <span>관상과 사주로 연애운 확인하기</span>
      </span>
    </Button>
  </Link>
</CtaBar>
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit && npm run build`
Expected: 빌드 성공. `app/page.tsx`에서 `LandingLoginSheet` 참조 0.

- [ ] **Step 4: 수동 동작 확인**

```
1. http://localhost:3001/ 접속
2. 랜딩 페이지 CTA 클릭
3. 바텀시트가 뜨지 않고 곧장 /onboarding 닉네임 화면으로 이동하는지 확인
```

- [ ] **Step 5: 커밋**

```bash
git add app/page.tsx
git commit -m "feat(landing): CTA 클릭 시 /onboarding으로 직행 (바텀시트 제거)"
```

---

### Task 7: 통합 빌드 + E2E 수동 시나리오

**Files:** 없음 (검증 only)

- [ ] **Step 1: 클린 빌드**

Run: `rm -rf .next && npm run build`
Expected: 빌드 성공. 경고는 허용하되 에러 없음.

- [ ] **Step 2: 시나리오 A — 비회원 정상 흐름**

```
1. 시크릿 창에서 http://localhost:3001/ 접속
2. 랜딩 CTA "관상과 사주로 연애운 확인하기" 클릭 → /onboarding로 이동 (바텀시트 안 뜸)
3. Step 0 (닉네임): "테스트" 입력 → "다음"
4. Step 1 (성별): "남성" 클릭 → 자동 진행
5. Step 2 (생년월일): 1990-01-01 → "다음"
6. Step 3 (생시): "오시" 선택 → CTA 버튼 텍스트 "사주 결과 보기" 확인 → 클릭
7. 카카오 로그인 바텀시트 슬라이드업 → momo 로고 + "카카오로 시작하기" + 약관 동의 간주 회색 글씨 확인
8. "카카오로 시작하기" 클릭 → 카카오 OAuth 동의 화면
9. 동의 → /callback → /onboarding?step=4 (사진 화면) 도착
10. Step 4 사진 화면에 닉네임/성별/생년월일/생시가 form에 복원되어 있는지 (DevTools React state)
11. 사진 업로드 → "다음" → profiles INSERT 발생
12. Step 5~13 진행 → "분석 시작" → /result/loading → /result 정상 도달
13. DevTools → Application → Session Storage 확인: momo_pre_onboarding 키 삭제됨
```

- [ ] **Step 3: 시나리오 B — 회원 재방문, 사주·관상 완료자 → /result 직행**

```
1. 시나리오 A로 가입한 계정으로 로그인 상태 유지
2. 주소창에 /onboarding 직접 입력
3. /result로 자동 리다이렉트되는지 확인 (Step 0 안 보여야 함)
```

- [ ] **Step 4: 시나리오 C — 회원 재방문, 필수 정보 일부 누락**

```
1. 별도 테스트 계정으로 카카오 로그인 후 Step 4 사진 업로드 직전에 이탈 (브라우저 닫기)
2. 다시 사이트 접속 → /onboarding 진입 (이미 로그인 상태)
3. /onboarding 첫 마운트가 profile.name + getOnboardingStep() 결과로 어디로 보내는지 확인
   - 닉네임만 있고 사진 없으면 → Step 4 (사진) 또는 그 이전 비어있는 step
   - 위 결과가 정확한지 확인
```

- [ ] **Step 5: 시나리오 D — sessionStorage 손실 fallback**

```
1. 시크릿 창에서 /onboarding 접속 (anon)
2. Step 0~3 입력
3. Step 3 CTA 클릭 → 바텀시트 → "카카오로 시작하기" 클릭 직전 DevTools → Application → Session Storage에서 momo_pre_onboarding 키 수동 삭제
4. "카카오로 시작하기" → OAuth → /callback → /onboarding 도달
5. profile에 name 없고 sessionStorage 비어있음 → 분기 4 fallback (Step 0부터)
6. Step 0이 표시되는지 확인 (사용자는 다시 입력해야 함, 정상 fallback 동작)
```

- [ ] **Step 6: 시나리오 E — 공유 페이지 → / → /onboarding (변경 없음 검증)**

```
1. 시크릿 창에서 기존 공유 링크 (/share/<token>) 접속
2. 공유 티저 페이지 → 2초 후 궁합 바텀시트
3. "궁합 보기" 클릭 → 기존과 동일하게 / (랜딩)로 이동 (변경 없음 확인)
4. 랜딩 CTA 클릭 → /onboarding (Stage 2 신규 동작)
5. Step 0~3 → 카카오 로그인 → /onboarding?step=4
6. DevTools → Application → Cookie 확인: momo_compat_partner 키 7일 만료 살아있음
7. 분석 완료 → /result → 궁합 탭 → /result/compat → A와의 궁합 자동 표시 확인
```

- [ ] **Step 7: 시나리오 F — 회원이 / 랜딩에 진입**

```
1. 이미 로그인된 회원 (사주 미완료) 상태로 / 접속
2. 랜딩 CTA 클릭 → /onboarding로 이동
3. /onboarding useEffect: 분기 2(로그인+profile있음)로 진입 → getOnboardingStep() 결과대로 이동
4. (사주 완료자라면 /result로 redirect)
```

- [ ] **Step 8: 모든 시나리오 통과 후 PR 생성 단계로**

체크리스트 OK면 다음 Task로.

---

### Task 8: docs 업데이트

**Files:**
- Modify: `docs/event-taxonomy.md`
- Modify: `docs/web-flow.md`
- Modify: `CLAUDE.md` (Key Rules Summary)

- [ ] **Step 1: event-taxonomy.md에 신규 이벤트 추가**

`docs/event-taxonomy.md`의 "온보딩" 섹션 표 마지막에 추가:

```markdown
| `click_login_in_onboarding_birth_time` | step 3 "사주 결과 보기" CTA 클릭 (Stage 2: 카카오 OAuth 트리거 직전) |
```

- [ ] **Step 2: web-flow.md 1번 플로우 도식 업데이트**

`## 1. 전체 플로우`의 코드 블록을 다음으로 교체:

```
랜딩 / (또는 광고 직행)
  ↓ CTA "관상과 사주로 연애운 확인하기"
/onboarding (anon 진입 가능)
  Step 0 닉네임 → Step 1 성별 → Step 2 생년월일 → Step 3 생시
    ↓ "사주 결과 보기" CTA
카카오 로그인 바텀시트 (LandingLoginSheet 재사용)
  - 카카오 버튼 + 약관 동의 간주 작은 글씨
    ↓ "카카오로 시작하기" → sessionStorage 저장 → signInWithOAuth
카카오 OAuth → /callback
    ↓
/onboarding?step=4 (sessionStorage 복원, Step 4 사진부터)
  Step 4 사진 → profiles INSERT + /api/run-analysis fire-and-forget
  Step 5 키 → ... → Step 13 확인
    ↓
/result/loading → /result → /complete
```

- [ ] **Step 3: web-flow.md 2번 표 갱신**

`## 2. 페이지별 요약` 표에서 "온보딩" 행을 다음으로 교체:

```markdown
| 온보딩 | `/onboarding` | **Step 0~3 anon 접근 가능** (닉네임/성별/생일/생시). Step 3 CTA → 카카오 로그인 바텀시트. Step 4(사진)부터 로그인 필수 |
```

- [ ] **Step 4: CLAUDE.md Rule 19 추가**

`CLAUDE.md`의 "Key Rules Summary" 섹션 마지막(Rule 18 다음)에 추가:

```markdown
19. **⚠️ Delayed Auth Onboarding (Stage 2 — 2026-04 적용)**: `/onboarding` Step 0~3은 **비로그인 anon 접근 허용**. 카카오 로그인은 Step 3 "사주 결과 보기" CTA 클릭 시 `LandingLoginSheet` 바텀시트로 트리거. 입력값은 `sessionStorage["momo_pre_onboarding"]` (24h TTL)에 저장되어 OAuth 왕복 후 `/onboarding` 첫 마운트가 복원 → Step 4(사진)부터 시작. **profiles 첫 INSERT 시점은 그대로 Step 4 사진 통과 시점**(변경 없음). **분석 호출 타이밍/DB/RLS/Edge Function/Storage 모두 변경 없음** (앱 공유 자원 보호). 회원 재방문은 `getOnboardingStep()` 결과에 따라 `/result` 또는 비어있는 step으로 이동.
```

- [ ] **Step 5: 커밋**

```bash
git add docs/event-taxonomy.md docs/web-flow.md CLAUDE.md
git commit -m "docs: Stage 2 (delayed auth onboarding) 흐름 반영"
```

---

### Task 9: PR + 머지 + Production 배포 검증

**Files:** 없음

- [ ] **Step 1: 클린 빌드 재확인**

Run: `rm -rf .next && npm run build`
Expected: 빌드 성공

- [ ] **Step 2: feature 브랜치 push**

Run: `git push -u origin feature/stage2-delayed-auth`

- [ ] **Step 3: PR 생성**

```bash
gh pr create --title "feat: Stage 2 — 카카오 로그인을 생시 입력 직후로 이동" --body "$(cat <<'EOF'
## Summary
- /onboarding Step 0~3을 비로그인(anon) 접근 가능하게 수정
- Step 3 "사주 결과 보기" CTA 클릭 시 LandingLoginSheet 바텀시트로 카카오 OAuth 트리거
- 카카오 OAuth 왕복 중 form 데이터를 sessionStorage("momo_pre_onboarding", 24h TTL)에 보존
- /onboarding 첫 마운트가 sessionStorage 복원해 Step 4(사진)부터 시작
- 회원 재방문은 getOnboardingStep() 결과에 따라 /result 또는 비어있는 step으로
- 랜딩 CTA: 바텀시트 → /onboarding 직행으로 변경
- LandingLoginSheet 바텀시트에 약관 동의 간주 회색 글씨 추가

## 배경
GA4 funnel에서 카카오 로그인 시작자의 약 61%가 profiles INSERT 단계까지 도달하지 못하는 누수 발견.
사용자가 닉네임/성별/생일/생시 4개를 이미 입력한 sunk cost 상태에서 로그인 요청 → 거부감 감소 + 가입 전환율 상승 기대.

## 앱 영향
- DB 스키마 / RLS / Edge Function / Storage — 0 변경
- profiles / saju_profiles / gwansang_profiles 쓰기 패턴 — 0 변경 (Step 4 사진 통과 시점에 INSERT)
- 분석 호출 타이밍 (calculate-saju + saju-insight + gwansang-reading 묶음) — 0 변경 (Step 4 fire-and-forget)
- 공유 페이지 4개 파일 — 0 변경
- momo 네이티브 앱 영향 0 (심사 중 안전)

## Test plan
- [ ] 시나리오 A: 비회원 정상 흐름 (랜딩 → /onboarding → 카카오 → 사진 → 결과)
- [ ] 시나리오 B: 회원 재방문 + 사주 완료자 → /result 직행
- [ ] 시나리오 C: 회원 재방문 + 필수 정보 일부 누락 → 해당 step으로
- [ ] 시나리오 D: sessionStorage 손실 fallback (Step 0부터)
- [ ] 시나리오 E: 공유 페이지 → / → /onboarding + momo_compat_partner 유지 + 궁합 자동 체크
- [ ] 시나리오 F: 회원이 랜딩에 진입 → /onboarding → getOnboardingStep 결과로
- [ ] Vercel Preview 빌드 성공
- [ ] 약관 동의 간주 회색 글씨 모바일에서 가독성 확인

## Spec
docs/superpowers/specs/2026-04-07-delayed-auth-onboarding.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Vercel Preview 빌드 통과 대기**

Run: `gh pr view <PR번호> --json statusCheckRollup`
Expected: Vercel state = SUCCESS

- [ ] **Step 5: Squash merge**

```bash
gh pr merge <PR번호> --squash --delete-branch
```

- [ ] **Step 6: Production 배포 완료 확인**

Run: `gh api repos/unknownstarter/momo-web/commits/main/status`
Expected: state = success, "Deployment has completed"

- [ ] **Step 7: 로컬 main 동기화**

```bash
git checkout main && git pull origin main
```

- [ ] **Step 8: Production smoke test**

`https://<production-domain>/onboarding` 직접 접속해 시나리오 A 첫 단계만 (랜딩→/onboarding→Step 0 표시) 빠르게 확인.

- [ ] **Step 9: Meta Ads Manager에서 광고 destination URL 변경 (노아님 수동 작업)**

**이게 Stage 2의 핵심 가치 중 하나**: 광고 유입자가 `/`(랜딩)을 거치지 않고 `/onboarding`으로 직행. 1순위 누수(랜딩 이탈 132명, 58.7%)를 통째로 해결.

```
1. https://business.facebook.com → 광고 관리자
2. 운영 중인 캠페인의 각 광고 단위 → 편집
3. "웹사이트 URL" 필드:
   변경 전: https://<domain>/ (또는 ?utm=...)
   변경 후: https://<domain>/onboarding (또는 /onboarding?utm=...)
4. UTM 파라미터는 그대로 유지
5. 저장 → 다음 광고 노출부터 적용
```

**확인:**
- GA4 실시간 보고서: `/onboarding` page_view 발화 확인
- GA4 탐색 funnel: `view_onboarding_name` → `click_next_in_onboarding_name` → ... → `click_login_in_onboarding_birth_time` → `view_onboarding_photo` 측정
- 24~48시간 모니터링 후 funnel 비교 (Stage 2 전 vs 후)

**롤백 가능:** 문제 발생 시 Meta Ads Manager에서 URL을 다시 `/`로 되돌리면 즉시 기존 흐름으로 복귀. 코드 롤백 불필요.

**랜딩 `/`는 그대로 유지** — 직접 방문, SEO, 공유 링크 fallback용. 광고만 `/onboarding` 직행.

---

## Self-Review

### 1. Spec coverage

- [x] 비회원 흐름 (Step 0~3 anon → Step 3 CTA → 카카오 로그인 → 사진) → Task 3, 4, 5
- [x] 회원 재방문 흐름 (필수 정보 누락 → 해당 step / 사주 완료 → /result) → Task 3 useEffect 분기 2
- [x] 랜딩 CTA → /onboarding 직행 → Task 6
- [x] 카카오 바텀시트 약관 동의 간주 글씨 → Task 2 Step 5
- [x] sessionStorage 보존 (form 데이터, 24h TTL) → Task 4
- [x] sessionStorage 복원 (OAuth 후) → Task 3 분기 3
- [x] sessionStorage clear (Step 4 INSERT 후) → Task 4 Step 3
- [x] 공유 페이지 변경 없음 → 명시적으로 Files 표에 0 변경 표기
- [x] 분석 타이밍 변경 없음 → Architecture + Files 표 + CLAUDE.md Rule 19 명시
- [x] 앱 공유 자원 변경 없음 → 명시적 보호 (DB/RLS/Edge Function/Storage)
- [x] 신규 GA4 이벤트 → Task 1
- [x] docs 업데이트 → Task 8
- [x] PR + 배포 검증 → Task 9

### 2. Placeholder scan
- "TBD"/"적절히"/"등등" 없음
- 모든 코드 블록 완성형 (placeholder 없이 실제로 컴파일되는 코드)
- 모든 step에 실행 명령어 + expected 결과 명시
- 라인 번호는 현재 파일 상태 기준 (±몇 줄 차이는 식별자/함수명으로 위치 가능)

### 3. Type consistency
- `momo_pre_onboarding` sessionStorage 키: Task 3(읽기), Task 4(쓰기), Task 4 Step 3(삭제)에서 동일
- `LandingLoginSheetProps` 인터페이스: Task 2에서 정의, Task 5에서 사용
- `OnboardingFormData` 타입: 기존 정의 그대로 사용 (변경 없음)
- `getOnboardingStep`: 기존 함수 import만 (시그니처 변경 없음)
- `isLoggedIn` state: Task 3에서 정의, Task 5에서 사용

### 4. Risk와 대응

| Risk | 대응 |
|---|---|
| 카카오 OAuth 후 sessionStorage 휘발 (인앱브라우저) | 시나리오 D fallback (Step 0부터 재입력). 큰 손실 아님 |
| 회원 재방문 시 sessionStorage가 남아있어서 재입력 데이터가 덮어씌워짐 | Task 3 분기 2에서 profile.name 우선. sessionStorage는 분기 3(profile 없음)에서만 사용 |
| `/onboarding` 직접 진입 시 anon이 Step 4 이상 접근 시도 | Task 3 분기 1에서 step > 3이면 0으로 강제 |
| `LandingLoginSheet` props 추가가 기존 호출자(`app/page.tsx`) 깨뜨림 | Task 2 모든 prop optional + 기본값. Task 6에서 `app/page.tsx`는 어차피 사용 안 함 |
| getOnboardingStep이 step 0~3 리턴할 수도 있음 (앱 가입자 중 필드 일부 누락) | Task 3 분기 2에서 그대로 해당 step 표시 — 정상 동작 |
| 카카오 인앱브라우저 OAuth 비호환 | 별도 이슈, 본 PR 범위 외 |

---

## Execution Handoff

Plan 작성 완료. `docs/superpowers/plans/2026-04-07-stage2-delayed-auth.md`에 저장됨.

**노아님 결정 요청:**

1. **Plan 자체 먼저 검토** — 노아님이 plan 한 번 훑어보시고 이상 없으면 구현 착수
2. **Subagent-Driven 실행** — Task별 fresh subagent. 각 task 사이마다 노아님이 commit diff 보고 OK 확인
3. **Inline 실행** — 같은 세션에서 Task 순차 실행. 노아님이 체크포인트마다 확인

저는 **1번 → 3번** 순서를 권합니다. 9개 task로 작게 쪼개져 있고 각 변경이 명확해서 inline 실행이 효율적입니다. Task 사이마다 잠깐 멈춰서 노아님이 짧게 OK만 주시면 빠르게 진행됩니다.
