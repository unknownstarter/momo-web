# 이벤트 텍소노미 (GA4)

> **네이밍 규칙**: `{action}_{target}_in_{location}` 또는 `{action}_{target}`
> **접두사**: `view_` (노출), `click_` (클릭/탭), `start_` (시작), `complete_` (완료), `share_` (공유)
> **모든 이벤트명**: snake_case

---

## 랜딩 (`/`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_main` | 랜딩 페이지 노출 |
| `click_cta_in_main` | 메인 CTA "내 이상형 알아보기" 클릭 |
| `view_login_bottomsheet` | 로그인 바텀시트 노출 |
| `start_login` | 카카오 로그인 버튼 클릭 (리다이렉트 직전) |

---

## 온보딩 (`/onboarding`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_onboarding_name` | step 0 이름 노출 |
| `click_next_in_onboarding_name` | step 0 다음 클릭 |
| `view_onboarding_gender` | step 1 성별 노출 |
| `click_next_in_onboarding_gender` | step 1 성별 선택 (자동 진행) |
| `view_onboarding_birth` | step 2 생년월일 노출 |
| `click_next_in_onboarding_birth` | step 2 다음 클릭 |
| `view_onboarding_birth_time` | step 3 시진 노출 |
| `click_next_in_onboarding_birth_time` | step 3 시진 선택/다음 클릭 |
| `view_onboarding_photo` | step 4 사진 노출 |
| `click_next_in_onboarding_photo` | step 4 사진 업로드 완료 |
| `view_onboarding_confirm` | 확인 화면 노출 |
| `click_start_analysis` | "분석 시작" 클릭 |

---

## 분석 로딩 (`/result/loading`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_analysis_loading` | 로딩 페이지 노출 |
| `complete_analysis` | 분석 완료 → 결과 페이지 이동 |

---

## 매칭 메인 (`/result`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_matching_main` | 매칭 메인 페이지 노출 |
| `click_saju_detail` | "사주 자세히 보기" 클릭 |
| `click_gwansang_detail` | "관상 자세히 보기" 클릭 |
| `click_matching_register` | "매칭 사전 신청하기" CTA 클릭 |
| `click_share_in_matching` | "친구에게 공유하기" CTA 클릭 |
| `click_compat_list` | "궁합 결과 보기" 카드 클릭 |
| `click_compat_share` | "친구와 궁합 보기" (공유) 클릭 |

---

## 사주/관상 상세 (`/result/detail`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_result_detail` | 상세 페이지 노출 |
| `click_tab_saju` | 사주 탭 클릭 |
| `click_tab_gwansang` | 관상 탭 클릭 |
| `click_share_in_detail` | "친구에게 공유하기" 클릭 |
| `click_back_to_matching` | "이상형 매칭 보러가기" 클릭 |

---

## 궁합 (`/result/compat`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_compat` | 궁합 페이지 노출 |
| `view_compat_detail` | 궁합 상세 바텀시트 열림 (파라미터: score) |
| `share_compat_result` | 궁합 결과 공유 클릭 |

---

## 전화번호 등록 (`/complete`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_phone_register` | 전화번호 등록 페이지 노출 |
| `click_submit_phone` | "알림 받기" / 전화번호 제출 클릭 |
| `complete_phone_register` | 전화번호 저장 완료 |

---

## 공유 티저 (`/share/[id]`, `/s/[code]`)

| 이벤트명 | 트리거 |
|---------|--------|
| `view_share_teaser` | 공유 티저 페이지 노출 |
| `click_detail_in_teaser` | 상세 사주/관상 보기 클릭 |
| `click_cta_in_teaser` | "나도 사주·관상 보러가기" CTA 클릭 |
| `view_compat_prompt` | 궁합 바텀시트 노출 (2초 후) |
| `click_compat_cta_in_prompt` | "궁합 보기" CTA 클릭 |
