# Stage 2: 로그인을 사진 직전으로 이동 (Delayed Auth Onboarding) — 스펙

> **상태:** 초안 (설계 단계). 구현 전 노아님 최종 검토 필요.
> **Stage 1 선행 필요:** 닉네임 입력 화면에 GIF + 환영 카피 추가 (이미 별도 작업 중)
> **착수 조건:** Stage 1 배포 후 일주일 이상 안정화 확인 + momo 네이티브 앱 심사 상황 고려

---

## 배경

### 발견된 문제

GA4 funnel 분석(2026-04-07)에서 카카오 로그인 시작자의 약 **61%가 `profiles` 테이블 INSERT 단계까지 도달하지 못함**을 확인.

```
단계 3 (start_login)                      62명  ←  카카오 로그인 클릭
단계 6 (click_next_in_onboarding_photo)   24명  ←  사진 업로드 완료 = profiles 첫 INSERT
                                       ────
                                          38명 이탈 (61%)
```

즉 "auth.users에는 있지만 profiles에는 없는" 유령 유저가 전체 로그인 유입의 절반 이상.

### 원인

현재 플로우는 **로그인이 너무 앞단**에 배치되어 있음:

```
랜딩 → CTA → 로그인 바텀시트 → 카카오 OAuth →
  /onboarding Step 0 (이름) → Step 1 (성별) → Step 2 (생년월일) →
  Step 3 (생시) → Step 4 (사진 + profiles INSERT)
```

- 사용자가 가치를 느끼기 전에 로그인 요구 → 거부감
- 카카오 OAuth 왕복 중 이탈 가능성
- 로그인 후에도 Step 0~3 입력을 해야 하므로 여전히 긴 여정

### 해결 방향 (value-first signup)

ChatGPT 초기, Pinterest, Notion, Figma 등이 검증한 패턴: **가치를 먼저 보여주거나, 사용자가 투자를 하게 만든 후 로그인 요구**.

이 프로젝트에서는 "사주·관상 결과" 가치를 먼저 보여주는 건 기술적으로 복잡하므로 (Edge Function 권한 + DB 저장 제약), **차선책으로 "사용자가 닉네임/성별/생년월일/생시 4개를 이미 입력한 상태"에서 로그인 요구**. Sunk cost 효과로 거부감 대폭 감소 예상.

---

## 목표

**정량 목표:**
- 카카오 로그인 시작자 → profiles INSERT 도달률 **61% → 85%+ 기대**
- 랜딩 이탈률 감소 (광고 destination URL을 /start 또는 동등 경로로 변경 가능)

**정성 목표:**
- 사용자가 "투자한 정보"를 갖고 로그인 결정 → 가입 전환율 상승
- 같은 사용자 경험을 3개 진입점(광고/랜딩/공유 링크)에서 통일

---

## 유저 플로우

### A. 비회원 (신규 유입)

```
랜딩 (/, 유지) 또는 광고 직행
    ↓ CTA 클릭
닉네임 입력
    ↓ 다음
성별 입력
    ↓ 자동 진행
생년월일 입력
    ↓ 다음
태어난 일시 입력 (생시)
    ↓ "사주 결과 보기" CTA
기존 카카오 로그인 바텀시트 (LandingLoginSheet 재사용)
    - 내용: momo 로고 + "시작하려면 로그인해 주세요" + "카카오로 시작하기" 버튼
    - 신규 추가: 버튼 하단 작은 회색 글씨
      "로그인 시, [개인정보처리방침]과 [서비스 이용약관]에 동의하는 것으로 간주합니다"
      (대괄호 안은 텍스트형 버튼 — 클릭 시 해당 페이지로 이동)
    ↓ "카카오로 시작하기" 클릭
카카오 OAuth → /callback
    ↓
사진 등록 페이지 (기존 /onboarding Step 4)
    - 닉네임/성별/생년월일/생시는 sessionStorage에서 복원된 상태
    ↓ 사진 업로드 → "다음"
profiles INSERT (첫 저장, 기존 동작 유지) + 분석 백그라운드 호출 (fire-and-forget)
    ↓
Step 5~13 (키/직업/지역/체형/종교/자기소개/관심사/이상형/확인)
    ↓ "분석 시작"
/result/loading → /result
    ↓
/complete (전화번호 + SMS 수신 동의)
```

### B. 회원 재방문

로그인된 상태로 사이트에 다시 진입했을 때:

