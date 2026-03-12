# Momo Web — 구현 설계서

> 개발 진입용 상세 설계. 라우트·데이터 흐름·컴포넌트·API·에러·a11y·성능을 정의한다.  
> 직군별 리뷰 및 개선안은 문서 하단에 반영됨.

---

## 1. 라우트 구조

| 경로 | 용도 | 인증 | 레이아웃 |
|------|------|------|----------|
| `/` | 랜딩 (모모 소개, 스크롤 없음, CTA "사주 & 관상 보기") | 불필요 | 라이트, 430px |
| `/login` | 로그인 (카카오 등) — 또는 랜딩 CTA에서 바로 OAuth | 불필요 | 라이트 |
| `/callback` | OAuth 콜백 (Supabase Auth) | — | 리다이렉트 전용 |
| `/onboarding` | 온보딩 (이름→성별→생년월일시→사진→확인) | 필요 | 라이트, 프로그레스 바 |
| `/result/loading` | 분석 로딩 (사주·관상 Edge Function 호출 중) | 필요 | 다크 |
| `/result` | 결과 (사주·관상 탭 또는 단일 스크롤) | 필요 | 다크 |
| `/complete` | 앱 출시 알림 (전화번호 + 문자 수신 수락) | 필요 | 라이트 |
| `/share/[id]` | 공유 페이지 (OG SSR, 결과 요약) | 불필요 | 라이트 |

- **라우트 가드**: 미인증 유저가 `/onboarding`, `/result`, `/complete` 접근 시 → `/` 또는 `/login`으로 리다이렉트.
- **완료 후 리다이렉트**: 온보딩 확인 "분석 시작" → `/result/loading` → (분석 완료) → `/result`. 결과 후 "앱 알림" CTA → `/complete`.

---

## 2. 데이터 흐름

### 2.1 인증

- **Supabase Auth** + 카카오 OAuth. `signInWithOAuth({ provider: 'kakao', options: { redirectTo: origin + '/callback' } })`.
- **콜백** (`/callback`): `supabase.auth.exchangeCodeForSession()` (또는 `onAuthStateChange`) 후 `profiles` 존재 여부 확인 → 없으면 `/onboarding`, 있으면 `is_saju_complete` 등에 따라 `/result` 또는 `/onboarding` 리다이렉트.
- **세션 갱신**: `middleware.ts`에서 `createServerClient`로 쿠키 갱신. (Next.js Supabase SSR 가이드 준수.)

### 2.2 온보딩 → 프로필 저장

- **클라이언트 상태**: 한 번에 하나의 스텝만 노출. 폼 값은 React state (또는 URL searchParams로 스텝만 관리하고, 값은 context/state). **제출 전에 sessionStorage 백업 권장** — 이탈 후 복구 옵션 확보.
- **저장 시점**: "확인" 화면에서 "분석 시작" 클릭 시.
  - 1) 사진은 먼저 `profile-images` 버킷에 업로드 (`auth_id` 경로), public URL을 받음.
  - 2) `profiles` **upsert** (기존 유저 갱신): `onConflict: 'auth_id'`. 필드: `auth_id`, `name`, `gender` (male/female), `birth_date` (YYYY-MM-DD), `birth_time` (HH:mm 또는 null), `profile_images` (Storage URL 배열).
- **제약**: 기존 `profiles` 스키마·RLS 그대로 사용. `is_saju_complete`, `is_gwansang_complete`, `is_profile_complete` 는 기본값 false → 분석 완료 후 DB 트리거/앱 로직에서 갱신 (웹은 해당 컬럼 수정하지 않음).

### 2.3 분석 플로우 (Edge Function)

- **진입**: `/result/loading`에서 `profile` (본인) 조회 후 아래 순서로 호출.
- **순서**:
  1. `calculate-saju`: body `{ birthDate, birthTime, isLunar: false }` → 만세력 결과 반환.
  2. `generate-saju-insight`: body `{ sajuResult: (1번 응답), userName }` → 사주 해석. (DB 저장은 Edge Function/앱 로직 따름.)
  3. `generate-gwansang-reading`: body `{ photoUrl: profile_images[0], userName, gender, ... }` (onboarding-analysis-flow.md 참조) → 관상 결과.
- **타임아웃·재시도**: Edge Function 호출 **타임아웃 60s** 명시. 재시도는 **1회만**, 지수 백오프 (비용·부하 고려).
- **로딩 UI**: 3단계 메시지 (사주 계산 중 / 사주 해석 중 / 관상 분석 중) + 프로그레스 바 + **소요 시간 기대치 문구** (예: "약 1분 정도 걸릴 수 있어요"). 완료 시 `/result`로 이동.
- **에러**: 1번 실패 → 재시도 버튼(1회). 2번 실패 → 사주만 표시, 관상 탭 비활성화. 3번 실패 → 관상 영역 숨김.

### 2.4 결과 페이지

