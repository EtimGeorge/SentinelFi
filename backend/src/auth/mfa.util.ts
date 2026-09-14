import * as crypto from "crypto";

/**
 * Minimal RFC 6238 TOTP implementation (HMAC-SHA1, 30s step, 6 digits)
 * plus one-time recovery-code generators. Pure Node crypto — no extra deps.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateHotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

export function verifyTotp(
  secret: string,
  token: string,
  window = 1,
): boolean {
  const sanitized = token.trim().replace(/\D/g, "");
  if (sanitized.length !== TOTP_DIGITS) return false;
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  for (let i = -window; i <= window; i++) {
    if (generateHotp(secret, counter + i) === sanitized) return true;
  }
  return false;
}

export function buildOtpauthUrl(params: {
  account: string;
  issuer: string;
  secret: string;
}): string {
  const label = encodeURIComponent(`${params.issuer}:${params.account}`);
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${encodeURIComponent(params.issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

/** e.g. "3F8A-C2D9" — 5 per enrollment, bcrypt-hashed before storage. */
export function generateRecoveryCodes(count = 5): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4)}`);
  }
  return codes;
}