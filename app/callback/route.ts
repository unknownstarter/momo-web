import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/constants";
import { getOnboardingStep } from "@/lib/onboarding-redirect";

/**
 * 카카오 OAuth 콜백. exchangeCodeForSession 후:
 * - 결과 있음 → /result
 * - 필수값 전부 있음(선택값 제외) → /onboarding?step=13
 * - 그 외 → /onboarding?step=N (첫 번째 비어 있는 스텝)
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
    .select("name, gender, birth_date, birth_time, profile_images, height, occupation, location, body_type, religion, saju_profile_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const target = getOnboardingStep(profile);
  const redirectPath =
    target === "result"
      ? ROUTES.RESULT
      : `${ROUTES.ONBOARDING}?step=${target}`;

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
