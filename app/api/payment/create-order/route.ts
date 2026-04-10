import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { PRODUCTS, isValidProductId } from "@/lib/constants";
import { randomUUID } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. productId 검증
    const body = await request.json();
    const { productId } = body;
    if (!productId || !isValidProductId(productId)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const product = PRODUCTS[productId];

    // 3. 이미 구매 완료 확인
    const { data: paid } = await supabaseAdmin
      .from("payment_history_web")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle();

    if (paid) {
      return NextResponse.json({ error: "Already purchased" }, { status: 409 });
    }

    // 4. 기존 pending 조회 (30분 이내만)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: existingPending } = await supabaseAdmin
      .from("payment_history_web")
      .select("order_id, amount")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "pending")
      .gte("created_at", thirtyMinAgo)
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({
        orderId: existingPending.order_id,
        amount: existingPending.amount,
      });
    }

    // 30분 초과 pending 삭제
    await supabaseAdmin
      .from("payment_history_web")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "pending")
      .lt("created_at", thirtyMinAgo);

    // 5. 신규 생성
    const orderId = randomUUID();
    const { error: insertError } = await supabaseAdmin
      .from("payment_history_web")
      .insert({
        user_id: user.id,
        product_id: productId,
        order_id: orderId,
        amount: product.amount,
        status: "pending",
      });

    if (insertError) {
      console.error("[create-order] INSERT 실패:", insertError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId, amount: product.amount });
  } catch (error) {
    console.error("[create-order] 서버 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
