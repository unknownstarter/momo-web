# Momo Web — 구현 계획

> Next.js + Tailwind CSS 모바일웹. 사전등록 + 사주/관상 유료 분석 서비스.

---

## Phase 0: 프로젝트 초기화 (1일)

### Task 0-1: Next.js 프로젝트 생성
```bash
npx create-next-app@latest momo-web --typescript --tailwind --app --src-dir=false
```
- TypeScript strict mode
- Tailwind CSS 4
- App Router
- ESLint + Prettier

### Task 0-2: Tailwind 디자인 토큰 설정
- `tailwind.config.ts`에 Momo 컬러/타이포/간격/라운딩 매핑
- `docs/design/design-system.md` 기반
- 글로벌 CSS: Pretendard 폰트 로딩, base 스타일

### Task 0-3: Supabase 클라이언트 설정
- `@supabase/ssr` + `@supabase/supabase-js` 설치
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 서버/클라이언트 Supabase 클라이언트 생성 (`lib/supabase/`)
- 미들웨어: 세션 갱신 (`middleware.ts`)

### Task 0-4: 루트 레이아웃
- `max-w-[430px] mx-auto min-h-dvh` 모바일 고정 레이아웃
- Pretendard 폰트 적용
- 메타데이터 기본값

### Task 0-5: Vercel 배포 연결
- GitHub 레포 생성 + Vercel 연동
- 환경변수 설정 (Supabase, PortOne)
- Preview 배포 확인

---

## Phase 1: 인증 + 온보딩 (2일)

### Task 1-1: 랜딩 페이지
- 인트로 슬라이드 3장 (Flutter `onboarding_page.dart`와 동일 카피)
- 페이지 인디케이터 (dot)
- CTA 버튼: "시작하기" → 카카오 로그인
- 건너뛰기 → 카카오 로그인

### Task 1-2: 카카오 로그인
- `supabase.auth.signInWithOAuth({ provider: 'kakao' })`
- OAuth 콜백 페이지 (`/callback`)
- 세션 확인 후 온보딩으로 리다이렉트
- **Supabase Dashboard**: Additional Redirect URL에 웹 도메인 추가
- **카카오 개발자 콘솔**: Web 플랫폼 + Redirect URI 추가

### Task 1-3: 온보딩 스텝 (4단계)
Flutter 앱의 15스텝 중 웹에 필요한 4단계만 구현:

| Step | 내용 | 캐릭터 | 진행 방식 |
|------|------|--------|----------|
| 0 | 이름 | 물결이(水) | 버튼 |
| 1 | 성별 | 물결이(水) | 자동진행 (0.3s) |
| 2 | 생년월일시 | 물결이(水) + 쇠동이(金) | DatePicker + 시진 선택 |
| 3 | 사진 (정면) | 불꼬리(火) | 파일 업로드 |

- "한 화면 한 질문" 패턴 유지
- 캐릭터 말풍선 가이드 동일
- 프로그레스 바 상단 표시
- 상태 관리: React state (useState + 로컬)
- 사진 업로드: Supabase Storage `profile-images` 버킷

### Task 1-4: 프로필 저장
- 온보딩 완료 시 `profiles` 테이블 INSERT
- `createProfile()`: name, gender, birthDate, birthTime
- 사진 URL: `profile_images` 컬럼에 저장
- **기존 momo 앱과 동일한 profiles 레코드** — 앱 출시 후 그대로 사용

---

## Phase 2: 결제 (1일)

### Task 2-1: 결제벽 페이지
- 결제 전 프리뷰: "당신의 사주에 숨겨진 비밀이 있어요"
- 가격 표시: ~~3,000원~~ **500원** (런칭 특가)
- 결제 버튼: "카카오페이로 500원 결제하기"
- 결제 수단 아이콘 (카카오페이, 토스페이, 카드)

### Task 2-2: 포트원 결제 연동
- `@portone/browser-sdk` 설치
- 포트원 V2 API 키 설정
- 결제 요청 → 카카오페이 간편결제
- 결제 완료 콜백 → 서버사이드 검증

### Task 2-3: 결제 검증 API Route
- `app/api/payment/verify/route.ts`
- 포트원 API로 결제 상태 확인
- `payments` 테이블에 기록 (transaction_id, amount, status, profile_id)
- 검증 성공 → 사주/관상 분석 트리거

### Task 2-4: payments 테이블 생성
```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  transaction_id text not null unique,
  amount integer not null default 500,
  status text not null default 'completed',
  payment_method text,
  created_at timestamptz default now()
);

alter table payments enable row level security;
create policy "Users can view own payments"
  on payments for select using (profile_id = auth.uid());
```

---

## Phase 3: 사주 & 관상 분석 (2일)

