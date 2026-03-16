import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 회원 탈퇴 요청: 기존 앱의 request_account_deletion RPC 호출.
 * profiles.account_status → 'pending_deletion', 7일 후 크론이 영구 삭제.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("request_account_deletion", {
    p_user_id: user.id,
    p_reasons: ["other"],
    p_free_text: "웹에서 탈퇴 요청",
  });

  if (error) {
    console.error("[delete-account]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && !data.success) {
    return NextResponse.json({ error: data.error ?? "Failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
