# [앱 전달] 유료 상세 분석 콘텐츠 연동 가이드

**작성일**: 2026-04-11
**대상 레포**: `momo` (Flutter 네이티브 앱)
**관련 웹 PR**: momo-web #48 (머지 완료)
**목적**: 웹에서 출시한 유료 상세 분석 콘텐츠(`paid_saju`, `paid_gwansang`)를 앱에서도 Key 결제 후 동일하게 열람할 수 있도록 연동

---

## 1. 배경 요약

웹에 **토스페이먼츠 500원 결제 → Claude Haiku AI 생성 → 13개 영역 심층 분석 콘텐츠** 파이프라인이 구축됨. 이 콘텐츠는 `paid_content` 테이블에 JSONB로 저장되며, **앱에서도 동일 콘텐츠를 열람할 수 있도록 공용 설계**되어 있음.

앱 팀이 **필요할 때** 연동하면 되며, 지금 당장 구현할 필요는 없음. DB 테이블 / Edge Function / RLS 정책은 이미 프로덕션에 배포되어 있음.

---

## 2. Supabase DB 현황

### 2.1 `paid_content` 테이블 (이미 생성됨, 앱+웹 공용)

```sql
CREATE TABLE paid_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  product_id  text NOT NULL,          -- 'paid_saju' | 'paid_gwansang' | 미래 확장
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
```

### 2.2 RLS 정책

```sql
-- 본인 콘텐츠만 조회 가능 (authenticated JWT)
CREATE POLICY "users_select_own_paid_content" ON paid_content
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE는 RLS 없음 → service_role로만 가능 (Edge Function 경유)
```

**중요**: 이 정책은 Flutter 앱의 Supabase 클라이언트(authenticated JWT)를 그대로 수용. 앱에서는 `Supabase.instance.client.from('paid_content')...` 패턴으로 읽기 가능. service_role 키는 절대 앱에 임베드하지 말 것.

---

## 3. Edge Functions (이미 배포됨)

### 3.1 `generate-paid-saju`
- **입력**: `{ userId: string, sajuProfileId: string }`
- **처리**: 결제 검증 → `saju_profiles` 조회 → Claude Haiku 4.5 호출 → `paid_content` UPDATE
- **출력**: `{ success: true }` 또는 `{ error: string }`
- **인증**: JWT Authorization 헤더 필요 (authenticated 유저)

### 3.2 `generate-paid-gwansang`
- **입력**: `{ userId: string, gwansangProfileId: string }`
- 구조 동일, `gwansang_profiles` 조회

### 3.3 결제 검증 방식
Edge Function 내부에서 **독립 결제 검증** 수행:
1. 현재는 `payment_history_web`(웹 전용)에서 paid 기록 확인
2. **앱 연동 시**: 앱 팀이 자체 Key 결제 기록 테이블(`purchases` 등)을 검증하는 로직을 Edge Function에 추가 필요

**권장**: 기존 Edge Function을 수정하지 말고, 앱 전용 래퍼 Edge Function 생성 또는 앱에서 직접 Claude API 호출 후 `paid_content`에 INSERT하는 별도 경로 구축.

---

## 4. 콘텐츠 JSON 구조

### 4.1 paid_saju
```jsonc
{
  "version": 1,
  "sections": [
    { "id": "personality", "title": "성격과 기질", "body": "400~800자" },
    { "id": "wealth", "title": "재물운", "body": "..." },
    { "id": "career", "title": "직업운", "body": "..." },
    { "id": "romance", "title": "연애운", "body": "..." },
    { "id": "marriage", "title": "결혼운", "body": "..." },
    { "id": "health", "title": "건강운", "body": "..." },
    { "id": "relationships", "title": "대인관계", "body": "..." },
    { "id": "family", "title": "가정운", "body": "..." },
    { "id": "academic", "title": "학업/시험운", "body": "..." },
    { "id": "travel", "title": "이동/해외운", "body": "..." },
    { "id": "advice", "title": "사주가 알려주는 조언", "body": "..." },
    { "id": "summary", "title": "종합 풀이", "body": "..." },
    {
      "id": "monthly_fortune",
      "title": "2026년 월별 운세",
      "year": 2026,
      "months": [
        { "month": 1, "title": "1월", "rating": 4, "focus": "재물", "body": "300~500자" },
        // ...12개월
      ]
    }
  ]
}
```