- **데이터**: `profiles` (본인) + `saju_profiles` (user_id = profiles.id) + `gwansang_profiles` (user_id = profiles.id). **우선 서버 컴포넌트**에서 `createServerClient()`로 조회해 props로 내려줌. 클라이언트 fetch는 재검증/폴백용으로만 사용.
- **공유**: `/share/[id]` — `id`는 `profiles.id` 또는 공유용 slug. SSR에서 해당 프로필 + 사주/관상 요약 조회 후 `generateMetadata`로 OG 태그 생성.

### 2.5 완료(앱 알림)

- **입력**: 전화번호, 문자 수신 동의 체크.
- **저장**: `profiles.phone` UPDATE, `is_phone_verified` (기존 정책 따름). **신규 테이블/컬럼 추가 없음.**
- **제출 후**: **감사 화면**으로 전환 (예: "등록되었어요. 앱 출시 시 알려드릴게요!") — 명확한 종료 인지.

---

## 3. 컴포넌트 구조

### 3.1 공통

- **RootLayout**: `max-w-[430px] mx-auto min-h-dvh`, Pretendard 폰트, 배경 `bg-hanji` (라이트) / 다크 페이지는 해당 페이지에서 `dark` 클래스 또는 wrapper.
- **모바일 컨테이너**: `components/ui/mobile-container.tsx` (430px, 중앙 정렬).

### 3.2 UI (design-system 기반)

- **Button**: variant (primary/outline/ghost), size (sm/md/lg), CTA는 `bg-[#2D2D2D]` 등 design-system 토큰.
- **Card**: 한지 elevated 배경, 라운딩 `rounded-2xl`.
- **Input**: 포커스 시 `border-brand`, 라운딩 `rounded-lg`.
- **Chip**: 관심사/키워드용, rounded-full.
- **CharacterBubble**: 캐릭터 이미지 + 말풍선. 오행별 캐릭터 경로는 `public/images/characters/{mulgyeori|bulkkori|...}/default.png`.

### 3.3 페이지별

- **랜딩**: 한 화면, 타이틀 + 부제목 + CTA 버튼. 스크롤 없음.
- **온보딩**: 상단 프로그레스 바, CharacterBubble, 스텝별 폼 (이름 input / 성별 2버튼 / 생년월일 date + 시진 12칩 / 사진 업로드 + 미리보기 / 확인 요약), 하단 CTA.
- **결과 로딩**: 다크 배경, 단계별 메시지, 프로그레스 바, (선택) 캐릭터 이미지 교대.
- **결과**: 사주 섹션 + 관상 섹션 (탭 또는 스크롤). 공유 버튼, "궁합 좋은 이성 보기" CTA.
- **완료**: 문구 + 전화번호 입력 + 수신 동의 체크 + 제출 버튼.

---

## 4. Supabase 사용 요약

- **클라이언트**: `@supabase/ssr` `createBrowserClient` (싱글톤). 브라우저에서 Auth, `profiles` INSERT/UPDATE, Storage upload, Edge Function invoke.
- **서버**: `createServerClient` (cookies). `app/` 라우트에서 `profiles`/`saju_profiles`/`gwansang_profiles` 조회, `/share/[id]` OG 메타데이터.
- **미들웨어**: 세션 갱신용 `getUser()` 호출. 보호 구간(`/onboarding`, `/result`, `/complete`) 미인증 시 리다이렉트.
- **Storage**: `profile-images` 버킷에 `{auth_id}/profile_0.{ext}` 형태로 업로드, public URL 획득.
- **Edge Function**: `invoke('calculate-saju'|'generate-saju-insight'|'generate-gwansang-reading', { body })`. 기존 함수 시그니처 그대로 사용.

---

## 5. 에러 처리

- **원칙**: 모든 에러/빈 상태마다 **다음 행동 CTA를 한 문장으로** 안내 (재시도, 문의, 홈으로 등).
- **Auth 실패**: 콜백에서 에러 시 `/login?error=auth` 리다이렉트 + 안내 문구.
- **프로필 INSERT/UPDATE 실패**: 인라인 에러 메시지 + "다시 시도" 버튼.
- **사진 업로드 실패**: 용량/형식 안내 + "다른 사진 선택" 버튼.
- **Edge Function 타임아웃/실패**: "잠시 후 다시 시도해 주세요" + 재시도 버튼(1회). 관상만 실패 시 사주만 표시.
- **결과 조회 실패**: "결과를 불러올 수 없습니다" + "홈으로" 링크.

---

## 6. 접근성 (a11y)

- **포커스**: 버튼·입력·링크 포커스 링 ring visible (design-system border-brand 활용).
- **버튼/터치**: 최소 터치 영역 **44×44px** (Apple HIG).
- **폼**: input에 `aria-label` 또는 `<label>` 연결. 에러 시 `aria-describedby` + `aria-invalid`.
- **로딩**: 단계 메시지 영역에 `aria-live="polite"` + **`role="status"`** 로 스크린 리더에 상태 변경 알림.
- **색상 대비**: 본문 텍스트 대비 ratio WCAG AA 이상 (design-system 토큰 유지).

