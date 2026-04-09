# [앱 전달] 공유 링크 앱 연동 가이드

**작성일**: 2026-04-08
**대상 레포**: `momo` (Flutter 네이티브 앱)
**관련 웹 PR**: momo-web #30 (머지 완료)
**목적**: momo 네이티브 앱에서 가입·사주·관상을 본 유저가, 웹과 **완전히 동일한 짧은 공유 링크**(`https://<웹도메인>/s/{8자}`)를 받아 카톡·문자로 뿌리고, 받는 사람은 웹의 공유 티저 페이지로 랜딩되도록 한다.

---

## 1. 배경 한 줄 요약

웹이 쓰던 `share_links` 테이블이 **문서에만 있고 실제 DB엔 없던 상태**였는데, 2026-04-08에 정식 생성하면서 **RLS 정책을 앱·웹 공용으로 심었음**. 이제 앱에서도 동일 테이블을 그대로 사용 가능하다. 새 RPC/Edge Function/스키마 변경 필요 없음.

---

## 2. Supabase DB 현황 (이미 적용됨 — 앱에서 아무것도 안 해도 됨)

```sql
-- 이미 프로덕션 Supabase(ejngitwtzecqbhbqfnsc)에 적용 완료
CREATE TABLE share_links (
  short_id   text PRIMARY KEY,          -- 8자 영소문자+숫자 코드 (a-z, 0-9)
  profile_id uuid NOT NULL UNIQUE        -- profiles.id FK, 유저당 row 1개
             REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 정책 (authenticated JWT 사용자 대상)
-- 1) 본인 profile에 해당하는 share_link만 SELECT 가능
CREATE POLICY "users_select_own_share_link" ON share_links
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- 2) 본인 profile에 해당하는 share_link만 INSERT 가능
CREATE POLICY "users_insert_own_share_link" ON share_links
  FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));
```

**중요**: 이 정책은 **앱의 Supabase 클라이언트(authenticated JWT)도 그대로 수용**한다. 앱에서는 그냥 `Supabase.instance.client.from('share_links')...` 패턴으로 쓰면 된다. service_role 키도, RPC도, Edge Function도 필요 없음.

---

## 3. 앱에서 구현해야 할 것 (Flutter)

### 3-1. 짧은 코드 생성 유틸

```dart
// lib/utils/short_id.dart (새 파일)
import 'dart:math';

const _kShortIdLen = 8;
const _kShortIdChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
final _rng = Random.secure();

String generateShortId() {
  return String.fromCharCodes(List.generate(
    _kShortIdLen,
    (_) => _kShortIdChars.codeUnitAt(_rng.nextInt(_kShortIdChars.length)),
  ));
}
```

> 웹과 동일한 36진수 8자 공간(약 2.8조 개). 충돌 확률 사실상 0.

### 3-2. `getOrCreateShareUrl` 헬퍼

```dart
// lib/services/share_link_service.dart (새 파일)
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/short_id.dart';

class ShareLinkService {
  static const String _webBaseUrl = 'https://fatemomo.xyz'; // TODO: 정확한 도메인 확정

  /// 현재 로그인 유저의 공유 URL을 반환한다.
  /// 기존 short_id가 있으면 재사용, 없으면 새로 생성.
  /// 동시 요청/PK 충돌 대비 재시도 포함.
  static Future<String> getOrCreateShareUrl(String profileId) async {
    final client = Supabase.instance.client;

    // 1. 기존 short_id 확인
    final existing = await client
        .from('share_links')
        .select('short_id')
        .eq('profile_id', profileId)
        .maybeSingle();

    if (existing != null && existing['short_id'] != null) {
      return '$_webBaseUrl/s/${existing['short_id']}';
    }

    // 2. 신규 생성 — profile_id UNIQUE 충돌(동시 탭) + short_id PK 충돌(희박) 재시도
    for (var attempt = 0; attempt < 3; attempt++) {
      final shortId = generateShortId();
      try {
        await client.from('share_links').insert({
          'short_id': shortId,
          'profile_id': profileId,
        });
        return '$_webBaseUrl/s/$shortId';
      } on PostgrestException catch (e) {
        // 23505: unique_violation
        if (e.code == '23505') {
          // profile_id 중복이면 동시 요청이 이미 성공한 것 → 재조회
          final raced = await client
              .from('share_links')
              .select('short_id')
              .eq('profile_id', profileId)
              .maybeSingle();
          if (raced != null && raced['short_id'] != null) {
            return '$_webBaseUrl/s/${raced['short_id']}';
          }
          // 재조회도 비었으면 short_id PK 충돌 — 새 id로 재시도
          continue;
        }
        rethrow;
      }
    }

    throw Exception('Failed to create share link after 3 attempts');
  }
}
```

