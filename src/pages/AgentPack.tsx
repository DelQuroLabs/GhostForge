import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Terminal, Copy, Check, Download } from 'lucide-react';
import { api, errMsg, type Book } from '../lib/api.js';
import { copyText } from '../lib/clipboard.js';
import CopyFallback from '../components/CopyFallback.js';
import { Button, Card, Field, Spinner } from '../components/ui.js';

type Pack = { bookId: number; title: string; filename: string; text: string };

export default function AgentPack() {
  const [params] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [pick, setPick] = useState(params.get('book') ?? '');
  const [build, setBuild] = useState<'serial' | 'full'>('serial');
  const [pack, setPack] = useState<Pack | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  useEffect(() => {
    api.books.list().then(setBooks).catch((e) => setErr(errMsg(e)));
  }, []);
  useEffect(() => {
    if (!pick) {
      setPack(null);
      return;
    }
    setBusy(true);
    setErr('');
    api.books.agentPack(pick, build)
      .then(setPack)
      .catch((e) => {
        setErr(errMsg(e));
        setPack(null);
      })
      .finally(() => setBusy(false));
  }, [pick, build]);

  function copy() {
    if (!pack) return;
    copyText(pack.text).then((ok) => {
      if (!ok) {
        setFallbackText(pack.text);
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  const [packUrl, setPackUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pack) {
      setPackUrl(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([pack.text], { type: 'text/markdown' }));
    setPackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pack]);

  const words = pack ? pack.text.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Agent Pack</h1>
          <p>Raw copy-paste fuel for agent models. Pick a book, copy the pack, paste it into Arena.ai Agent Mode — the agent writes the book while series canon stays in tact here.</p>
        </div>
      </div>
      {err ? <div className="alert error">{err}</div> : null}
      {fallbackText !== null ? <CopyFallback text={fallbackText} onClose={() => setFallbackText(null)} /> : null}
      <div className="two-col">
        <div>
          <Field label="Book to pack">
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">— pick a book —</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}{b.series_title ? ` (${b.series_title}${b.series_number ? ` #${b.series_number}` : ''})` : ''}</option>)}
            </select>
          </Field>
          <Field label="Build mode">
            <div className="seg">
              <button className={build === 'serial' ? 'selected' : ''} onClick={() => setBuild('serial')}>Serial</button>
              <button className={build === 'full' ? 'selected' : ''} onClick={() => setBuild('full')}>Full book</button>
            </div>
            <span className="field-hint">{build === 'serial' ? 'One chapter per reply — the agent waits for “next”. Best for long books.' : 'The agent writes the entire book back-to-back, resuming past limits unprompted. Best for short books.'}</span>
          </Field>
          {busy ? <Spinner label="Building pack…" /> : null}
          {pack ? (
            <Card>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span className="dim" style={{ fontSize: 12.5 }}>{pack.filename} · {words.toLocaleString()} words · {(pack.text.length / 1024).toFixed(1)} KB</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button small variant="soft" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy raw pack'}</Button>
                  {packUrl ? <a className="btn ghost btn-sm" href={packUrl} download={pack!.filename} title="If the download doesn't start, right-click → “Save link as…”"><Download size={13} /> .md</a> : null}
                </div>
              </div>
              <pre style={{
                whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.6, maxHeight: 560, overflowY: 'auto',
                background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 8, padding: 14, margin: 0, fontFamily: 'ui-monospace,Menlo,Consolas,monospace',
              }}>{pack.text}</pre>
            </Card>
          ) : !busy ? (
            <Card><p className="dim" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65 }}>
              <Terminal size={15} style={{ verticalAlign: -2 }} /> Pick a book to generate its raw agent prompt —
              series bible, cast, chapter plan, style rules, and an output contract the agent must follow.
            </p></Card>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 8px' }}>How to run it</h3>
            <ol className="dim" style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
              <li>Create a <strong>Blank Shell</strong> with your premise (add chapter summaries if you have them).</li>
              <li>Open its Agent Pack here and copy the raw text.</li>
              <li>Paste into <strong>Arena.ai Agent Mode</strong> — serial (one chapter per reply, you say “next”) or full-book, your pick above.</li>
              <li>Bring the finished manuscript home via <em>Import</em> on the book page — chapters split automatically.</li>
              <li>Next book in the series? Same flow — the pack carries all prior canon forward.</li>
            </ol>
          </Card>
          <Card>
            <h3 style={{ margin: '0 0 8px' }}>What the agent receives</h3>
            <ul className="dim" style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
              <li>Series bible: earlier books, premises, chapter lists, continuity rules</li>
              <li>Book spec: genre, audience, tone, style-like, POV, target length</li>
              <li>Cast + chapter plan (or orders to propose one first)</li>
              <li>LitRPG system rules when the genre is LitRPG</li>
              <li>Output contract: serial (chapter-by-chapter) or full-book build with tally</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
