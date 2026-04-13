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
 * 토스 결제창 → successUrl 리다이렉트로 호출됨.
 * 외부 도메인(토스) → 우리 도메인 리다이렉트이므로 세션 쿠키가 유실될 수 있어
 * 세션 인증 대신 orderId(서버 생성 UUID, 추측 불가)로 주문을 식별한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");

  if (!paymentKey || !orderId) {
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=missing_params", request.url)
    );
  }

  try {
    // 1. 원자적 잠금 — orderId(서버 생성 UUID)로 식별
    // 세션 쿠키가 외부 리다이렉트에서 유실될 수 있으므로 user_id 검증 생략
    // orderId는 crypto.randomUUID()로 생성되어 추측 불가능
    const { data: locked, error: lockError } = await supabaseAdmin
      .from("payment_history_web")
      .update({ status: "processing" })
      .eq("order_id", orderId)
      .eq("status", "pending")
      .select("id, amount, product_id, user_id")
      .maybeSingle();

    if (lockError || !locked) {
      return NextResponse.redirect(
        new URL("/result?payment=already", request.url)
      );
    }

    // 2. DB의 amount로 토스 승인 API 호출 (클라이언트 amount 무시)
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

      // 실패 → pending 복원 (재시도 허용)
      await supabaseAdmin
        .from("payment_history_web")
        .update({ status: "pending" })
        .eq("id", locked.id);

      return NextResponse.redirect(
        new URL(`/result?payment=fail&reason=${encodeURIComponent(error.code ?? "unknown")}`, request.url)
      );
    }

    // 3. 성공 → paid + paymentKey 저장
    await supabaseAdmin
      .from("payment_history_web")
      .update({
        status: "paid",
        payment_key: paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq("id", locked.id);

    return NextResponse.redirect(
      new URL("/result?payment=success", request.url)
    );
  } catch (error) {
    console.error("[payment/confirm] 서버 오류:", error);
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=server_error", request.url)
    );
  }
}
