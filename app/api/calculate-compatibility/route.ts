import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCompatibility } from "@/lib/compatibility";

/**
 * POST /api/calculate-compatibility
 * 1:1 궁합 계산. body: { partnerProfileId: string }
 */
export async function POST(req: Request) {
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // body 파싱
    const body = await req.json().catch(() => null);
    const partnerProfileId =
      typeof body?.partnerProfileId === "string"
        ? body.partnerProfileId.trim()
        : "";
    if (!partnerProfileId) {
      return NextResponse.json(
        { ok: false, error: "partnerProfileId is required" },
        { status: 400 },
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

    // 자기 자신과의 궁합 방지
    if (myProfile.id === partnerProfileId) {
      return NextResponse.json(
        { ok: false, error: "cannot calculate compatibility with yourself" },
        { status: 400 },
      );
    }

    const result = await computeCompatibility(
      myProfile.id,
      partnerProfileId,
      session.access_token,
    );

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "compatibility_calculation_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("[calculate-compatibility]", err);
    return NextResponse.json(
      { ok: false, error: "internal_server_error" },
      { status: 500 },
    );
  }
}