---

## 7. 성능

- **이미지**: `next/image` 사용, `public/images/characters` 캐릭터 이미지 최적화.
- **폰트**: Pretendard `next/font/local`, preload.
- **번들**: 결과 페이지 차트/애니메이션 등 무거운 컴포넌트는 `dynamic(..., { ssr: false })` 또는 lazy load 검토.
- **라우트 프리페치**: 랜딩 CTA에 `Link` 사용 시 Next.js 자동 프리페치.

---

## 8. 보안

- **환경 변수**: `NEXT_PUBLIC_*` 만 클라이언트 노출. Supabase service role key는 서버 전용 (필요 시 API Route에서만).
- **RLS**: Supabase 기존 RLS 정책 그대로. 웹은 동일한 Auth로 행만 INSERT/UPDATE/SELECT.
- **입력 검증**: 이름 길이, 생년월일 범위, 전화번호 형식 클라이언트·서버(가능한 경우) 양쪽 검증.

---

## 9. 직군별 설계 리뷰 및 반영 사항

아래는 프론트엔드·백엔드·프로덕트 관점에서의 솔직한 평가와 베스트 프랙티스 반영 내용이다.

### 9.1 프론트엔드 관점

- **평가**: 라우트·데이터 흐름은 명확함. 온보딩이 단일 페이지에서 스텝 전환인데, 새로고침 시 상태 유실 가능성이 있음. 결과 페이지에서 서버 vs 클라이언트 fetch 혼선 가능.
- **베스트 프랙티스**: (1) 온보딩 폼 상태는 URL과 동기화하지 않더라도, "확인" 제출 전에 sessionStorage 백업 권장 (이탈 시 복구 옵션). (2) 결과 페이지는 **서버 컴포넌트**에서 `profiles`+`saju_profiles`+`gwansang_profiles`를 조회해 props로 내려주는 것을 우선으로 하여, 클라이언트 fetch는 보조(재검증 등)만 사용. (3) 로딩 단계 메시지는 `aria-live="polite"`와 함께 `role="status"` 명시.
- **반영**: §2.4 결과 페이지를 "서버 컴포넌트에서 createServerClient로 조회 후 props 전달 우선"으로 명시. §6 a11y에 `role="status"` 추가. §3.2 온보딩에 "제출 전 sessionStorage 백업 권장" 노트 추가.

### 9.2 백엔드·인프라 관점

- **평가**: Edge Function 호출 순서와 실패 시나리오는 정리됨. 다만 `generate-saju-insight` / `generate-gwansang-reading`이 DB에 직접 쓰는지, 아니면 클라이언트가 응답을 받아 다시 저장하는지에 따라 클라이언트 로직이 달라짐. 문서에는 "기존 앱 동작 따름"으로만 되어 있어 구현 시 앱 코드 또는 Supabase 로그 확인 필요.
- **베스트 프랙티스**: (1) Edge Function 호출 시 **타임아웃** 명시 (예: 60s). (2) 재시도는 **지수 백오프**로 1회만 (사주/관상은 비용 있으므로 무한 재시도 지양). (3) 프로필 INSERT 시 **auth_id unique**로 upsert 사용 시 `onConflict: 'auth_id'` 명시.
- **반영**: §2.3에 "Edge Function 타임아웃 60s, 재시도는 1회·지수 백오프" 명시. §2.2에 "profiles upsert 시 onConflict: 'auth_id'" 명시.

### 9.3 프로덕트·UX 관점

- **평가**: 플로우는 단순하고 목적이 분명함. 랜딩이 "스크롤 없음"이라 정보량이 적어 이탈 가능성은 있으나, 진입 장벽을 낮추는 트레이드오프로 수용 가능. 완료 페이지에서 "문자 수신 수락"이 필수인지 선택인지에 따라 전환율이 달라짐.
- **베스트 프랙티스**: (1) **에러/빈 상태**마다 다음 행동(재시도, 문의, 홈으로)을 한 문장으로 안내. (2) 로딩이 10초 이상일 수 있으므로 "약 N분 소요될 수 있어요" 같은 기대치 안내. (3) 완료 페이지 제출 후 **감사 화면** (예: "등록되었어요. 앱 출시 시 알려드릴게요!")으로 전환해 명확한 종료 인지.
- **반영**: §5 에러 처리에 "모든 에러/빈 상태에 다음 행동 CTA 한 문장" 추가. §2.3 로딩 UI에 "소요 시간 기대치 문구(예: 약 1분)" 추가. §2.5 완료에 "제출 후 감사 화면으로 전환" 명시.

---

위 개선안은 §2~§6 본문에 반영되어 있다.
