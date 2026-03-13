import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/constants";

/**
 * 카카오 OAuth 콜백. Supabase가 code를 담아 리다이렉트함.
 * exchangeCodeForSession 후 profiles 존재 여부에 따라 /onboarding 또는 /result로 보냄.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}${ROUTES.HOME}?error=no_code`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}${ROUTES.HOME}?error=config`);
  }

  const sessionCookies: { name: string; value: string; options?: object }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        sessionCookies.push(...cookiesToSet);
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}${ROUTES.HOME}?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectWithCookies(origin + ROUTES.ONBOARDING, sessionCookies);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_profile_complete, saju_profile_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  // 프로필 없음 → 온보딩(닉네임부터). 프로필 미완료 → 온보딩. 프로필 완료 + 분석 결과 있음 → 결과.
  const profileComplete = Boolean(profile?.is_profile_complete);
  const hasResult = Boolean(profile?.saju_profile_id);
  const redirectPath = !profile || !profileComplete || !hasResult ? ROUTES.ONBOARDING : ROUTES.RESULT;

  return redirectWithCookies(origin + redirectPath, sessionCookies);
}

function redirectWithCookies(
  url: string,
  cookiesToSet: { name: string; value: string; options?: object }[]
) {
  const res = NextResponse.redirect(url, 302);
  cookiesToSet.forEach(({ name, value, options }) =>
    res.cookies.set(name, value, (options as object) ?? {})
  );
  return res;
}
