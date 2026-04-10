import { NextRequest, NextResponse } from "next/server";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

/**
 * 토스페이먼츠 결제 승인 API.
 *
 * 결제위젯 requestPayment의 successUrl로 리다이렉트되면
 * 쿼리 파라미터(paymentKey, orderId, amount)를 받아
 * 토스페이먼츠 승인 API를 호출한 뒤 결과 페이지로 리다이렉트합니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(
      new URL("/result?payment=fail&reason=missing_params", request.url)
    );
  }

  try {
    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[payment/confirm] 승인 실패:", error);
      return NextResponse.redirect(
        new URL(
          `/result?payment=fail&reason=${encodeURIComponent(error.code ?? "unknown")}`,
          request.url
        )
      );
    }

    // TODO: 결제 성공 후 콘텐츠 해금 로직 (DB 업데이트 등)
    // const payment = await response.json();

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
