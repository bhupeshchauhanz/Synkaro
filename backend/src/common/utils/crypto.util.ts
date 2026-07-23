import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM with the JWT_SECRET as KDF input.
 * Format: base64(iv | tag | ciphertext)
 */
export function encryptText(plain: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptText(encoded: string, secret: string): string {
  try {
    const buf = Buffer.from(encoded, 'base64');
    // Minimum length: 12 (iv) + 16 (tag) + 1 (at least 1 byte ciphertext) = 29
    if (buf.length < 29) return '';
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const key = deriveKey(secret);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}

/** Marker prefix to identify encrypted payloads in DB. */
export const ENC_PREFIX = 'enc:v1:';
