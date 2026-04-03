# Momo Web — 태스크 마스터

> 구현 순서 및 체크리스트. `docs/implementation-design.md`와 함께 사용.

---

## Phase 0: 개발 환경

- [x] **0-1** Next.js 15 프로젝트 생성 (TypeScript, App Router, Tailwind, ESLint)
- [x] **0-2** Tailwind 설정 — design-system.md 토큰 반영 (색상, 폰트, 간격, 라운딩, maxWidth mobile)
- [x] **0-3** Pretendard 폰트 — `next/font/local` + globals.css 적용
- [x] **0-4** Supabase 클라이언트 — `lib/supabase/client.ts`, `lib/supabase/server.ts` (createBrowserClient / createServerClient)
- [x] **0-5** 미들웨어 — `middleware.ts` 세션 갱신, 보호 구간 리다이렉트
- [x] **0-6** 루트 레이아웃 — `max-w-[430px] mx-auto min-h-dvh`, Pretendard, 메타데이터
- [x] **0-7** 공통 UI — `components/ui/mobile-container.tsx`, Button/Card/Input 스켈레톤 (design-system)
- [x] **0-8** 환경 변수 — `.env.example` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

---

## Phase 1: 랜딩 & 인증

- [x] **1-1** 랜딩 페이지 `/` — 모모 간략 설명, 스크롤 없음, CTA "사주 & 관상 보기"
- [x] **1-2** 로그인 — 카카오 OAuth 트리거 (`signInWithOAuth`), redirectTo `/callback`
- [x] **1-3** 콜백 페이지 `/callback` — exchangeCodeForSession / onAuthStateChange, profiles 존재 여부에 따라 `/onboarding` 또는 `/result` 리다이렉트
- [x] **1-4** 라우트 가드 — 미인증 시 `/onboarding`, `/result`, `/complete` 접근 차단 → `/` 또는 `/login`

---

## Phase 2: 온보딩

- [x] **2-1** 온보딩 레이아웃 — 프로그레스 바, 뒤로가기, CharacterBubble, 하단 CTA
- [x] **2-2** Step: 이름 — 인풋 2~10자, 검증, 다음
- [x] **2-3** Step: 성별 — 남성/여성 버튼, 선택 시 0.3s 후 자동 진행
- [x] **2-4** Step: 생년월일·시진 — date input + 12지지 시진 그리드 + "모르겠어요"
- [x] **2-5** Step: 사진 — 파일 업로드, Storage `profile-images` 업로드, 미리보기
- [x] **2-6** Step: 확인 — 입력 요약 카드, "분석 시작" 버튼
- [x] **2-7** 프로필 저장 — 확인 제출 시 Storage 업로드 후 `profiles` upsert (onConflict: 'auth_id'), sessionStorage 백업 권장
- [x] **2-8** 캐릭터 에셋 — 물결이/불꼬리 등 `public/images/characters` 경로 연동

---

## Phase 3: 분석 & 결과

- [x] **3-1** 분석 로딩 페이지 `/result/loading` — 다크 배경, 3단계 메시지, 프로그레스 바, 소요 시간 기대치 문구
- [x] **3-2** Edge Function 호출 — calculate-saju → generate-saju-insight → generate-gwansang-reading (타임아웃 60s, 재시도 1회)
- [x] **3-3** 로딩 → 결과 전환 — 분석 완료 시 `/result`로 이동, 에러 시 재시도 UI
- [x] **3-4** 결과 페이지 `/result` — 서버 컴포넌트에서 profiles + saju_profiles + gwansang_profiles 조회 후 props 전달
- [x] **3-5** 사주 결과 UI — 4주, 오행, 해석, 올해 운세, 이상형 섹션 (design-system 라이트 톤)
- [x] **3-6** 관상 결과 UI — 동물상 리빌, 삼정/오관, 5축, 이상형 (design-system 라이트 톤)
- [x] **3-7** 결과 CTA — "친구에게 공유하기", "궁합 좋은 이성 보기" (앱 유도)
- [x] **3-8** 에러 처리 — 사주/관상 실패 시 부분 표시, 재시도/홈으로 CTA

---

## Phase 4: 완료 & 공유

- [x] **4-1** 완료 페이지 `/complete` — "APP 준비 중" 문구, 전화번호 입력, 문자 수신 동의 체크
- [x] **4-2** 전화번호 저장 — `profiles.phone` UPDATE (기존 컬럼만)
- [x] **4-3** 제출 후 감사 화면 — "등록되었어요. 앱 출시 시 알려드릴게요!" 전환
- [x] **4-4** 공유 페이지 `/share/[id]` — SSR, generateMetadata로 OG 태그, 결과 요약 + "나도 사주 보러 가기" CTA
- [x] **4-5** 공유 링크 — 결과 페이지에서 `/share/[profileId]` 링크 생성, 카카오/클립보드 공유 (Web Share API 또는 fallback)

---

## Phase 4.5: 궁합 기능 (2026-03-24 완료)

