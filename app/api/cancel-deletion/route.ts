import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 탈퇴 취소: account_status → 'active', deletion_requested_at → null.
 * 앱의 PendingDeletionPage 취소 로직과 동일.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: "active", deletion_requested_at: null })
    .eq("auth_id", user.id);

  if (error) {
    console.error("[cancel-deletion]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
