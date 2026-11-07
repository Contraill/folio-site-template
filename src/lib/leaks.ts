/* What postbuild looks for in the output: pieces of each sealed page's text, long enough not to match by chance. */
export function readablePieces(title: string, markdown: string): string[] {
  const body = markdown.replace(/^---[\s\S]*?---/, '').replace(/[*_`#>[\]()!]/g, ' ');
  const sentences = [title, ...body.split(/[.\n]/)].map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length >= 12);
  const runs = sentences.flatMap((s) => { const w = s.split(' '); return w.length > 4 ? w.slice(0, -3).map((_, i) => w.slice(i, i + 4).join(' ')) : []; });
  return [...new Set([...sentences, ...runs])].filter((p) => p.length >= 12);
}
export const leaked = (output: string, pieces: string[]) => pieces.find((p) => output.includes(p)) ?? null;
