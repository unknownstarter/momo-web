# 카카오 로그인 + Supabase 연동 — 노아님이 하실 일

> 코드 쪽은 이미 구현해 두었습니다. 아래는 **노아님이 직접 설정**하실 것만 정리한 체크리스트입니다.

## 이미 구현된 것 (코드)

- **랜딩** 「카카오로 시작하기」 → `signInWithOAuth({ provider: 'kakao', redirectTo: origin + '/callback' })`
- **GET /callback** (Route Handler) → `exchangeCodeForSession(code)` → `profiles` 조회 → 없으면 `/onboarding`, 있으면 `is_saju_complete` 보고 `/result` 또는 `/onboarding` 리다이렉트
- **미들웨어** → Supabase 세션 갱신 (쿠키)
- **lib/supabase** → client (브라우저), server (cookies)

---

## 1. Supabase Dashboard (Authentication)

- [ ] **Authentication → Providers → Kakao**
  - Kakao 켜기
  - **Client ID**: 카카오 개발자 콘솔에서 발급한 **REST API 키**
  - **Client Secret**: 카카오 개발자 콘솔에서 발급한 **Client Secret** (카카오 로그인 활성화 후 생성)

- [ ] **Authentication → URL Configuration**
  - **Site URL**:  
    - 로컬 테스트: `http://localhost:3000`  
    - 배포: `https://momo-web.vercel.app` (또는 실제 도메인)
  - **Redirect URLs**에 다음 추가:
    - `http://localhost:3000/callback`
    - `https://momo-web.vercel.app/callback`
    - (프로덕션 도메인 쓰면) `https://<도메인>/callback`

> Supabase 프로젝트 URL: `https://ejngitwtzecqbhbqfnsc.supabase.co` (momo 앱과 동일)

---

## 2. 카카오 개발자 콘솔

> 최신 콘솔에는 "플랫폼 → Web"이 없고, **앱 설정 → 앱 키** 또는 **JavaScript 키 수정** 화면에서 웹용 도메인·리다이렉트 URI를 등록합니다.

- [ ] **내 애플리케이션** → momo 앱 선택 → **앱 키** 또는 **JavaScript 키 수정** 화면으로 이동

- [ ] **JavaScript SDK 도메인**
  - 우리 웹이 뜨는 도메인을 등록 (여기 등록된 도메인에서만 카카오 로그인 요청 가능)
  - 예시:
    - `http://localhost:3000` (로컬)
    - `https://momo-web.vercel.app` (또는 실제 배포 도메인)
  - 필요하면 여러 개 추가 (예: localhost + Vercel + 프로덕션 도메인)

- [ ] **카카오 로그인 리다이렉트 URI**
  - **Supabase Auth 콜백 URL**을 그대로 등록 (앱에서 이미 쓰고 있다면 동일한 값이 있음)
  - 값: `https://ejngitwtzecqbhbqfnsc.supabase.co/auth/v1/callback`
  - 우리 웹 URL(`/callback`)이 아니라 **Supabase가 받는 주소** 한 개만 넣으면 됨. 이미 앱 때문에 넣어 두셨으면 그대로 두고, 없으면 위 주소 추가.

- [ ] **동의 항목**  
  - momo 정책상 이메일·닉네임·프로필사진 **수집 안 함** → 필수 동의만 넣고, 나머지는 비수집으로 두면 됨.

---

## 3. 환경 변수

- [ ] **로컬** `.env.local` 예시:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://ejngitwtzecqbhbqfnsc.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
  ```
  - (서버 전용 작업 시) `SUPABASE_SERVICE_ROLE_KEY` 필요하면 추가

- [ ] **Vercel** (또는 배포 환경)
  - 동일한 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
  - 배포 후 리다이렉트가 되려면 Supabase Redirect URLs에 배포 URL이 들어가 있어야 함

---

## 4. 한 번만 확인하면 좋은 것

| 항목 | 확인 |
|------|------|
| Supabase **profiles** 테이블 | 앱과 공유, RLS 있음. 웹에서 INSERT 시 `auth_id` = `auth.users.id` |
| 카카오 Redirect URI | 반드시 **Supabase 콜백** (`.../auth/v1/callback`) 한 개. 웹 앱 URL이 아님. |
| 웹 앱 리다이렉트 | 로그인 후 Supabase가 **우리 웹** `/callback`으로 보내는 건 Supabase URL Configuration의 Redirect URLs로 설정. |

---

## 5. 연동 후 웹 플로우 (구현된 코드 기준)

1. 랜딩 **「카카오로 시작하기」** → `signInWithOAuth({ provider: 'kakao', redirectTo: origin + '/callback' })`
2. 카카오 로그인 → Supabase가 처리 후 **`/callback`** 으로 리다이렉트 (쿼리에 `code` 포함)
3. **`/callback`** 에서 `exchangeCodeForSession(code)` 후:
   - `profiles` 조회 (auth_id = user.id)
   - 없으면 → `/onboarding`
   - 있으면 → `is_saju_complete` 등 보고 `/result` 또는 `/onboarding`으로 이동

이제 **1~3번만** 위 체크리스트대로 하시면 카카오 로그인과 Supabase 연동이 동작합니다.
