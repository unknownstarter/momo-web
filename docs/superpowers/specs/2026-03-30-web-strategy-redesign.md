# 모모 웹 전략 재설계 — 매칭 중심 전환

> **날짜**: 2026-03-30
> **목적**: 웹 프로젝트의 목적을 "앱 알림 수집"에서 "매칭풀 실제 진입"으로 전환
> **상태**: 확정

---

## 1. 전략 개요

### 1.1 목적

소개팅 앱 모모의 콜드 스타트 해결 — 앱 출시 DAY 1에 매칭 가능한 솔로 여성 프로필 확보.

"확보"의 정의: 단순 가입이 아니라, **전화번호 SMS 인증 완료 → `is_phone_verified = true` → 매칭풀 실제 진입**까지.

### 1.2 포지셔닝

**"사주랑 관상으로 내 이상형 찾기"**

- **브랜드 주체**: 모모 (나무리 캐릭터) — AI를 활용해 이상형을 찾아주는 친근한 안내자
- **방법**: 사주 + 관상 분석
- **가치**: 내 이상형이 어떤 사주/관상인지 알 수 있고, 실제로 만날 수 있다
- **톤**: 여성의 연애 호기심 자극 — "궁금하지 않아?", "알아볼래?"
- **숨기는 것**: "소개팅 앱"이라는 단어. 앱 정체는 SMS 인증 직전에만 자연스럽게 공개

### 1.3 핵심 가설

사주·관상이라는 이미 믿고 있는 체계 위에 "이상형 찾기"라는 명확한 가치를 얹으면, 솔로 여성이 자발적으로 프로필을 만들고, SMS 인증까지 완료하고, 공유까지 한다.

### 1.4 기존 가설 대비 변경

| 항목 | 기존 | 개편 |
|------|------|------|
| **전환 동기** | "앱 알림 받기" (약함) | "이상형 매칭 등록" (강함) |
| **전환 결과** | 전화번호 저장만 | SMS 인증 → 매칭풀 진입 |
| **공유 동기** | "재밌어서" | "재밌어서" + "순번 올리기" |
| **앱 출시 시** | 알림 → 앱 다운 → 인증 (70% 탈락) | 이미 인증 완료 → 즉시 매칭 |

### 1.5 웹이 하지 않는 것 (불변)

- Supabase DB 스키마/RLS/Edge Function/Storage 정책 변경 (앱 백엔드에 요청만)
- 결제/유료화
- 소개팅 앱 브랜딩 전면 노출

---

## 2. 사이트맵

```
/                    → 랜딩 (리프레이밍: "사주랑 관상으로 내 이상형 찾기")
/callback            → 카카오 OAuth (기존 유지)
/onboarding          → 온보딩 (기존 유지)
/result/loading      → 분석 로딩 (문구 변경: "이상형도 찾아볼게요")
/result              → ⭐ NEW 매칭 중심 메인
/result/detail       → 사주 & 관상 상세 (기존 result 페이지 재활용, 궁합 탭 제거)
/result/compat       → 궁합 (기존 궁합 탭을 별도 페이지로)
/complete            → SMS OTP 인증 (리브랜딩: "매칭 등록")
/share/[id]          → 공유 티저 (문구 리프레이밍)
/s/[code]            → 짧은 공유 링크 (기존 유지)
```

---

## 3. 유저 플로우

```
랜딩
  "사주랑 관상으로 내 이상형 찾기"
  모모(나무리): "너의 이상형, 내가 찾아줄게!"
  CTA: "내 이상형 알아보기"
    ↓
카카오 로그인
    ↓
온보딩 (기존 유지, 연애 상태 질문 추가 없음)
  이름 → 성별 → 생년월일·생시 → 사진 → 확인
  ※ 연애 상태 질문은 스킵 — 이상형 매칭에 관심 보이고 인증하는 행위 자체가 솔로 시그널
    ↓
분석 로딩 (다크 모드 — 기존 유지)
  "모모가 사주와 관상을 분석하고 있어요..."
  "이상형도 함께 찾아볼게요!"
    ↓
/result — 매칭 중심 메인
  - 헤더: 내 프로필 사진 + 이름 + 분석 완료 메시지
  - 섹션 1: 내 연애 유형 요약
  - 섹션 2: 내 이상형의 사주 (ideal_match 데이터)
  - 섹션 3: 매칭 대기 현황 (이성 N명, 궁합 90점+ M명)
  - CTA: "전화번호 인증하고 매칭 등록하기" → /complete
  - 진입점: [사주&관상 자세히 보기 → /result/detail] [궁합 보기 → /result/compat]
    ↓
/complete — SMS OTP 인증
  전화번호 입력 → NHN Cloud OTP 발송 → 6자리 입력 → 인증 완료
  → is_phone_verified = true → matching_waitlist INSERT → 매칭풀 진입
    ↓
인증 완료 (같은 /complete 페이지 내 상태 변경)
  "축하해요! 47번째로 매칭 대기 등록됐어요!"
  "친구에게 공유하면 내 순번이 올라가요"
  CTA: "공유해서 순번 올리기"
    ↓
공유 → 친구 유입 → 반복 (바이럴 루프)
```

