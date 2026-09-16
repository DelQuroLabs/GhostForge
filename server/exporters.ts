import JSZip from 'jszip';

export type ExportBook = {
  id: number; title: string; subtitle: string; premise: string;
  kind: string; genre: string; penName: string; seriesTitle: string;
  seriesNumber: number | null; logline: string; blurb: string;
  categories: string[]; keywords: string[]; created_at: string;
};
export type ExportChapter = { idx: number; title: string; body: string };
export type ExportChar = { name: string; role: string; description: string; arc: string };

function headerLines(b: ExportBook): string[] {
  return [
    b.title, b.subtitle ? b.subtitle : '', `by ${b.penName || 'Ghostforge Studio'}`,
    b.seriesTitle ? `${b.seriesTitle}${b.seriesNumber ? `, Book ${b.seriesNumber}` : ''}` : '',
  ].filter(Boolean);
}

export function buildMarkdown(b: ExportBook, chs: ExportChapter[], chars: ExportChar[]): string {
  const L: string[] = [];
  L.push(`# ${b.title}`, '');
  if (b.subtitle) L.push(`*${b.subtitle}*`, '');
  L.push(`by ${b.penName || 'Ghostforge Studio'}`, '');
  if (b.seriesTitle) L.push(`*${b.seriesTitle}${b.seriesNumber ? ` — Book ${b.seriesNumber}` : ''}*`, '');
  L.push('---', '', '## Contents', '');
  chs.forEach((c, i) => L.push(`${i + 1}. ${c.title}`));
  L.push('', '---', '');
  chs.forEach((c, i) => {
    L.push(`## Chapter ${i + 1}: ${c.title}`, '', c.body || '*(Unforged — approve the draft stage to forge this chapter.)*', '');
  });
  if (chars.length) {
    L.push('---', '', '## Cast', '');
    chars.forEach((c) => L.push(`### ${c.name} — ${c.role}`, '', c.description, '', `*Arc: ${c.arc}*`, ''));
  }
  L.push('---', '', `*Forged with Ghostforge · ${b.genre} · ${new Date(b.created_at).toISOString().slice(0, 10)}*`, '');
  return L.join('\n');
}