| 프로필 상태 | 이동 대상 |
|---|---|
| 필수 정보 일부 누락 (이름 없음/성별 없음/생년월일 없음 등) | 해당 필수 정보 입력 페이지로 이동 (기존 `getOnboardingStep()` 로직 사용) |
| 필수 정보 모두 있음 + 사진 없음 | 사진 등록 페이지로 이동 |
| 필수 정보 모두 있음 + 사진 있음 + 사주·관상 분석 결과 없음 | /onboarding Step 5~13 중 비어있는 첫 스텝 |
| 필수 정보 모두 있음 + 사주·관상 분석 결과 있음 (`saju_profile_id` 존재) | **`/result` 직행** |

**중요:** 이 판단 로직은 `lib/onboarding-redirect.ts`의 기존 `getOnboardingStep(profile)` 함수가 이미 정확히 구현하고 있음. 재사용.

### C. 공유 링크 유입자 (비회원)

**Stage 2에서는 기존 동작 유지.** 즉 공유 페이지(`/share/[id]`)의 "나도 사주·관상 보기" CTA는 기존처럼 `/`(랜딩)로 이동. 랜딩 CTA를 한 번 더 눌러서 닉네임 입력 흐름에 합류.

노아님 결정 (2026-04-07):
> "유지하고 공유하기 링크에서 CTA 눌렀을 때도 기존과 동일하게 '/'로 랜딩하게 해줘. 어차피 친구 링크 통해서 들어온거라서 괜찮아. 이건 나중에 공유하기 링크의 CTA 유입 관련 데이터 보고 다시 얘기하자."

→ 공유 페이지 관련 4개 파일(`share-teaser-view.tsx`, `share-result-view.tsx`, `share-compatibility-prompt.tsx`, `app/share/[id]/page.tsx`)은 **코드 변경 없음**. Stage 2 이후 별도 이터레이션에서 데이터 보고 결정.

### D. 탈퇴 요청 / 삭제된 계정

기존 `app/callback/route.ts`의 로직 유지:
- `account_status === "pending_deletion"` → `/pending-deletion` 리다이렉트
- `account_status === "deleting" | "deleted"` → signOut + `/?error=account_deleted`

---

## 기술적 설계 선택

### 1. 닉네임~생시 입력을 어디에 둘 것인가?

**선택지 비교:**

| 선택지 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **α. 신규 `/start` 라우트** | 별도 anon 페이지 생성, Step 0~3 UI 복사 | 명확한 분리, 단일 책임 | 코드 중복 (Step 0~3 JSX 2벌) |
| **β. 기존 `/onboarding` anon 허용** | `/onboarding` Step 0~3을 비로그인도 접근 가능하게 수정 | 코드 중복 없음, 최소 변경 | 라우트 의미가 약간 모호 (anon + 로그인 혼용) |

**노아님 선호:** β 방향 — "기존 닉네임 페이지를 건드려서 로그인 없이도 쓸 수 있게". Stage 2 구현 시 β로 진행.

### 2. sessionStorage 정책

카카오 OAuth는 외부 도메인(accounts.kakao.com) 왕복을 거치지만, **같은 브라우저 탭에서 origin이 보존**되므로 `sessionStorage`는 유지됨. 이를 활용해 Step 0~3 입력값을 임시 저장:

```ts
sessionStorage.setItem("momo_pre_onboarding", JSON.stringify({
  name, gender, birthDate, birthTime, savedAt: ISO8601
}));
```

**저장 시점:** 각 스텝 "다음" 클릭 직전
**복원 시점:** 카카오 OAuth 후 `/onboarding` 마운트 시 (profile에 name이 없고 sessionStorage에 유효 데이터가 있으면 복원 + Step 4로 이동)
**삭제 시점:** Step 4 사진 업로드 + `profiles` INSERT 성공 직후
**TTL:** 24시간 (`savedAt` 기준 클라이언트 만료 체크)

### 3. 카카오 OAuth 트리거 위치

**현재:** 랜딩 CTA → `LandingLoginSheet` 바텀시트 → "카카오로 시작하기"

**Stage 2:** 태어난 일시 스크린 CTA → `LandingLoginSheet` 바텀시트 → "카카오로 시작하기"

- **기존 `LandingLoginSheet` 컴포넌트 그대로 재사용.** 공용화 리팩터링 불필요.
- 바텀시트가 열리는 "트리거 위치"만 랜딩에서 Step 3로 이동.
- 카카오 버튼 클릭 직전에 sessionStorage 저장이 필요 → `LandingLoginSheet`에 `onBeforeLogin?: () => void` 콜백 prop 추가. Step 3에서는 form을 저장하는 콜백 전달.
- 랜딩에서도 계속 `LandingLoginSheet` 사용하되, 랜딩 CTA는 **단순 `<Link href="/onboarding">` 으로 변경** (바텀시트 없이 곧장 닉네임 화면으로). 로그인은 Step 3에서만 일어남.

### 4. 약관 동의 UI

