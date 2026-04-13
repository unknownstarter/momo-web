import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 토스페이먼츠 결제 승인 API.
 *
 * 두 가지 방식으로 호출됨:
 * 1. Redirect 방식 (모바일): 토스 → successUrl GET 리다이렉트
 * 2. Promise 방식 (PC): 클라이언트 fetch로 직접 호출 (Accept: application/json)
 *
 * orderId(서버 생성 UUID)로 주문 식별.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");

  // JSON 응답 요청 여부 (PC Promise 방식)
  const wantsJson = request.headers.get("Accept")?.includes("application/json")
    || request.headers.get("X-Requested-With") === "fetch";

  if (!paymentKey || !orderId) {
    if (wantsJson) {
      return NextResponse.json({ error: "missing_params", success: false }, { status: 400 });
    }
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=missing_params", request.url)
    );
  }

  try {
    // 1. 원자적 잠금
    const { data: locked, error: lockError } = await supabaseAdmin
      .from("payment_history_web")
      .update({ status: "processing" })
      .eq("order_id", orderId)
      .eq("status", "pending")
      .select("id, amount, product_id, user_id")
      .maybeSingle();

    if (lockError || !locked) {
      if (wantsJson) {
        return NextResponse.json({ error: "already", success: false }, { status: 409 });
      }
      return NextResponse.redirect(
        new URL("/result?payment=already", request.url)
      );
    }

    // 2. 토스 승인 API 호출
    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: locked.amount,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[payment/confirm] 토스 승인 실패:", error);

      await supabaseAdmin
        .from("payment_history_web")
        .update({ status: "pending" })
        .eq("id", locked.id);

      if (wantsJson) {
        return NextResponse.json({ error: error.code ?? "unknown", success: false }, { status: 400 });
      }
      return NextResponse.redirect(
        new URL(`/result?payment=fail&reason=${encodeURIComponent(error.code ?? "unknown")}`, request.url)
      );
    }

    // 3. 성공 → paid
    await supabaseAdmin
      .from("payment_history_web")
      .update({
        status: "paid",
        payment_key: paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq("id", locked.id);

    if (wantsJson) {
      return NextResponse.json({ success: true, productId: locked.product_id });
    }
    // 모바일 redirect: 결제 완료 → 상세 분석 페이지로 바로 이동
    return NextResponse.redirect(
      new URL(`/paid/${locked.product_id}`, request.url)
    );
  } catch (error) {
    console.error("[payment/confirm] 서버 오류:", error);
    if (wantsJson) {
      return NextResponse.json({ error: "server_error", success: false }, { status: 500 });
    }
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=server_error", request.url)
    );
  }
}
