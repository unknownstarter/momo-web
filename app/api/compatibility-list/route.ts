import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCompatibilityList } from "@/lib/compatibility";

/**
 * GET /api/compatibility-list
 * 내 궁합 전체 목록 조회 (점수 내림차순).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // 내 profile.id 조회
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!myProfile) {
      return NextResponse.json(
        { ok: false, error: "no_profile" },
        { status: 404 },
      );
    }

    const list = await fetchCompatibilityList(myProfile.id);

    return NextResponse.json({ ok: true, data: list });
  } catch (err) {
    console.error("[compatibility-list]", err);
    return NextResponse.json(
      { ok: false, error: "internal_server_error" },
      { status: 500 },
    );
  }
}
