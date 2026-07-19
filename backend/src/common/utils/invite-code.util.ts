import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export function generateOtp(length = 6): string {
  const max = 10 ** length;
  const num = Number(`0x${randomBytes(4).toString('hex')}`) % max;
  return num.toString().padStart(length, '0');
}
