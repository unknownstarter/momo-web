import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PRODUCTS, isValidProductId, ROUTES } from "@/lib/constants";
import { PaidContentView } from "@/components/paid/paid-content-view";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PaidPageProps { params: Promise<{ productId: string }>; }

export default async function PaidPage({ params }: PaidPageProps) {
  const { productId } = await params;
  if (!isValidProductId(productId)) { redirect(ROUTES.RESULT); }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect(ROUTES.HOME); }

  const { data: paidContent } = await supabaseAdmin
    .from("paid_content").select("content").eq("user_id", user.id).eq("product_id", productId).maybeSingle();

  const hasContent = paidContent && paidContent.content && JSON.stringify(paidContent.content) !== '{}';

  if (!hasContent) {
    const { data: payment } = await supabaseAdmin
      .from("payment_history_web").select("id").eq("user_id", user.id).eq("product_id", productId).eq("status", "paid").maybeSingle();
    if (!payment) { redirect(ROUTES.RESULT); }
  }

  const product = PRODUCTS[productId];
  return <PaidContentView productId={productId} productName={product.name} content={hasContent ? paidContent!.content : null} />;
}
