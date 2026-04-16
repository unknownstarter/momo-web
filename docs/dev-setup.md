# 개발 환경 설정 가이드

> 새 디바이스에서 momo-web 개발을 시작할 때 참고하는 문서.

---

## 1. 필수 도구

| 도구 | 버전 | 비고 |
|------|------|------|
| **Node.js** | 20 (`.nvmrc` 참조) | `nvm install && nvm use` |
| **npm** | 10+ | Node 20에 포함 |
| **Git** | 최신 | — |
| **Vercel CLI** | 최신 (선택) | `npm i -g vercel` — Preview 배포 확인용 |

---

## 2. 레포 클론 & 의존성 설치

```bash
git clone https://github.com/unknownstarter/momo-web.git
cd momo-web
nvm use          # Node 20으로 전환
npm install
```

---

## 3. 환경변수 (`.env.local`)

`.env.example`을 복사한 뒤 값을 채운다.

```bash
cp .env.example .env.local
```

### 필수 환경변수

| 변수 | 용도 | 발급처 |
|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | `.env.example`에 하드코딩 (공유 프로젝트) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `.env.example`에 하드코딩 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 service role key | Supabase Dashboard → Settings → API |
| `SHARE_SECRET` | 공유 링크 토큰 암호화 (16자+) | 임의 문자열 생성 |

### 결제 (토스페이먼츠)

| 변수 | 용도 | 발급처 |
|------|------|--------|
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 결제위젯 클라이언트 키 | [토스페이먼츠 개발자센터](https://developers.tosspayments.com) |
| `TOSS_SECRET_KEY` | 결제 승인 서버 시크릿 키 | 동일 |

> 미설정 시 코드 내 테스트 키(`test_gck_docs_*`, `test_gsk_docs_*`)로 폴백되므로 개발은 가능하다.

### 분석 (선택)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 측정 ID (예: `G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel ID |

---

## 4. 개발 서버

```bash
npm run dev      # http://localhost:3000
```

- 모바일 고정 레이아웃(`max-w-[430px]`)이므로 브라우저 DevTools에서 모바일 뷰포트 추천.
- 카카오 OAuth 콜백: 로컬에서 테스트 시 카카오 개발자 콘솔에 `http://localhost:3000` Redirect URI 등록 필요.

---

## 5. 주요 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | 15.1.x | App Router 프레임워크 |
| `react` / `react-dom` | 19.x | UI 라이브러리 |
| `@supabase/supabase-js` | 2.x | Supabase 클라이언트 |
| `@supabase/ssr` | 0.5.x | 서버 컴포넌트용 Supabase (쿠키 기반) |
| `@tosspayments/tosspayments-sdk` | 2.x | 결제위젯 SDK |
| `tailwindcss` | 3.x | 스타일링 (Momo 디자인 토큰 커스텀) |
| `framer-motion` | 11.x | 애니메이션 (결과 리빌, 페이지 전환) |
| `blurhash` | 2.x | 프로필 이미지 블러 프리뷰 |
| `@ncdai/react-wheel-picker` | 1.x | 생년월일·생시 선택 휠 피커 |

---

## 6. 배포

| 환경 | 방식 |
|------|------|
| **Preview** | feature 브랜치 push → Vercel 자동 Preview 배포 |
| **Production** | PR 머지(main) → Vercel 자동 Production 배포 |

**절대 금지**: main에 직접 push, fast-forward 머지 — Production 배포 누락 원인.

---

## 7. Supabase 공유 프로젝트

- 프로젝트 ID: `ejngitwtzecqbhbqfnsc`
- momo 네이티브 앱(Flutter)과 **동일 프로젝트 공유**.
- DB 스키마 / RLS / Edge Function / Storage 정책 **변경 금지**. 클라이언트 읽기/쓰기만.
- 상세: `CLAUDE.md` "Supabase 공유 백엔드" 섹션 참조.

---

## 8. 카카오 OAuth 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com) → 앱 → 플랫폼 → Web 도메인 추가
2. Redirect URI: `https://<도메인>/callback` + `http://localhost:3000/callback` (로컬)
3. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에 동일 URL 추가
