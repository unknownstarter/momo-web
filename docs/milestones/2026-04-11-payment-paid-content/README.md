# 결제 플로우 + 유료 상세 콘텐츠 마일스톤

**작업 기간**: 2026-04-10 ~ 2026-04-11
**마스터**: 노아(Noah)
**실행**: 아리(Ari, Claude Opus 4.6)

---

## 한 줄 요약

웹에 **토스페이먼츠 결제위젯 기반 결제 인프라**를 완성하고, **Claude Haiku 4.5 기반 유료 상세 분석 콘텐츠** 생성·열람 시스템을 구축했다.

---

## 배경 및 목적

1. **1단계 목적**: 토스페이먼츠 PG 심사 통과를 위한 결제 플로우 구축
2. **2단계 목적**: 여성 유저 과금 의향 검증 — 사주/관상 상세 분석 500원 판매로 손금·타로 등 확장 가능성 측정
3. **비즈니스 전략**:
   - 웹 = 여성 유저 확보 + 과금 의향 테스트 채널
   - 앱 = 남성 유저의 Key 충전 수익 모델
   - 두 채널은 상호 독립적, 공유 자원(Supabase)만 동일

---

## 문서 구성

| 문서 | 내용 |
|------|------|
| [research.md](./research.md) | 리서치 — 토스페이먼츠 SDK, 프롬프트 엔지니어링, 비용 분석 |
| [implementation.md](./implementation.md) | 구현 — 파일 변경 내역, DB 스키마, API 엔드포인트 |
| [policies.md](./policies.md) | 정책 — 결제 정책, 유료 콘텐츠 정책, 보안 정책 |

---

## 관련 PR

| PR | 제목 |
|----|------|
| [#44](https://github.com/unknownstarter/momo-web/pull/44) | feat(payment): 포트원/이니시스 → 토스페이먼츠 결제위젯 전환 |
| [#45](https://github.com/unknownstarter/momo-web/pull/45) | fix(payment): 토스페이먼츠 테스트 클라이언트 키 오타 수정 |
| [#46](https://github.com/unknownstarter/momo-web/pull/46) | feat: 결제 플로우 — checkout + 승인 API + 결제 내역 + 메뉴 통합 |
| [#47](https://github.com/unknownstarter/momo-web/pull/47) | fix(checkout): 결제 버튼 활성화 상태 명확하게 |
| [#48](https://github.com/unknownstarter/momo-web/pull/48) | feat: 유료 상세 분석 콘텐츠 (2단계) |

---

## 관련 설계 문서

- [결제 플로우 설계 (1단계)](../../superpowers/specs/2026-04-10-payment-flow-design.md)
- [유료 콘텐츠 설계 (2단계)](../../superpowers/specs/2026-04-10-paid-content-design.md)
- [결제 플로우 구현 계획](../../superpowers/plans/2026-04-10-payment-flow.md)
- [유료 콘텐츠 구현 계획](../../superpowers/plans/2026-04-10-paid-content.md)

---

## 앱 팀 전달 문서

- [앱 팀 유료 콘텐츠 연동 가이드](../../handoff/2026-04-11-paid-content-integration.md)
