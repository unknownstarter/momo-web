# momo-web 변경 이력

> 프로덕트·UI·플로우 변경을 날짜별로 기록합니다.

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
