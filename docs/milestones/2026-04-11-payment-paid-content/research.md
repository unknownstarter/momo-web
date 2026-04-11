# 리서치 내역

**작업 기간**: 2026-04-10 ~ 2026-04-11

---

## 1. 결제 PG 비교 — 포트원 vs 토스페이먼츠 직접

### 초기 시도: 포트원(PortOne) + KG이니시스
- 포트원 V2 SDK로 이니시스 팝업 결제창 연동 시도
- 여러 번의 400 에러 → 이니시스 필수 파라미터 누락 (customer.customerId, fullName, phoneNumber, email)
- 수정 후 동작은 했으나 UX 열악 (팝업 방식)

### 경쟁사 관찰 (사주아이)
- 토스페이먼츠 결제위젯 직접 연동 (페이지 내 임베드)
- 카카오페이/네이버페이/토스페이/카드 한 화면에 표시
- 990원 소액 결제 정상 작동

### 최종 결론: 토스페이먼츠 직접 연동
| 항목 | 포트원 | 토스페이먼츠 직접 |
|------|--------|-----------------|
| 역할 | PG 중개 | PG 직접 |
| 결제 UI | 팝업 | 페이지 내 임베드 |
| 수수료 | PG + 포트원 중개 | PG만 |
| 간편결제 | PG별로 분리 | 한 화면에 통합 |

---

## 2. 토스페이먼츠 SDK 조사

### SDK 버전
- **`@tosspayments/tosspayments-sdk` v2.6.0** (통합 SDK, V2)
- V1 (`@tosspayments/payment-widget-sdk`)은 deprecated

### 주요 API
```typescript
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

const tossPayments = await loadTossPayments(clientKey);
const widgets = tossPayments.widgets({ customerKey });

await widgets.setAmount({ currency: "KRW", value: amount });
await widgets.renderPaymentMethods({ selector: "#payment-method" });
await widgets.renderAgreement({ selector: "#agreement" });
await widgets.requestPayment({ orderId, orderName, successUrl, failUrl, ... });
```

### 키 종류 (중요)
| 용도 | 접두사 | 위치 |
|------|--------|------|
| 결제위젯 연동 키 | `test_gck_` / `test_gsk_` | 결제위젯 사용 시 |
| API 개별 연동 키 | `test_ck_` / `test_sk_` | 결제창 직접 호출, 빌링 등 |

**실수 사례**: API 개별 연동 키를 결제위젯에 사용하면 위젯 로드 실패.

### 테스트 키 (문서용)
- Client: `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm`
- Secret: `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6`

### 결제 승인 플로우
1. 클라이언트: `requestPayment()` → 토스 결제창
2. 유저 결제 → `successUrl`로 리다이렉트 (GET, query params: paymentKey, orderId, amount)
3. 서버: `POST https://api.tosspayments.com/v1/payments/confirm` 호출 (Secret Key Basic auth)
4. 성공 → 최종 결제 완료

---

## 3. 최소 결제금액 정책 조사

### 결론
- **PG사 공식 최소 금액 제한 없음** (이니시스, 토스, KCP, 나이스 모두 동일)
- 실무적 최소 금액 약 100원 수준
- 사주아이 990원 판매는 특별한 우회 없음 — 그냥 일반 결제
- **500원 결제 가능**

### 카드 수수료 고려
- 약 3.5% + 건당 수수료
- 500원 → 수취 약 476원 (17원 PG 수수료)

---

## 4. Claude 프롬프트 엔지니어링 리서치

### 모델 선택
| 모델 | Input ($/M) | Output ($/M) | paid_saju 원가 | 마진 |
|------|------------|-------------|---------------|------|
| **Haiku 4.5** ✅ | $1 | $5 | ~86원 | **83~88%** |
| Sonnet | $3 | $15 | ~270원 | 44~65% |
| Opus | $15 | $75 | ~1,340원 | 적자 |

### Anthropic 공식 가이드 핵심 (Haiku 품질 극대화)

**1. XML 태그로 구조화**
```xml
<role>전문가 역할 정의</role>
<context>맥락과 동기</context>
<instructions>구체적 지시</instructions>
<output_format>JSON 스키마 강제</output_format>
```

**2. Few-shot 예제 (3~5개)**
- `<examples>` / `<example>` 태그로 wrap
- 원하는 출력 품질을 실제 예시로 보여주는 것이 가장 강력

**3. 역할 + 맥락 + 동기 부여**
- 단순 지시가 아닌 "왜" 이 해석이 중요한지 설명
- "고객이 500원을 지불한 유료 콘텐츠" 같은 맥락 제공

**4. 프롬프트 캐싱 (Anthropic)**
- 시스템 프롬프트(역할 + 예시 + 출력 형식)는 유저별로 동일
- 캐싱 적용 시 입력 비용 **90% 할인**

**5. max_tokens 제한**
- paid_saju: 16,000 tokens (12섹션 + 12개월)
- paid_gwansang: 12,000 tokens (13섹션)
- 비용 통제 + 출력 일관성

**6. JSON 출력 강제**
- `<output_format>` 태그에 정확한 JSON 스키마 제공
- Haiku는 구조 명확할수록 형식 준수율 높음

---

## 5. Supabase DB 용량 분석

### paid_content 1건당 크기 예측
| 항목 | 계산 |
|------|------|
| paid_saju | 12섹션 × 600자 + 12개월 × 400자 ≈ 12,000자 |
| paid_gwansang | 13섹션 × 600자 ≈ 7,800자 |
| 한국어 UTF-8 | 1자 ≈ 3 bytes |
| JSON 오버헤드 | +30% |
| **paid_saju 1건** | ~47 KB |
| **paid_gwansang 1건** | ~30 KB |

### 스케일 시뮬레이션
| 유저 수 | 최대 row (유저당 2건) | 총 용량 |
|--------|---------------------|---------|
| 1,000명 | 2,000건 | ~150 MB |
| 10,000명 | 20,000건 | ~1.5 GB |
| 100,000명 | 200,000건 | ~15 GB |

### 제한
- Supabase Pro 플랜 8 GB 포함 → **10,000명까지 여유**
- PostgreSQL TOAST가 대형 JSONB 자동 압축
- Edge Function 동시 실행: Pro 100개 → 10,000명까지 여유

---

## 6. 전문가 리뷰 프로세스

각 설계 단계마다 4~5명의 전문가 에이전트가 병렬 리뷰:
- 프론트엔드 (Next.js/React 관점)
- 백엔드/DB (Supabase/RLS 관점)
- 프로덕트/UX (전환율, 사용성)
- 보안 (인증, 권한, 우회 가능성)
- 비용 분석 (Claude API 원가 vs 매출)

**리뷰 루프**:
1. v1 설계 → 리뷰 → 이슈 발견
2. v2 반영 → 재리뷰 → 잔존 이슈
3. v3 반영 → 재리뷰 → 승인
4. 구현 → 최종 통합 리뷰

**발견된 주요 이슈들**:
- 가격 조작 (amount 클라이언트 전달 → DB 조회로 변경)
- RLS INSERT 취약 (paid 직접 삽입 → pending만 허용)
- 동시성 (더블 컨펌 → 원자적 잠금 + 예약 row)
- 인증 (Edge Function JWT 검증)
- 레이트 리밋 (Claude API 비용 남용 방지)
