import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/matching-stats
 * 분석 완료 유저 수 조회 (소셜 프루프용).
 * Phase 2에서 matching_waitlist 기반 매칭 대기 이성 수로 업그레이드 예정.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_saju_complete", true);

    if (error) {
      return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: count ?? 0 });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
