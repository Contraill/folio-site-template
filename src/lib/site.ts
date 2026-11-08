/* What site.yaml says about this site, read at build. For a password site, the key every page is sealed with: derived
   once per build from FOLIO_PASSWORD (a secret of this repository, never in Git), with a fresh salt. */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { siteKey, weakness } from './seal';

type Config = { access?: 'public' | 'access' | 'password'; title?: { en?: string; tr?: string } };
export const config: Config = parse(readFileSync('site.yaml', 'utf8')) ?? {};
export const access = config.access ?? 'public';
export const siteTitle = config.title?.en ?? 'Site';

let key: Promise<{ key: CryptoKey; salt: Uint8Array<ArrayBuffer> }> | undefined;
export function sealer() {
  key ??= (async () => {
    const password = process.env.FOLIO_PASSWORD;
    const weak = weakness(password);
    if (weak) throw new Error(`access: password, but FOLIO_PASSWORD is ${password ? `too weak: ${weak}` : 'not set (a secret of this repository)'}`);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { key: await siteKey(password!, salt), salt };
  })();
  return key;
}
