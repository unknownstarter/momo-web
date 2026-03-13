# 공유 링크 보안 검토

## 요약

- **링크 소유자만이 결과를 볼 수 있는 구조**로 설계되어 있으며, URL/토큰이 비밀 역할을 합니다.
- **민감 정보**(이메일, 전화번호, auth_id, 프로필 사진 URL)는 공유 응답/뷰에 **포함하지 않습니다**.
- Admin(service role) 사용은 **서버 전용**이며, 클라이언트에 노출되지 않습니다.

---

## 1. URL/토큰

| 방식 | 보안 |
|------|------|
| `/share/[token]` | `profileId`를 AES-256-GCM으로 암호화. URL에 UUID가 노출되지 않음. 복호화는 서버만 가능(`SHARE_SECRET` 필요). |
| `/s/[code]` | 8자 랜덤 코드 → `share_links.profile_id` 매핑. 코드 추측 시도는 36^8 조합; 필요 시 IP당 요청 제한(rate limit)으로 브루트포스 완화 가능. |

**권장**: `SHARE_SECRET`은 16자 이상, 프로덕션에서만 사용하고 클라이언트/저장소에 두지 않기.

---

## 2. 공유 시 노출되는 데이터 (최소화)

- **profiles**: `name`, `character_type`, `dominant_element` 및 결과 조회용 id만 사용. **auth_id, email, phone, profile_images** 등은 조회/전달하지 않음.
- **saju_profiles**: 공유 뷰에 필요한 컬럼만 선택 (year/month/day/hour_pillar, five_elements, ai_interpretation, personality_traits, romance_style, romance_key_points, period_fortunes, yearly_fortune, ideal_match, dominant_element). **user_id** 등 내부 식별자는 노출하지 않음.
- **gwansang_profiles**: 공유 뷰에 필요한 컬럼만 선택. **user_id, photo_urls, face_measurements** 등은 노출하지 않음.

공유 페이지는 위와 같이 **필요한 필드만 명시적으로 select**하여, 나중에 테이블에 민감 컬럼이 추가되어도 기본적으로 노출되지 않도록 함.

---

## 3. Admin 클라이언트 사용

- `createAdminClient()`는 **서버 컴포넌트**와 **API 라우트**에서만 사용.
- RLS를 우회해 “로그인 없이 링크만으로 결과 조회”를 구현한 부분이며, **의도된 사용**임.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 환경 변수로만 두고, 클라이언트 번들/응답에 포함되지 않음.

---

## 4. 설계상의 한계와 선택

- **“링크를 가진 사람 = 결과를 볼 수 있는 사람”**으로 간주. 링크가 유출되면 해당 결과는 그 링크를 가진 누구나 볼 수 있음.
- 짧은 코드(`/s/[code]`)는 이론상 브루트포스 가능성이 있으나, 36^8 공간이고 서버에서 코드→profile_id 매핑만 하므로, 필요 시 **rate limit**으로 완화 가능.
- 사주/관상 결과에 **생년월일·시가 간접적으로 드러날 수 있음**(연·월·일·시주 등). 이는 “공유된 결과”의 성격상 수용한 범위로 두고, 이용약관/개인정보처리방침에서 “공유 링크에 포함되는 정보”를 안내하는 것을 권장.

---

## 5. 체크리스트 (배포/운영)

- [ ] `SHARE_SECRET` 설정(16자 이상), 프로덕션에서만 사용
- [ ] `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용, 클라이언트/저장소에 없음
- [x] 공유 페이지/API에서 profiles·saju_profiles·gwansang_profiles 조회 시 **필요 컬럼만 명시적 select** (share/[id], s/[code] 반영됨)
- [ ] (선택) `/share/[id]`, `/s/[code]`에 rate limit 적용 검토
