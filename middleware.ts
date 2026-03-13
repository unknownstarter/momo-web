import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/constants";
import { getOnboardingStep } from "@/lib/onboarding-redirect";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || request.nextUrl.pathname !== "/") {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, gender, birth_date, birth_time, profile_images, height, occupation, location, body_type, religion, saju_profile_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const target = getOnboardingStep(profile);
  const redirectUrl =
    target === "result"
      ? new URL(ROUTES.RESULT, request.url)
      : new URL(`${ROUTES.ONBOARDING}?step=${target}`, request.url);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
