import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isValidProductId } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!isValidProductId(productId)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("paid_content")
      .select("content, created_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!data.content || JSON.stringify(data.content) === '{}') {
      return NextResponse.json({ error: "Generating" }, { status: 202 });
    }

    return NextResponse.json({ content: data.content, createdAt: data.created_at });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
