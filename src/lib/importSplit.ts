// Manuscript splitter — turns pasted/uploaded agent output into chapters.
// Splits on headings like `# Chapter 1: Title` (the Agent Pack output
// contract), `Chapter 2`, `## Chapter Three`, Prologue/Epilogue, etc.

export type ParsedChapter = { title: string; body: string; words: number };

const HEAD = /^(#{1,4}\s+)?(chapter\s+(?:\d+|[a-z]+(?:-[a-z]+)?)|prologue|epilogue|foreword|afterword|introduction|conclusion|part\s+\d+)\b\s*[:.\-–—]?\s*(.*)$/i;
const WORDCOUNT = /^\(?\s*word count\s*:[^)]*\)?\s*$/i;
const NOTEHEAD = /^NOTE\b\s*[:\-–—]?\s*.*$/i;

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function splitManuscript(
  raw: string, opts: { stripNotes: boolean },
): { chapters: ParsedChapter[]; warnings: string[] } {
  const warnings: string[] = [];
  const text = raw.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  type Sec = { head: string; rest: string; lines: string[] };
  const secs: Sec[] = [];
  let cur: Sec | null = null;
  const preface: string[] = [];
  for (const ln of lines) {
    const m = HEAD.exec(ln.trim());
    if (m) {
      cur = { head: (m[2] ?? '').trim(), rest: (m[3] ?? '').trim(), lines: [] };
      secs.push(cur);
    } else if (cur) {
      cur.lines.push(ln);
    } else {
      preface.push(ln);
    }
  }
  if (preface.some((l) => l.trim())) {
    warnings.push('Text before the first chapter heading was ignored — paste chapters only, or add headings.');
  }
  if (!secs.length) {
    const body = clean(lines.join('\n'), opts.stripNotes);
    if (!body) return { chapters: [], warnings: ['Nothing to import — paste some text first.'] };
    return {
      chapters: [{ title: 'Chapter 1', body, words: countWords(body) }],
      warnings: ['No chapter headings found — imported as a single chapter.'],
    };
  }
  const chapters = secs
    .map((s, i) => {
      let title = (s.rest || s.head).replace(/^#+\s*/, '').trim();
      if (title.length > 120) title = title.slice(0, 120);
      if (!title) title = `Chapter ${i + 1}`;
      const body = clean(s.lines.join('\n'), opts.stripNotes);
      return { title, body, words: countWords(body) };
    })
    .filter((c) => c.body);
  if (chapters.length < secs.length) {
    warnings.push(`${secs.length - chapters.length} empty section(s) were skipped.`);
  }
  return { chapters, warnings };
}

function clean(body: string, strip: boolean): string {
  let lines = body.split('\n');
  if (strip) {
    lines = lines.filter((l) => !WORDCOUNT.test(l.trim()));
    const ni = lines.findIndex((l) => NOTEHEAD.test(l.trim()));
    if (ni >= 0) lines = lines.slice(0, ni);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
