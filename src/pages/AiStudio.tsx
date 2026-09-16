import { useEffect, useState } from 'react';
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus.js';
import { Bot, Send, Copy, Check, ExternalLink, FileText } from 'lucide-react';
import { api, errMsg, type Book, type AiCfg } from '../lib/api.js';
import { copyText } from '../lib/clipboard.js';
import CopyFallback from '../components/CopyFallback.js';
import { Button, Card, Field, Badge, Spinner } from '../components/ui.js';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AiStudio() {
  const [cfg, setCfg] = useState<AiCfg | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookPick, setBookPick] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState<number | 'brief' | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  function loadAi() {
    Promise.all([api.ai.get(), api.books.list()]).then(([c, b]) => {
      setCfg(c);
      setBooks(b);
    }).catch((e) => setErr(errMsg(e)));
  }
  // Re-checks on mount, tab focus, and tab visible — a failed fetch while
  // the server naps can never strand the badge on "no key" again.
  useRefetchOnFocus(loadAi);

  const picked = books.find((b) => String(b.id) === bookPick);
  const brief = picked
    ? `BOOK: "${picked.title}" (${picked.genre}, ${picked.kind})\nPREMISE: ${picked.premise || '(none yet)'}\nAUDIENCE: ${picked.audience || '—'} · TONE: ${picked.tone || '—'}${picked.style ? `\nSTYLE LIKE: ${picked.style}` : ''}`
    : '';

  function copy(text: string, tag: number | 'brief') {
    copyText(text).then((ok) => {
      if (!ok) {
        setFallbackText(text);
        return;
      }
      setCopied(tag);
      setTimeout(() => setCopied((c) => (c === tag ? null : c)), 1500);
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (text.length > 60000) {
      setErr('That message is over 60,000 characters — the chat caps there. Paste shorter sections and go piece by piece.');
      return;
    }
    setErr('');
    setBusy(true);
    setInput('');
    const history: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    try {
      const r = await api.ai.chat({
        ...(bookPick ? { bookId: Number(bookPick) } : {}),
        messages: history,
      });
      setMessages([...history, { role: 'assistant', content: r.text }]);
    } catch (e) {
      // Keep the user's message on screen — it stays put and Retry re-sends it.
      setErr(errMsg(e));
      setMessages(history);
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (busy || messages.length === 0 || messages[messages.length - 1]?.role !== 'user') return;
    setErr('');
    setBusy(true);
    try {
      const r = await api.ai.chat({
        ...(bookPick ? { bookId: Number(bookPick) } : {}),
        messages,
      });
      setMessages([...messages, { role: 'assistant', content: r.text }]);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>AI Studio</h1>
          <p>Write with your own models, keep everything organized here. Chat in-app with your API key — or launch your favorite chat and paste results back into any chapter.</p>
        </div>
      </div>
      {err ? (
        <div className="alert error" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 200 }}>{err}</span>
          {!busy && messages.length > 0 && messages[messages.length - 1]?.role === 'user' ? (
            <Button small variant="soft" onClick={retry}>Retry</Button>
          ) : null}
        </div>
      ) : null}
      {fallbackText !== null ? <CopyFallback text={fallbackText} onClose={() => setFallbackText(null)} /> : null}
      <div className="two-col">
        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Bot size={18} /> Ghostwriter chat</h3>
            {cfg ? <Badge tone={cfg.hasKey || cfg.baseUrl.includes('localhost') || cfg.baseUrl.includes('127.0.0.1') ? 'green' : 'dim'}>{cfg.model || 'no model set'}</Badge> : <Spinner label="" />}
          </div>
          <Field label="Book context (optional)">
            <select className="input" value={bookPick} onChange={(e) => setBookPick(e.target.value)}>
              <option value="">General chat — no book</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', marginBottom: 12, padding: 4 }}>
            {messages.length === 0 ? (
              <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
                Ask for scenes, outlines, rewrites, titles, blurbs — anything. Pick a book above and the
                ghostwriter knows its premise, audience, and tone. Replies can be copied into any chapter with one click.
              </p>
            ) : null}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%',
                background: m.role === 'user' ? 'rgba(212,175,55,.12)' : 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '9px 12px',
              }}>
                <div className="dim" style={{ fontSize: 11, marginBottom: 4 }}>{m.role === 'user' ? 'you' : `ghostwriter${cfg?.model ? ` · ${cfg.model}` : ''}`}</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.65 }}>{m.content}</div>
                {m.role === 'assistant' ? (
                  <div style={{ marginTop: 6 }}>
                    <Button small variant="ghost" onClick={() => copy(m.content, i)}>
                      {copied === i ? <Check size={13} /> : <Copy size={13} />} {copied === i ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <p className="dim" style={{ fontSize: 13 }}>Writing…</p> : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={cfg && !cfg.hasKey && !cfg.baseUrl.includes('localhost') ? 'Add an API key in Settings first…' : 'Ask for a scene, a rewrite, ideas…'}
              style={{ flex: 1 }} />
            <Button onClick={send} disabled={busy || !input.trim()}><Send size={15} /> Send</Button>
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'center' }}><FileText size={18} /> Book brief → any chat</h3>
            <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              Prefer Arena, ChatGPT, or Claude in their own tabs? Copy the brief below so any chat instantly
              knows your book, then paste finished chapters back via <em>Edit</em> in the reader.
            </p>
            {brief ? (
              <>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10 }}>{brief}</pre>
                <Button small variant="soft" onClick={() => copy(brief, 'brief')}>
                  {copied === 'brief' ? <Check size={13} /> : <Copy size={13} />} {copied === 'brief' ? 'Copied' : 'Copy brief'}
                </Button>
              </>
            ) : (
              <p className="dim" style={{ fontSize: 13 }}>Pick a book in the chat panel to generate its brief.</p>
            )}
          </Card>
          <Card>
            <h3 style={{ margin: '0 0 10px' }}>Launch your favorite chat</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="btn soft" href="https://arena.ai" target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open Arena.ai</a>
              <a className="btn soft" href="https://chatgpt.com" target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open ChatGPT</a>
            </div>
            <p className="dim" style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 0 }}>
              Both sites block embedding inside other apps, so they open in a new tab — your books,
              chapters, and audiobooks stay organized here.
            </p>
          </Card>
          <Card>
            <h3 style={{ margin: '0 0 8px' }}>Connection</h3>
            {!cfg ? <Spinner label="Checking…" /> : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge tone={cfg.hasKey ? 'green' : 'dim'}>{cfg.hasKey ? `key set ${cfg.last4}` : 'no key'}</Badge>
                <span className="dim" style={{ fontSize: 13 }}>{cfg.provider} · {cfg.model || 'no model'}</span>
                <Button small variant="ghost" to="/settings">Settings & AI</Button>
                <Button small variant="ghost" onClick={loadAi} title="Re-check the key status with the server">↻</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