### 3.1 바이럴 루프

```
A 결과 확인 → 매칭 등록(인증) → "47번째 등록!"
  → "공유하면 순번 5칸 올라가요" → 공유
  → B 공유 티저 수신: "A님의 이상형은 이런 사주래요! 너도 알아볼래?"
  → B 가입 → 분석 → 매칭 등록(인증)
  → A 순번 5칸 상승
  → B도 공유 → C 유입 → 체인
```

기존 궁합 바이럴(친구 간 궁합 공유)도 공존:
- 이상형 매칭 바이럴 = 신규 유저 유입
- 궁합 바이럴 = 기존 유저 인게이지먼트

---

## 4. 화면별 상세

### 4.1 랜딩 (`/`) — 리프레이밍

**변경 포인트:**
- 헤드라인: "사주랑 관상으로 내 이상형 찾기"
- 서브: 모모(나무리) 캐릭터가 "너의 이상형, 내가 찾아줄게!" 안내
- CTA: "내 이상형 알아보기"
- 기존 구조(스크롤 없는 한 화면) 유지, 문구만 변경

### 4.2 분석 로딩 (`/result/loading`) — 문구 변경

**추가 문구:**
- "이상형도 함께 찾아볼게요!" (기존 로딩 애니메이션에 문구 추가)

### 4.3 매칭 메인 (`/result`) — ⭐ NEW

**전체 구조:**
```
┌─────────────────────────────────────┐
│  헤더                                │
│  [내 프로필 사진 (96px 원형)]         │
│  "OO님의 분석이 완료됐어요!"         │
│  [불꼬리형] [고양이상]  ← 배지       │
│                                      │
│  섹션 1: 내 연애 유형                 │
│  ┌────────────────────────────────┐  │
│  │ 연애할 때 당신은                │  │
│  │ "감정에 솔직한 정열가"          │  │
│  │ [감정표현 풍부] [직진형] [열정적]│  │
│  │ "마음을 숨기지 못하는 당신은..." │  │
│  └────────────────────────────────┘  │
│                                      │
│  섹션 2: 내 이상형의 사주             │
│  ┌────────────────────────────────┐  │
│  │ 모모가 찾은 당신의 이상형        │  │
│  │ [이상형 오행 캐릭터]             │  │
│  │ "물의 기운을 가진 사람과         │  │
│  │  가장 잘 맞아요"                │  │
│  │ [차분한] [깊은 공감력] [신중한]  │  │
│  │ 관상으로 보면                   │  │
│  │ "고양이상과 가장 잘 맞아요"      │  │
│  └────────────────────────────────┘  │
│                                      │
│  섹션 3: 매칭 대기 현황               │
│  ┌────────────────────────────────┐  │
│  │ 현재 매칭 대기 중인 이성  12명   │  │
│  │ 그 중 궁합 90점+ 예상    3명    │  │
│  └────────────────────────────────┘  │
│                                      │
│  섹션 4: 진입점 카드 (2열 그리드)     │
│  [사주&관상 자세히 보기] [궁합 보기]  │
│                                      │
│  ── 하단 고정 CtaBar ──              │
│  [전화번호 인증하고 매칭 등록하기]    │
│  [친구에게 공유하기] (서브)           │
└─────────────────────────────────────┘
```

**데이터 소스:**

| 섹션 | 데이터 | 테이블/소스 |
|------|--------|------------|
| 헤더 | name, profile_images[0], character_type, animal_type_korean | profiles, gwansang_profiles |
| 연애 유형 | romance_style, romance_key_points, personality_traits | saju_profiles |
| 이상형 사주 | ideal_match.description, ideal_match.traits, ideal_match_animal_korean | saju_profiles, gwansang_profiles |
| 매칭 대기 | 이성 유저 수, 예상 궁합 높은 수 | matching_waitlist + profiles 집계 |

**이미지 규칙:**
- 내 아바타: `profile_images[0]` 우선, 없으면 오행이 캐릭터 폴백 (`object-cover` / `object-contain`)
- 이상형 섹션: 이상형 오행 캐릭터 사용 (실제 사람이 아닌 "유형" 표시이므로)

