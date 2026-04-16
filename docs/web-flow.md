# Momo Web — 유저 플로우 (무료, 결제 없음)

> 웹으로 콜드 스타트 해결. **유료화(결제) 없음.** 기존 앱과 동일한 디자인 컨셉 적용.

---

## 웹의 역할 (절대 원칙)

- **Supabase 구조·정책은 절대 건드리지 않는다.** 스키마 변경, RLS/정책 변경, Edge Function 수정, Storage 정책 변경 금지.
- **웹이 하는 일**: (1) **신규 유저 확보** (2) **유저 정보를 받아서 기존 테이블에 넣기** (INSERT/UPDATE만) (3) **사주·관상 결과를 보여주기** (4) **결과 데이터를 기존 구조에 저장**
- **목적**: 같은 유저가 **앱에서 로그인하면** 이미 웹에서 쌓아둔 프로필·사주·관상 데이터가 그대로 있어서, **바로 소개팅 앱 경험으로 이어지게** 만드는 것. 웹 = 앱으로 가는 퍼널의 앞단.

---

## 1. 전체 플로우

```
진입점 3가지 (모두 /onboarding으로 합류):
  ① Meta/인스타 광고 → /onboarding 직행 (destination URL)
  ② 오가닉/직접 진입 → / (랜딩) → CTA → /onboarding
  ③ 공유 링크 → /share/[id] → CTA → / (랜딩) → CTA → /onboarding

/onboarding (Stage 2: 비로그인 anon 접근 가능)
  Step 0 닉네임 → Step 1 성별 → Step 2 생년월일 → Step 3 생시
    ↓ 각 step 진행 시 sessionStorage("momo_pre_onboarding") 백업
    ↓ "사주 결과 보기" CTA (Step 3)
카카오 로그인 바텀시트 (LandingLoginSheet 재사용)
    ↓ "카카오로 시작하기" → onBeforeLogin 콜백이 sessionStorage 저장 → signInWithOAuth
카카오 OAuth 동의 화면 → /callback — 세션 교환
    ↓
/onboarding?step=4 (사진)
    sessionStorage 복원 → form hydration
    ↓
사진 업로드 → profiles INSERT (첫 저장, 변경 없음) + /api/run-analysis fire-and-forget
    ↓
Step 5 키 → ... → Step 13 확인
    ↓ "분석 시작"
사주 & 관상 분석 로딩 (/result/loading)
    ↓
결과 페이지 (/result)
    ↓
완료 (/complete) — 전화번호 + 문자 수신 동의

회원 재방문:
- 사주·관상 결과 있음 → /result 직행
- 필수 정보 일부 누락 → 해당 step으로 이동
- 비로그인 + sessionStorage 진행 중 → 마지막 step에서 재개
```

---

## 2. 페이지별 요약

| 단계 | 경로 | 설명 |
|------|------|------|
| 랜딩 | `/` | 모모 간략 설명, 스크롤 없음, CTA: "사주 & 관상 보기" |
| 로그인 | `/login` 또는 랜딩 CTA 직행 | 카카오 로그인 등 |
| 온보딩 | `/onboarding` | **Stage 2: Step 0~3 anon 접근 허용** (닉네임/성별/생년월일/생시). Step 3 CTA에서 카카오 로그인 바텀시트 트리거. Step 4(사진)부터 로그인 필수, profiles INSERT는 사진 업로드 시점 그대로 |
| 생년월일시 | `/onboarding` 내 또는 `/birth` | 생년월일 + 시진(12지지) |
| 프로필 등록 | `/onboarding` 내 | 사진 등 |
| 확인 | `/onboarding/confirm` | 입력 요약, "분석 시작" CTA |
| 분석 로딩 | `/result/loading` | 사주·관상 분석 로딩 연출 |
| 결과 | `/result` | 사주·관상·**궁합** 3개 탭. 공유 + 앱 유도 CTA |
| 궁합 상세 | `/result?tab=compatibility` | 궁합 리스트 + 상세 바텀시트 (게이지, AI 스토리) |
| 공유 티저 | `/s/{code}` 또는 `/share/{token}` | 공유 티저 + **2초 후 궁합 유도 바텀시트** |
| 앱 알림 | `/waitlist` 또는 `/complete` | "APP 준비 중" 문구 + 전화번호·문자 수신 수락 |

