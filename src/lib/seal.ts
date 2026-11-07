/* Password sites: every page is encrypted at build and opened in the browser. Both sides use WebCrypto, so this one
   file runs in Node (build) and in the page.

   - Key: PBKDF2-HMAC-SHA-256, 600 000 iterations (OWASP's 2023 minimum for this hash), with a random 16-byte salt per
     build. The whole site shares the key, so a visitor types the password once per tab.
   - Cipher: AES-256-GCM with a fresh 12-byte IV per page; authenticated, so a wrong password or a changed byte fails.
   - Each page's address is bound in as associated data: a sealed page can't be moved to another address.
   - Opening refuses fewer iterations than the minimum, so a doctored page can't make guessing cheaper.

   The ciphertext is public: anyone can try passwords offline as fast as their hardware allows. Only a strong password
   protects it, so the build refuses short ones (see weakness). */
export const ITERATIONS = 600_000;
export const MAX_ITERATIONS = 5_000_000;
export const MIN_PASSWORD = 14;

export type Sealed = { v: 1; kdf: 'PBKDF2-SHA-256'; iter: number; salt: string; iv: string; ct: string };

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
export const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
/** The associated data: the page's address and the format version. */
export const bound = (path: string) => enc.encode(`folio-site:${path}:v1`);

/** The site key. `extractable` lets the browser keep it for the tab, so other pages open without the password. */
export async function siteKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations = ITERATIONS, extractable = false) {
  if (!Number.isInteger(iterations) || iterations < ITERATIONS || iterations > MAX_ITERATIONS) throw new Error('unsupported page');
  const base = await subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
}

export async function seal(key: CryptoKey, salt: Uint8Array, plaintext: string, path: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: bound(path) }, key, enc.encode(plaintext)));
  return { v: 1, kdf: 'PBKDF2-SHA-256', iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

/** The plaintext, or an error: a wrong password and a damaged page look the same from outside. */
export async function open(key: CryptoKey, sealed: Sealed, path: string): Promise<string> {
  if (sealed?.v !== 1 || sealed.kdf !== 'PBKDF2-SHA-256') throw new Error('unsupported page');
  return new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(sealed.iv), additionalData: bound(path) }, key, unb64(sealed.ct)));
}

/** Why a password is too weak for a site anyone can download, or null. */
export function weakness(password: string | undefined): string | null {
  if (typeof password !== 'string' || password.normalize('NFC').length < MIN_PASSWORD) return `shorter than ${MIN_PASSWORD} characters`;
  if (new Set(password).size < 6) return 'too few different characters';
  return null;
}
