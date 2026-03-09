# Supabase 연동 가이드 — 기존 프로젝트 공유

> momo 네이티브 앱과 동일한 Supabase 프로젝트를 사용한다.
> 새 프로젝트를 만들지 않는다.

---

## 1. 연결 정보

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ejngitwtzecqbhbqfnsc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<기존 anon key 그대로>
SUPABASE_SERVICE_ROLE_KEY=<기존 service role key — 서버사이드 전용>
```

---

## 2. 클라이언트 설정

### 서버 컴포넌트용 (`lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### 브라우저 컴포넌트용 (`lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 미들웨어 (`middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  await supabase.auth.getUser() // 세션 갱신
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 3. 카카오 로그인 (웹)

### Supabase Dashboard 설정
1. Authentication → URL Configuration
2. **Site URL**: `https://momo-web.vercel.app` (or custom domain)
3. **Additional Redirect URLs**: `https://momo-web.vercel.app/callback`

### 카카오 개발자 콘솔 설정
1. 내 애플리케이션 → momo 앱 선택
2. 플랫폼 → **Web** 추가 → 사이트 도메인: `https://momo-web.vercel.app`
3. 카카오 로그인 → Redirect URI: 기존 Supabase 콜백 URL 그대로 사용
   - `https://ejngitwtzecqbhbqfnsc.supabase.co/auth/v1/callback`

### 로그인 구현
```typescript
// 로그인 트리거
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: `${window.location.origin}/callback`,
    scopes: '', // 이메일 수집 안 함 (momo 정책)
  },
})

// /callback/page.tsx — 콜백 처리
export default function CallbackPage() {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/onboarding')
      }
    })
  }, [])
}
```

---

## 4. 기존 테이블 사용

> **스키마 변경 이력**: momo 앱에서 발생한 DB 변경사항은 `docs/schema-changelog.md`에서 추적합니다.

### profiles (INSERT — 온보딩 완료 시)
```typescript
const { data, error } = await supabase
  .from('profiles')
  .insert({
    auth_id: user.id,
    name,
    gender,
    birth_date: birthDate,
    birth_time: birthTime,
    profile_images: [photoUrl],
    is_saju_complete: false,    // 분석 후 true로 업데이트
    is_profile_complete: false, // 웹에서는 매칭프로필 미완성
  })
  .select()
  .single()
```

### Edge Function 호출 (기존 함수 그대로)
```typescript
// 사주 계산
const { data } = await supabase.functions.invoke('calculate-saju', {
  body: { birthDate, birthTime, gender, userName }
})

// 사주 AI 해석 — 응답에 idealMatch 객체 포함 (2026-03-09~)
const { data } = await supabase.functions.invoke('generate-saju-reading', {
  body: { userId: profileId, birthDate, birthTime, gender, userName }
})

// 관상 분석 — 응답에 ideal_match_* 4필드 포함 (2026-03-09~)
const { data } = await supabase.functions.invoke('generate-gwansang-reading', {
  body: { userId: profileId, photoUrl, userName, gender }
})
```

> **참고**: Edge Function 응답 구조 변경 상세는 `docs/schema-changelog.md` 참조

### Storage (사진 업로드)
```typescript
const fileName = `${userId}/${Date.now()}.jpg`
const { data, error } = await supabase.storage
  .from('profile-images')
  .upload(fileName, file, { contentType: 'image/jpeg', upsert: true })

const { data: { publicUrl } } = supabase.storage
  .from('profile-images')
  .getPublicUrl(fileName)
```

---

## 5. 신규 테이블 (웹 전용)

### payments
```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  transaction_id text not null unique,
  amount integer not null default 500,
  status text not null default 'completed',
  payment_method text,
  created_at timestamptz default now()
);

alter table payments enable row level security;
create policy "Users can view own payments"
  on payments for select using (
    profile_id in (
      select id from profiles where auth_id = auth.uid()
    )
  );
create policy "Service can insert payments"
  on payments for insert with check (true);
```

### waitlist
```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  phone text not null,
  marketing_agreed boolean not null default false,
  agreed_at timestamptz,
  created_at timestamptz default now()
);

create unique index waitlist_phone_unique on waitlist(phone);
alter table waitlist enable row level security;
create policy "Users can insert own waitlist"
  on waitlist for insert with check (true);
create policy "Users can view own waitlist"
  on waitlist for select using (
    profile_id in (
      select id from profiles where auth_id = auth.uid()
    )
  );
```

---

## 6. 주의사항

- **DB 스키마 변경 시** momo 네이티브 앱에 영향 없는지 확인 (하위호환 필수)
- **RLS 정책**: 기존 정책은 건드리지 않음. 신규 테이블만 추가
- **Edge Function**: 기존 함수 수정 금지. 필요 시 새 함수 추가
- **auth_id vs profiles.id**: 인증은 `auth.uid()`, 비즈니스 로직은 `profiles.id`
- **JWT**: Edge Function은 `--no-verify-jwt`로 배포된 상태 (ES256 이슈)
