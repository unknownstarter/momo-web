# Momo Web — 태스크 마스터

> 구현 순서 및 체크리스트. `docs/implementation-design.md`와 함께 사용.

---

## Phase 0: 개발 환경

- [ ] **0-1** Next.js 15 프로젝트 생성 (TypeScript, App Router, Tailwind, ESLint)
- [ ] **0-2** Tailwind 설정 — design-system.md 토큰 반영 (색상, 폰트, 간격, 라운딩, maxWidth mobile)
- [ ] **0-3** Pretendard 폰트 — `next/font/local` + globals.css 적용
- [ ] **0-4** Supabase 클라이언트 — `lib/supabase/client.ts`, `lib/supabase/server.ts` (createBrowserClient / createServerClient)
- [ ] **0-5** 미들웨어 — `middleware.ts` 세션 갱신, 보호 구간 리다이렉트
- [ ] **0-6** 루트 레이아웃 — `max-w-[430px] mx-auto min-h-dvh`, Pretendard, 메타데이터
- [ ] **0-7** 공통 UI — `components/ui/mobile-container.tsx`, Button/Card/Input 스켈레톤 (design-system)
- [ ] **0-8** 환경 변수 — `.env.example` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

---

## Phase 1: 랜딩 & 인증

- [ ] **1-1** 랜딩 페이지 `/` — 모모 간략 설명, 스크롤 없음, CTA "사주 & 관상 보기"
- [ ] **1-2** 로그인 — 카카오 OAuth 트리거 (`signInWithOAuth`), redirectTo `/callback`
- [ ] **1-3** 콜백 페이지 `/callback` — exchangeCodeForSession / onAuthStateChange, profiles 존재 여부에 따라 `/onboarding` 또는 `/result` 리다이렉트
- [ ] **1-4** 라우트 가드 — 미인증 시 `/onboarding`, `/result`, `/complete` 접근 차단 → `/` 또는 `/login`

---

## Phase 2: 온보딩

- [ ] **2-1** 온보딩 레이아웃 — 프로그레스 바, 뒤로가기, CharacterBubble, 하단 CTA
- [ ] **2-2** Step: 이름 — 인풋 2~10자, 검증, 다음
- [ ] **2-3** Step: 성별 — 남성/여성 버튼, 선택 시 0.3s 후 자동 진행
- [ ] **2-4** Step: 생년월일·시진 — date input + 12지지 시진 그리드 + "모르겠어요"
- [ ] **2-5** Step: 사진 — 파일 업로드, Storage `profile-images` 업로드, 미리보기
- [ ] **2-6** Step: 확인 — 입력 요약 카드, "분석 시작" 버튼
- [ ] **2-7** 프로필 저장 — 확인 제출 시 Storage 업로드 후 `profiles` upsert (onConflict: 'auth_id'), sessionStorage 백업 권장
- [ ] **2-8** 캐릭터 에셋 — 물결이/불꼬리 등 `public/images/characters` 경로 연동

---

## Phase 3: 분석 & 결과

- [ ] **3-1** 분석 로딩 페이지 `/result/loading` — 다크 배경, 3단계 메시지, 프로그레스 바, 소요 시간 기대치 문구
- [ ] **3-2** Edge Function 호출 — calculate-saju → generate-saju-insight → generate-gwansang-reading (타임아웃 60s, 재시도 1회)
- [ ] **3-3** 로딩 → 결과 전환 — 분석 완료 시 `/result`로 이동, 에러 시 재시도 UI
- [ ] **3-4** 결과 페이지 `/result` — 서버 컴포넌트에서 profiles + saju_profiles + gwansang_profiles 조회 후 props 전달
- [ ] **3-5** 사주 결과 UI — 4주, 오행, 해석, 올해 운세, 이상형 섹션 (design-system 다크 톤)
- [ ] **3-6** 관상 결과 UI — 동물상 리빌, 삼정/오관, 5축, 이상형 (design-system 다크 톤)
- [ ] **3-7** 결과 CTA — "친구에게 공유하기", "궁합 좋은 이성 보기" (앱 유도)
- [ ] **3-8** 에러 처리 — 사주/관상 실패 시 부분 표시, 재시도/홈으로 CTA

---

## Phase 4: 완료 & 공유

- [ ] **4-1** 완료 페이지 `/complete` — "APP 준비 중" 문구, 전화번호 입력, 문자 수신 동의 체크
- [ ] **4-2** 전화번호 저장 — `profiles.phone` UPDATE (기존 컬럼만)
- [ ] **4-3** 제출 후 감사 화면 — "등록되었어요. 앱 출시 시 알려드릴게요!" 전환
- [ ] **4-4** 공유 페이지 `/share/[id]` — SSR, generateMetadata로 OG 태그, 결과 요약 + "나도 사주 보러 가기" CTA
- [ ] **4-5** 공유 링크 — 결과 페이지에서 `/share/[profileId]` 링크 생성, 카카오/클립보드 공유 (Web Share API 또는 fallback)

---

## Phase 5: 품질 & 배포

- [ ] **5-1** 접근성 — 포커스 링, 44px 터치 영역, aria-label/aria-live/role="status", 대비
- [ ] **5-2** 에러/빈 상태 — 모든 화면에 다음 행동 CTA 한 문장
- [ ] **5-3** 성능 — next/image, 폰트 preload, 무거운 컴포넌트 dynamic import 검토
- [ ] **5-4** Vercel 배포 — GitHub 연동, 환경 변수 설정, Preview 배포 확인

---

## 참조

- 플로우: `docs/web-flow.md`
- 설계 상세: `docs/implementation-design.md`
- 디자인: `docs/design/design-system.md`
- Supabase 구조: `docs/supabase-structure.md`