- [x] **4.5-1** 궁합 상수 & 토큰 (`COMPATIBILITY_GRADES`, `getCompatColor`)
- [x] **4.5-2** GA 이벤트 5개 추가
- [x] **4.5-3** 궁합 비즈니스 로직 `lib/compatibility.ts` (캐시, 계산, 리스트, AI 스토리 폴링)
- [x] **4.5-4** API Routes 4개 (calculate-compatibility, compatibility-list, compatibility-story, og-compat)
- [x] **4.5-5** 원형 게이지 SVG 컴포넌트
- [x] **4.5-6** 궁합 상세 바텀시트 (AI 스토리 하이브리드 폴링, 이성=인연 스토리, 동성=케미 분석)
- [x] **4.5-7** 궁합 탭 컴포넌트 (리스트 + 빈 상태 + storyCacheMap)
- [x] **4.5-8** 결과 페이지 궁합 탭 통합 (Suspense, 레퍼럴 자동 계산)
- [x] **4.5-9** 공유 페이지 궁합 유도 바텀시트 (2초 후 등장)
- [x] **4.5-10** 코드 리뷰 반영 (Critical 3건 + Important 6건 + UX 3건)

> 설계서: `docs/plans/compatibility-feature.md`
> 구현 플랜: `docs/superpowers/plans/2026-03-20-compatibility-feature.md`
> PR: [#3](https://github.com/unknownstarter/momo-web/pull/3) (MERGED)

---

## Phase 5: 품질 & 배포

- [x] **5-1** 접근성 — 포커스 링, 44px 터치 영역, aria-label/aria-live/role="status", 대비
- [x] **5-2** 에러/빈 상태 — 모든 화면에 다음 행동 CTA 한 문장
- [x] **5-3** 성능 — next/image, 폰트 preload, 무거운 컴포넌트 dynamic import 검토
- [x] **5-4** Vercel 배포 — GitHub 연동, 환경 변수 설정, Preview 배포 확인

---

## Phase 6: 매칭 중심 전환 (2026-03-31)

- [x] **6-1** `/result` 매칭 중심 메인 페이지 (히어로 + 블러해시 + 카운터 + 연애운 카드)
- [x] **6-2** `/result/detail` 사주/관상 상세 (기존 코드 이동, 궁합 탭 제거)
- [x] **6-3** `/result/compat` 궁합 별도 페이지
- [x] **6-4** 랜딩/로딩 "이상형 찾기" 리프레이밍
- [x] **6-5** matching-stats API (분석 완료 유저 수 + 이성 블러해시)
- [x] **6-6** 이용약관/개인정보처리방침 노션 링크 + 포트원 검수용 약관 추가
- [x] **6-7** 전화번호 미등록 유저 → "선착순 매칭 사전 신청하기" CTA / 등록 유저 → "친구에게 공유하기" CTA

---

## Phase 6.5: UX 개선 + 정책 변경 (2026-04-03)

- [x] **6.5-1** 원형 아바타에 관상 프로필 사진 표시 (캐릭터 → 사진 우선)
- [x] **6.5-2** GA4 이벤트 텍소노미 통일 + 전 페이지 트래킹 추가 (`docs/event-taxonomy.md`)
- [x] **6.5-3** 공유 티저 레이아웃 수정 (간격/스크롤/버튼 문구)
- [x] **6.5-4** 공유 상세 페이지 스켈레톤 로딩 추가
- [x] **6.5-5** 매칭 카운터 blur-to-reveal + 카운트업 애니메이션
- [x] **6.5-6** 이용약관/개인정보처리방침 매칭 조항 + 푸터 사업자 정보 추가
- [x] **6.5-7** 매칭풀 기준 변경: `is_saju_complete = true` (전화번호 → 앱 알림용)
- [x] **6.5-8** 페이지 전환 딤 오버레이 + 로딩 GIF
- [x] **6.5-9** "친구와 궁합 보기" 링크 수정 (공유 → 궁합 페이지)

---

## Phase 7: 본인인증 연동 (TODO — 다날 승인 대기)

- [ ] **7-1** 다날 본인인증 가입 승인 대기 (포트원 경유)
- [ ] **7-2** 포트원 본인인증 SDK 연동 (`/complete` 페이지)
- [ ] **7-3** 인증 완료 시 `profiles.is_phone_verified = true` 설정
- [ ] **7-4** CLAUDE.md `is_phone_verified` 규칙 변경 반영

---

## Phase 8: 앱 연동 + 그로스 (TODO)

- [ ] **8-1** 앱 매칭풀 기준 변경: `is_phone_verified` → `is_saju_complete` (앱 백엔드)
- [ ] **8-2** 앱 Firebase Phone Auth → 다날 본인인증 교체 (앱 프로젝트)
- [ ] **8-3** 인스타 스토리용 결과 카드 이미지 생성 기능 (9:16)
- [ ] **8-4** 인스타 광고 소재 제작 + 메타 광고 캠페인 세팅
- [ ] **8-5** 게이미피케이션: 순번/초대 보상 (`matching_waitlist` 테이블 필요)
- [ ] **8-6** 카카오 알림톡 연동 (앱 출시 시 전환 알림)

---

## 참조

- 플로우: `docs/web-flow.md`
- 설계 상세: `docs/implementation-design.md`
- 디자인: `docs/design/design-system.md`
- Supabase 구조: `docs/supabase-structure.md`
