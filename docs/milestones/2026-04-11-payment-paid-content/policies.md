# 정책 반영 내역

**작업 기간**: 2026-04-10 ~ 2026-04-11

---

## 1. 결제 정책

### 1.1 결제 수단
- **PG사**: 토스페이먼츠 (결제위젯 SDK v2)
- **지원 결제수단**: 카카오페이, 네이버페이, 토스페이, 신용/체크카드
- **기존 포트원/이니시스 완전 제거**

### 1.2 가격 정책
| 상품 | 가격 | 비고 |
|------|------|------|
| 더 자세한 사주 보기 (`paid_saju`) | 500원 | 유저당 1회 |
| 더 자세한 관상 보기 (`paid_gwansang`) | 500원 | 유저당 1회 |

- **가격 권위**: `lib/constants.ts`의 `PRODUCTS` 상수만이 유일한 진실. DB 저장·토스 승인 모두 이 값 참조.
- **클라이언트 amount 신뢰 금지**: 결제 승인 시 query param의 amount 무시, DB 조회 값 사용.

### 1.3 결제 활성화 정책
- 현재 **화이트리스트 3개 이메일**에서만 결제 활성화 (`paymentEnabled=true`)
  - `kakaopay-review@dropdown.xyz`
  - `toss-review@dropdown.xyz`
  - `hh109a@gmail.com`
- 일반 유저는 CTA 클릭 시 "준비 중" 토스트만 표시
- 유료 콘텐츠 품질 검증 후 전체 공개 예정

### 1.4 환불 정책
- 디지털 콘텐츠 특성상 결제 즉시 제공
- 생성 실패 시 재시도 가능 (별도 환불 없음)
- 상세: `/refund-policy` 페이지

### 1.5 심사용 테스트 계정 정책
- 모든 PG 심사 계정은 `fn_update_matchable` 트리거에서 **매칭풀 영구 제외**
- 카카오페이: `bc03ecc4-ee50-429a-b6f9-817186c4ec49`
- 토스페이먼츠: `2c1b6189-506c-4a48-8d72-d8204fed2551`

---

## 2. 유료 콘텐츠 정책

### 2.1 제공 콘텐츠
- **paid_saju**: 13개 영역 (성격, 재물, 직업, 연애, 결혼, 건강, 대인관계, 가정, 학업, 이동, 조언, 종합 + 월별 운세 12개월)
- **paid_gwansang**: 13개 영역 (이마, 눈썹, 눈, 코, 입, 귀, 턱, 얼굴윤곽, 성격, 연애, 직업, 재물, 종합)
- 각 섹션 **400~800자** 상세 해석 (무료 대비 5~10배 분량)

### 2.2 생성 정책
- **AI 모델**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **생성 시점**: 결제 성공 후 유저가 `/paid/{productId}` 첫 방문 시 비동기 생성
- **소요 시간**: 30~60초
- **실패 복구**: 빈 content row 남으면 재방문 시 재생성 트리거

### 2.3 해금 정책 (앱+웹 공용 기준)
- **해금 기준**: `paid_content`에 해당 유저+상품 row 존재 여부
- 결제 수단(웹 토스 / 앱 Key)과 무관
- 웹에서는 `payment_history_web`에 paid 기록이 있어도 해금으로 간주
- 앱 팀이 나중에 Key 결제 연동 시 `paid_content`에 직접 INSERT (Edge Function 경유)

### 2.4 콘텐츠 구조 정책
- `content`는 JSONB로 저장
- `version` 필드로 구조 변경 대응
- 상품별로 다른 JSON 스키마 허용
- 미래 확장: 손금, 타로, 별자리 등 신규 `product_id` 추가만으로 확장

### 2.5 비용 정책
- **원가**: paid_saju 약 86원, paid_gwansang 약 57원 (프롬프트 캐싱 적용)
- **PG 수수료**: 약 17원 (3.5%)
- **순이익**: paid_saju 약 396원 (마진 79%), paid_gwansang 약 425원 (마진 85%)

---

## 3. 보안 정책

### 3.1 DB 접근 제어 (RLS)
- `payment_history_web`:
  - SELECT: 본인 기록만
  - INSERT: 본인 + `status='pending'`만 (paid 직접 삽입 차단)
  - UPDATE: 없음 (service_role 전용)
- `paid_content`:
  - SELECT: 본인 기록만 (앱+웹 공용)
  - INSERT/UPDATE: 없음 (service_role 전용)

### 3.2 CHECK 제약
- `payment_history_web.status`: `('pending', 'processing', 'paid', 'refunded')`만 허용
- `payment_history_web.amount`: `> 0`