### 4.2 paid_gwansang
```jsonc
{
  "version": 1,
  "sections": [
    { "id": "forehead", "title": "이마 (천정)", "body": "..." },
    { "id": "eyebrows", "title": "눈썹 (보수관)", "body": "..." },
    { "id": "eyes", "title": "눈 (감찰관)", "body": "..." },
    { "id": "nose", "title": "코 (심판관)", "body": "..." },
    { "id": "mouth", "title": "입 (출납관)", "body": "..." },
    { "id": "ears", "title": "귀 (채청관)", "body": "..." },
    { "id": "chin", "title": "턱 (지각)", "body": "..." },
    { "id": "face_shape", "title": "얼굴 윤곽", "body": "..." },
    { "id": "personality", "title": "관상으로 본 성격", "body": "..." },
    { "id": "romance", "title": "관상으로 본 연애운", "body": "..." },
    { "id": "career", "title": "관상으로 본 직업운", "body": "..." },
    { "id": "fortune", "title": "관상으로 본 재물운", "body": "..." },
    { "id": "summary", "title": "종합 관상 풀이", "body": "..." }
  ]
}
```

### 4.3 `version` 필드
파싱 시 반드시 확인. 향후 스키마 변경 대응용.

---

## 5. 해금 기준

**결제 수단과 무관하게**, `paid_content`에 해당 `user_id + product_id` row가 존재하면 해금.

```dart
// Flutter 예시
Future<bool> isPaidContentUnlocked(String productId) async {
  final row = await Supabase.instance.client
      .from('paid_content')
      .select('content')
      .eq('product_id', productId)
      .maybeSingle();

  if (row == null) return false;
  final content = row['content'];
  // 빈 row ('{}')는 생성 중 — 미해금 취급
  return content != null && content.isNotEmpty;
}
```

---

## 6. 앱 연동 시나리오 (권장)

### 시나리오 A: Key 결제 후 웹 Edge Function 재사용 (간단)
1. 앱에서 Key 차감 (기존 `user_keys` 로직)
2. `purchases` 테이블에 구매 기록 생성
3. 웹 Edge Function 호출 불가 (결제 검증이 `payment_history_web` 기준)
4. → **시나리오 B 또는 C 필요**

### 시나리오 B: 앱 전용 Edge Function 생성 (권장)
- `generate-paid-saju-app`, `generate-paid-gwansang-app` 신규 생성
- 결제 검증: `purchases` 또는 `user_keys` 기반
- 나머지 로직(Claude 호출, JSON 구조)은 웹 버전과 동일 복사

### 시나리오 C: 웹 Edge Function 확장
- 기존 `generate-paid-saju`에 결제 검증 분기 추가
- **주의**: 앱과 웹이 같은 함수를 공유하게 되므로 변경 시 양쪽 영향 검토 필요

### 권장: **시나리오 B**
- 웹과 앱을 완전히 분리
- 향후 각자 독립적으로 프롬프트 조정 가능
- 공유 자원은 `paid_content` 테이블만

---

## 7. 하지 말아야 할 것

- ❌ 웹 Edge Function (`generate-paid-saju`, `generate-paid-gwansang`) 수정 — 웹 결제 플로우 깨짐
- ❌ `paid_content` 스키마 변경 (컬럼 추가/삭제/이름 변경) — 웹과 공유 중
- ❌ RLS 정책 수정 — 양쪽 클라이언트 의존 중
- ❌ `service_role` 키를 앱에 임베드 — 절대 금지
- ❌ `paid_content.content` JSON 구조의 기존 필드 삭제/이름 변경 — version 필드로 신규 버전 분기

---

## 8. 향후 확장

신규 유료 상품 추가 시 (예: 손금 `paid_palm`):
1. 웹: `lib/constants.ts`의 `PRODUCTS`에 `paid_palm` 추가
2. 웹: `app/checkout`에서 사용 가능해짐 (자동)
3. Supabase: `generate-paid-palm` Edge Function 신규 생성
4. 웹: `/paid/paid_palm` 페이지가 자동으로 동작
5. 앱: 앱 팀이 필요 시 연동

**DB 변경 불필요** — `paid_content.product_id`는 text라 자유롭게 확장.

---

## 9. 질문 있을 때

- **웹 측 구현체**: `app/api/paid-content/`, `components/paid/`, `app/paid/[productId]/`
- **설계 문서**: `docs/superpowers/specs/2026-04-10-paid-content-design.md`
- **정책 문서**: `docs/milestones/2026-04-11-payment-paid-content/policies.md`
- **스키마 이력**: `docs/schema-changelog.md`

---

## 10. 마이그레이션 체크리스트 (앱 연동 시)

- [ ] `paid_content` 테이블 read 권한 확인 (RLS authenticated → OK)
- [ ] `isPaidContentUnlocked(productId)` 헬퍼 구현
- [ ] 앱 홈/상세에서 해금 상태 체크하여 "상세 분석 보기" 진입점 노출
- [ ] 상세 열람 페이지에서 `content` 파싱 + 렌더링 (13개 섹션, 월별 운세)
- [ ] 미해금 유저에게 Key 결제 플로우 연결
- [ ] 결제 후 Edge Function 호출 또는 앱 전용 생성 경로 구축
- [ ] 로딩 연출 (30~60초 대기)
- [ ] 에러 처리 (재시도 버튼)
