# momo-web 변경 이력

> 프로덕트·UI·플로우 변경을 날짜별로 기록합니다.

---

## 2026-04-10 ~ 2026-04-11

### 결제 플로우 + 유료 상세 콘텐츠 (마일스톤)

**마일스톤 문서**: [`docs/milestones/2026-04-11-payment-paid-content/`](./milestones/2026-04-11-payment-paid-content/README.md)

#### 1단계: 결제 인프라 (2026-04-10)
- **PR**: [#44](https://github.com/unknownstarter/momo-web/pull/44), [#45](https://github.com/unknownstarter/momo-web/pull/45), [#46](https://github.com/unknownstarter/momo-web/pull/46), [#47](https://github.com/unknownstarter/momo-web/pull/47)
- 포트원/이니시스 → **토스페이먼츠 결제위젯 SDK v2** 전환
- `payment_history_web` 신규 테이블 (웹 전용)
- `/checkout` 페이지 (서버 셸 + 토스 위젯 임베드)
- 결제 승인 API (원자적 잠금 + DB 금액 검증)
- `/payment-history` 결제 내역 페이지
- `ResultMenu`를 `/result`에도 추가 + "결제 내역" 메뉴
- 테스트 계정 화이트리스트에서만 결제 활성화

#### 2단계: 유료 상세 콘텐츠 (2026-04-11)
- **PR**: [#48](https://github.com/unknownstarter/momo-web/pull/48)
- `paid_content` 신규 테이블 (앱+웹 공용, JSONB)
- Edge Function 2개 신규 (`generate-paid-saju`, `generate-paid-gwansang`, Claude Haiku 4.5)
- `/paid/[productId]` 열람 페이지 (서버 셸 + 클라이언트 뷰어 + 폴링)
- 로딩 연출 (라이트 스켈레톤 + 단계 메시지 + 진행 바)
- 섹션 카드 + 월별 운세 컴포넌트 (가로 스크롤 탭)
- product_id 마이그레이션: `saju-detail` → `paid_saju`, `gwansang-detail` → `paid_gwansang`
- 해금 기준: `paid_content` row 존재 (결제 수단 무관, 앱+웹 공용)

#### 상품 정의
| product_id | 상품명 | 가격 | 내용 |
|-----------|--------|------|------|
| `paid_saju` | 더 자세한 사주 보기 | 500원 | 13개 영역 심층 분석 + 월별 운세 |
| `paid_gwansang` | 더 자세한 관상 보기 | 500원 | 13개 영역 관상 심층 분석 |

#### 비용 / 마진
- Claude Haiku 4.5 기준: paid_saju 원가 ~86원, paid_gwansang 원가 ~57원
- PG 수수료 17원 (3.5%)
- **마진 79~85%**

#### 앱 팀 전달
- [앱 연동 가이드](./handoff/2026-04-11-paid-content-integration.md) 작성 완료

---

## 2026-04-04

### 온보딩 퍼널 트래킹 + 미성년자 제한

#### 퍼널 트래킹
- **온보딩 전 스텝(0~13) GA4 이벤트 트래킹 추가**: 기존에는 Step 0(이름)만 트래킹되어 이탈 지점 파악 불가 → 전 스텝 `view_onboarding_{step}` / `click_next_in_onboarding_{step}` 이벤트 발화
- 이벤트 텍소노미 문서(`docs/event-taxonomy.md`) 업데이트

#### 미성년자 이용 제한
- **생년월일 선택 시 한국 나이 20세 미만 제한**: 연도 휠 피커 상한을 `currentYear - 19`로 제한 (2026년 기준 2007년생까지)
- 생년월일 선택 화면에 "만 19세 이상(한국 나이 20세)만 이용할 수 있어요" 안내 문구 추가
- 참고: 한국 소개팅 앱 표준은 휴대폰 본인인증(PASS)이나, 사전등록 단계에서는 생년월일 제한 + 안내로 대응. 앱 출시 시 SMS 본인인증으로 이중 검증 예정.

---

## 2026-04-03

### 매칭 정책 변경 + UX 개선 + 인프라

#### 정책 변경
- **매칭풀 기준 변경**: `is_phone_verified = true` → `is_saju_complete = true` (앱 백엔드 변경 필요)
- **전화번호 역할 변경**: 매칭 자격 → 앱 출시 알림용 (선택)
- **전화번호 인증**: 앱 홈 진입 필수 조건으로만 사용 (어뷰징 방지)

#### 기능 추가/변경
- 원형 아바타에 관상 프로필 사진 표시 (캐릭터 → 사진 우선, 폴백 캐릭터)
- GA4 이벤트 텍소노미 통일 (`view_`/`click_` 접두사) + 전 페이지 트래킹 추가
- 공유 티저 레이아웃 수정 (간격/스크롤/버튼 문구)
- 공유 상세 페이지 스켈레톤 로딩 추가
- 이상형 설명 왼쪽 정렬 + 텍스트 사이즈 조정
- 매칭 카운터: 틴더 blur-to-reveal 패턴 (이성 블러해시 사진 + 카운트업)
- 페이지 전환 시 딤 오버레이 + 로딩 GIF 표시
- "친구와 궁합 보기" 링크 수정 (공유 → 궁합 페이지)

#### 법적/약관
- 푸터에 통신판매업 신고번호 + 사업자 정보 전체 추가
- 이용약관/개인정보처리방침 노션 링크로 변경 (새탭)
- 이용약관에 서비스 제공기간/취소/환불/교환 규정 추가 (제9~11조)
- 이용약관/개인정보처리방침에 이상형 매칭 서비스 조항 추가
- 온보딩 사진 스텝에 "이상형 매칭에 활용" 안내 강화

#### CTA 변경
- 하단 CTA: 공유하기 메인 + "앱 출시 알림 받기" 서브 (전화번호 미등록 시)
- `/complete`: "매칭 사전 신청" → "앱 출시 알림 받기"로 역할 변경

---

## 2026-03-25

### 궁합 기능 안정화 + compat_connections 연동

#### 핵심 변경
- **`compat_connections` 테이블 연동**: 궁합 리스트가 `saju_compatibility` 직접 조회 → `compat_connections` 기반으로 변경. 앱 batch 데이터가 웹 궁합 탭에 노출되던 문제 해결.
- **`fn_record_compat_connection` RPC**: 궁합 계산 시(캐시 히트/미스 모두) 의도적 관계 기록. 직접 INSERT 불가(RLS).

#### 버그 수정
| 이슈 | 수정 |
|------|------|
| `is_phone_verified: true` 웹에서 잘못 설정 | 제거 — 전화번호 저장만, 인증은 앱에서 |
| 비로그인 `/result` 접속 시 무한 "이동 중..." | 401 응답 시 랜딩으로 리다이렉트 |
| 온보딩 step 4 fire-and-forget → step 5~12 스킵 | `getOnboardingStep`에서 프로필 필수 필드 체크 후 `saju_profile_id` 확인 |
| step 13 불필요한 이중 분석 | `saju_profile_id: null` 리셋 제거, `is_profile_complete: true` 설정 |
| step 4 사진 업로드 실패 무시 | 에러 메시지 표시 + 진행 차단 |
| "다시 시도" 버튼 재트리거 실패 | ref 변경 대신 직접 fetch 호출 |
| `fetchSajuForCompat` pillar null-safe 누락 | `toPillar()` 변환 복원 + 필수 pillar 누락 시 조기 종료 |
| `compatibility_id` null인 항목 0점 표시 | `compat_connections` 조회 시 null 필터링 |
| 탈퇴 유저 공유 링크 정상 동작 | `fetchShareData`에서 `account_status` 체크 |
| detail 페이지 404 | 티저 "자세히 보기" → 랜딩으로 변경 |
| `object-cover` 규칙 위반 3곳 | `object-contain`으로 수정 |
| `/complete` 기존 전화번호 미표시 | 기존 phone 로드 + 이미 등록이면 완료 화면 직행 |

---

## 2026-03-24

### 궁합(Compatibility) 기능 출시 — 바이럴 루프 강화

- **PR**: [#3](https://github.com/unknownstarter/momo-web/pull/3) (squash merge → `f7c02ea`)
- **목적**: 공유 동기를 "보여주기"에서 "관계 확인하기"로 전환하여 바이럴 루프 강화

#### 신규 기능
| 기능 | 설명 |
|------|------|
| **궁합 탭** | 결과 페이지에 사주/관상/**궁합** 3번째 탭 추가. 리스트 + 빈 상태 UI |
| **궁합 계산** | `calculate-compatibility` Edge Function 연동. 캐시 우선, 양방향 조회 |
| **AI 스토리** | `generate-match-story` 연동. 이성="인연 스토리", 동성="케미 분석" 자동 분기 |
| **하이브리드 폴링** | AI 스토리 5초 간격 최대 3회 폴링 + 분석 로딩 GIF + 부모 캐시 |
| **상세 바텀시트** | 캐릭터 쌍 + 원형 게이지(1.8s 애니메이션) + 등급 + 강점/도전 + AI 스토리 |
| **공유 궁합 바텀시트** | 공유 티저 페이지에서 2초 후 "궁합은 몇 점일까?" 바텀시트 등장 |
| **레퍼럴 자동 계산** | sessionStorage + 쿠키 병행으로 비회원 긴 여정에서도 partner ID 유지 |
| **궁합 OG 이미지** | `/api/og-compat` — 공유자 캐릭터 + 점수 + 등급 |
| **에러 피드백** | 자기 자신 궁합, 사주 미완료, 네트워크 에러 시 유저 메시지 표시 |

#### DB 변경 (앱 측에서 수행)
- `saju_compatibility` 테이블에 `user_gender`, `partner_gender` NOT NULL 컬럼 추가
- `generate-match-story` Edge Function 프롬프트 전면 개편 (점수별 솔직한 톤 + 동성 friend 모드)
- `generate-daily-recommendations` Edge Function에 성별 필터 추가

#### 파일 변경
- **신규 9개**: `lib/compatibility.ts`, API Route 4개, 컴포넌트 4개
- **수정 6개**: `lib/constants.ts`, `lib/result-tokens.ts`, `lib/analytics.ts`, `app/result/page.tsx`, `app/s/[code]/page.tsx`, `app/share/[id]/page.tsx`

#### 설계 문서
- 설계서: `docs/plans/compatibility-feature.md`
- 구현 플랜: `docs/superpowers/plans/2026-03-20-compatibility-feature.md`

---

## 2026-03-18

### OG 이미지 폰트 로딩 실패 수정

- **PR**: [#2](https://github.com/unknownstarter/momo-web/pull/2) (MERGED)
- Pretendard CDN 실패 시 Noto Sans KR 폴백 적용
- 글로벌 싱글톤 폰트 캐싱으로 성능 개선

---

## 2026-03-12

### 로그인 플로우 — 랜딩 CTA + 바텀시트 (PD 반영)

- **변경 요약**: 별도 로그인 페이지 없이, 랜딩에서 CTA 클릭 시 **바텀시트**로 카카오 로그인 유도.
- **근거**: PD 판단상 유저 입장에서 단계 수를 줄이는 것이 전환율에 유리하다는 결론. ([product-login-flow.md](./product-login-flow.md) 참고)

#### 구현 내용

| 항목 | 내용 |
|------|------|
| **랜딩** | "사주 & 관상 보기" 클릭 시 `/login` 이동 제거 → **바텀시트 오픈** |
| **바텀시트** | `components/ui/bottom-sheet.tsx` — 백드롭·ESC 닫기, 하단 슬라이드 업 애니메이션 |
| **시트 콘텐츠** | "시작하려면 로그인해 주세요" + **카카오로 시작하기** 버튼 + 이용약관·개인정보처리방침 링크 |
| **현재 동작** | "카카오로 시작하기" 클릭 시 시트 닫고 `/onboarding` 이동 (OAuth 바이패스) |
| **연동 후** | 동일 버튼에서 `signInWithOAuth({ provider: 'kakao' })` 호출 후 `/callback` → 온보딩/결과 리다이렉트 |

#### 문서 반영

- `docs/auth-bypass.md`: 플로우를 랜딩 → 바텀시트 → 온보딩 기준으로 수정.
- `docs/product-login-flow.md`: 현재 구현을 바텀시트 기준으로 정리.

#### 참고

- `/login` 페이지는 유지 (직접 URL 접근·에러 시 보조용).
- 저장소: [unknownstarter/momo-web](https://github.com/unknownstarter/momo-web)
