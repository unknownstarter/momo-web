import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/matching-stats
 * 매칭 메인 페이지용 통계 + 이성 블러해시 사진.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // 내 성별 확인
    let myGender: string | null = null;
    try {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (user) {
        const { data: me } = await supabase
          .from("profiles")
          .select("gender")
          .eq("auth_id", user.id)
          .maybeSingle();
        myGender = me?.gender ?? null;
      }
    } catch { /* 비로그인 시 무시 */ }

    // 분석 완료 유저 수
    const { count: totalCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_saju_complete", true);

    // 이성 블러해시 사진 (최대 3개)
    let blurHashes: string[] = [];
    if (myGender) {
      const oppositeGender = myGender === "male" ? "female" : "male";
      const { data: opposites } = await supabase
        .from("profiles")
        .select("blur_hash")
        .eq("gender", oppositeGender)
        .eq("is_saju_complete", true)
        .not("blur_hash", "is", null)
        .not("blur_hash", "eq", "")
        .limit(3);
      if (opposites) {
        blurHashes = opposites.map((p) => p.blur_hash as string).filter(Boolean);
      }
    }

    return NextResponse.json({
      ok: true,
      count: totalCount ?? 0,
      blurHashes,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
