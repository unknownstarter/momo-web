import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isValidProductId } from "@/lib/constants";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;
    if (!productId || !isValidProductId(productId)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const rateLimitKey = `${user.id}:${productId}`;
    const lastCall = rateLimitMap.get(rateLimitKey) ?? 0;
    if (Date.now() - lastCall < RATE_LIMIT_MS) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    rateLimitMap.set(rateLimitKey, Date.now());

    const { data: existing } = await supabaseAdmin
      .from("paid_content")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing && JSON.stringify(existing.content) !== '{}') {
      return NextResponse.json({ success: true, status: "already_generated" });
    }

    const { data: payment } = await supabaseAdmin
      .from("payment_history_web")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ error: "Payment required" }, { status: 403 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, saju_profile_id, gwansang_profile_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const edgeFunctionName = productId === "paid_saju"
      ? "generate-paid-saju"
      : "generate-paid-gwansang";

    const edgeFunctionBody = productId === "paid_saju"
      ? { userId: user.id, sajuProfileId: profile.saju_profile_id }
      : { userId: user.id, gwansangProfileId: profile.gwansang_profile_id };

    const { error: fnError } = await supabaseAdmin.functions.invoke(
      edgeFunctionName,
      {
        body: edgeFunctionBody,
        headers: {
          Authorization: request.headers.get("Authorization") ?? "",
        },
      }
    );

    if (fnError) {
      console.error(`[paid-content/generate] Edge Function 실패:`, fnError);
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[paid-content/generate] 서버 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