노아님 스펙: 바텀시트의 "카카오로 시작하기" 버튼 **하단에 작은 회색 글씨 추가**:

> "로그인 시, [개인정보처리방침]과 [서비스 이용약관]에 동의하는 것으로 간주합니다"

- 대괄호 `[...]`는 텍스트형 버튼 (인라인 링크)
- 클릭 시 `/privacy`, `/terms` 페이지로 이동 (새 탭 권장)
- 스타일: `text-[11px] text-ink-tertiary`, 링크는 `underline underline-offset-2`
- 체크박스 없음 — 클릭 = 암묵 동의
- **기존 `LegalLinks` 컴포넌트와 별개**. 기존 `LegalLinks`는 바텀시트 하단에 그대로 두되, 이 "동의 간주" 문구는 카카오 버튼 **바로 아래**에 별도로 배치

### 5. 랜딩 페이지 `/`의 역할

**유지.** 다음 목적으로 계속 필요:
- SEO 크롤링 대상
- 직접 방문자 (URL 입력, 북마크)
- 공유 링크 유입자의 중간 경유지

**변경점:** CTA 버튼 동작만 수정.
- **현재:** 버튼 클릭 → `LandingLoginSheet` 바텀시트 오픈
- **Stage 2:** 버튼 클릭 → `/onboarding` (닉네임 화면) 직행

랜딩의 나머지(브랜드 소개, 미리보기, 소셜 프루프)는 그대로.

### 6. 광고 destination URL

**Stage 2 배포 후 수동 작업.** Meta Ads Manager에서 destination URL을 `/` 또는 `/onboarding`으로 변경. 코드 범위 외.

권장: 배포 후 24~48시간 `/onboarding` anon 흐름 안정성 확인 → 그 다음 Meta 광고 URL 변경. 기존 광고는 `/`로 두고 병행 가능.

---

## 수정 범위 (예상)

| 파일 | 변경 요지 | 예상 diff |
|---|---|---|
| `app/onboarding/page.tsx` | useEffect 로그인 체크 조건 완화 (anon 허용), Step 3 CTA를 `LandingLoginSheet`로 교체, 각 step에서 sessionStorage 저장, handleStep4Submit 후 sessionStorage clear | ~80~120줄 |
| `components/landing-login-sheet.tsx` | `onBeforeLogin?: () => void` prop 추가. 카카오 버튼 하단에 "동의 간주" 작은 글씨 추가 | ~30줄 |
| `app/page.tsx` | 랜딩 CTA를 `<LandingLoginSheet>`에서 `<Link href="/onboarding">` 버튼으로 교체 | ~10줄 |
| `lib/analytics.ts` | pre-onboarding 단계 이벤트 (기존 `view_onboarding_*` 재사용 가능 — 신규 이벤트 불필요) | 0줄 또는 소량 |
| `docs/web-flow.md` | 유저 플로우 섹션 업데이트 | ~30줄 |
| `docs/event-taxonomy.md` | 기존 이벤트 해석 변경 노트 추가 | ~10줄 |
| `CLAUDE.md` | 신규 Key Rule 추가 (로그인이 Step 3 직후 트리거됨) | ~5줄 |

**변경 없음 (중요):**
- DB 스키마 / RLS / Edge Function / Storage — **0 변경**
- `lib/analysis.ts` / `app/api/run-analysis/route.ts` — **0 변경** (분석 타이밍 그대로)
- `app/result/loading/page.tsx` — **0 변경**
- `app/callback/route.ts` — **0 변경** (기존 `getOnboardingStep` 로직 재사용)
- 공유 페이지 4개 파일 — **0 변경** (노아님 결정)
- `app/login/page.tsx` — **0 변경** (dead route지만 Stage 2 범위 밖. 별도 정리)

**총 예상 코드 diff: 150~250줄 내외.** Plan 자체는 500줄 이내로 단순화.

---

## 명시적 비결정 (Stage 2 착수 시 결정)

1. **GIF 에셋 최종 선택** — Stage 1에서 확정되면 Stage 2는 그 결과 재사용. Stage 1 결과 반영.
2. **회원 재방문 시 필수 정보 부분 누락 케이스의 UX** — 기존 `getOnboardingStep()` 로직이 0~3 step으로 보낼 수 있음. `/onboarding`의 Step 0~3이 anon 허용 상태에서 로그인 유저가 접근하면 어떻게 동작하는지 검증 필요.
3. **sessionStorage 손실 fallback 경로** — Stage 2 구현 시 시나리오 D로 검증 (가장 까다로운 엣지 케이스).
4. **카카오 인앱브라우저 OAuth 호환성** — 현재 미확인. Stage 2 QA 시 직접 테스트.
5. **광고 destination URL 변경 시점** — 배포 안정화 기준 (24h? 48h?) 결정.

