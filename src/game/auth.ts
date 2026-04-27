/**
 * Lightweight passcode hashing for the leaderboard.
 *
 * Uses Web Crypto SubtleCrypto SHA-256, which is built into every modern
 * browser. This is *not* a security-grade auth system — a 4-digit passcode is
 * brute-forceable. It exists to give players a way to come back to their
 * progress on another device, not to protect anything sensitive.
 */

export function isValidPasscode(passcode: string): boolean {
  return /^\d{4}$/.test(passcode);
}

export async function hashPasscode(passcode: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Tiny fallback that's deterministic but obviously weaker. Not used in
    // any modern browser; here for SSR/test environments.
    let h = 0;
    for (let i = 0; i < passcode.length; i++) {
      h = (h << 5) - h + passcode.charCodeAt(i);
      h |= 0;
    }
    return `fallback-${h.toString(16)}`;
  }
  const encoded = new TextEncoder().encode(`tt-passcode:${passcode}`);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeHandle(name: string): string {
  return name.trim().slice(0, 20);
}
