# Momo Web — 코드베이스·문서 분석 및 개발 환경·설계 정리

> 작성일: 2026-03-10  
> 목적: 콜드 스타트 해결용 모바일 최적화 앱을 위한 문서·코드 분석 + 필요한 개발 환경·설계 정리

---

## 1. 문서 분석 요약

### 1.1 CLAUDE.md (프로젝트 메모리)
- **정체성**: momo 네이티브 앱 출시 전, 프로필 사전 확보용 모바일웹. 사주·관상 500원 → 바이럴 공유 → 궁합 알림 신청 → 앱 출시 시 문자.
- **절대 규칙**: Supabase DB·RLS·Edge Function·Storage 정책 **수정 금지**. 앱과 백엔드 공유. 신규 테이블 추가·Redirect URL 추가만 허용.
- **Tech**: Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Supabase(공유), 토스페이먼츠(결제위젯 SDK v2), Pretendard, Framer Motion.
- **레이아웃**: `max-w-[430px] mx-auto min-h-dvh`, 한지 크림(#F7F3EE) / 다크 먹색(#1D1E23).
- **아키텍처**: app(라우팅·서버 컴포넌트), components(UI), lib(비즈니스·Supabase·결제), hooks(클라이언트 상태).

### 1.2 docs/design/design-system.md
- **역할**: Flutter 앱 디자인 토큰을 Tailwind로 1:1 매핑. 웹은 이 토큰만 사용해 앱과 동일한 look & feel 유지.
- **컬러**: 한지 시맨틱(hanji, ink, brand, accent), 오행(element-wood/fire/earth/metal/water + pastel), 궁합 등급(compat-*), 인트로 액센트(골드/하늘/핑크).
- **타이포**: Pretendard, hero~overline 스케일(48px~11px), line-height·letter-spacing 명시.
- **간격**: 4px 그리드(space2~space64), 페이지 패딩 px-5, 카드 p-4, gap-6/8.
- **라운딩·그림자**: rounded-lg/xl/2xl/[20px]/full, shadow low/medium/high, 다크 mystic.
- **애니메이션**: fast/normal/slow/reveal, Framer Motion 페이드·슬라이드·스코어 리빌.
- **컴포넌트 매핑**: SajuButton→Button, SajuCard→Card, SajuInput→Input, Chip, CharacterBubble, CompatibilityGauge, Loading 등.

### 1.3 docs/plans/page-specs.md
- **랜딩**: 인트로 슬라이드 3장(동일 카피·액센트 컬러), 인디케이터, CTA "시작하기"/"다음", 건너뛰기, 스와이프.
- **온보딩**: 4스텝(이름→성별→생년월일시→사진). 프로그레스 바, CharacterBubble, 물결이(수)/불꼬리(화). 시진 12지지 그리드, 사진 업로드→Storage.
- **결제벽**: 블러 프리뷰, 500원 런칭가, 카카오페이 CTA.
- **분석 로딩**: 10초 4단계 메시지·프로그레스, 다크 배경, 캐릭터 교대.
- **사주 결과**: 다크, 4주·오행·성격·연애·올해운세·**이상형 사주**(ideal_match JSONB).
- **관상 결과**: 다크, 동물상 리빌·삼정·오관·5축·**이상형 관상**(ideal_match_* 컬럼).
- **공유**: `/share/[id]` SSR, OG 동적 생성, CTA "나도 사주 보러 가기".

### 1.4 docs/plans/implementation-plan.md
- **Phase 0**: Next.js 생성, Tailwind Momo 토큰, Supabase 클라이언트·미들웨어, 루트 레이아웃, Vercel 연결.
- **Phase 1**: 랜딩 3슬라이드, 카카오 로그인·콜백, 온보딩 4단계, profiles INSERT.
- **Phase 2**: 결제벽, 토스페이먼츠 결제위젯·서버 검증, payments 테이블(신규).
- **Phase 3**: Edge Function 호출(기존 그대로), 로딩 연출, 사주/관상 결과·공유·OG.
- **Phase 4**: waitlist 테이블(신규), 알림 신청·완료, SMS 발송 준비.
- **Phase 5**: SEO, 성능, 분석·에러 핸들링.
- **일정**: 약 8일. 사전 준비물(사업자, 토스페이먼츠, 카카오 Web, Supabase Redirect URL 등) 명시.

### 1.5 docs/plans/supabase-integration.md
- **연결**: 동일 프로젝트 `ejngitwtzecqbhbqfnsc`, .env.local에 URL·anon key·service role key.
- **클라이언트**: 서버용 createServerClient(쿠키), 브라우저용 createBrowserClient, middleware 세션 갱신.
- **카카오**: Site URL·Redirect URL 추가, 카카오 Web 플랫폼·Redirect URI.
- **기존 테이블**: profiles INSERT, Edge Function invoke(calculate-saju, generate-saju-insight, generate-gwansang-reading), Storage profile-images 업로드.
- **신규 테이블**: payments, waitlist(RLS·정책 예시 포함). **기존 테이블/정책 수정 금지.**

### 1.6 docs/plans/payment-integration.md
- **500원 고정**, 토스페이먼츠 결제위젯 SDK v2, 간편결제 우선. 환경변수: CLIENT_KEY, SECRET_KEY.
- **클라이언트**: @tosspayments/tosspayments-sdk, 결제위젯 임베드 → /checkout 페이지.
- **서버**: /api/payment/confirm에서 토스페이먼츠 API로 승인·검증 후 payment_history_web INSERT.

### 1.7 docs/plans/waitlist-and-marketing.md
- **전략**: 결과 후 "궁합 매칭·앱 출시 알림" → 전화번호·마케팅 동의 → 앱 출시 시 문자.
- **UI**: /waitlist (전화번호·체크박스·알림 받기), /waitlist/complete (프로필 요약·공유 CTA).
- **waitlist**: phone unique, marketing_agreed, agreed_at, saju_summary, animal_type 등.
- **법적**: 개인정보 동의, 수신거부, 야간 발송 제한, 발신번호 등록.

### 1.8 docs/schema-changelog.md
- **saju_profiles.ideal_match** (JSONB): element, dayStem, dayStemHanja, traits, description. 천간합·용신 기반.
- **gwansang_profiles**: ideal_match_animal, ideal_match_animal_korean, ideal_match_traits, ideal_match_description.
- **Edge Function**: generate-saju-insight 응답에 idealMatch, generate-gwansang-reading 응답에 ideal_match_* 포함. **웹은 해당 컬럼/응답만 읽어서 표시.**

### 1.9 docs/design/onboarding-analysis-flow.md (Flutter 전체 플로우)
- **역할**: 앱의 15단계 온보딩·운명 분석·결과·DB/Edge Function 상세 스펙. **웹은 이 중 4단계 온보딩만 사용** (이름·성별·생년월일시·사진).
- **참고용**: 12시진 값·프로필 2-Phase 저장·로딩 8단계 텍스트·결과 탭 구조·캐릭터–오행 매핑·비즈니스 상수.
- **주의**: 웹에서는 SMS 인증·매칭프로필(키/직업/지역 등) 수집 없음. 웹 전용 플로우는 page-specs + implementation-plan 기준.

---

## 2. 코드베이스 현황

| 구분 | 상태 |
|------|------|
| **package.json / Next.js** | 없음 (프로젝트 미초기화) |
| **app/** | 빈 디렉터리 |
| **components/** | 빈 디렉터리 |
| **lib/** | 빈 디렉터리 |
| **styles/** | 없음 |
| **public/** | `images/characters/` — 오행 캐릭터 이미지 다수 (mulgyeori, bulkkori, namuri, soedongi, heuksuni, gold_tokki, black_tokki, namuri_girlfriend 등), default/expressions/poses/views 구조 |
| **설정 파일** | tailwind.config.ts, next.config.ts, tsconfig.json 없음 |

**결론**: 문서와 public 에셋만 있고, **실제 앱 코드는 없음**. Phase 0(프로젝트 초기화)부터 진행 필요.

---

## 3. 콜드 스타트 해결과의 연결

- **목표**: 앱 출시 전에 **프로필 N천 명 확보** → 출시 시 매칭 풀 확보.
- **웹의 역할**:
  - 진입: 랜딩(가치 제안) → 카카오 로그인 → **최소 온보딩 4스텝**으로 프로필 생성.
  - 수익·검증: **500원 결제**로 사주+관상 결과 노출 → 지불 의사(PMF) 검증.
  - 바이럴: 결과 공유(OG·카카오톡) → 유입 확대.
  - 전환: "궁합 알림" → **전화번호 수집** → 앱 출시 시 문자로 앱 다운로드 유도.
- **디자인·컨셉**: 앱과 **동일 디자인 시스템**(design-system.md) + **동일 캐릭터·오행 컨셉** 사용 → 브랜드 일관성, 앱 전환 시 이질감 최소화.

---

## 4. 개발 환경에 필요한 것

### 4.1 필수 도구
- **Node.js** 18+ (LTS 권장)
- **npm** (또는 pnpm/yarn)
- **Git** (이미 사용 중)

### 4.2 프로젝트 초기화 시 할 일
1. **Next.js 15** 생성 (TypeScript, App Router, Tailwind, ESLint, `src-dir=false`).
2. **의존성 추가**  
   - `@supabase/ssr`, `@supabase/supabase-js`  
   - `framer-motion`  
   - `@tosspayments/tosspayments-sdk` (결제)
3. **Pretendard** 폰트: self-hosted (`next/font/local`) — design-system 기준.

### 4.3 환경 변수 (.env.local)
```env
# Supabase (기존 프로젝트 공유)
NEXT_PUBLIC_SUPABASE_URL=https://ejngitwtzecqbhbqfnsc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — 서버 전용>

# 토스페이먼츠 (결제)
NEXT_PUBLIC_PORTONE_STORE_ID=
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=
PORTONE_V2_API_SECRET=
```

### 4.4 외부 설정 (수정 없이 추가만)
- **Supabase Dashboard**: Authentication URL Configuration에 웹 Site URL·Redirect URL 추가.
- **카카오 개발자 콘솔**: Web 플랫폼 추가, Redirect URI는 Supabase 콜백 URL 유지.
- **Vercel**: 배포 연결 후 위 env 동일하게 설정.

### 4.5 DB/서버 (건드리지 않을 것)
- 기존 테이블·RLS·Edge Function·Storage 정책 **변경 금지**.
- **신규 테이블만** 필요 시 추가: `payments`, `waitlist` (문서에 정의된 스키마·RLS만).

---

## 5. 설계 요약 (모바일 최적화 + 앱과 동일 컨셉)

### 5.1 레이아웃·UI
- **모바일 고정**: `max-w-[430px] mx-auto min-h-dvh`, 모든 화면 동일.
- **디자인 토큰**: `docs/design/design-system.md` 전부 반영한 `tailwind.config.ts` (색상·폰트·간격·라운딩·그림자·maxWidth mobile).
- **테마**: 라이트 = 한지 톤(랜딩·온보딩·결제·알림), 다크 = 먹색(분석 로딩·사주/관상 결과).
- **폰트**: Pretendard only, 글로벌 적용.

### 5.2 라우트 구조 (문서 기준)
- `/` — 랜딩 (3슬라이드, CTA → 로그인)
- `/callback` — 카카오 OAuth 콜백
- `/onboarding` — 4스텝 (이름·성별·생년월일시·사진)
- `/payment` — 결제벽
- `/payment/complete` — 결제 완료·검증 후 분석 트리거
- `/result/loading` — 분석 로딩
- `/result/saju` — 사주 결과
- `/result/gwansang` — 관상 결과
- `/waitlist` — 알림 신청
- `/waitlist/complete` — 알림 완료
- `/share/[id]` — 공유 페이지 (SSR·OG)

### 5.3 데이터·인증
- **인증**: Supabase Auth, 카카오 OAuth. 세션은 미들웨어에서 갱신.
- **프로필**: 기존 `profiles` INSERT만 (온보딩 완료 시). 스키마 변경 없음.
- **결제**: 토스페이먼츠 승인·검증 후 `payment_history_web` INSERT (신규 테이블).
- **알림**: `waitlist` INSERT/UPDATE (신규 테이블).
- **분석**: 기존 Edge Function만 호출 (calculate-saju → generate-saju-insight → generate-gwansang-reading). 응답으로 ideal_match·ideal_match_* 등 활용.

### 5.4 캐릭터·에셋
- **경로**: `public/images/characters/{캐릭터명}/default.png`, expressions, poses, views.
- **오행 매핑**: design-system + onboarding-analysis-flow (namuri→목, bulkkori→화, heuksuni→토, soedongi→금, mulgyeori→수).
- **온보딩**: 물결이(mulgyeori) Step 0~2, 불꼬리(bulkkori) Step 3. 필요 시 쇠동이(soedongi) 시진 스텝.

### 5.5 컴포넌트 계층
- **ui/**: Button, Card, Input, Chip, Loading 등 — design-system의 Flutter→React 매핑 준수.
- **onboarding/**: CharacterBubble, Step별 폼·시진 그리드 등.
- **result/**: 사주 4주, 오행 차트, 동물상 리빌, 이상형 섹션, 공유 버튼 등.
- **공통**: 430px 컨테이너, 프로그레스 바, CTA 버튼 스타일 통일.

### 5.6 성능·SEO
- **이미지**: `next/image`, public/characters 활용.
- **폰트**: Pretendard local, preload.
- **공유**: `/share/[id]`에서 `generateMetadata` + 동적 OG 이미지(선택)로 카카오 미리보기 대응.

---

## 6. 다음 단계 (Phase 0 실행 순서)

1. **Next.js 프로젝트 생성**  
   - 기존 `app/`, `components/`, `lib/`, `public/` 유지하면서 `package.json`·`next.config.ts`·`tsconfig.json` 생성 및 의존성 설치.
2. **Tailwind 설정**  
   - `tailwind.config.ts`에 design-system.md 토큰 전부 반영 (darkMode: 'class' 포함).
3. **글로벌 스타일**  
   - `styles/globals.css` (Tailwind directives, Pretendard 적용).
4. **Supabase**  
   - `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts` 추가 (supabase-integration.md 코드 사용).
5. **루트 레이아웃**  
   - `app/layout.tsx`: max-w-[430px], min-h-dvh, Pretendard, 메타데이터.
6. **환경 변수 템플릿**  
   - `.env.example`에 필수 변수 목록만 기재 (실제 키 제외).

이후 Phase 1(랜딩·로그인·온보딩)부터 page-specs·implementation-plan 순서로 구현하면 됨.

---

## 7. 문서·코드 매핑 요약

| 목적 | 참조 문서 |
|------|-----------|
| 전역 규칙·스택·아키텍처 | CLAUDE.md |
| Supabase 절대 금지·허용 | CLAUDE.md, supabase-integration.md |
| UI·컬러·타이포·컴포넌트 | design-system.md |
| 페이지별 UI·인터랙션 | page-specs.md |
| 작업 순서·일정 | implementation-plan.md |
| 결제·결제 검증 | payment-integration.md |
| 알림·waitlist·SMS | waitlist-and-marketing.md |
| ideal_match·이상형 섹션 | schema-changelog.md |
| 앱 플로우·DB·Edge Function 상세 | onboarding-analysis-flow.md (참고, 웹은 4스텝만) |

이 문서는 **코드베이스와 문서를 훑어본 분석**과 **모모 콜드 스타터 해결을 위한 모바일 최적화 앱에 필요한 개발 환경·설계**를 한곳에 정리한 것입니다. 실제 구현 시 위 표와 Phase 0~5 순서를 따라가면 됩니다.
