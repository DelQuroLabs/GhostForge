import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileUp, Trash2 } from 'lucide-react';
import { api, fmtWords, errMsg, type Book, type Chapter } from '../lib/api.js';
import { Button, Card, Field, Badge, Spinner } from '../components/ui.js';
import { splitManuscript } from '../lib/importSplit.js';

type Mode = 'fill' | 'append' | 'replace';
type Full = Book & { chapters: Chapter[] };

const MODE_HELP: Record<Mode, string> = {
  fill: 'Match in order — text fills your existing chapters (keeps their titles); any extras are appended as new chapters.',
  append: 'Add after — every parsed chapter is added to the end. Nothing existing is touched.',
  replace: 'Replace all — deletes every existing chapter, then imports fresh.',
};

export default function ImportBook() {
  const { id } = useParams();
  const nav = useNavigate();
  const [book, setBook] = useState<Full | null>(null);
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<Mode>('fill');
  const [stripNotes, setStripNotes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.books.get(id!).then((b) => {
      setBook(b as Full);
      if (b.chapters.length === 0) setMode('replace');
    }).catch((e) => setErr(errMsg(e)));
  }, [id]);

  const parsed = useMemo(() => splitManuscript(source, { stripNotes }), [source, stripNotes]);
  const existing = book?.chapters ?? [];
  const nonEmpty = existing.filter((c) => c.words > 0).length;
  const totalWords = parsed.chapters.reduce((a, c) => a + c.words, 0);

  function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setErr('File too large — 8 MB max.');
      return;
    }
    setErr('');
    f.text().then((t) => {
      setSource(t);
      setFileName(f.name);
    }).catch((e) => setErr(errMsg(e)));
  }

  async function doImport() {
    if (!parsed.chapters.length || busy) return;
    if (mode !== 'append' && nonEmpty > 0) {
      const n = mode === 'fill' ? Math.min(parsed.chapters.length, existing.length) : existing.length;
      if (!window.confirm(`This will overwrite the text of ${n} existing chapter(s). Continue?`)) return;
    }
    setBusy(true);
    setErr('');
    try {
      await api.books.importChapters(id!, {
        mode,
        chapters: parsed.chapters.map((c) => ({ title: c.title, body: c.body })),
      });
      nav(`/books/${id}`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  if (!book) return err ? <div className="alert error">{err}</div> : <Spinner label="Opening importer…" />;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link to={`/books/${id}`} className="btn ghost btn-sm"><ArrowLeft size={14} /> {book.title}</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>Import manuscript</h1>
          <p>Bring the finished book home. Paste the agent's chapters (or upload a .txt/.md file) — headings like <code># Chapter 1: Title</code> split automatically.</p>
        </div>
      </div>
      {err ? <div className="alert error">{err}</div> : null}
      <div className="two-col">
        <Card>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Source text</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {fileName ? <Badge>{fileName}</Badge> : null}
              <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.text" style={{ display: 'none' }}
                onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              <Button small variant="soft" onClick={() => fileRef.current?.click()}><FileUp size={14} /> Upload file</Button>
              {source ? <Button small variant="ghost" onClick={() => { setSource(''); setFileName(''); }}><Trash2 size={14} /> Clear</Button> : null}
            </div>
          </div>
          <textarea className="input" value={source} onChange={(e) => setSource(e.target.value)}
            placeholder={'# Chapter 1: The Night Market\n\nMara slipped through the crowd…\n\n# Chapter 2: Rollback\n\nRyn held her breath…'}
            style={{ minHeight: 340, fontFamily: 'ui-monospace,Menlo,Consolas,monospace', fontSize: 13, lineHeight: 1.6 }} />
          <label className="dim" style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <input type="checkbox" checked={stripNotes} onChange={(e) => setStripNotes(e.target.checked)} />
            Strip agent annotations (word-count lines and trailing NOTEs)
          </label>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <Field label="How should the text land?">
              <div className="seg">
                <button className={mode === 'fill' ? 'selected' : ''} onClick={() => setMode('fill')}>Match in order</button>
                <button className={mode === 'append' ? 'selected' : ''} onClick={() => setMode('append')}>Append</button>
                <button className={mode === 'replace' ? 'selected' : ''} onClick={() => setMode('replace')}>Replace all</button>
              </div>
              <span className="field-hint">{MODE_HELP[mode]}</span>
            </Field>
          </Card>
          <Card>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Preview</h3>
              <span className="dim" style={{ fontSize: 12.5 }}>
                {parsed.chapters.length} chapters · {fmtWords(totalWords)} words{existing.length ? ` · book has ${existing.length}` : ''}
              </span>
            </div>
            {parsed.warnings.map((w) => <div key={w} className="alert error" style={{ marginBottom: 8 }}>{w}</div>)}
            {parsed.chapters.length === 0 ? (
              <p className="dim" style={{ fontSize: 13, margin: 0 }}>Paste or upload a manuscript to see the split.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {parsed.chapters.map((c, i) => (
                  <div key={i} className="row-between" style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 10px' }}>
                    <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong>{i + 1}.</strong> {c.title}
                      <span className="dim" style={{ fontSize: 12 }}>
                        {mode === 'fill' && i < existing.length ? ` → fills “${existing[i]!.title}”` : null}
                        {mode === 'fill' && i >= existing.length ? ' → + new chapter' : null}
                        {mode === 'append' ? ` → appended as #${existing.length + i + 1}` : null}
                      </span>
                    </span>
                    <Badge tone={c.words > 0 ? 'green' : 'dim'}>{fmtWords(c.words)}w</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="row-between mt">
              <span className="dim" style={{ fontSize: 12.5 }}>
                {mode === 'replace' && existing.length > 0 ? `⚠ deletes ${existing.length} existing chapter(s)` : null}
                {mode === 'fill' && nonEmpty > 0 ? `⚠ overwrites text in up to ${Math.min(parsed.chapters.length, existing.length)} chapter(s)` : null}
              </span>
              <Button onClick={doImport} disabled={busy || parsed.chapters.length === 0}>
                {busy ? 'Importing…' : `Import ${parsed.chapters.length} chapter${parsed.chapters.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
