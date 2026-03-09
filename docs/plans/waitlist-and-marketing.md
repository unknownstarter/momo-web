# 사전등록 & 마케팅 — 전화번호 수집 + 앱 출시 알림

---

## 1. 전략 요약

```
사주/관상 결과 (와우 모먼트)
  → "궁합 매칭도 궁금하지 않으세요?"
  → "앱 출시 시 가장 먼저 알려드릴게요"
  → 전화번호 입력 + 마케팅 동의
  → 앱 출시 → 문자 일괄 발송 → 앱 다운로드 전환
```

---

## 2. 알림 신청 UI

### 페이지 구성 (`/waitlist`)

```
┌─────────────────────────────┐
│  💫 궁합 92점인 인연이       │
│  당신을 기다리고 있어요      │
│                             │
│  [캐릭터 일러스트]          │
│                             │
│  앱 출시 시                  │
│  가장 먼저 알려드릴게요!     │
│                             │
│  ┌───────────────────────┐  │
│  │ 010-0000-0000         │  │
│  └───────────────────────┘  │
│                             │
│  ☑ 마케팅 정보 수신에       │
│    동의합니다 (필수)         │
│  ⓘ 개인정보 수집·이용 동의  │
│                             │
│  [알림 받기]                │← CTA
│                             │
│  나중에 할게요               │
└─────────────────────────────┘
```

### 개인정보 수집·이용 동의 내용 (법적 필수)
```
수집 항목: 휴대폰 번호
수집 목적: 서비스 출시 알림 및 마케팅 정보 발송
보유 기간: 서비스 종료 시 또는 동의 철회 시까지
수신 거부: 문자 내 "수신거부" 회신으로 가능
```

---

## 3. 데이터 저장

### waitlist 테이블
```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  phone text not null,
  marketing_agreed boolean not null default false,
  agreed_at timestamptz,
  saju_summary text,        -- "목화토금수 균형형" 등 요약
  animal_type text,          -- "나른한 고양이상" 등
  created_at timestamptz default now()
);

create unique index waitlist_phone_unique on waitlist(phone);
```

### 저장 로직
```typescript
await supabase.from('waitlist').upsert({
  profile_id: profileId,
  phone: formattedPhone,
  marketing_agreed: true,
  agreed_at: new Date().toISOString(),
  saju_summary: sajuProfile?.summary,
  animal_type: gwansangProfile?.animalType,
}, { onConflict: 'phone' })
```

---

## 4. 완료 페이지

### 구성 (`/waitlist/complete`)
```
┌─────────────────────────────┐
│  🎉 신청 완료!               │
│                             │
│  앱 출시 시                  │
│  010-****-1234로             │
│  알려드릴게요!               │
│                             │
│  ─── 내 프로필 요약 ───     │
│  이름: 김모모                │
│  동물상: 나른한 고양이상     │
│  사주: 목화토금수 균형형     │
│                             │
│  [친구도 사주 보게 하기]    │← 바이럴 CTA
│  [카카오톡 공유]             │
│  [링크 복사]                 │
└─────────────────────────────┘
```

---

## 5. 바이럴 루프

### 공유 메시지 (카카오톡)
```
🔮 내 사주 결과가 이렇대!

[OG 이미지 — 사주 요약 카드]

"나른한 고양이상 + 목화 조화형"
궁합 좋은 사람이 누군지 궁금하다면?

👉 나도 사주 보러 가기
```

### 공유 트래킹
- UTM 파라미터: `?utm_source=kakao&utm_medium=share&utm_campaign=saju&ref={userId}`
- `ref` 파라미터로 추천인 추적 (향후 리워드 가능)
- 공유 클릭 이벤트 트래킹

---

## 6. 앱 출시 시 문자 발송

### 발송 서비스 비교

| 서비스 | 단가 (건당) | API | 비고 |
|--------|-----------|-----|------|
| 알리고 | SMS 9.9원, LMS 27원 | REST API | 가장 저렴 |
| 뿌리오 | SMS 11원, LMS 30원 | REST API | UI 편리 |
| CoolSMS | SMS 20원 | REST API | 개발자 친화 |

### 문자 템플릿
```
[momo] 드디어 출시!

궁합 92점 인연이 기다리고 있어요 💫

지금 다운로드하면 프리미엄 3일 무료!
👉 https://momo.app.link/download

수신거부: 이 문자에 "거부" 회신
```

### 발송 스크립트 (Node.js)
```typescript
// scripts/send-launch-sms.ts
const waitlist = await supabase
  .from('waitlist')
  .select('phone')
  .eq('marketing_agreed', true)

const phones = waitlist.data.map(w => w.phone)

// 야간 발송 제한 (21시~8시)
const hour = new Date().getHours()
if (hour >= 21 || hour < 8) {
  console.error('야간 발송 제한 시간입니다.')
  process.exit(1)
}

// 알리고 API 호출 (배치)
for (const batch of chunk(phones, 500)) {
  await sendSMS({
    receivers: batch.join(','),
    message: LAUNCH_MESSAGE,
    sender: '02-0000-0000', // 발신번호 사전등록 필수
  })
}
```

---

## 7. 법적 요건 체크리스트

- [ ] **개인정보 수집·이용 동의서** 작성
- [ ] **개인정보처리방침** 웹 공개 (footer 링크)
- [ ] **마케팅 수신 동의** 별도 체크박스 (필수 아닌 선택으로 변경 검토)
- [ ] **수신 거부 방법** 문자에 포함 (법적 의무)
- [ ] **야간 광고 제한** 21시~8시 발송 금지
- [ ] **발신번호 사전등록** 통신사에 등록 (미등록 시 발송 차단)
- [ ] **광고 표시** 문자 첫 줄에 `(광고)` 표기 또는 `[momo]` 브랜드명

---

## 8. 전환 퍼널 KPI

| 단계 | 측정 | 목표 |
|------|------|------|
| 랜딩 → 카카오 로그인 | 전환율 | 40%+ |
| 로그인 → 온보딩 완료 | 완료율 | 80%+ |
| 온보딩 → 결제 | 전환율 | 30%+ |
| 결제 → 결과 공유 | 공유율 | 25%+ |
| 결과 → 알림 신청 | 신청율 | 50%+ |
| 알림 → 앱 다운로드 | 전환율 | 20%+ |
