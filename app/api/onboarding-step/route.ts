import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingStep } from "@/lib/onboarding-redirect";

/**
 * 로그인 유저의 온보딩 재개 스텝 반환. 결과 있으면 result, 없으면 0~13.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, gender, birth_date, birth_time, profile_images, height, occupation, location, body_type, religion, saju_profile_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const target = getOnboardingStep(profile);
  return NextResponse.json({
    step: target === "result" ? "result" : target,
  });
}
