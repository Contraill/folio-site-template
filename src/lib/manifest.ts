/* Which manifest this repository has: site.yaml, or folio.yaml, its old name, still read while repositories move.
   Both at once stops the build, as it stops the Folio controller: neither guesses which one is meant. */
import { existsSync } from 'node:fs';

export function manifestFile(exists: (path: string) => boolean = existsSync): string {
  const found = ['site.yaml', 'folio.yaml'].filter(exists);
  if (found.length > 1) throw new Error('Both site.yaml and folio.yaml are present: keep only site.yaml.');
  return found[0] ?? 'site.yaml';
}
