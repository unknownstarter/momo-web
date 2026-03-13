import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용. RLS를 거치지 않고 조회할 때만 사용 (예: 공유 페이지 /share/[id]).
 * 클라이언트 번들에 포함되면 안 되므로 client 컴포넌트에서 import 금지.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey);
}