**상태별 분기:**
- 인증 전: CTA "전화번호 인증하고 매칭 등록하기"
- 인증 후 재방문: "47번째로 등록됐어요!", CTA "공유해서 순번 올리기"
- 이성 0명: 카운터 숨김, "지금 1번째로 등록하면 앱 출시 시 가장 먼저 매칭!"

### 4.4 사주 & 관상 상세 (`/result/detail`) — 기존 코드 재활용

- 기존 `/result` 페이지 코드를 `/result/detail`로 이동
- 탭 구조: [사주] [관상] 2탭 (궁합 탭 제거)
- 상단에 "← 돌아가기" 네비게이션 (매칭 메인으로)
- 나머지 UI 변경 없음

### 4.5 궁합 (`/result/compat`) — 기존 궁합 탭 분리

- 기존 `CompatibilityTab` 컴포넌트를 별도 페이지로
- 상단에 "← 돌아가기" 네비게이션
- 기존 궁합 리스트 + 상세 바텀시트 + AI 스토리 그대로 유지
- 프로필 사진 표시도 이미 구현됨 (이전 작업)

### 4.6 SMS OTP 인증 (`/complete`) — 리브랜딩

**기존**: 전화번호 저장 + 문자 수신 동의 + "앱 나오면 알려드릴게요"

**변경:**
```
┌─────────────────────────────────────┐
│  모모(나무리): "거의 다 왔어요!"      │
│                                      │
│  "전화번호를 인증하면                 │
│   내 이상형 매칭에 등록돼요"          │
│                                      │
│  [전화번호 입력]                      │
│  [인증번호 받기] ← CTA               │
│                                      │
│  (OTP 발송 후)                       │
│  [6자리 인증번호 입력]                │
│  [인증 완료] ← CTA                   │
│                                      │
│  (인증 완료 후 — 같은 페이지 상태 변경) │
│  "🎉 축하해요!"                      │
│  "47번째로 매칭 대기 등록됐어요!"      │
│  "친구 1명 초대 = 순번 5칸 상승"      │
│                                      │
│  [공유해서 순번 올리기] ← 메인 CTA    │
│  [내 결과 다시 보기] ← 서브 링크      │
└─────────────────────────────────────┘
```

**SMS 인증 플로우:**
1. 전화번호 입력 (한국 번호 010 형식)
2. API Route → NHN Cloud SMS API → OTP 6자리 발송
3. 유저가 6자리 입력 → 서버에서 검증 (3분 타임아웃)
4. 성공 시:
   - `profiles.phone` 업데이트
   - `profiles.is_phone_verified = true` 설정
   - `matching_waitlist` INSERT (순번 자동 채번)
5. 실패 시: 재시도 안내 (3회 제한)

---

## 5. 게이미피케이션

### 5.1 순번 시스템

- 인증 완료 시 `matching_waitlist.queue_number` 자동 부여 (현재 max + 1)
- "47번째로 등록됐어요!" 표시
- 순번이 낮을수록 앱 출시 시 우선 매칭 (약속)

### 5.2 초대 보상 (순번 상승)

- 내가 공유한 링크로 친구가 가입 + 인증 완료 시:
  - 내 `referral_count += 1`
  - 내 `queue_number -= 5` (최소 1)
- 공유 링크에 referrer 정보 포함: `/share/[id]?ref=[referrer_profile_id]` 형태
- 공유 수신자가 인증 완료 시, `ref` 파라미터의 유저를 `referred_by`로 기록

### 5.3 실시간 카운터

- 매칭 메인 페이지에 표시:
  - "현재 매칭 대기 중인 이성: N명"
  - "그 중 궁합 90점+ 예상: M명"
- 데이터 소스: `matching_waitlist` JOIN `profiles` (gender 필터)
- 궁합 90점+ 예상 수: 이성 인원의 ~25%로 추정 표시 (1:1 궁합 계산은 Edge Function 호출 비용이 크므로 batch 계산 전까지 추정치 사용. 추후 실제 batch 결과가 있으면 정확한 수치로 교체)

---

## 6. 데이터 요구사항 (앱 백엔드 요청)

### 6.1 신규 테이블 — `matching_waitlist`

```sql
create table matching_waitlist (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) unique,
  queue_number   int not null,
  referral_count int not null default 0,
  referred_by    uuid references profiles(id),
  verified_at    timestamptz not null,
  created_at     timestamptz default now()
);

create index idx_waitlist_queue on matching_waitlist(queue_number);
create index idx_waitlist_referrer on matching_waitlist(referred_by);
```

**RLS 정책 요청:**
- 인증된 유저: 자기 행 SELECT/INSERT/UPDATE
- queue_number: 서버에서 자동 채번 (max + 1)

### 6.2 `profiles.is_phone_verified` 웹 설정 허용

