import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT = "momo-share-v1";

function getKey(): Buffer {
  const secret = process.env.SHARE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SHARE_SECRET must be set and at least 16 characters");
  }
  return scryptSync(secret, SALT, KEY_LEN);
}

/**
 * 프로필 ID를 URL에 넣을 수 있는 암호화 토큰으로 인코딩.
 * 서버 전용. 클라이언트에 프로필 UUID가 노출되지 않도록 함.
 */
export function encodeShareToken(profileId: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([
    cipher.update(profileId, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64url");
}

/**
 * 공유 URL의 토큰을 복호화해 프로필 ID 반환.
 * 실패 시 null.
 */
export function decodeShareToken(token: string): string | null {
  try {
    const key = getKey();
    const buf = Buffer.from(token, "base64url");
    if (buf.length < IV_LEN + TAG_LEN + 1) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
  } catch {
    return null;
  }
}
