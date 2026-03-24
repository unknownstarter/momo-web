import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCompatibilityAiStory } from "@/lib/compatibility";

/**
 * GET /api/compatibility-story?partnerId=xxx
 * AI 스토리 폴링 전용 (경량 엔드포인트).
 */
export async function GET(req: Request) {
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

    // searchParams에서 partnerId 추출
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId")?.trim() ?? "";
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!partnerId || !UUID_RE.test(partnerId)) {
      return NextResponse.json(
        { ok: false, error: "valid partnerId is required" },
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

    const result = await fetchCompatibilityAiStory(myProfile.id, partnerId);

    return NextResponse.json({ ok: true, aiStory: result.aiStory });
  } catch (err) {
    console.error("[compatibility-story]", err);
    return NextResponse.json(
      { ok: false, error: "internal_server_error" },
      { status: 500 },
    );
  }
}