### 3-3. 기존 공유 플로우 연동

앱의 결과 화면에 공유 버튼이 이미 있다면, 탭 시 이 함수를 호출해서 나온 URL을 `share_plus` 패키지(또는 카카오 공유 SDK)에 넘기면 된다:

```dart
onPressed: () async {
  final url = await ShareLinkService.getOrCreateShareUrl(myProfileId);
  await Share.share(url); // 또는 카카오톡 공유 SDK
}
```

---

## 4. 웹 도메인 결정 필요

현재 momo-web 프로덕션 도메인이 `fatemomo.xyz`인지 확인 필요. 개인정보처리방침(`docs/legal/privacy-policy.md`)에 `fatemomo.xyz`라고 명시되어 있어 이걸로 가정했지만, 실제 배포 URL과 일치하는지 **앱 통합 직전에 반드시 재확인**할 것.

도메인 교체 대비 `.env`나 `--dart-define`으로 주입받는 구조를 권장:

```dart
static const String _webBaseUrl = String.fromEnvironment(
  'WEB_BASE_URL',
  defaultValue: 'https://fatemomo.xyz',
);
```

---

## 5. 공유 링크가 열렸을 때의 경험 (참고)

받는 사람이 `https://<웹도메인>/s/{code}`를 카톡에서 탭하면:

1. **OG 미리보기**: `"{name}님은 연애할 때 {romanceType}이래요 {emoji}"` + 캐릭터 이미지 (웹이 자동 생성)
2. **랜딩 페이지**: 웹의 공유 티저(`ShareTeaserView`) — 이름, 캐릭터, 성격·로맨스 키워드, 이상형 요약
3. **바텀시트**: 2초 후 "나랑 궁합 볼래?" 유도 → 신규 유저는 온보딩 → 기존 로그인 유저는 즉시 궁합 계산

앱에서 발급한 URL이든 웹에서 발급한 URL이든 **동일 라우트**(`/s/[code]`)로 해석되므로 경험이 100% 일치한다.

---

## 6. 테스트 체크리스트 (앱 구현 후)

- [ ] 앱에서 결과 화면 → 공유 버튼 → `https://<웹도메인>/s/{8자}` URL 반환 확인
- [ ] 받은 URL을 카카오톡에 붙여넣고 OG 미리보기 정상 표시 확인
- [ ] 링크 탭 → 웹 `/s/{code}` 공유 티저 페이지 정상 로딩
- [ ] 같은 앱 유저가 공유 버튼 여러 번 눌러도 **동일 short_id 재사용** (Supabase Studio에서 `share_links` 테이블 확인)
- [ ] 앱·웹에서 동일 유저가 각각 공유 버튼 눌렀을 때 동일 URL이 나오는지 (같은 profile_id → 같은 short_id)
- [ ] 네트워크 장애/Supabase 장애 상황에서 그레이스풀 에러 처리

---

## 7. 웹 측 참고 코드 (이미 배포됨)

- `app/api/share-url/route.ts` — 웹의 동일 로직. 서버 라우트라 service_role로 접근하지만, 앱은 authenticated JWT로 위 RLS 정책을 통해 동일한 동작을 구현한다.
- `app/s/[code]/page.tsx` — 공유 링크 랜딩 페이지 (OG 메타, 티저, 궁합 바텀시트)
- `lib/share-data.ts::resolveShortCode(code)` — short_id → profile_id 해석

---

## 8. 하지 말아야 할 것

- ❌ `share_links` 테이블에 새 컬럼 추가 — 웹과 공유 중, 스키마 변경 금지
- ❌ RLS 정책 수정/삭제 — 양쪽 클라이언트가 의존 중
- ❌ `short_id` 길이·문자셋 변경 — 웹이 발급한 8자 36진수 코드와 충돌 우려
- ❌ `service_role` 키를 앱에 임베드 — 절대 금지. authenticated JWT만 사용

---

## 9. 질문 있을 때

- **웹 측 구현체**: `app/api/share-url/route.ts` (이 파일과 1:1 매칭되도록 앱을 구현하면 됨)
- **스키마 이력**: `docs/schema-changelog.md` 2026-04-08 항목
- **사고 전말**: 공유 링크가 "웹 전용"이었던 게 아니라 단순히 테이블이 생성되지 않아 웹조차 제대로 동작하지 않던 상태였음. 2026-04-08 PR #30에서 정식 복구.
