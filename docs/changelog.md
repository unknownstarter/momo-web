# momo-web 변경 이력

> 프로덕트·UI·플로우 변경을 날짜별로 기록합니다.

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
