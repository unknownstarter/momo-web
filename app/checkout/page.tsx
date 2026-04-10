import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS, isValidProductId, ROUTES } from "@/lib/constants";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { CheckoutForm } from "@/components/checkout/checkout-form";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CheckoutPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const productId = params.product;

  if (!productId || !isValidProductId(productId)) {
    redirect(ROUTES.RESULT);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(ROUTES.HOME);
  }

  const { data: paid } = await supabaseAdmin
    .from("payment_history_web")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .eq("status", "paid")
    .maybeSingle();

  if (paid) {
    redirect(`${ROUTES.RESULT}?payment=already`);
  }

  // paid_content에 이미 콘텐츠가 있는 경우도 체크 (앱 Key 구매 유저 대응)
  const { data: existingContent } = await supabaseAdmin
    .from("paid_content")
    .select("id, content")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingContent && JSON.stringify(existingContent.content) !== '{}') {
    redirect(`${ROUTES.RESULT}?payment=already`);
  }

  const product = PRODUCTS[productId];

  return (
    <CheckoutForm
      productId={productId}
      productName={product.name}
      productDescription={product.description}
      amount={product.amount}
      userId={user.id}
      userEmail={user.email ?? null}
    />
  );
}