- 기존 규칙 변경: 웹에서 SMS OTP 인증 완료 후 `is_phone_verified = true` 설정 허용
- 조건: NHN Cloud SMS OTP를 통한 실제 검증 거친 경우에만

### 6.3 웹에서 호출하는 기존 RPC/Edge Function (영향 없음 확인)

웹이 호출하는 RPC:
- `fn_record_compat_connection` (p_partner_id) — 궁합 기록
- `request_account_deletion` (p_user_id, p_reasons, p_free_text) — 탈퇴

웹이 호출하는 Edge Function:
- `calculate-saju`, `generate-saju-insight`, `generate-gwansang-reading`
- `calculate-compatibility`, `generate-match-story`

> 위 함수들의 시그니처/RLS 변경 시 웹이 깨짐. 변경 전 웹 팀 확인 필수.

---

## 7. 주요 변경 파일 (예상)

| 파일/경로 | 변경 유형 | 내용 |
|-----------|----------|------|
| `app/page.tsx` | 수정 | 랜딩 헤드라인/CTA 리프레이밍 |
| `app/result/page.tsx` | ⭐ 신규 작성 | 매칭 중심 메인 페이지 |
| `app/result/detail/page.tsx` | 신규 (기존 코드 이동) | 사주&관상 상세 (기존 /result 코드) |
| `app/result/compat/page.tsx` | 신규 (기존 탭 분리) | 궁합 별도 페이지 |
| `app/result/loading/page.tsx` | 수정 | 로딩 문구 추가 |
| `app/complete/page.tsx` | 대폭 수정 | SMS OTP 인증 + 매칭 등록 + 순번 |
| `app/api/send-otp/route.ts` | 신규 | NHN Cloud SMS OTP 발송 |
| `app/api/verify-otp/route.ts` | 신규 | OTP 검증 + is_phone_verified 설정 |
| `app/api/matching-stats/route.ts` | 신규 | 매칭 대기 현황 집계 |
| `components/result/matching-hero.tsx` | 신규 | 매칭 메인 핵심 UI |
| `components/share-teaser-view.tsx` | 수정 | 공유 문구 리프레이밍 |
| `lib/constants.ts` | 수정 | 라우트 상수 추가 |
| `CLAUDE.md` | 수정 | is_phone_verified 규칙 변경, 사이트맵 업데이트 |

---

## 8. 퍼널 KPI

### 8.1 개편 퍼널

| 단계 | 전환율 (목표) | 500명 매칭풀 역산 |
|------|-------------|------------------|
| 웹 방문 (UV) | — | ~3,200명 |
| 카카오 로그인 | 60% | ~1,920명 |
| 온보딩 완료 | 80% | ~1,536명 |
| 분석 결과 도달 | 90% | ~1,382명 |
| 매칭 메인 확인 | 100% | ~1,382명 |
| SMS OTP 인증 완료 | 40% | **~553명** |

### 8.2 핵심 지표

| 지표 | 목표 | 비고 |
|------|------|------|
| 매칭 메인 → SMS 인증 | >= 40% | 핵심 전환 |
| 공유율 (인증 후) | >= 50% | 순번 보상 동기 |
| 전체 공유율 | >= 30% | 인증 전 포함 |
| K-factor | >= 0.6 | 공유 30% × 신규 2명 |

---

## 9. SMS 인증 기술 선택

| 항목 | 결정 |
|------|------|
| **Phase 1** | NHN Cloud SMS API (OTP 발송, 건당 ~10원) |
| **Phase 2** | NHN KCP PASS 본인인증 (PortOne 경유) |
| **전환 용이성** | 같은 NHN 그룹, 인증 인터페이스만 교체 |

---

## 10. 디자인 규칙 (기존 디자인 시스템 준수)

- 배경: `bg-hanji` (#F7F3EE) — 라이트 모드
- 카드: `bg-hanji-elevated` (#FEFCF9), `rounded-2xl`, `border-hanji-border`, `shadow-low`
- 이상형 카드: 이상형 오행 pastel 배경 그라데이션
- 칩/태그: `rounded-full`, 오행 main 텍스트 + pastel 배경
- 카운터 숫자: `text-[32px] font-bold`, 오행 main 색상
- CTA: `bg-ink text-white h-[52px] rounded-button`
- 진입점 카드: 2열 그리드, `gap-3`
- 간격: 섹션 간 `mt-8`(32px), 카드 내부 `p-4`(16px)
- 이미지: 내 아바타 = `profile_images[0]` 우선 (없으면 오행이 폴백), 이상형 = 오행 캐릭터
- CTA 하단 고정: CtaBar `shrink-0`, 콘텐츠 `flex-1 overflow-auto`