export function buildTxt(b: ExportBook, chs: ExportChapter[]): string {
  const L: string[] = [...headerLines(b), '', '='.repeat(50), ''];
  chs.forEach((c, i) => {
    L.push('', `CHAPTER ${i + 1}: ${c.title.toUpperCase()}`, '', c.body || '(Unforged chapter.)', '');
  });
  return L.join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function paras(body: string): string {
  return body.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`).join('\n');
}

export function buildHtml(b: ExportBook, chs: ExportChapter[], chars: ExportChar[]): string {
  const author = b.penName || 'Ghostforge Studio';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(b.title)}</title>
<style>body{font-family:Georgia,serif;max-width:42rem;margin:3rem auto;padding:0 1.5rem;color:#1c1a17;line-height:1.75;background:#fdfbf7}h1{font-size:2.4rem;margin-bottom:.2rem}h2{margin-top:3.5rem;border-top:1px solid #d8d2c4;padding-top:2rem}.sub{font-style:italic;color:#6b6259}.by{margin:1rem 0 2rem}.toc li{margin:.3rem 0}.cast{background:#f4efe4;padding:1rem 1.5rem;border-radius:.5rem;margin:1rem 0}</style>
</head><body><h1>${esc(b.title)}</h1>${b.subtitle ? `<div class="sub">${esc(b.subtitle)}</div>` : ''}<div class="by">by ${esc(author)}</div>
${b.seriesTitle ? `<div class="sub">${esc(b.seriesTitle)}${b.seriesNumber ? ` — Book ${b.seriesNumber}` : ''}</div>` : ''}
<h2>Contents</h2><ol class="toc">${chs.map((c) => `<li>${esc(c.title)}</li>`).join('')}</ol>
${chs.map((c, i) => `<h2>Chapter ${i + 1}: ${esc(c.title)}</h2>\n${paras(c.body || '(Unforged chapter.)')}`).join('\n')}
${chars.length ? `<h2>Cast</h2>${chars.map((c) => `<div class="cast"><strong>${esc(c.name)}</strong> — ${esc(c.role)}<br>${esc(c.description)}<br><em>Arc: ${esc(c.arc)}</em></div>`).join('')}` : ''}
<hr><p><em>Forged with Ghostforge · ${esc(b.genre)}</em></p></body></html>`;
}

export function buildKdp(b: ExportBook): string {
  return [
    'GHOSTFORGE PUBLISH KIT', '='.repeat(50), '',
    `TITLE: ${b.title}`, b.subtitle ? `SUBTITLE: ${b.subtitle}` : '', `AUTHOR: ${b.penName || '(set pen name)'}`,
    b.seriesTitle ? `SERIES: ${b.seriesTitle}${b.seriesNumber ? ` #${b.seriesNumber}` : ''}` : '', '',
    '--- KDP DESCRIPTION (paste into description field) ---', '', b.blurb, '',
    '--- CATEGORIES (request via KDP support / Author Central) ---',
    ...b.categories.map((c, i) => `${i + 1}. ${c}`), '',
    '--- KEYWORDS (7 slots) ---',
    ...b.keywords.map((k, i) => `${i + 1}. ${k}`), '',
    '--- LOGLINE (ads / tagline) ---', '', b.logline, '',
    '--- LAUNCH CHECKLIST ---',
    '[ ] Upload manuscript (EPUB from Ghostforge export)', '[ ] Upload cover (2400x3840 recommended; SVG→PNG from Publish tab)',
    '[ ] Paste description above', '[ ] Set 7 keywords', '[ ] Request categories', '[ ] KDP Select? (yes = exclusivity + KU)', '[ ] Price: series starter $0.99–$2.99 or free; standalone $2.99–$4.99',
  ].filter((l) => l !== '').join('\n');
}

export async function buildEpub(b: ExportBook, chs: ExportChapter[]): Promise<Buffer> {
  const zip = new JSZip();
  const author = b.penName || 'Ghostforge Studio';
  const uid = `ghostforge-${b.id}-${Date.now()}`;
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const items = chs.map((_, i) => `<item id="ch${i}" href="ch${i}.xhtml" media-type="application/xhtml+xml"/>`).join('');
  const spine = chs.map((_, i) => `<itemref idref="ch${i}"/>`).join('');
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?><package version="2.0" unique-identifier="uid" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(b.title)}</dc:title><dc:creator>${esc(author)}</dc:creator><dc:language>en</dc:language><dc:identifier id="uid">${uid}</dc:identifier></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>${items}</manifest><spine toc="ncx">${spine}</spine></package>`);
  const nav = chs.map((c, i) => `<navPoint id="n${i}" playOrder="${i + 1}"><navLabel><text>Chapter ${i + 1}: ${esc(c.title)}</text></navLabel><content src="ch${i}.xhtml"/></navPoint>`).join('');
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uid}"/></head><docTitle><text>${esc(b.title)}</text></docTitle><navMap>${nav}</navMap></ncx>`);
  zip.file('OEBPS/style.css', `body{font-family:Georgia,serif;line-height:1.7}h1{font-size:1.6em;margin-top:2em}p{margin:0 0 1em;text-indent:1.5em}h1+p{text-indent:0}`);
  zip.file('OEBPS/ch-cover.xhtml', `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title></head><body><h1>${esc(b.title)}</h1><p>${esc(b.subtitle)}</p><p>by ${esc(author)}</p></body></html>`);
  chs.forEach((c, i) => {
    zip.file(`OEBPS/ch${i}.xhtml`, `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${esc(c.title)}</title><link rel="stylesheet" href="style.css"/></head><body><h1>Chapter ${i + 1}: ${esc(c.title)}</h1>\n${paras(c.body || '(Unforged chapter.)')}</body></html>`);
  });
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'book';
}
