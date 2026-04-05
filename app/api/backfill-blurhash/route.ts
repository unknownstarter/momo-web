import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";
import { encode } from "blurhash";

/**
 * POST /api/backfill-blurhash
 * blur_hash가 없는 기존 프로필에 blurhash 생성 후 저장.
 * sharp로 이미지 → raw pixels → blurhash encode.
 * 일회성 마이그레이션용.
 */
export const maxDuration = 120;

export async function POST(request: Request) {
  const secret = request.headers.get("x-admin-secret");
  if (secret !== process.env.SHARE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, profile_images, blur_hash")
    .or("blur_hash.is.null,blur_hash.eq.");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets = (profiles ?? []).filter(
    (p) => Array.isArray(p.profile_images) && p.profile_images.length > 0
  );

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "no profiles to process" });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const profile of targets) {
    try {
      const imageUrl = profile.profile_images[0];
      const res = await fetch(imageUrl);
      if (!res.ok) {
        errors.push(`${profile.id}: fetch ${res.status}`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const { data: pixels, info } = await sharp(buffer)
        .resize(32, 32, { fit: "cover" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const hash = encode(
        new Uint8ClampedArray(pixels),
        info.width,
        info.height,
        4,
        3
      );

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ blur_hash: hash })
        .eq("id", profile.id);

      if (updateErr) {
        errors.push(`${profile.id}: update failed`);
      } else {
        processed++;
      }
    } catch (e) {
      errors.push(`${profile.id}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: targets.length,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
