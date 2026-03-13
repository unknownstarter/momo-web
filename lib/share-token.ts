import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT = "momo-share-v1";
const UUID_BIN_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.SHARE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SHARE_SECRET must be set and at least 16 characters");
  }
  return scryptSync(secret, SALT, KEY_LEN);
}

/** UUID 문자열 → 16바이트 (hex 파싱) */
function uuidToBuffer(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error("Invalid UUID");
  return Buffer.from(hex, "hex");
}

/** 16바이트 → UUID 문자열 */
function bufferToUuid(buf: Buffer): string {
  if (buf.length !== UUID_BIN_LEN) throw new Error("Invalid UUID buffer");
  const hex = buf.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 프로필 ID를 URL에 넣을 수 있는 짧은 암호화 토큰으로 인코딩.
 * UUID를 16바이트로 암호화해 토큰 길이를 줄임 (~86자 → ~59자).
 */
export function encodeShareToken(profileId: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const plain = uuidToBuffer(profileId);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64url");
}

/**
 * 공유 URL의 토큰을 복호화해 프로필 ID 반환.
 * 신규: 16바이트 UUID. 구형: UTF-8 UUID 문자열(36바이트) 호환.
 */
export function decodeShareToken(token: string): string | null {
  try {
    const key = getKey();
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
    if (enc.length < 1) return null;
    const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(enc), decipher.final()]);
    if (out.length === UUID_BIN_LEN) return bufferToUuid(out);
    if (out.length === 36) return out.toString("utf8");
    return null;
  } catch {
    return null;
  }
}