### Task 3-1: 분석 트리거
- 결제 완료 후 Edge Function 호출 (기존 함수 그대로)
- `calculate-saju` → `generate-saju-insight` → `generate-gwansang-reading`
- 로딩 연출: 10초 프로그레스 (사주 계산 → AI 해석 → 관상 분석)
- Flutter 앱의 `destiny_analysis_page.dart` 로딩 UX 재현

### Task 3-2: 사주 결과 페이지
- **다크 모드** (먹색 배경)
- 사주팔자 4주 표시 (년/월/일/시)
- 오행 분포 시각화
- AI 해석 텍스트 (성격, 연애관, 올해 운세)
- 오행 캐릭터 표시
- **공유 CTA**: "내 사주 결과 공유하기" (카카오톡, 링크 복사)

### Task 3-3: 관상 결과 페이지
- **다크 모드**
- 동물상 리빌 (애니메이션)
- 삼정/오관 해석
- Traits 5축 레이더 차트
- **공유 CTA**: "내 동물상 공유하기"

### Task 3-4: 공유 기능 (OG 태그 SSR)
- `/share/[id]` 동적 라우트
- Server Component에서 사주/관상 데이터 fetch
- OG 메타태그 생성 (title, description, image)
- 카카오톡 공유 시 미리보기 카드 표시
- 공유 페이지 방문 → 랜딩으로 CTA ("나도 해보기")

---

## Phase 4: 사전등록 + 대기 명단 (1일)

### Task 4-1: waitlist 테이블 생성
```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  phone text not null,
  marketing_agreed boolean not null default false,
  agreed_at timestamptz,
  created_at timestamptz default now()
);

create unique index waitlist_phone_unique on waitlist(phone);
alter table waitlist enable row level security;
```

### Task 4-2: 알림 신청 페이지
- 결과 페이지 후 CTA: "운명의 인연, 궁합 매칭 받고 싶다면?"
- 전화번호 입력 (010-XXXX-XXXX 포맷)
- 체크박스: "마케팅 정보 수신에 동의합니다" (필수)
- 개인정보 수집·이용 동의 링크
- 제출 → waitlist INSERT

### Task 4-3: 완료 페이지
- "앱 출시 시 가장 먼저 알려드릴게요!"
- 프로필 요약 (이름, 사주 요약, 동물상)
- 추가 공유 CTA
- "친구도 사주 보게 하기" 버튼

### Task 4-4: 문자 발송 준비
- 알리고 or 뿌리오 API 키 준비
- 발송 스크립트: waitlist 테이블에서 marketing_agreed=true인 번호 추출
- 문자 템플릿: "momo 앱이 출시되었어요! 당신의 궁합 92점 인연이 기다리고 있어요. [앱 다운로드 링크]"
- 야간(21시~8시) 발송 제한 로직

---

## Phase 5: 최적화 + 런칭 (1일)

### Task 5-1: SEO & 메타데이터
- 루트 페이지 메타: title, description, OG image
- `robots.txt`, `sitemap.xml`
- 구조화된 데이터 (JSON-LD)

### Task 5-2: 성능 최적화
- 이미지 최적화 (`next/image`)
- 폰트 최적화 (`next/font/local` + preload)
- 번들 분석 + 코드 스플리팅
- Lighthouse 90+ 목표

### Task 5-3: 분석 & 트래킹
- 페이지뷰 / 퍼널 단계별 전환율 트래킹
- 이벤트: 카카오 로그인, 온보딩 완료, 결제 완료, 공유 클릭, 알림 신청
- Supabase analytics 또는 Mixpanel

### Task 5-4: 에러 핸들링
- 결제 실패 → 재시도 UI
- Edge Function 타임아웃 → 폴백 메시지
- 세션 만료 → 자동 로그인 리다이렉트

---

## 일정 요약

| Phase | 내용 | 예상 기간 |
|-------|------|----------|
| 0 | 프로젝트 초기화 | 1일 |
| 1 | 인증 + 온보딩 | 2일 |
| 2 | 결제 | 1일 |
| 3 | 사주 & 관상 분석 결과 | 2일 |
| 4 | 사전등록 + 대기 명단 | 1일 |
| 5 | 최적화 + 런칭 | 1일 |
| **합계** | | **~8일** |

---

## 사전 준비물 (노아님 필요)

- [ ] **사업자등록증** — PG 가맹 심사용 (포트원)
- [ ] **포트원 계정** — V2 API 키 발급
- [ ] **카카오페이 가맹** — 포트원 통해 신청
- [ ] **도메인** — 예: momo-saju.com
- [ ] **Vercel 계정** — 배포용
- [ ] **알리고/뿌리오 계정** — SMS 발송용
- [ ] **개인정보처리방침** — 전화번호 수집 법적 요건
- [ ] **카카오 개발자 콘솔** — Web 플랫폼 추가 + Redirect URI
- [ ] **Supabase Dashboard** — Additional Redirect URL 추가
