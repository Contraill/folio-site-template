/* After the build of a password site: proves nothing readable left it. Every page must be sealed, no sentence of any
   page may appear in the output, and nothing else may be published next to the pages (it would be public). Any
   failure stops the build, so nothing is deployed. Public and access sites need no check here. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { leaked, readablePieces } from '../src/lib/leaks.ts';

const DIST = 'dist';
const access = (parse(readFileSync('site.yaml', 'utf8')) ?? {}).access ?? 'public';
if (access !== 'password') process.exit(0);

const fail = (why: string): never => { console.error(`postbuild: ${why}`); process.exit(1); };
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : [p]; });
const built = files(DIST).map((f) => relative(DIST, f));
const loose = built.filter((f) => !/^(.*\.(html|css|js|woff2?)|_headers|favicon\.(ico|svg))$/.test(f));
if (loose.length) fail(`a password site can't publish other files, they would be public: ${loose.join(', ')}`);
const open = built.filter((f) => f.endsWith('.html') && !readFileSync(join(DIST, f), 'utf8').includes('data-folio-sealed'));
if (open.length) fail(`pages not sealed: ${open.join(', ')}`);
const output = built.map((f) => readFileSync(join(DIST, f), 'utf8')).join('\n');
const pages = files('src/content/pages').filter((f) => f.endsWith('.md'));
for (const page of pages) {
  const source = readFileSync(page, 'utf8');
  const title = /^title:\s*(.+)$/m.exec(source)?.[1].replace(/^["']|["']$/g, '') ?? '';
  const found = leaked(output, readablePieces(title, source));
  if (found) fail(`${page}: “${found.slice(0, 24)}…” is readable in the output`);
}
console.log(`postbuild: ${built.filter((f) => f.endsWith('.html')).length} pages sealed, nothing readable in dist`);
