# Supabase 서버·DB 구조 (MCP 조회 기준)

> Supabase MCP(`list_tables`, `list_edge_functions`)로 조회한 현재 구조. **참고용이며, DB·서버 정책 변경 금지.**

---

## 1. public 스키마 테이블 요약

| 테이블 | 역할 | 웹에서 사용 |
|--------|------|-------------|
| **profiles** | 유저 기본 정보 (auth_id, name, birth_date, birth_time, gender, profile_images, phone, is_phone_verified, saju_profile_id, gwansang_profile_id, is_saju_complete, is_gwansang_complete, is_profile_complete 등) | ✅ INSERT/UPDATE (온보딩·프로필), SELECT |
| **saju_profiles** | 사주 분석 결과 (user_id, year/month/day/hour_pillar, five_elements, dominant_element, personality_traits, ai_interpretation, ideal_match, romance_style, yearly_fortune 등) | ✅ 읽기 (결과 페이지), 생성은 Edge Function |
| **gwansang_profiles** | 관상 분석 (user_id, animal_type, animal_modifier, samjeong, ogwan, traits, ideal_match_* 등) | ✅ 읽기 (결과 페이지), 생성은 Edge Function |
| **saju_compatibility** | 궁합 캐시 (user_id, partner_id, **user_gender**, **partner_gender**, total_score, overall_analysis, ai_story 등) | ✅ 읽기/쓰기 (궁합 기능, 2026-03-24~) |
| **daily_matches** | 일일 추천 (user_id, recommended_id, compatibility_id, section 등) | 참고 (앱 매칭용) |
| **likes** | 좋아요 | 앱 전용 |
| **matches** | 매칭 성사 | 앱 전용 |
| **chat_rooms** / **chat_messages** | 채팅 | 앱 전용 |
| **user_points** / **point_transactions** | 포인트 | 앱 전용 |
| **daily_usage** | 일일 무료 한도 | 앱 전용 |
| **blocks** / **reports** | 차단·신고 | 앱 전용 |
| **purchases** | 구매 내역 | 앱 전용 (웹 유료화 없음) |
| **character_items** | 캐릭터 아이템 | 앱 전용 |
| **blocked_phone_hashes** | 전화번호 블록 | 앱 전용 |
| **profile_ratings** | 프로필 평점 | 앱 전용 |
| **share_links** | 공유 짧은 링크 (short_id → profile_id) | ✅ 읽기/쓰기 (공유 URL 생성, 2026-03-13~) |
| **compat_connections** | 의도적 궁합 관계 (user_id, partner_id, compatibility_id FK) | ✅ RPC로 쓰기 + 읽기 (궁합 리스트, 2026-03-25~). 직접 INSERT 불가(RLS) |

---

## 2. profiles 주요 컬럼 (웹 관련)

- `id`, `auth_id` (unique) — 식별
- `name`, `birth_date`, `birth_time`, `gender` — 온보딩 필수
- `profile_images` (text[]) — 사진 URL
- `phone`, `is_phone_verified` — 앱 출시 알림용
- `saju_profile_id`, `gwansang_profile_id` — 분석 결과 FK
- `is_saju_complete`, `is_gwansang_complete`, `is_profile_complete` — 완료 플래그
- `dominant_element`, `character_type`, `animal_type` — 분석 결과 동기화

---

## 3. Edge Functions (현재 배포됨)

| slug | 용도 | 웹 호출 |
|------|------|---------|
| **calculate-saju** | 만세력 사주 계산 | ✅ 분석 시작 시 |
| **generate-saju-insight** | 사주 AI 해석 (Claude) | ✅ 사주 결과 생성 |
| **generate-gwansang-reading** | 관상 AI 분석 (Claude Vision) | ✅ 관상 결과 생성 |
| **batch-calculate-compatibility** | 궁합 일괄 계산 | 선택 (앱 매칭용) |
| **generate-daily-recommendations** | 일일 추천 생성 | 앱 전용 |
| **calculate-compatibility** | 1:1 궁합 계산 | ✅ 웹+앱 공용 (2026-03-24~) |
| **generate-match-story** | 매칭 스토리 생성 | ✅ 웹+앱 공용 (2026-03-24~) |

- 모든 함수 `verify_jwt: false` 로 배포됨 (JWT 검증 없음).

---

## 4. 웹에서 쓰는 흐름

1. **온보딩 완료** → `profiles` INSERT (auth_id, name, gender, birth_date, birth_time, profile_images, is_saju_complete=false, is_profile_complete=false 등).
2. **분석 시작** →  
   `calculate-saju` → `generate-saju-insight` → `generate-gwansang-reading`  
   (및 필요 시 DB에 saju_profiles, gwansang_profiles 저장·profiles 연결은 기존 트리거/로직 따름)
3. **결과 페이지** → `profiles` + `saju_profiles` + `gwansang_profiles` 조회 (자기 데이터만).
4. **앱 출시 알림** → `profiles.phone` 업데이트 + `is_phone_verified` 또는 별도 waitlist 형태 저장 (허용 범위 내 신규 테이블만).

이 문서는 **구조 파악용**이며, 스키마·RLS·Edge Function 코드는 수정하지 않습니다.
