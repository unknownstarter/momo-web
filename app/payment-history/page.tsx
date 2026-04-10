import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { MobileContainer } from "@/components/ui/mobile-container";
import { PRODUCTS, ROUTES, type ProductId } from "@/lib/constants";
import Link from "next/link";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PaymentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.HOME);
  }

  const { data: payments } = await supabaseAdmin
    .from("payment_history_web")
    .select("id, product_id, amount, status, paid_at, created_at")
    .eq("user_id", user.id)
    .in("status", ["paid", "refunded"])
    .order("created_at", { ascending: false });

  const statusLabel = (s: string) =>
    s === "paid" ? "결제완료" : s === "refunded" ? "환불완료" : s;

  const statusColor = (s: string) =>
    s === "paid" ? "text-brand" : "text-ink-tertiary";

  return (
    <MobileContainer className="min-h-dvh bg-hanji text-ink flex flex-col">
      <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
        <Link
          href={ROUTES.RESULT}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold text-ink">결제 내역</h1>
      </header>

      <main className="flex-1 px-5 py-6">
        {!payments || payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[15px] text-ink-tertiary">아직 결제 내역이 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const product = PRODUCTS[p.product_id as ProductId];
              const date = p.paid_at ?? p.created_at;
              const formatted = new Date(date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-ink">
                      {product?.name ?? p.product_id}
                    </p>
                    <span className={`text-[13px] font-medium ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13px] text-ink-tertiary">{formatted}</span>
                    <span className="text-[15px] font-bold text-ink">
                      {p.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </MobileContainer>
  );
}
