import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Pencil, Save, RefreshCw, Wand2, Sparkles, X, Copy, Check, ClipboardCheck } from 'lucide-react';
import { api, fmtWords, errMsg, type Chapter, type Book, type ApiError, type Review } from '../lib/api.js';
import { copyText } from '../lib/clipboard.js';
import CopyFallback from '../components/CopyFallback.js';
import { Button, Badge, Spinner, Modal, Field } from '../components/ui.js';
import ListenBar from '../components/ListenBar.js';
import ReviewPanel from '../components/ReviewPanel.js';
import { useJob, rememberJob, forgetJob } from '../lib/useJob.js';

export default function ChapterReader() {
  const { chId } = useParams();
  const [data, setData] = useState<{ chapter: Chapter; book: Book; prevId: number | null; nextId: number | null } | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftWords, setDraftWords] = useState(1500);
  const [draft, setDraft] = useState<{ text: string; model: string; words: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selReview, setSelReview] = useState<number | null>(null);
  const [showRevise, setShowRevise] = useState(false);
  const [revChecks, setRevChecks] = useState<boolean[]>([]);
  const [revNotes, setRevNotes] = useState('');
  const [revJobId, setRevJobId] = useState<string | null>(null);
  const { job: revJob, gone: revGone } = useJob(revJobId);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.chapters.get(chId!);
      setData(d);
      try {
        const rl = await api.reviews.list(chId!);
        setReviews(rl);
        setSelReview(rl[0]?.id ?? null);
      } catch { /* reviews optional — chapter still reads */ }
      setTitle(d.chapter.title);
      setBody(d.chapter.body);
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [chId]);
  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  // Revise-job watchers. NOTE: every hook in this file must stay ABOVE the
  // `if (!data)` return below — React hard-crashes the whole page ("rendered
  // more hooks than during the previous render") if any hook runs on some
  // renders but not others. That was the chapter-open blank screen.
  useEffect(() => {
    if (!revJob || revJob.kind !== 'revise') return;
    if (revJob.status === 'done') {
      forgetJob(revJob.id);
      setRevJobId(null);
      setBusy('');
      const r = revJob.result as { words?: number; model?: string } | null;
      void load().then(() => setMsg(`Revision applied${r?.model ? ` by ${r.model}` : ''}${r?.words ? ` (${r.words.toLocaleString('en-US')} words)` : ''}. Review again to confirm every fix landed.`));
    } else if (revJob.status === 'failed') {
      setRevJobId(null);
      setBusy('');
      setErr(revJob.error?.message ?? 'The revision failed.');
    }
  }, [revJob, load]);
  useEffect(() => {
    if (revGone && revJobId) {
      setRevJobId(null);
      setBusy('');
      setErr('The revision left the server (it finished long ago or the server restarted). Reloading to check whether it landed.');
      void load();
    }
  }, [revGone, revJobId, load]);

  if (!data) {
    // A failed load must never strand the page on a spinner: say so + retry.
    if (err) {
      return (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Link to="/" className="btn ghost btn-sm"><ArrowLeft size={14} /> Shelf</Link>
          </div>
          <div className="alert error">{err}</div>
          <Button onClick={() => { setErr(''); load(); }}>↻ Retry opening the chapter</Button>
        </div>
      );
    }
    return <Spinner label="Opening chapter…" />;
  }
  const { chapter, book, prevId, nextId } = data;
  const selReviewData = reviews.find((x) => x.id === selReview) ?? null;
  const paras = (editing ? body : chapter.body).split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean);

  async function save() {
    setBusy('save');
    setErr('');
    try {
      const c = await api.chapters.update(chId!, { title, body });
      setData((prev) => (prev ? { ...prev, chapter: c } : prev));
      setEditing(false);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function regen() {
    setBusy('regen');
    setErr('');
    try {
      const c = await api.chapters.regenerate(chId!);
      setData((prev) => (prev ? { ...prev, chapter: c } : prev));
      setBody(c.body);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function runDraft() {
    if (!draftPrompt.trim()) return;
    setBusy('draft');
    setErr('');
    try {
      const r = await api.ai.draft({ chapterId: Number(chId!), prompt: draftPrompt.trim(), targetWords: draftWords });
      setDraft(r);
    } catch (e) {
      setErr((e as ApiError)?.code === 'NO_KEY'
        ? 'No AI key configured — add one in Settings → AI to draft with a model. Or press Edit and paste text from any chat.'
        : errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function useDraft() {
    if (!draft) return;
    setBusy('usedraft');
    setErr('');
    try {
      const c = await api.chapters.update(chId!, { body: draft.text });
      setData((prev) => (prev ? { ...prev, chapter: c } : prev));
      setBody(c.body);
      setShowDraft(false);
      setDraft(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }
  function copyDraft() {
    if (!draft) return;
    copyText(draft.text).then((ok) => {
      if (!ok) {
        setFallbackText(draft.text);
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  function openDraft() {
    setDraftPrompt(`Write this chapter in full — complete scenes, strong dialogue, sensory detail, and an ending with momentum.`);
    setDraft(null);
    setShowDraft(true);
  }
  function openRevise() {
    const r = reviews.find((x) => x.id === selReview);
    if (!r) return;
    setRevChecks(r.findings.map(() => true));
    setRevNotes('');
    setShowRevise(true);
  }
  async function startRevise() {
    const r = reviews.find((x) => x.id === selReview);
    if (!r) return;
    const fixes = r.findings
      .filter((_, i) => revChecks[i])
      .map((f) => ({ quote: f.quote, issue: f.issue, suggestion: f.suggestion }));
    if (!fixes.length && !revNotes.trim()) {
      setErr('Approve at least one fix (or add a note) before revising.');
      return;
    }
    setErr('');
    setShowRevise(false);
    setBusy('revise');
    try {
      const { jobId: jid } = await api.engine.jobs.startRevise(Number(chId), fixes, revNotes.trim());
      rememberJob({ id: jid, kind: 'revise', label: `Revise · ${fixes.length} fix${fixes.length === 1 ? '' : 'es'}` });
      setRevJobId(jid);
      setMsg(`Revision running — applying ${fixes.length} approved fix${fixes.length === 1 ? '' : 'es'}. The run lives on the server.`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy('');
    }
  }
  async function review() {
    setBusy('review');
    setErr('');
    setMsg('');
    try {
      const r = await api.reviews.run(chId!);
      setReviews((prev) => [r, ...prev]);
      setSelReview(r.id);
      setData((prev) => (prev ? { ...prev, chapter: { ...prev.chapter, review_score: r.score, reviewed_at: r.created_at } } : prev));
      const errs = r.findings.filter((f) => f.severity === 'error').length;
      const warns = r.findings.filter((f) => f.severity === 'warning').length;
      setMsg(`Editor finished — score ${r.score}/100 (${errs} must-fix, ${warns} should-fix). The notes are just below.`);
      setTimeout(() => document.getElementById('editor-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (e) {
      setErr((e as ApiError)?.code === 'NO_KEY'
        ? 'No AI key configured — add one in Settings → AI to run the editor. Your draft is untouched.'
        : errMsg(e));
    } finally {
      setBusy('');
    }
  }
  async function enhance() {
    setBusy('enhance');
    setErr('');
    setMsg('');
    try {
      const c = await api.chapters.enhance(chId!);
      setData((prev) => (prev ? { ...prev, chapter: c } : prev));
      setBody(c.body);
      setMsg(`Enhanced — the text below is the new AI version (${fmtWords(c.words)} words, same plot). Marked ✦ AI-enhanced above.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr((e as ApiError)?.code === 'NO_KEY'
        ? 'No AI key configured — add one in Settings → AI to enhance with a frontier model. Your offline draft is untouched.'
        : errMsg(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="reader">
      <div className="row-between" style={{ marginBottom: 18 }}>
        <Link to={`/books/${book.id}`} className="btn ghost btn-sm"><ArrowLeft size={14} /> {book.title}</Link>
        <div style={{ display: 'flex', gap: 6 }}>
          <Badge>{fmtWords(chapter.words)} words</Badge>
                {(chapter.written_by ?? '') !== '' ? (
                  <Badge tone={chapter.written_by === 'story-engine' ? 'dim' : 'gold'} title={`Written by ${chapter.written_by}`}>
                    {chapter.written_by === 'story-engine' ? 'story engine' : chapter.written_by === 'import' ? 'imported' : `✦ ${chapter.written_by.includes('/') ? chapter.written_by.slice(chapter.written_by.lastIndexOf('/') + 1) : chapter.written_by}`}
                  </Badge>
                ) : chapter.ai_enhanced ? <Badge tone="gold">✦ AI-enhanced</Badge> : <Badge>draft</Badge>}
        </div>
      </div>
      <div className="ch-no">Chapter {chapter.idx + 1} of {book.kind === 'fiction' ? 'the novel' : 'the book'}</div>
      {editing ? (
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontFamily: 'Georgia,serif', fontSize: 24, textAlign: 'center', marginBottom: 16 }} />
      ) : (
        <h1>{chapter.title}</h1>
      )}
      <div className="reader-tools">
        {editing ? (
          <>
            <Button small onClick={save} disabled={!!busy}><Save size={14} /> {busy === 'save' ? 'Saving…' : 'Save'}</Button>
            <Button small variant="ghost" onClick={() => { setEditing(false); setBody(chapter.body); setTitle(chapter.title); }}><X size={14} /> Cancel</Button>
          </>
        ) : (
          <>
            {!chapter.body ? <Button small variant="soft" onClick={openDraft}><Sparkles size={14} /> Draft with AI</Button> : null}
            <Button small variant="soft" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>
            <Button small variant="ghost" onClick={regen} disabled={!!busy}><RefreshCw size={14} /> {busy === 'regen' ? 'Rewriting…' : 'Regenerate'}</Button>
            <Button small variant="soft" onClick={enhance} disabled={!!busy} title="Rewrites this chapter with your AI model — same plot and beats, richer prose. Costs one AI call."><Wand2 size={14} /> {busy === 'enhance' ? 'Enhancing… (up to a few min)' : 'Enhance with AI'}</Button>
            <Button small variant="ghost" onClick={review} disabled={!!busy || !chapter.body} title={chapter.body ? 'The AI editor scores this chapter 0–100 and lists every issue (accuracy, syntax, cadence) with fixes. Costs one AI call; your text is untouched.' : 'Write the chapter before reviewing it'}><ClipboardCheck size={14} /> {busy === 'review' ? 'Reviewing… (up to a few min)' : 'Review'}</Button>
            <Button small variant="soft" onClick={openRevise} disabled={!!busy || !!revJobId || !selReviewData || selReviewData.findings.length === 0} title="Tick the review fixes you approve, then the AI revises the chapter applying only those. Costs one AI call."><Pencil size={14} /> Revise…</Button>
          </>
        )}
      </div>
      {!editing ? <ListenBar chapterNo={chapter.idx + 1} title={chapter.title} text={chapter.body} /> : null}
      {err ? <div className="alert error">{err}</div> : null}
      {msg ? <div className="alert ok">{msg}</div> : null}
      {revJobId ? (
        <div className="alert" style={{ marginBottom: 12 }}>
          {revJob && revJob.events.length ? revJob.events[revJob.events.length - 1]!.msg : 'Revision accepted — starting…'}
        </div>
      ) : null}
      {fallbackText !== null ? <CopyFallback text={fallbackText} onClose={() => setFallbackText(null)} /> : null}
      {busy === 'review' ? <div className="dim" style={{ fontSize: 13, marginTop: 8 }}>The editor is reading for accuracy, syntax, and cadence…</div> : null}
      {reviews.length > 0 ? <ReviewPanel reviews={reviews} selId={selReview} onPick={setSelReview} /> : null}
      {editing ? (
        <textarea className="input" value={body} onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: 480, fontFamily: 'Georgia,serif', fontSize: 16, lineHeight: 1.8 }} />
      ) : (
        <div className="reader-body">
          {paras.length === 0 ? <p className="dim">This chapter is empty. Draft it with AI, or press Edit and paste text from any chat.</p> : null}
          {paras.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br/>') }} />
          ))}
        </div>
      )}
      {showRevise && selReviewData ? (
        <Modal title={`Revise from review — score ${selReviewData.score}/100`} onClose={() => setShowRevise(false)}>
          <p className="dim" style={{ fontSize: 13 }}>
            Tick the fixes you approve. The revision applies <em>only</em> these — everything else in your chapter stays untouched.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0', maxHeight: 320, overflowY: 'auto' }}>
            {selReviewData.findings.map((f, i) => (
              <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={revChecks[i] ?? false} onChange={() => setRevChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))} style={{ marginTop: 3 }} />
                <span>
                  <strong>[{f.severity}] {f.category}</strong> — {f.issue}
                  <br /><span className="dim">“{f.quote}”</span>
                  <br /><span className="dim">Fix: {f.suggestion}</span>
                </span>
              </label>
            ))}
          </div>
          <Field label="Extra notes for the revision (optional)">
            <textarea className="input" value={revNotes} onChange={(e) => setRevNotes(e.target.value)}
              placeholder="e.g. keep the innkeeper's joke, but fix the timeline…" style={{ minHeight: 64 }} />
          </Field>
          <div className="row-between mt">
            <Button variant="ghost" onClick={() => setShowRevise(false)}>Cancel</Button>
            <Button onClick={startRevise} disabled={busy === 'revise' || (revChecks.every((v) => !v) && !revNotes.trim())}>
              {busy === 'revise' ? 'Starting…' : `Approve & revise (${revChecks.filter(Boolean).length} fixes)`}
            </Button>
          </div>
        </Modal>
      ) : null}
      {showDraft ? (
        <Modal title={`Draft with AI — Chapter ${chapter.idx + 1}`} onClose={() => setShowDraft(false)}>
          <Field label="Direction for the model" hint="The model already knows your book brief, this chapter's summary, and where the last chapter ended.">
            <textarea className="input" value={draftPrompt} onChange={(e) => setDraftPrompt(e.target.value)} style={{ minHeight: 90 }} />
          </Field>
          <Field label="Target words (200–4000)">
            <input className="input" type="number" min={200} max={4000} step={100} value={draftWords}
              onChange={(e) => setDraftWords(Math.max(200, Math.min(4000, Number(e.target.value) || 1500)))} />
          </Field>
          {!draft ? (
            <div className="row-between mt">
              <Button variant="ghost" onClick={() => setShowDraft(false)}>Cancel</Button>
              <Button onClick={runDraft} disabled={busy === 'draft' || !draftPrompt.trim()}>
                <Sparkles size={14} /> {busy === 'draft' ? 'Drafting… (up to a few min)' : 'Draft chapter'}
              </Button>
            </div>
          ) : (
            <div>
              <div className="row-between" style={{ margin: '12px 0 8px' }}>
                <span className="dim" style={{ fontSize: 12.5 }}>{draft.model} · {draft.words.toLocaleString()} words</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button small variant="ghost" onClick={copyDraft}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}</Button>
                  <Button small variant="ghost" onClick={runDraft} disabled={busy === 'draft'}><RefreshCw size={13} /> Redo</Button>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'Georgia,serif', fontSize: 14.5, lineHeight: 1.75, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 12 }}>{draft.text}</div>
              <div className="row-between mt">
                <Button variant="ghost" onClick={() => setShowDraft(false)}>Discard</Button>
                <Button onClick={useDraft} disabled={busy === 'usedraft'}><Save size={14} /> {busy === 'usedraft' ? 'Saving…' : 'Use as chapter text'}</Button>
              </div>
            </div>
          )}
        </Modal>
      ) : null}
      <div className="reader-nav">
        {prevId ? <Link to={`/read/${prevId}`} className="btn soft btn-sm"><ArrowLeft size={14} /> Prev</Link> : <span />}
        {nextId ? <Link to={`/read/${nextId}`} className="btn soft btn-sm">Next <ArrowRight size={14} /></Link> : <span />}
      </div>
    </div>
  );
}
