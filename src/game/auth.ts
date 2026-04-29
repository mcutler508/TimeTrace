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

// Substring-matched against a leetspeak-normalized handle. Kept intentionally
// short — false positives on common substrings (the "Scunthorpe problem") are
// worse than missing edge cases. We match the worst slurs and a small core of
// vulgar profanity. Short tokens (<=3 chars) require word-boundary matching to
// avoid swallowing innocent names.
const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole',
  'bastard', 'whore', 'slut', 'wank', 'twat', 'jerkoff', 'jackoff',
  'nigger', 'nigga', 'faggot', 'fagot', 'retard', 'retarded', 'tranny',
  'kike', 'spic', 'chink', 'gook', 'wetback', 'beaner', 'paki',
  'rape', 'rapist', 'pedo', 'pedophile', 'molest', 'nazi', 'hitler',
  'cum', 'jizz', 'boner', 'penis', 'vagina', 'anal', 'anus', 'fellatio',
  'fap', 'milf', 'incel', 'kkk',
];

const SHORT_BANNED = ['ass', 'tit', 'fag'];

function leetNormalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[8]/g, 'b')
    .replace(/[(]/g, 'c')
    .replace(/[3]/g, 'e')
    .replace(/[6]/g, 'g')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[2]/g, 'z')
    .replace(/[^a-z]/g, '');
}

export function containsProfanity(name: string): boolean {
  const normalized = leetNormalize(name);
  if (!normalized) return false;
  for (const word of BANNED_WORDS) {
    if (normalized.includes(word)) return true;
  }
  // Short words: must be the whole handle, not embedded (avoids "class", "title").
  for (const word of SHORT_BANNED) {
    if (normalized === word) return true;
  }
  return false;
}
