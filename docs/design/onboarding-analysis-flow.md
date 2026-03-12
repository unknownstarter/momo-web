# Momo Web — 로그인 → 온보딩 → 운명 분석 → 완료 플로우

> momo Flutter 앱의 전체 플로우를 Next.js + Tailwind CSS + Supabase 웹 버전으로 재구현하기 위한 설계 문서.
> 작성일: 2026-03-10

---

## 목차

1. [전체 플로우 개요](#1-전체-플로우-개요)
2. [로그인 (Auth)](#2-로그인-auth)
3. [온보딩 15단계](#3-온보딩-15단계)
4. [운명 분석 (Destiny Analysis)](#4-운명-분석-destiny-analysis)
5. [결과 페이지 (Destiny Result)](#5-결과-페이지-destiny-result)
6. [Supabase 스키마](#6-supabase-스키마)
7. [Edge Function API](#7-edge-function-api)
8. [캐릭터 에셋 시스템](#8-캐릭터-에셋-시스템)
9. [비즈니스 상수 & 제한](#9-비즈니스-상수--제한)
10. [구현 시 주의사항](#10-구현-시-주의사항)

---

## 1. 전체 플로우 개요

```
로그인 (Apple / Kakao)
  ↓
프로필 체크 (profiles 테이블 조회)
  ├─ 프로필 없음 → 온보딩 (15단계)
  ├─ 사주 미완료 → 온보딩으로 리다이렉트
  ├─ 매칭프로필 미완료 → 매칭프로필 페이지
  └─ 모두 완료 → 홈
  ↓
온보딩 15단계 (이름 → 성별 → 생년월일 → 시진 → SMS → 사진 → 키 → 직업 → 지역 → 체형 → 종교 → 자기소개 → 관심사 → 이상형 → 확인)
  ↓
2-Phase 저장
  ├─ Phase A: createProfile (INSERT) — 이름, 성별, 생년월일, 시진, 전화번호
  └─ Phase B: completeMatchingProfile (UPDATE) — 사진, 키, 직업, 지역, 체형, 종교, 자기소개, 관심사, 이상형
  ↓
운명 분석 페이지 (로딩 연출 ~16초)
  ├─ Step 1: calculate-saju (만세력 계산)
  ├─ Step 2: generate-saju-insight (Claude AI 해석)
  ├─ Step 3: generate-gwansang-reading (Claude Vision 관상)
  └─ Step 4: batch-calculate-compatibility + generate-daily-recommendations (비동기)
  ↓
결과 페이지 [사주 탭 | 관상 탭]
  ↓
CTA: "내 사주와 찰떡인 사람, 만나볼까요?" → 홈/매칭
```

---

## 2. 로그인 (Auth)

### 2.1 지원 로그인 방식
- **Apple Sign In** (iOS 네이티브 / 웹은 OAuth)
- **Kakao Login** (OAuth, 외부 브라우저)

> Google 로그인은 제거됨 (2026-03-03)

### 2.2 로그인 화면 UI
- "momo" 브랜드 로고
- 카피: "사주가 알고 있는 나의 인연"
- Apple Sign In 버튼 (primary)
- Kakao Login 버튼 (secondary)
- 이용약관 링크

### 2.3 OAuth 설정
- **Kakao**: `scopes: ''` (빈 문자열). Supabase GoTrue가 `account_email`을 기본 scope로 하드코딩하므로, Kakao 비즈니스에서 이메일을 "선택 동의"로 설정 필수
- **Apple/Kakao 데이터 정책**: 소셜 로그인에서 이메일·닉네임·프로필사진 **수집하지 않음**. 모두 온보딩에서 직접 입력

### 2.4 로그인 후 분기
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) → /login

const { data: profile } = await supabase
  .from('profiles')
  .select()
  .eq('auth_id', session.user.id)
  .maybeSingle();

if (!profile) → /onboarding
if (!profile.is_saju_complete) → /onboarding
if (!profile.is_profile_complete) → /matching-profile
else → /home
```

### 2.5 세션 관리
- Supabase Auth 자동 토큰 관리 (access_token 자동 갱신)
- 스플래시에서 `auth.getUser()`로 서버사이드 세션 유효성 검증
- 삭제된 유저의 stale 토큰 감지 → 자동 signOut → 로그인 리다이렉트

---

## 3. 온보딩 15단계

### 3.0 공통 UI 패턴
- **원 퀘스천 퍼 스크린**: 한 화면에 하나의 질문만
- **캐릭터 버블**: 각 단계마다 오행 캐릭터가 말풍선으로 질문
- **프로그레스 바**: 15단계 중 현재 위치 표시 (오행 색상)
- **버튼 동작**: 일부 단계는 선택 시 자동 전진 (300ms 딜레이 + haptic)
- **선택사항 단계**: "건너뛰기" 버튼 표시

### 3.1 Step 0: 이름 입력
| 항목 | 값 |
|------|-----|
| **캐릭터** | 물결이 (Water/水) |
| **프로그레스 색상** | SajuColor.water (파란색) |
| **메시지** | "반가워요! 이름이 어떻게 돼요~?" |
| **입력** | 텍스트 (autofocus) |
| **검증** | 2자 이상, 20자 이하, trim |
| **에러** | "이름은 2자 이상이어야 해요" |
| **전진** | 버튼 클릭 |
| **필수** | ✓ |

### 3.2 Step 1: 성별 선택
| 항목 | 값 |
|------|-----|
| **캐릭터** | 물결이 (Water/水) |
| **메시지** | "{이름}님 반가워요! 성별도 알려주실래요?" |
| **입력** | 단일 선택 칩 2개 |
| **옵션** | `남성` (water색), `여성` (fire색) |
| **전진** | 선택 시 자동 (300ms) |
| **필수** | ✓ |
| **DB 변환** | '남성' → 'male', '여성' → 'female' |

### 3.3 Step 2: 생년월일 선택
| 항목 | 값 |
|------|-----|
| **캐릭터** | 물결이 (Water/水) |
| **메시지** | "태어난 날을 알려주면 사주를 펼쳐볼게요!" |
| **입력** | 날짜 피커 (인라인) |
| **범위** | 1940-01-01 ~ 18년 전 오늘 |
| **기본값** | 2000-01-01 |
| **미리보기** | "YYYY년 MM월 DD일" (애니메이션) |
| **전진** | 버튼 클릭 |
| **필수** | ✓ |
| **DB 포맷** | "YYYY-MM-DD" (ISO 8601) |

### 3.4 Step 3: 생시(시진) 선택
| 항목 | 값 |
|------|-----|
| **캐릭터** | 쇠동이 (Metal/金) |
| **메시지** | "태어난 시간까지 알면 훨씬 정확해져요!\n몰라도 전혀 괜찮아요~" |
| **입력** | 3열 그리드 (12시진) + "모르겠어요" |
| **전진** | 선택 시 자동 (300ms) |
| **필수** | ✗ (모르겠어요 가능) |

**12시진 옵션:**

| 인덱스 | 시진 | 한자 | 시간대 | DB값 |
|--------|------|------|--------|------|
| 0 | 자시 | 子時 | 23:00~01:00 | "00:00" |
| 1 | 축시 | 丑時 | 01:00~03:00 | "02:00" |
| 2 | 인시 | 寅時 | 03:00~05:00 | "04:00" |
| 3 | 묘시 | 卯時 | 05:00~07:00 | "06:00" |
| 4 | 진시 | 辰時 | 07:00~09:00 | "08:00" |
| 5 | 사시 | 巳時 | 09:00~11:00 | "10:00" |
| 6 | 오시 | 午時 | 11:00~13:00 | "12:00" |
| 7 | 미시 | 未時 | 13:00~15:00 | "14:00" |
| 8 | 신시 | 申時 | 15:00~17:00 | "16:00" |
| 9 | 유시 | 酉時 | 17:00~19:00 | "18:00" |
| 10 | 술시 | 戌時 | 19:00~21:00 | "20:00" |
| 11 | 해시 | 亥時 | 21:00~23:00 | "22:00" |

### 3.5 Step 4: SMS 전화번호 인증 (2-Phase)
| 항목 | 값 |
|------|-----|
| **캐릭터** | 흙순이 (Earth/土) |
| **메시지** | "거의 다 왔어요!\n진짜 인연만 만나려면 인증은 필수예요~" |
| **필수** | ✓ |

**Phase 1: 전화번호 입력**
- 입력: 전화번호 필드 (자동 하이픈 포맷)
- 검증: `PhoneUtils.isValidKorean()` — 한국 전화번호 형식
- 중복 체크: `is_phone_verified = true`인 번호와 비교
- 버튼: "인증번호 받기" → Firebase `verifyPhoneNumber()`
- 에러 메시지:
  - 중복: "이미 가입된 번호입니다."
  - 과다 요청: "요청이 너무 많아요. 잠시 후 다시 시도해주세요."
  - 잘못된 번호: "올바른 전화번호를 입력해주세요."

**Phase 2: OTP 코드 입력**
- UI: 전화번호 표시 + "변경" 버튼 → 6자리 OTP 입력 → 타이머(180초) + "재발송"
- 타이머: 3분 카운트다운 ("MM:SS")
- OTP 6자리 완료 시 자동 검증
- 성공 메시지: "완벽해요!\n이제 진짜 인연을 찾을 준비가 됐어요!"
- 만료 메시지: "시간이 지나버렸어요~\n재발송 눌러서 다시 해봐요!"
- 에러 메시지: "앗, 번호가 맞지 않는 것 같아요.\n다시 한 번 확인해봐요~"

**인증 완료 후:**
1. Firebase Phone Auth 로그인 (임시)
2. Supabase profiles에 `phone` (E.164) + `is_phone_verified = true` 저장
3. Firebase signOut
4. 성공 → 다음 단계로

> **웹 구현 시**: Firebase Phone Auth 대신 Supabase Phone Auth 또는 별도 SMS API 사용 검토

### 3.6 Step 5: 프로필 사진 (정면)
| 항목 | 값 |
|------|-----|
| **캐릭터** | 불꼬리 (Fire/火) |
| **메시지** | "얼굴에 숨은 동물상이 궁금하지 않아요?\n셀카 한 장이면 충분해요!" |
| **입력** | 이미지 선택 (갤러리) |
| **설정** | maxWidth: 1024, maxHeight: 1024, quality: 85 |
| **미리보기** | 원형 180×180 |
| **안내** | "정면을 바라본 사진이 가장 정확해요.\nAI가 관상을 분석해 동물상을 알려줄게요!" |
| **전진** | 버튼 클릭 |
| **필수** | ✓ |

### 3.7 Step 6: 키
| 항목 | 값 |
|------|-----|
| **캐릭터** | 나무리 (Wood/木) |
| **메시지** | "키가 어떻게 되세요?" |
| **입력** | 숫자 (cm), 3자리 제한 |
| **검증** | 140 ≤ height ≤ 220 |
| **전진** | 버튼 클릭 |
| **필수** | ✓ |
| **DB 타입** | int |

### 3.8 Step 7: 직업
| 항목 | 값 |
|------|-----|
| **캐릭터** | 나무리 (Wood/木) |
| **메시지** | "어떤 일을 하고 계세요?" |
| **입력** | 텍스트 |
| **placeholder** | "예: 마케터, 개발자, 대학생" |
| **검증** | 비어있지 않음 (trim 후) |
| **전진** | 버튼 클릭 |
| **필수** | ✓ |

### 3.9 Step 8: 활동 지역
| 항목 | 값 |
|------|-----|
| **캐릭터** | 흙순이 (Earth/土) |
| **메시지** | "주로 어디서 활동하세요?" |
| **입력** | 단일 선택 칩 (18개) |
| **전진** | 선택 시 자동 (300ms) |
| **필수** | ✓ |

**18개 지역 옵션:**
서울 강남 / 서울 강북 / 서울 강서 / 서울 강동 / 경기 남부 / 경기 북부 / 인천 / 부산 / 대구 / 대전 / 광주 / 제주도 / 경상도 / 전라도 / 충청도 / 강원도 / 국내 기타 / 해외

### 3.10 Step 9: 체형
| 항목 | 값 |
|------|-----|
| **캐릭터** | 불꼬리 (Fire/火) |
| **메시지** | "체형을 알려주세요!" |
| **입력** | 단일 선택 칩 (4개) |
| **전진** | 선택 시 자동 (300ms) |
| **필수** | ✓ |

**BodyType enum:**
| 값 | 라벨 |
|----|------|
| `slim` | 마른 |
| `average` | 보통 |
| `slightlyChubby` | 살짝 통통 |
| `chubby` | 통통 |

### 3.11 Step 10: 종교
| 항목 | 값 |
|------|-----|
| **캐릭터** | 쇠동이 (Metal/金) |
| **메시지** | "종교가 있으신가요?" |
| **입력** | 단일 선택 칩 (5개) |
| **전진** | 선택 시 자동 (300ms) |
| **필수** | ✓ |

**Religion enum:**
| 값 | 라벨 |
|----|------|
| `none` | 무교 |
| `christian` | 기독교 |
| `catholic` | 천주교 |
| `buddhist` | 불교 |
| `other` | 기타 |

### 3.12 Step 11: 자기소개 (선택)
| 항목 | 값 |
|------|-----|
| **캐릭터** | 물결이 (Water/水) |
| **메시지** | "자기소개를 적어주세요!\n건너뛰어도 괜찮아요~" |
| **입력** | 멀티라인 텍스트 (5줄) |
| **제한** | 300자 (maxBioLength) |
| **카운터** | "{length}/300" — 270자 초과 시 빨간색 |
| **전진** | 버튼 클릭 또는 건너뛰기 |
| **필수** | ✗ |

### 3.13 Step 12: 관심사 (선택)
| 항목 | 값 |
|------|-----|
| **캐릭터** | 나무리 (Wood/木) |
| **메시지** | "관심사를 골라주세요!\n건너뛰어도 돼요~" |
| **입력** | 다중 선택 칩 (프리셋 12개) + 직접 입력 |
| **최대** | 10개 |
| **전진** | 버튼 클릭 또는 건너뛰기 |
| **필수** | ✗ |

**프리셋 관심사 (12개):**
여행 / 음악 / 영화 / 운동 / 독서 / 요리 / 사진 / 게임 / 반려동물 / 카페 / 맛집 / 드라이브

**직접 입력:**
- 텍스트 필드 (20자 제한) + "추가" 버튼
- 커스텀 관심사는 삭제 가능 칩으로 표시
- 카운터: "{selected}/{max}개 선택" (최대치 도달 시 빨간색)

### 3.14 Step 13: 이상형 (선택)
| 항목 | 값 |
|------|-----|
| **캐릭터** | 불꼬리 (Fire/火) |
| **메시지** | "어떤 사람을 만나고 싶어요?\n건너뛰어도 돼요~" |
| **입력** | 멀티라인 텍스트 (3줄) |
| **제한** | 200자 |
| **카운터** | "{length}/200" — 180자 초과 시 빨간색 |
| **전진** | 버튼 클릭 또는 건너뛰기 |
| **필수** | ✗ |

### 3.15 Step 14: 확인 (요약)
| 항목 | 값 |
|------|-----|
| **캐릭터** | 물결이 (Water/水) |
| **메시지** | "좋아요! 이제 조상님의 지혜를 빌려볼게요~" |
| **입력** | 읽기 전용 요약 카드 |
| **전진** | "운명 분석하기" 버튼 (별 아이콘) |

**요약 카드 행 (순서):**

| 아이콘 | 라벨 | 표시값 | 편집 대상 |
|--------|------|--------|-----------|
| person | 이름 | 입력값 | Step 0 |
| wc | 성별 | 입력값 | Step 1 |
| cake | 생년월일 | YYYY년 MM월 DD일 | Step 2 |
| access_time | 생시 | 시진명 (시간대) 또는 "모르겠어요" | Step 3 |
| phone_android | 전화번호 | {phone} (인증완료) 또는 "미인증" | Step 4 |
| photo | 사진 | 32×32 원형 썸네일 | Step 5 |
| straighten | 키 | {height}cm | Step 6 |
| work_outline | 직업 | 입력값 | Step 7 |
| location_on | 활동지역 | 입력값 | Step 8 |
| accessibility_new | 체형 | BodyType.label | Step 9 |
| favorite_border | 종교 | Religion.label | Step 10 |
| edit_note | 자기소개 | 20자 잘림 (조건부) | Step 11 |
| interests | 관심사 | "tag1, tag2 외 N개" (조건부) | Step 12 |
| favorite | 이상형 | 20자 잘림 (조건부) | Step 13 |

각 행 탭 → 해당 단계로 이동하여 수정 가능

### 온보딩 단계별 캐릭터 배정

| Step | 캐릭터 | 오행 | 색상 |
|------|--------|------|------|
| 0-2 | 물결이 | Water | 파란색 |
| 3 | 쇠동이 | Metal | 금색 |
| 4 | 흙순이 | Earth | 갈색 |
| 5 | 불꼬리 | Fire | 빨간색 |
| 6-7 | 나무리 | Wood | 초록색 |
| 8 | 흙순이 | Earth | 갈색 |
| 9 | 불꼬리 | Fire | 빨간색 |
| 10 | 쇠동이 | Metal | 금색 |
| 11 | 물결이 | Water | 파란색 |
| 12 | 나무리 | Wood | 초록색 |
| 13 | 불꼬리 | Fire | 빨간색 |
| 14 | 물결이 | Water | 파란색 |

### 2-Phase 저장

**Phase A: `createProfile()` — INSERT**
```typescript
const profileData = {
  auth_id: session.user.id,
  name: formData.name,
  gender: formData.gender === '남성' ? 'male' : 'female',
  birth_date: formData.birthDate,  // "YYYY-MM-DD"
  birth_time: formData.birthTime,  // "HH:MM" or null
  phone: formData.phone,           // E.164 format or null
  is_phone_verified: formData.isPhoneVerified,
};

await supabase
  .from('profiles')
  .upsert(profileData, { onConflict: 'auth_id' })
  .select()
  .single();
```

**사진 업로드 (Phase A-B 사이)**
```typescript
const storagePath = `${authId}/profile_0.${ext}`;
await supabase.storage
  .from('profile-images')
  .upload(storagePath, file, { upsert: true });

const { data: { publicUrl } } = supabase.storage
  .from('profile-images')
  .getPublicUrl(storagePath);
```

**Phase B: `completeMatchingProfile()` — UPDATE**
```typescript
const updates = {
  profile_images: [publicUrl],
  height: formData.height,           // int
  occupation: formData.occupation,
  location: formData.location,
  bio: formData.bio || null,
  interests: formData.interests || [],
  body_type: formData.bodyType,      // enum.name
  religion: formData.religion,       // enum.name
  ideal_type: formData.idealType || null,
  is_profile_complete: true,
};

await supabase
  .from('profiles')
  .update(updates)
  .eq('auth_id', session.user.id)
  .select()
  .single();
```

---

## 4. 운명 분석 (Destiny Analysis)

### 4.1 로딩 페이지 UI
- **배경**: 다크 테마
- **로딩 스피너**: `loading_spinner.gif` (160×160)
- **단계 인디케이터**: 8개 점 (활성 점은 너비 확장 애니메이션)
- **메인 텍스트**: 2줄 (제목 + 부제목), 페이드 애니메이션
- **프로그레스 바**: 퍼센트 + 얇은 선형 바
- **총 시간**: ~16초 (8단계 × 2초)

### 4.2 로딩 텍스트 8단계

| 단계 | 제목 | 부제목 |
|------|------|--------|
| 1 | 사주팔자를 한 자 한 자 풀고 있어요 | 4,000년 된 비밀 노트를 꺼내는 중... |
| 2 | 목·화·토·금·수, 어디에 힘이 실렸을까요? | 오행의 균형을 저울질하고 있어요 |
| 3 | 올해 운세와 연애운도 살펴보는 중! | 초년·중년·말년까지 꼼꼼하게요 |
| 4 | 얼굴에서 복(福)의 기운을 찾고 있어요 | 조상님이 물려주신 복을 읽는 중이에요 |
| 5 | 숨어있던 동물상이 슬슬 보여요...! | 여우? 곰? 고양이? 두근두근... |
| 6 | 드디어 퍼즐이 맞춰지고 있어요! | 사주 × 관상, 운명의 그림이 완성돼요 |
| 7 | 아주 조금만 더요...! | 정성스럽게 마무리하고 있어요 |
| 8 | 진짜 거의 다 됐어요! | 엄청난 사주가 모아지고 있어요! 기대해도 좋아요 ✨ |

### 4.3 분석 처리 순서

```
1. 사주 계산 (calculate-saju)
   ↓
2. 사주 AI 해석 (generate-saju-insight) — 만세력 결과 필요
   ↓
3. [병렬 실행]
   ├─ 관상 분석 (generate-gwansang-reading) — await
   ├─ 궁합 일괄 계산 (batch-calculate-compatibility) — fire & forget
   └─ 일일 추천 생성 (generate-daily-recommendations) — fire & forget
   ↓
4. 결과 페이지로 이동
```

### 4.4 에러 처리
- 사주 실패 → 전체 중단, 에러 UI + 재시도 버튼
- 관상 실패 → 관상탭 비활성화, 사주 결과만 표시
- 궁합/추천 실패 → 무시 (비동기 백그라운드)

---

## 5. 결과 페이지 (Destiny Result)

### 5.1 전체 레이아웃

```
┌─────────────────────────────────────┐
│ ← 뒤로가기                          │
├─────────────────────────────────────┤
│ Hero Section                         │
│ - 캐릭터 원형 (96×96)               │
│ - 동물상 배지 (우측 하단, 48×48)    │
│ - 이름 + 뱃지                       │
│ - 사주 한줄 요약                    │
├─────────────────────────────────────┤
│ [사주] [관상]  ← 탭바 (sticky)      │
├─────────────────────────────────────┤
│ 탭 콘텐츠 (스크롤)                  │
├─────────────────────────────────────┤
│ CTA: "내 사주와 찰떡인 사람,        │
│       만나볼까요?"                   │
└─────────────────────────────────────┘
```

### 5.2 사주 탭 콘텐츠

1. **캐릭터 인사 버블** — 캐릭터 이미지 + 말풍선 (characterGreeting)
2. **사주 4기둥 카드** — 연주/월주/일주/시주 각각 천간+지지 표시
3. **오행 분포 차트** — 도넛 차트 (목/화/토/금/수 비율)
4. **성격 특성 칩** — personalityTraits 배열을 칩으로 표시
5. **AI 사주 해석** — interpretation 텍스트 (카드)
6. **올해 운세** — year, yearPillar, summary, 좋은 달/조심할 달
7. **시기별 운세** — 초년/중년/말년 각각 연애/사업/직장/건강/금전운
8. **연애 스타일** — romanceStyle 텍스트
9. **연애 핵심 포인트** — romanceKeyPoints 배열
10. **이상형 사주** — element, dayStem, traits, description

### 5.3 관상 탭 콘텐츠

1. **동물상 히어로** — "나른한 고양이상" (animalModifier + animalTypeKorean)
2. **헤드라인** — headline 텍스트
3. **매력 키워드** — charmKeywords 칩 (중앙정렬)
4. **삼정(三停) 운세** — 상정(초년)/중정(중년)/하정(말년)
5. **오관(五官) 해석** — 눈/코/입/귀/눈썹 각각
6. **성격 요약** — personalitySummary
7. **연애 스타일** — romanceSummary
8. **연애 핵심 포인트** — romanceKeyPoints
9. **성격 특성 5축** — 프로그레스 바 (0-100)
   - leadership (리더십)
   - warmth (온화함)
   - independence (독립성)
   - sensitivity (감성)
   - energy (에너지)
10. **이상형 관상** — idealMatchAnimal + traits + description

### 5.4 Bottom CTA
- 버튼: "내 사주와 찰떡인 사람, 만나볼까요?"
- 아이콘: ♥ (favorite)
- 이동: `/post-analysis-matches` (매칭 추천 페이지)

---

## 6. Supabase 스키마

### 6.1 profiles (유저 기본 정보)
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  birth_date date NOT NULL,
  birth_time time,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  profile_images text[] DEFAULT '{}',
  bio text,
  interests text[] DEFAULT '{}',
  height int,
  location text,
  occupation text,
  body_type text CHECK (body_type IN ('slim', 'average', 'slightlyChubby', 'chubby')),
  ideal_type text,
  mbti text,
  drinking text CHECK (drinking IN ('none', 'sometimes', 'often')),
  smoking text CHECK (smoking IN ('nonSmoker', 'smoker', 'eCigarette')),
  religion text CHECK (religion IN ('none', 'christian', 'catholic', 'buddhist', 'other')),
  dating_style text,
  saju_profile_id uuid REFERENCES public.saju_profiles(id) ON DELETE SET NULL,
  dominant_element text CHECK (dominant_element IN ('wood', 'fire', 'earth', 'metal', 'water')),
  character_type text CHECK (character_type IN ('namuri', 'bulkkori', 'heuksuni', 'soedongi', 'mulgyeori')),
  gwansang_profile_id uuid REFERENCES public.gwansang_profiles(id) ON DELETE SET NULL,
  animal_type text,
  is_saju_complete boolean NOT NULL DEFAULT false,
  is_gwansang_complete boolean NOT NULL DEFAULT false,
  is_profile_complete boolean NOT NULL DEFAULT false,
  is_matchable boolean NOT NULL DEFAULT false,
  is_phone_verified boolean NOT NULL DEFAULT false,
  is_selfie_verified boolean NOT NULL DEFAULT false,
  push_enabled boolean DEFAULT true,
  point_balance int NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 전화번호 부분 유니크 인덱스 (인증 완료된 번호만)
CREATE UNIQUE INDEX idx_profiles_phone_unique
  ON public.profiles(phone)
  WHERE phone IS NOT NULL AND is_phone_verified = true;
```

### 6.2 saju_profiles (사주 분석 결과)
```sql
CREATE TABLE public.saju_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year_pillar jsonb NOT NULL,    -- {"stem": "갑", "branch": "자"}
  month_pillar jsonb NOT NULL,
  day_pillar jsonb NOT NULL,
  hour_pillar jsonb,             -- nullable (시간 모를 때)
  five_elements jsonb NOT NULL,  -- {"wood": 2, "fire": 1, ...}
  dominant_element text NOT NULL,
  personality_traits text[] DEFAULT '{}',
  ai_interpretation text,
  is_lunar_calendar boolean NOT NULL DEFAULT false,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  ideal_match jsonb,
  romance_style text,
  romance_key_points text[] NOT NULL DEFAULT '{}',
  period_fortunes jsonb,        -- {"earlyYears": {...}, "middleYears": {...}, ...}
  yearly_fortune jsonb          -- {"year": 2026, "yearPillar": "병오", ...}
);
```

### 6.3 gwansang_profiles (관상 분석)
```sql
CREATE TABLE public.gwansang_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  animal_type text NOT NULL,
  animal_type_korean text NOT NULL DEFAULT '',
  animal_modifier text NOT NULL DEFAULT '',
  face_measurements jsonb NOT NULL DEFAULT '{}',
  samjeong jsonb NOT NULL DEFAULT '{}',     -- {"upper": "...", "middle": "...", "lower": "..."}
  ogwan jsonb NOT NULL DEFAULT '{}',        -- {"eyes": "...", "nose": "...", ...}
  traits jsonb NOT NULL DEFAULT '{}',       -- {"leadership": 65, "warmth": 78, ...}
  photo_urls text[] NOT NULL DEFAULT '{}',
  headline text NOT NULL DEFAULT '',
  personality_summary text NOT NULL DEFAULT '',
  romance_summary text NOT NULL DEFAULT '',
  romance_key_points text[] NOT NULL DEFAULT '{}',
  charm_keywords text[] NOT NULL DEFAULT '{}',
  saju_synergy text NOT NULL DEFAULT '',
  detailed_reading text,
  ideal_match_animal text,
  ideal_match_animal_korean text,
  ideal_match_traits text[],
  ideal_match_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 6.4 saju_compatibility (궁합 캐시)
```sql
CREATE TABLE public.saju_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score int NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  five_element_score int,
  day_pillar_score int,
  overall_analysis text,
  strengths text[] DEFAULT '{}',
  challenges text[] DEFAULT '{}',
  advice text,
  ai_story text,
  is_detailed boolean NOT NULL DEFAULT false,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);
```

### 6.5 daily_matches (매일 추천)
```sql
CREATE TABLE public.daily_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommended_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compatibility_id uuid REFERENCES public.saju_compatibility(id) ON DELETE SET NULL,
  match_date date NOT NULL DEFAULT current_date,
  section text NOT NULL DEFAULT 'compatibility'
    CHECK (section IN ('destiny', 'compatibility', 'gwansang', 'new')),
  is_viewed boolean NOT NULL DEFAULT false,
  photo_revealed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, recommended_id, match_date)
);
```

### 6.6 likes (좋아요)
```sql
CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(sender_id, receiver_id)
);
```

### 6.7 matches (매칭 성사)
```sql
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  like_id uuid REFERENCES public.likes(id) ON DELETE SET NULL,
  compatibility_id uuid REFERENCES public.saju_compatibility(id) ON DELETE SET NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  unmatched_at timestamptz
);
```

### 6.8 chat_rooms & chat_messages
```sql
CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'icebreaker', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 6.9 기타 테이블

```sql
-- 포인트
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,  -- 'purchase', 'like_sent', 'photo_reveal', etc.
  amount int NOT NULL,
  target_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 일일 사용량
CREATE TABLE public.daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT current_date,
  free_likes_used int NOT NULL DEFAULT 0,
  free_accepts_used int NOT NULL DEFAULT 0,
  free_photo_reveals_used int NOT NULL DEFAULT 0,
  UNIQUE(user_id, usage_date)
);

-- 사용자 액션 로그
CREATE TABLE public.user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,  -- 'photo_reveal', 'like', 'premium_like', 'pass'
  points_spent int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 차단 & 신고
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 6.10 주요 DB 트리거

| 트리거 | 테이블 | 동작 |
|--------|--------|------|
| `fn_update_saju_complete` | profiles | saju_profile_id 연결 시 `is_saju_complete = true` |
| `fn_update_matchable` | profiles | 모든 필수 필드 완료 시 `is_matchable = true` |
| `fn_update_gwansang_complete` | gwansang_profiles | `is_gwansang_complete = true` + animal_type 동기화 |
| `fn_sync_profile_to_auth` | profiles | name → auth.users.display_name, phone → auth.users.phone |

### 6.11 Storage 버킷

| 버킷 | Public | 용도 |
|-------|--------|------|
| `profile-images` | ✓ | 유저 프로필 사진 |
| `chat-images` | ✗ | 채팅 이미지 |
| `saju-cards` | ✓ | 사주 공유 카드 |

폴더 구조: `{bucket}/{auth.uid()}/{filename}`

---

## 7. Edge Function API

### 7.1 calculate-saju (만세력 계산)

```
POST /functions/v1/calculate-saju

Request:
{
  "birthDate": "1995-03-15",    // ISO 8601 (필수)
  "birthTime": "14:30",         // HH:mm (선택)
  "isLunar": false              // 음력 여부 (필수)
}

Response:
{
  "yearPillar": { "stem": "갑", "branch": "자" },
  "monthPillar": { "stem": "을", "branch": "축" },
  "dayPillar": { "stem": "병", "branch": "인" },
  "hourPillar": { "stem": "정", "branch": "묘" },  // null if no birthTime
  "fiveElements": { "wood": 2, "fire": 1, "earth": 2, "metal": 1, "water": 2 },
  "dominantElement": "wood",
  "birthDate": "1995-03-15",
  "birthTime": "14:30",
  "isLunar": false
}
```

### 7.2 generate-saju-insight (사주 AI 해석)

```
POST /functions/v1/generate-saju-insight

Request:
{
  "sajuResult": { /* calculate-saju 응답 전체 */ },
  "userName": "홍길동"
}

Response:
{
  "personalityTraits": ["직관적", "감성적", "리더십"],
  "interpretation": "당신의 사주는...",
  "characterName": "나무리",
  "characterElement": "wood",
  "characterGreeting": "안녕! 나는 나무리야. 너의 성장하는 기운이 느껴져!",
  "romanceStyle": "따뜻하고 감정을 잘 표현하는...",
  "romanceKeyPoints": ["배우자와 깊은 정서적 유대", "공동의 미래 설계"],
  "periodFortunes": {
    "earlyYears": {
      "romance": "...", "business": "...", "career": "...",
      "health": "...", "wealth": "..."
    },
    "middleYears": { /* 동일 구조 */ },
    "laterYears": { /* 동일 구조 */ }
  },
  "yearlyFortune": {
    "year": 2026,
    "yearPillar": "병오",
    "summary": "올해는...",
    "goodMonths": [1, 3, 5],
    "cautionMonths": [7, 9]
  },
  "idealMatch": {
    "element": "earth",
    "dayStem": "기",
    "dayStemHanja": "己",
    "traits": ["안정적", "따뜻함"],
    "description": "당신과 잘 맞는 이상형은..."
  }
}
```

### 7.3 generate-gwansang-reading (관상 분석)

```
POST /functions/v1/generate-gwansang-reading

Request:
{
  "photoUrl": "https://...",     // Storage 공개 URL (필수)
  "sajuData": {                  // 참고용 (관상 프롬프트에 직접 포함 금지!)
    "dominant_element": "wood",
    "day_stem": "갑",
    "personality_traits": ["직관적", "감성적"]
  },
  "gender": "여성",
  "age": 28
}

Response:
{
  "animal_type": "cat",
  "animal_modifier": "나른한",
  "animal_type_korean": "고양이",
  "headline": "감성적이고 사색적인 기질...",
  "samjeong": {
    "upper": "초년운(상정): ...",
    "middle": "중년운(중정): ...",
    "lower": "말년운(하정): ..."
  },
  "ogwan": {
    "eyes": "눈은...", "nose": "코는...", "mouth": "입은...",
    "ears": "귀는...", "eyebrows": "눈썹은..."
  },
  "traits": {
    "leadership": 65, "warmth": 78, "independence": 52,
    "sensitivity": 85, "energy": 60
  },
  "personality_summary": "당신의 관상은...",
  "romance_summary": "연애에 있어서는...",
  "romance_key_points": ["감정 표현을 잘함", "상대방 배려"],
  "charm_keywords": ["따뜻함", "지성", "섬세함"],
  "ideal_match_animal": "dog",
  "ideal_match_animal_korean": "강아지",
  "ideal_match_traits": ["충실함", "활발함"],
  "ideal_match_description": "당신과 어울리는 관상은..."
}
```

> **주의**: 관상 프롬프트에 사주/오행 데이터를 **절대 전달하지 말 것**. 동물상 선택이 편향됨.

### 7.4 batch-calculate-compatibility (궁합 일괄 계산)

```
POST /functions/v1/batch-calculate-compatibility
Request: { "userId": "profiles.id" }
Response: null (비동기, fire & forget)
```

### 7.5 generate-daily-recommendations (일일 추천)

```
POST /functions/v1/generate-daily-recommendations
Request: { "userId": "profiles.id", "isInitial": true }
Response: null (비동기, daily_matches 테이블에 삽입)
```

### 배포 규칙
모든 Edge Function은 반드시 `--no-verify-jwt`로 배포:
```bash
supabase functions deploy [function-name] --no-verify-jwt
```
이유: Supabase 유저 JWT는 ES256 알고리즘이지만, Edge Function 기본 검증기는 HS256만 지원

---

## 8. 캐릭터 에셋 시스템

### 8.1 캐릭터 목록

| 캐릭터 | 폴더명 | 오행 | 한글명 | 파일 수 |
|--------|--------|------|--------|---------|
| 나무리 | `namuri` | 목(Wood) | 나무리 | 11 |
| 나무리 여 | `namuri_girlfriend` | (여성 변형) | 나무리 여 | 12 |
| 불꼬리 | `bulkkori` | 화(Fire) | 불꼬리 | 7 |
| 흙순이 | `heuksuni` | 토(Earth) | 흙순이 | 16 |
| 쇠동이 | `soedongi` | 금(Metal) | 쇠동이 | 13 |
| 물결이 | `mulgyeori` | 수(Water) | 물결이 | 12 |
| 황금토끼 | `gold_tokki` | (특수) | 황금토끼 | 18 |
| 검은토끼 | `black_tokki` | (특수) | 검은토끼 | 12 |

### 8.2 에셋 폴더 구조

```
public/images/characters/
├── {character}/
│   ├── default.png              ← 기본 이미지
│   ├── expressions/             ← 표정
│   │   ├── default.png
│   │   ├── laugh.png
│   │   ├── love.png
│   │   ├── sad.png
│   │   ├── surprised.png
│   │   └── angry.png (일부만)
│   ├── poses/                   ← 포즈
│   │   ├── sitting.png
│   │   ├── standing.png
│   │   └── waving.png
│   └── views/                   ← 시점
│       ├── back.png
│       ├── front.png
│       └── side.png
```

> **참고**: `bulkkori`(불꼬리)는 expressions 폴더가 없음 (poses + views만)

### 8.3 오행 → 캐릭터 매핑

```typescript
const ELEMENT_TO_CHARACTER: Record<string, string> = {
  wood: 'namuri',     // 나무리 (목)
  fire: 'bulkkori',   // 불꼬리 (화)
  earth: 'heuksuni',  // 흙순이 (토)
  metal: 'soedongi',  // 쇠동이 (금)
  water: 'mulgyeori', // 물결이 (수)
};

const ELEMENT_TO_NAME: Record<string, string> = {
  wood: '나무리',
  fire: '불꼬리',
  earth: '흙순이',
  metal: '쇠동이',
  water: '물결이',
};

function getCharacterPath(element: string, variant: string = 'default') {
  const character = ELEMENT_TO_CHARACTER[element];
  if (variant === 'default') return `/images/characters/${character}/default.png`;
  return `/images/characters/${character}/${variant}`;
}
```

### 8.4 오행 색상 매핑

```typescript
const ELEMENT_COLORS = {
  wood: { primary: '#4CAF50', pastel: '#E8F5E9', label: '목(木)' },
  fire: { primary: '#FF5722', pastel: '#FBE9E7', label: '화(火)' },
  earth: { primary: '#795548', pastel: '#EFEBE9', label: '토(土)' },
  metal: { primary: '#FFC107', pastel: '#FFF8E1', label: '금(金)' },
  water: { primary: '#2196F3', pastel: '#E3F2FD', label: '수(水)' },
};
```

### 8.5 오행 유형 정의

```typescript
const FIVE_ELEMENT_TYPES = {
  wood: { korean: '목', hanja: '木', meaning: '나무' },
  fire: { korean: '화', hanja: '火', meaning: '불' },
  earth: { korean: '토', hanja: '土', meaning: '흙' },
  metal: { korean: '금', hanja: '金', meaning: '쇠' },
  water: { korean: '수', hanja: '水', meaning: '물' },
};

// 천간(天干) → 오행
const HEAVENLY_STEMS = {
  '갑': 'wood', '을': 'wood',
  '병': 'fire', '정': 'fire',
  '무': 'earth', '기': 'earth',
  '경': 'metal', '신': 'metal',
  '임': 'water', '계': 'water',
};

// 상생 관계: 목→화→토→금→수→목
// 상극 관계: 목→토→수→화→금→목
```

---

## 9. 비즈니스 상수 & 제한

### 일일 무료 한도
| 항목 | 한도 |
|------|------|
| 좋아요 | 3회/일 |
| 수락 | 3회/일 |
| 사진 열람 | 3회/일 |

### 포인트 비용
| 액션 | 비용 |
|------|------|
| 좋아요 | 50P |
| 프리미엄 좋아요 | 100P |
| 수락 | 100P |
| 사진 열람 (무료 소진 후) | 30P |
| 상세 궁합 리포트 | 500P |
| 사주 상세 리포트 | 500P |

### 프로필 제한
| 항목 | 값 |
|------|-----|
| 최대 사진 | 5장 |
| 최소 사진 | 1장 |
| 자기소개 최대 | 300자 |
| 이름 최대 | 20자 |
| 관심사 최대 | 10개 |
| 최소 나이 | 18세 |
| 최대 나이 | 60세 |

### daily_matches 섹션
| 섹션 | 설명 |
|------|------|
| `destiny` | 운명적 매칭 (최고 궁합) |
| `compatibility` | 궁합 기반 추천 |
| `gwansang` | 관상 매칭 (동물상 상보성) |
| `new` | 신규 가입자 |

---

## 10. 구현 시 주의사항

### Auth
- Supabase 유저 JWT는 **ES256** 알고리즘 → Node.js 라이브러리 설정 확인
- `auth_id` (auth.users.id) ≠ `profiles.id` — 혼동 금지
- `profiles.id`를 사주/매칭/궁합에 사용, `auth_id`는 인증 확인용만

### 데이터 동기화
- profiles → auth.users 동기화는 **DB 트리거**로 처리 (클라이언트에서 `auth.updateUser()` 직접 호출 금지)
- `auth.updateUser()`는 별도 try-catch 필수, 실패해도 주 로직 블로킹 금지

### FK 위반 처리
- FK 위반 (23503) + `auth_id` 관련 → stale 세션으로 판단 → signOut + 로그인 리다이렉트
- 중복 전화번호 (23505) → "이미 가입된 번호입니다" 안내

### 관상 분석
- 관상 프롬프트에 사주/오행 데이터 **절대 전달 금지** → 동물상 선택 편향 유발
- `photoUrl`은 반드시 Storage URL (public) — 로컬 파일 경로 사용 금지
- Claude 모델 ID: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

### 사진
- 유저 사진은 `profile-images` 버킷(PUBLIC)에만 저장
- 폴더 구조: `{auth.uid()}/profile_0.{ext}`
- 분석 feature는 결과 데이터만 별도 저장

### 1인1계정 정책
- `enable_manual_linking=true` (이메일 자동 병합 차단)
- `profiles.phone` partial unique index로 중복 방지
- 중복 시 토스트 안내 + 로그인 화면 유지

### Matchability 조건
프로필이 매칭 대상이 되려면 (자동 트리거 계산):
- `is_saju_complete = true`
- `is_profile_complete = true`
- `profile_images` 길이 ≥ 2
- `occupation`, `location`, `height`, `bio` 모두 non-null
- `deleted_at IS NULL`

### Realtime
- `chat_messages`와 `likes` 테이블만 Supabase Realtime 구독

---

## Appendix: Supabase 테이블 상수 (코드용)

```typescript
export const TABLES = {
  profiles: 'profiles',
  sajuProfiles: 'saju_profiles',
  gwansangProfiles: 'gwansang_profiles',
  sajuCompatibility: 'saju_compatibility',
  dailyMatches: 'daily_matches',
  likes: 'likes',
  matches: 'matches',
  chatRooms: 'chat_rooms',
  chatMessages: 'chat_messages',
  pointTransactions: 'point_transactions',
  dailyUsage: 'daily_usage',
  userActions: 'user_actions',
  blocks: 'blocks',
  reports: 'reports',
  purchases: 'purchases',
  characterItems: 'character_items',
  blockedPhoneHashes: 'blocked_phone_hashes',
} as const;

export const STORAGE_BUCKETS = {
  profileImages: 'profile-images',
  chatImages: 'chat-images',
  sajuCards: 'saju-cards',
} as const;

export const EDGE_FUNCTIONS = {
  calculateSaju: 'calculate-saju',
  generateSajuInsight: 'generate-saju-insight',
  generateGwansangReading: 'generate-gwansang-reading',
  calculateCompatibility: 'calculate-compatibility',
  batchCalculateCompatibility: 'batch-calculate-compatibility',
  generateDailyRecommendations: 'generate-daily-recommendations',
  generateMatchStory: 'generate-match-story',
} as const;
```