---

## 앱 영향 분석

momo 네이티브 앱은 Supabase 프로젝트를 공유한다. Stage 2 변경의 앱 영향:

| 영역 | 변경 여부 | 영향 |
|---|---|---|
| DB 스키마 | 0 | 없음 |
| RLS 정책 | 0 | 없음 |
| Edge Function (`calculate-saju`, `generate-saju-insight`, `generate-gwansang-reading`, 기타) | 0 | 없음 |
| Storage 정책 (`profile-images` 등) | 0 | 없음 |
| `profiles` 테이블 쓰기 패턴 | 0 | 첫 INSERT 타이밍 그대로 (Step 4 사진 업로드 시점) |
| `saju_profiles` 쓰기 패턴 | 0 | 분석 완료 시 upsert, 그대로 |
| `gwansang_profiles` 쓰기 패턴 | 0 | 분석 완료 시 upsert, 그대로 |
| 분석 타이밍 (`calculate-saju` + `generate-saju-insight` + `generate-gwansang-reading`) | 0 | Step 4 fire-and-forget, 그대로 |

→ **앱 영향 0.** 순수하게 웹 클라이언트 라우팅/상태 관리만 변경.

### 분석 조기 시작 최적화는 본 Stage에서 제외

앞선 논의(2026-04-07)에서 노아님이 "로그인 직후 사주 분석 시작하고, 사진 업로드 후 관상 분석 시작" 최적화 아이디어를 주셨음. 이는 기술적으로 가능하지만:

- `runAnalysis()`를 2단계로 분리 필요
- `/api/run-analysis` 멱등성 로직 재설계 필요
- **앱과 공유하는 `profiles/saju_profiles/gwansang_profiles` 테이블의 중간 상태**(사주만 완료, 관상 미완료) 발생
- 앱이 이 중간 상태를 어떻게 쿼리하는지 전수 조사 필요
- momo 앱이 심사 중인 상황에서 데이터 쓰기 패턴 변경은 **리스크 매우 큼**

→ **Stage 2에서 명시적으로 제외.** 앱 심사 완료 + 앱 쿼리 패턴 전수 검증 후 별도 PR로 진행. Stage 3 또는 별도 프로젝트로 분리.

---

## Stage 1과의 관계

**Stage 1 (선행):**
- 기존 `/onboarding` Step 0(닉네임) UI에 환영 GIF + 카피만 추가
- 로직 변경 없음, 흐름 변경 없음
- 기존 유저/흐름에 영향 0
- 빠르게 배포 가능 (10분 작업)

**Stage 2 (본 스펙):**
- Stage 1의 환영 GIF + 카피를 **그대로 유지**
- 로그인 트리거 위치를 Step 0 → Step 3 직후로 이동
- `/onboarding`을 anon 접근 가능하게 수정
- sessionStorage 복원 로직 추가
- 랜딩 CTA 동작 변경

**Stage 2 착수 조건:**
1. Stage 1 배포 + Production 안정성 확인 (최소 일주일 권장)
2. momo 앱 심사 상황 고려 (진행 중이면 더 신중)
3. 노아님 최종 검토 및 스펙 확정

---

## 체크리스트 (Stage 2 착수 전)

- [ ] Stage 1 배포 완료 + Production 안정성 확인
- [ ] momo 앱 심사 상태 확인 (이 스펙에는 앱 영향 없음이 확정)
- [ ] GA4 퍼널에서 "Stage 1 이후의 기본 데이터" 확보 (비교 기준선)
- [ ] 노아님 최종 스펙 검토 (특히 "약관 동의 간주" 문구 정확한 워딩)
- [ ] `/onboarding` anon 허용 시 기존 회원 재방문 케이스 엣지 케이스 리스트업
- [ ] 카카오 인앱브라우저 OAuth 호환성 사전 테스트 (가능하다면)
- [ ] Stage 2용 별도 plan 파일 작성 (본 스펙 기반, 구현 step별 상세)

---

## 참고 자료

- Stage 1 작업: `components/onboarding/welcome-character.tsx` (신규) + `app/onboarding/page.tsx` Step 0 블록 수정
- 기존 1600줄 plan (보류): `docs/superpowers/plans/2026-04-07-pre-login-onboarding.md` — overengineering 사례로 참고만 (그대로 적용 금지)
- GA4 funnel 결과 (노아님 스크린샷, 2026-04-07): 카카오 로그인 시작자의 61% 이탈
- 기존 유저 재방문 라우팅 로직: `lib/onboarding-redirect.ts` `getOnboardingStep()`
- 카카오 OAuth 트리거 컴포넌트: `components/landing-login-sheet.tsx`