### 3.3 결제 승인 원자성
- 결제 승인 API는 `UPDATE ... WHERE status='pending' AND user_id=$uid RETURNING *` 원자적 잠금
- 동시 요청 시 첫 번째만 processing으로 전환
- 두 번째는 즉시 `/result?payment=already` 리다이렉트

### 3.4 콘텐츠 생성 멱등성
- Edge Function은 예약 row 선점 방식
  1. 결제 검증
  2. `INSERT ... ON CONFLICT DO NOTHING` (빈 content)
  3. 선점 성공 시만 Claude 호출
  4. 성공 → UPDATE content
- 동시 요청 2개가 와도 Claude API 1번만 호출

### 3.5 레이트 리밋
- `/api/paid-content/generate`: per-user per-product 1분 1회
- Claude API 비용 남용 방지
- 현재 인메모리 기반 (향후 Upstash Redis 전환 검토)

### 3.6 인증 & 권한
- 모든 서버 API는 세션에서 user_id 추출 (query param 신뢰 금지)
- Edge Function은 `payment_history_web` 독립 검증 (웹 API 체크에 의존하지 않음)
- `SUPABASE_SERVICE_ROLE_KEY`, `TOSS_SECRET_KEY`, `ANTHROPIC_API_KEY`는 서버 전용

### 3.7 민감 정보 관리
- 결제 승인 API는 GET (토스 리다이렉트 콜백 구조상 불가피)
- `paymentKey`가 URL query param으로 서버 로그에 노출 가능
- Vercel 로그 보존 기간 주의
- 향후 개선: 중간 클라이언트 페이지 경유 POST 전환 검토

---

## 4. 앱 보호 정책 (CLAUDE.md 준수)

### 4.1 절대 금지
- 기존 테이블 (`saju_profiles`, `gwansang_profiles`, `profiles`, `purchases`, `user_keys`, `key_transactions` 등) **수정/삭제/이름 변경 금지**
- 기존 RLS 정책 수정 금지
- 기존 6개 Edge Function (`calculate-saju`, `generate-saju-insight`, `generate-gwansang-reading`, `batch-calculate-compatibility`, `calculate-compatibility`, `generate-match-story`) 수정 금지
- 기존 Storage 정책 수정 금지

### 4.2 허용 사항
- **신규 테이블 추가**: `payment_history_web`, `paid_content`
- **신규 Edge Function 추가**: `generate-paid-saju`, `generate-paid-gwansang`
- **기존 함수 수정 예외**: `fn_update_matchable` 트리거 (PG 심사 계정 제외용, 일반 유저 로직 불변)
- 기존 테이블 읽기/쓰기 (정의 변경 없음)

### 4.3 앱 영향도 체크
| 변경 | 앱 참조 여부 | 영향 |
|------|------------|------|
| `payment_history_web` 신규 | ❌ | 없음 |
| `paid_content` 신규 | ❌ (향후 연동) | 없음 (현재), 확장 가능 |
| Edge Function 2개 신규 | ❌ | 없음 |
| `fn_update_matchable` 수정 | ⚠️ 앱이 의존 | 일반 유저 로직 불변 — 영향 없음 |

---

## 5. 배포 정책

### 5.1 배포 프로세스 (CLAUDE.md 규칙 12)
- Feature 브랜치에서 작업
- GitHub PR을 통한 squash merge만 허용
- Fast-forward merge 금지 (Vercel 중복 빌드 스킵 방지)
- Vercel Production 배포 완료 확인까지가 작업 완료

### 5.2 Edge Function 배포
- 웹 코드와 별도 배포 사이클
- Supabase Dashboard → Edge Functions에서 수동 배포
- 환경변수 `ANTHROPIC_API_KEY` 설정 필수

---

## 6. 데이터 스키마 정책

### 6.1 product_id 네이밍
- **현재 & 미래**: `paid_*` 접두사 사용
  - `paid_saju`, `paid_gwansang`
  - 향후: `paid_palm` (손금), `paid_tarot` (타로), `paid_constellation` (별자리) 등
- 1단계에서 사용한 `saju-detail`, `gwansang-detail`은 **deprecated** (코드베이스에서 완전 제거)

### 6.2 확장성
- `paid_content.content` JSONB로 상품별 구조 유연하게 저장
- `version` 필드로 스키마 마이그레이션 대응
- 상품별로 다른 Edge Function (`generate-paid-*`)
- 새 상품 추가 시: PRODUCTS 상수 + Edge Function + content JSON 스키마만 추가