---

## 2-1. 궁합 바이럴 플로우 (2026-03-24 추가)

```
A 공유 → B 공유 티저 도착 → 2초 후 궁합 바텀시트
  → B "궁합 보기" 클릭
    → B 기존 회원 → /result?tab=compatibility → 자동 궁합 계산 → 상세 시트
    → B 비회원 → / (랜딩, 기존 경로 유지) → CTA → /onboarding (anon Step 0~3)
  → Step 3 카카오 로그인 바텀시트 → /onboarding?step=4 (사진)부터 → 분석 → /result
  → 궁합 탭 자동 활성화 (momo_compat_partner sessionStorage/쿠키 7일 보존)
  → B "궁합 요청 링크 공유" → C 전환 → 체인
```

- sessionStorage + 쿠키 병행으로 카카오 OAuth 리다이렉트 중에도 partner ID 유지
- 동성 = "친구 궁합" (케미 분석), 이성 = "연인 궁합" (인연 스토리)
- 점수별 솔직한 톤: 낮으면 위트있게 솔직, 높으면 진심으로

### 궁합 데이터 아키텍처 (⚠️ 중요)

```
saju_compatibility (점수 저장)     ← 앱 batch + 웹 모두 upsert
compat_connections (관계 추적)     ← 유저가 의도적으로 확인한 것만
궁합 리스트 조회                   ← compat_connections 기반 (앱 batch 제외)
```

- **`saju_compatibility`를 직접 조회하면 안 됨** — 앱 batch 데이터가 섞임
- **`compat_connections`에 기록은 RPC(`fn_record_compat_connection`)로만** — 직접 INSERT 불가(RLS)
- **궁합 계산 시 캐시 히트/미스 모든 경로에서 RPC 호출 필수** — 누락 시 리스트에 안 나오는 "유령 궁합"

### 전화번호 저장 규칙 (⚠️ 중요)

- `/complete` 페이지에서 `profiles.phone`에 **저장만**
- **`is_phone_verified: true`를 웹에서 절대 설정하면 안 됨**
- 이유: 앱의 SMS OTP 인증 플로우 + 매칭풀 필터 + 중복번호 체크가 깨짐
- 실제 SMS 인증은 앱에서만 진행

---

## 3. 디자인 원칙

- **기존 앱 디자인 컨셉과 최대한 동일**
- `docs/design/design-system.md` 토큰 사용: 한지/먹색, 오행 팔레트, Pretendard, 4px 그리드, 오행 캐릭터
- 모바일 고정: `max-w-[430px] mx-auto min-h-dvh`
- 라이트: 랜딩·온보딩·확인·알림·**결과(궁합 포함)** / 다크: **분석 로딩만**

---

## 4. 제외 사항 (웹에서 하지 않는 것)

- **결제·유료화 전부 제외**: 결제벽, 500원 결제, 토스페이먼츠 연동, `payments` 테이블 사용 없음
- **수익화는 앱에서만**: 웹은 프로필 확보 + 전화번호 수집 + 앱 출시 알림만 목표

---

## 5. 데이터·백엔드

- **Supabase 구조·정책 변경 금지.** 웹은 기존 테이블·API에 **읽기/쓰기만** 한다.
- **인증**: Supabase Auth (카카오 OAuth). 기존 프로젝트 공유.
- **프로필**: 기존 `profiles` 테이블만 사용 (INSERT/UPDATE). 스키마·RLS 변경 금지.
- **분석**: 기존 Edge Function만 **호출** (`calculate-saju`, `generate-saju-insight`, `generate-gwansang-reading`). 코드·정책 수정 금지.
- **앱 출시 알림**: 기존 `profiles.phone`, `is_phone_verified` 등 **이미 있는 컬럼**만 사용. (신규 테이블/컬럼 추가 없음.)

---

## 6. 공유·바이럴

- 결과 페이지: "친구에게 공유하기" → 공유 링크 (`/share/[id]`) + OG 태그 (SSR).
- "궁합 좋은 이성 보기" → 앱 출시 후 매칭 서비스로 유도하는 CTA (웹에서는 안내만).

이 플로우를 기준으로 라우트·화면·문구를 구현하면 됩니다.
