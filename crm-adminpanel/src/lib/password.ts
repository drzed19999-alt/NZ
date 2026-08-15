// Readable but strong temporary password. Used wherever a rep needs a one-off
// credential to hand over on a call (lead conversion, investor password reset).
export function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const buf = new Uint32Array(14);
  crypto.getRandomValues(buf);
  buf.forEach((n) => (out += chars[n % chars.length]));
  return out + '!7';
}
