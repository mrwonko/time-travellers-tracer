// crypto.randomUUID() is only defined in "secure contexts" (https, or the
// special-cased localhost). Dev-server access over a LAN IP (vite.config.ts
// sets server.host: true specifically so phones/tablets can reach it) is
// NOT secure-context-exempted, so randomUUID is undefined there even
// though it works fine against localhost. crypto.getRandomValues() predates
// that restriction and is not gated the same way, so it's the real fallback
// here — Math.random() only exists as a can't-throw last resort.
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
