import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Trash2, Download, Wand2, CheckCircle2, BookOpen, Plus, Pencil, Terminal, Upload, ClipboardCheck, Copy, Check, Eye, ExternalLink, PenLine } from 'lucide-react';
import { api, fmtWords, errMsg, type Book, type Chapter, type CharRow, type ApiError, type GateMode, type Job } from '../lib/api.js';
import { useJob, rememberJob, forgetJob, trackedJobs } from '../lib/useJob.js';

const parseStep = (s: string): { brief: string; cards: string; verdict: string } => {
  try {
    const o = JSON.parse(s) as { brief?: unknown; cards?: unknown; verdict?: unknown };
    return {
      brief: typeof o.brief === 'string' ? o.brief : '',
      cards: typeof o.cards === 'string' ? o.cards : '',
      verdict: typeof o.verdict === 'string' ? o.verdict : '',
    };
  } catch {
    return { brief: '', cards: '', verdict: '' };
  }
};
import { Button, Card, Tabs, Badge, Spinner, Progress, EmptyState, Modal, Field } from '../components/ui.js';
import Cover, { coverSvgString, downloadCoverSVG } from '../components/Cover.js';
import AudioTab from './AudioTab.js';
import EditorTab from './EditorTab.js';
import PlanTab from './PlanTab.js';
import { slugify } from '../lib/download.js';
import { copyText } from '../lib/clipboard.js';
import CopyFallback from '../components/CopyFallback.js';
import { scoreTone } from '../components/ReviewPanel.js';

type Full = Book & { chapters: Chapter[]; characters: CharRow[] };
const STAGE_ORDER = ['premise', 'outline', 'characters', 'draft', 'done'];
const shortWriter = (w: string): string => (w.includes('/') ? w.slice(w.lastIndexOf('/') + 1) : w);
const EXPORT_FORMATS: Array<[string, string, string, string]> = [
  ['epub', 'epub', 'EPUB', 'Kindle / Apple Books'],
  ['md', 'md', 'Markdown', 'Universal source'],
  ['html', 'html', 'HTML', 'Print-ready read'],
  ['txt', 'txt', 'Plain text', 'Logline-agnostic'],
  ['kdp', 'md', 'KDP kit', 'Blurb + cats + keywords'],
  ['json', 'json', 'JSON', 'Full backup'],
];

function GateProgress({ job }: { job: Job | null }) {
  if (!job) return <>Starting the gates run…</>;
  const f = job.facts as { i?: number; n?: number };
  const multi = typeof f.n === 'number' && f.n > 1 ? ` · chapter ${(f.i ?? 0) + 1}/${f.n}` : '';
  const latest = job.events.length ? job.events[job.events.length - 1]!.msg : 'starting…';
  return (<><strong>{job.label}</strong>{multi} — {latest}</>);
}

export default function BookWorkspace() {
  const { id } = useParams();
  const nav = useNavigate();
  const [book, setBook] = useState<Full | null>(null);
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [enh, setEnh] = useState<{ i: number; n: number } | null>(null);
  const [rev, setRev] = useState<{ i: number; n: number } | null>(null);
  const [wrt, setWrt] = useState<{ i: number; n: number } | null>(null);
  const [gateJobId, setGateJobId] = useState<string | null>(null);
  const { job: gateJob, gone: gateGone } = useJob(gateJobId);
  const [gateResume, setGateResume] = useState(() => trackedJobs().find((t) => t.kind === 'gates') ?? null);
  const [gateNotes, setGateNotes] = useState<Record<number, string>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [showAddCh, setShowAddCh] = useState(false);
  const [chTitle, setChTitle] = useState('');
  const [chSummary, setChSummary] = useState('');
  const [showEditBook, setShowEditBook] = useState(false);
  const [showChar, setShowChar] = useState(false);
  const [editChar, setEditChar] = useState<CharRow | null>(null);
  const [charForm, setCharForm] = useState({ name: '', role: '', description: '', arc: '' });
  const [editBook, setEditBook] = useState({ title: '', subtitle: '', logline: '', blurb: '', genre: '', audience: '', tone: '' });
  const [msg, setMsg] = useState('');
  const [dlMsg, setDlMsg] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState('');
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [viewed, setViewed] = useState<{ label: string; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setBook(await api.books.get(id!));
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  // Pre-serialize the rendered cover so its download is a plain native link
  // (works even where programmatic downloads are blocked).
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (tab !== 'publish' || !book) return;
    const t = setTimeout(() => {
      const svg = coverSvgString();
      if (!svg) return;
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      setCoverUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    }, 60);
    return () => clearTimeout(t);
  }, [tab, book]);

  // Gates-job watchers. NOTE: every hook in this file must stay ABOVE the
  // `if (!book)` return below — React hard-crashes the whole page ("rendered
  // more hooks than during the previous render") if any hook runs on some
  // renders but not others. That was the book-open blank screen.
  useEffect(() => {
    if (!gateJob || gateJob.kind !== 'gates') return;
    const f = gateJob.facts as { i?: number; n?: number };
    if (typeof f.i === 'number' && typeof f.n === 'number') setWrt({ i: f.i, n: f.n });
    if (gateJob.status === 'done') {
      forgetJob(gateJob.id);
      setGateJobId(null);
      setBusy('');
      setWrt(null);
      const r = gateJob.result as { chapterIds?: number[]; wordsTotal?: number; model?: string } | null;
      const n = r?.chapterIds?.length ?? 0;
      const words = (r?.wordsTotal ?? 0).toLocaleString('en-US');
      const model = r?.model ?? 'the model';
      void load().then(() => setMsg(n > 1
        ? `Novel Engine finished: ${n} chapters (${words} words) written by ${model}. The ledger tracked every one.`
        : `Chapter written by ${model} (${words} words).`));
    } else if (gateJob.status === 'failed') {
      setGateJobId(null);
      setBusy('');
      setWrt(null);
      setErr(gateJob.error?.message ?? 'The gates run failed.');
      void load();
    }
  }, [gateJob, load]);
  useEffect(() => {
    if (gateGone && gateJobId) {
      setGateJobId(null);
      setBusy('');
      setWrt(null);
      setErr('The gates run left the server (it finished long ago or the server restarted). Any chapters that landed are saved — reloading.');
      void load();
    }
  }, [gateGone, gateJobId, load]);

  if (!book) {
    // A failed load must never strand the page on a spinner: say so + retry.
    if (err) {
      return (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Link to="/" className="btn ghost btn-sm"><ArrowLeft size={14} /> Shelf</Link>
          </div>
          <div className="alert error">{err}</div>
          <Button onClick={() => { setErr(''); load(); }}>↻ Retry opening the book</Button>
        </div>
      );
    }
    return <Spinner label="Opening the manuscript…" />;
  }

  const chapters = book.chapters;
  const totalWords = chapters.reduce((a, c) => a + c.words, 0);
  const forged = chapters.filter((c) => c.words > 0).length;
  const aiCount = chapters.filter((c) => c.ai_enhanced).length;
  const stageIdx = STAGE_ORDER.indexOf(book.stage);
  const nextStage = STAGE_ORDER[stageIdx + 1];

  async function advance() {
    if (!nextStage) return;
    setBusy('advance');
    setErr('');
    try {
      setBook(await api.books.advance(id!, nextStage));
      if (nextStage === 'draft') setTab('outline');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function forgeDraft(force = false) {
    setBusy('forge');
    setErr('');
    try {
      setBook(await api.books.forgeDraft(id!, force));
      setTab('outline');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function enhanceAll() {
    if (!chapters.length || enh) return;
    if (!window.confirm(`Rewrite all ${chapters.length} chapters with AI? Each chapter costs one large AI call (the priciest step), and each draft is replaced by its AI version. This takes several minutes.`)) return;
    setErr('');
    setMsg('');
    setEnh({ i: 0, n: chapters.length });
    try {
      for (let i = 0; i < chapters.length; i++) {
        setEnh({ i, n: chapters.length });
        await api.chapters.enhance(String(chapters[i]!.id));
      }
      await load();
      setMsg(`Enhanced ${chapters.length}/${chapters.length} chapters — rows marked ✦ AI below. Open any chapter to read the new version.`);
    } catch (e) {
      const code = (e as ApiError)?.code;
      setErr(code === 'NO_KEY'
        ? 'No AI key configured. The offline draft is complete — add a key in Settings → AI to enhance chapters with a frontier model.'
        : errMsg(e));
      await load();
    } finally {
      setEnh(null);
    }
  }

  async function delChapter(c: Chapter) {
    if (!window.confirm(c.words > 0
      ? `Delete "${c.title}" (${fmtWords(c.words)} words)? Its text is gone for good. The outline renumbers.`
      : `Delete "${c.title}" from the outline? The outline renumbers.`)) return;
    setBusy(`delch${c.id}`);
    setErr('');
    try {
      await api.chapters.remove(String(c.id));
      await load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  function openCharModal(c: CharRow | null) {
    setEditChar(c);
    setCharForm(c ? { name: c.name, role: c.role, description: c.description, arc: c.arc } : { name: '', role: '', description: '', arc: '' });
    setShowChar(true);
  }

  async function saveChar() {
    if (!charForm.name.trim()) return;
    setBusy('savechar');
    setErr('');
    try {
      if (editChar) await api.chars.update(editChar.id, { ...charForm, name: charForm.name.trim() });
      else await api.chars.add(id!, { ...charForm, name: charForm.name.trim() });
      setShowChar(false);
      await load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function delChar(c: CharRow) {
    if (!window.confirm(`Remove ${c.name} from the cast?`)) return;
    setBusy(`delchar${c.id}`);
    setErr('');
    try {
      await api.chars.remove(c.id);
      await load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function reviewAll() {
    const targets = chapters.filter((c) => c.words > 0);
    if (!targets.length || rev) return;
    if (!window.confirm(`Send ${targets.length} chapter${targets.length > 1 ? 's' : ''} to the editor? Each chapter costs one AI call (pennies on a mini model). Your text is untouched — you get a score plus fix-it notes per chapter.`)) return;
    setErr('');
    setMsg('');
    setRev({ i: 0, n: targets.length });
    try {
      const scores: number[] = [];
      for (let i = 0; i < targets.length; i++) {
        setRev({ i, n: targets.length });
        const r = await api.reviews.run(String(targets[i]!.id));
        scores.push(r.score);
      }
      await load();
      const avg = Math.round(scores.reduce((a, s) => a + s, 0) / scores.length);
      setMsg(`Editor finished: ${scores.length}/${targets.length} chapters, average score ${avg}/100. Open any chapter to read its notes.`);
    } catch (e) {
      const code = (e as ApiError)?.code;
      setErr(code === 'NO_KEY'
        ? 'No AI key configured. Add one in Settings → AI to run the editor.'
        : errMsg(e));
      await load();
    } finally {
      setRev(null);
    }
  }

  async function runGates(c: Chapter, mode: GateMode, force = false) {
    if (wrt || busy || gateJobId) return;
    if ((mode === 'write' || mode === 'fast') && c.words > 0 && !force) {
      if (!window.confirm(`Chapter ${c.idx + 1} already has text. Overwrite it by re-running the gates? The current text is replaced.`)) return;
      force = true;
    }
    setBusy(`wrt${c.id}`);
    setErr('');
    setMsg('');
    if (mode === 'write' || mode === 'fast') {
      // Gates 3–6 run for minutes — start a job and poll it, so a dropped tab
      // or proxy never kills the run. Brief/cards stay sync (one quick call).
      try {
        const { jobId: jid } = await api.engine.jobs.startGates(id!, [c.id], mode, force || undefined);
        rememberJob({ id: jid, kind: 'gates', label: `Chapter ${c.idx + 1} · ${mode}`, bookId: id });
        setGateResume(null);
        setGateJobId(jid);
        setMsg(mode === 'fast'
          ? `Fast 1–6 running for chapter ${c.idx + 1} — progress shows above; the run lives on the server.`
          : `Gates 3–6 running for chapter ${c.idx + 1} — progress shows above; the run lives on the server.`);
      } catch (e) {
        setErr(errMsg(e));
        setBusy('');
      }
      return;
    }
    try {
      await api.engine.gates(id!, c.id, mode, { note: gateNotes[c.id]?.trim() || undefined, force: force || undefined });
      await load();
      if (mode === 'brief') setMsg(`Gate 1 brief ready for chapter ${c.idx + 1} — review it below, then run Cards.`);
      else setMsg(`Gate 2 scene cards ready for chapter ${c.idx + 1} — review them below, then Write.`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function writeAllChapters() {
    const targets = chapters.filter((c) => c.words === 0);
    if (!targets.length || wrt || gateJobId) return;
    if (!window.confirm(`Fast-write ${targets.length} chapter${targets.length > 1 ? 's' : ''} with the Novel Engine? Gates 1–6 run without stopping (5 AI calls per chapter). The run lives on the server — progress shows above even if this tab naps.`)) return;
    setErr('');
    setMsg('');
    setWrt({ i: 0, n: targets.length });
    try {
      const { jobId: jid } = await api.engine.jobs.startGates(id!, targets.map((t) => t.id), 'fast');
      rememberJob({ id: jid, kind: 'gates', label: `${targets.length} chapters · fast`, bookId: id });
      setGateResume(null);
      setGateJobId(jid);
      setMsg(`Fast 1–6 running for ${targets.length} chapters — progress shows above; the run lives on the server.`);
    } catch (e) {
      setErr(errMsg(e));
      setWrt(null);
    }
  }

  function copyPlainLink(fmt: string, label: string) {
    const url = `${window.location.origin}${api.books.exportUrl(id!, fmt)}`;
    copyText(url).then((ok) => {
      if (!ok) {
        setFallbackText(url);
        return;
      }
      setCopiedLink(fmt);
      setTimeout(() => setCopiedLink((cur) => (cur === fmt ? '' : cur)), 1500);
    });
    setDlMsg({ tone: 'info', text: `${label} link ready — paste it into any browser tab's address bar to download.` });
  }

  async function viewText(fmt: string, label: string) {
    setBusy(`view-${fmt}`);
    setErr('');
    try {
      const res = await fetch(api.books.exportUrl(id!, fmt));
      if (!res.ok) throw new Error(`${label} failed (${res.status})`);
      setViewed({ label, text: await res.text() });
    } catch (e) {
      setDlMsg({ tone: 'error', text: errMsg(e) });
    } finally {
      setBusy('');
    }
  }

  function copyViewed() {
    if (!viewed) return;
    copyText(viewed.text).then((ok) => {
      if (!ok) setFallbackText(viewed.text);
      else {
        setCopiedLink('viewed');
        setTimeout(() => setCopiedLink((cur) => (cur === 'viewed' ? '' : cur)), 1500);
      }
    });
  }

  function copyCover() {
    const svg = coverSvgString();
    if (!svg) {
      setDlMsg({ tone: 'error', text: 'Cover is still rendering — wait a beat and try again.' });
      return;
    }
    copyText(svg).then((ok) => {
      if (!ok) {
        setFallbackText(svg);
        return;
      }
      setCopiedLink('cover');
      setDlMsg({ tone: 'info', text: 'Cover SVG copied — paste it into a text file ending in .svg.' });
      setTimeout(() => setCopiedLink((cur) => (cur === 'cover' ? '' : cur)), 1600);
    });
  }

  async function markPublished() {
    setBusy('pub');
    try {
      const upd = await api.books.update(id!, { status: 'published' });
      setBook((prev) => (prev ? { ...upd, chapters, characters: prev.characters } : prev));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function doDelete() {
    if (busy) return;
    setBusy('delete');
    setErr('');
    try {
      await api.books.remove(id!);
      nav('/');
    } catch (e) {
      setErr(errMsg(e));
      setShowDelete(false);
    } finally {
      setBusy('');
    }
  }

  async function addChapter() {
    if (!chTitle.trim()) return;
    setBusy('addch');
    setErr('');
    try {
      await api.books.addChapter(id!, { title: chTitle.trim(), summary: chSummary.trim() });
      setChTitle('');
      setChSummary('');
      setShowAddCh(false);
      setTab('outline');
      await load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function saveBookDetails() {
    setBusy('editbook');
    setErr('');
    try {
      await api.books.update(id!, {
        title: editBook.title.trim() || book?.title || 'Untitled Book',
        subtitle: editBook.subtitle, logline: editBook.logline, blurb: editBook.blurb,
        genre: editBook.genre.trim() || book?.genre || 'General',
        audience: editBook.audience, tone: editBook.tone,
      });
      setShowEditBook(false);
      await load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  function openEditBook() {
    if (!book) return;
    setEditBook({
      title: book.title, subtitle: book.subtitle ?? '', logline: book.logline ?? '', blurb: book.blurb ?? '',
      genre: book.genre, audience: book.audience ?? '', tone: book.tone ?? '',
    });
    setShowEditBook(true);
  }

  const seriesLine = book.series_title ? `${book.series_title}${book.series_number ? ` #${book.series_number}` : ''}` : undefined;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link to="/" className="btn ghost btn-sm"><ArrowLeft size={14} /> Shelf</Link>
      </div>
      {err ? <div className="alert error">{err}</div> : null}
      {msg ? <div className="alert ok">{msg}</div> : null}
      {gateJobId ? (
        <div className="alert" style={{ marginBottom: 12 }}>
          <GateProgress job={gateJob} />
        </div>
      ) : null}
      {gateResume && !gateJobId ? (
        <div className="alert" style={{ marginBottom: 12 }}>
          A gates run (“{gateResume.label}”, started {new Date(gateResume.at).toLocaleTimeString()}) may still be going on the server.
          {' '}<Button small onClick={() => { setGateJobId(gateResume.id); setGateResume(null); }}>Reattach</Button>
          {' '}<Button small variant="ghost" onClick={() => { forgetJob(gateResume.id); setGateResume(null); }}>Dismiss</Button>
        </div>
      ) : null}
      {fallbackText !== null ? <CopyFallback text={fallbackText} onClose={() => setFallbackText(null)} /> : null}
      <div className="ws-head">
        <Cover title={book.title} author={book.pen_name ?? 'Ghostforge'} cover={book.cover_cfg} seriesLine={seriesLine} />
        <div className="ws-title" style={{ flex: 1, minWidth: 260 }}>
          <h1>{book.title}</h1>
          {book.subtitle ? <div className="sub">{book.subtitle}</div> : null}
          <div className="dim" style={{ fontSize: 13 }}>
            by {book.pen_name ?? '—'} · {book.genre} · {book.kind}
            {seriesLine ? <> · {seriesLine}</> : null}
          </div>
          <div className="ws-badges">
            <Badge tone={book.status === 'complete' || book.status === 'published' ? 'green' : 'gold'}>{book.status}</Badge>
            <Badge>{book.mode}</Badge>
            <Badge tone="blue">{fmtWords(totalWords)} words</Badge>
            {aiCount > 0 ? <Badge tone="gold">✦ {aiCount} AI-written</Badge> : null}
          </div>
          <div className="ws-actions">
            {chapters.length === 0 ? (
              <Button small onClick={() => setShowAddCh(true)}><Plus size={14} /> Add your first chapter</Button>
            ) : book.mode === 'engine' && forged < chapters.length ? (
              <Button small onClick={() => setTab('outline')}>
                <PenLine size={14} /> Write chapters ({chapters.length - forged} left)
              </Button>
            ) : forged < chapters.length ? (
              <Button small onClick={() => forgeDraft(false)} disabled={!!busy}>
                <Sparkles size={14} /> {busy === 'forge' ? 'Forging…' : `Forge full draft (${chapters.length} chapters)`}
              </Button>
            ) : (
              <Button small variant="soft" to={`/read/${chapters[0]?.id}`}><BookOpen size={14} /> Read from Chapter 1</Button>
            )}
            {book.status !== 'published' && chapters.length > 0 && forged === chapters.length ? (
              <Button small variant="ghost" onClick={markPublished} disabled={!!busy}><CheckCircle2 size={14} /> Mark published</Button>
            ) : null}
            <Button small variant="ghost" onClick={openEditBook}><Pencil size={14} /> Edit details</Button>
            <Button small variant="ghost" to={`/agent-pack?book=${id}`}><Terminal size={14} /> Agent Pack</Button>
            <Button small variant="ghost" to={`/books/${id}/import`}><Upload size={14} /> Import</Button>
            <Button small variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={14} /> Delete</Button>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'plan', label: 'Plan' },
          { id: 'outline', label: forged < chapters.length ? 'Outline' : 'Chapters', count: chapters.length },
          { id: 'characters', label: 'Characters', count: book.characters.length },
          { id: 'editor', label: 'Editor-in-Chief' },
          { id: 'publish', label: 'Publish Kit' },
          { id: 'audio', label: 'Audiobook' },
        ]}
        active={tab} onPick={setTab}
      />

      {tab === 'overview' ? (
        <div>
          {book.mode === 'guided' && book.stage !== 'done' ? (
            <Card className="mt">
              <div className="row-between">
                <strong>Guided build — approve each stage</strong>
                <Button small onClick={advance} disabled={busy === 'advance'}>
                  {busy === 'advance' ? 'Working…' : nextStage === 'draft' ? 'Approve & forge full draft' : `Approve ${book.stage} → ${nextStage}`}
                </Button>
              </div>
              <div className="stepper">
                {STAGE_ORDER.map((s) => (
                  <div key={s} className={`step ${STAGE_ORDER.indexOf(s) < stageIdx || (s === 'premise') ? 'done' : ''} ${s === book.stage ? 'now' : ''}`}>
                    {s === book.stage ? `▸ ${s}` : s}
                  </div>
                ))}
              </div>
              <p className="dim" style={{ fontSize: 13, margin: 0 }}>
                {book.stage === 'outline' ? 'Review the chapter-by-chapter outline below, then approve to lock it.' : null}
                {book.stage === 'characters' ? 'Review the cast, then approve — the forge will write every chapter next.' : null}
              </p>
            </Card>
          ) : null}
          <div className="two-col mt">
            <Card>
              <h3 className="field-label">Logline</h3>
              <p style={{ lineHeight: 1.65 }}>{book.logline || '—'}</p>
              <h3 className="field-label" style={{ marginTop: 16 }}>Blurb (KDP description)</h3>
              <p className="blurb">{book.blurb || '—'}</p>
            </Card>
            <Card>
              <h3 className="field-label">Manuscript stats</h3>
              <dl className="kv">
                <dt>Chapters</dt><dd>{forged} / {chapters.length} forged</dd>
                <dt>Words</dt><dd>{fmtWords(totalWords)} (target {fmtWords(book.target_words)})</dd>
                <dt>AI-enhanced</dt><dd>{aiCount} chapters</dd>
                <dt>Audience</dt><dd>{book.audience || '—'}</dd>
                <dt>Tone</dt><dd>{book.tone || '—'}</dd>
                {book.style ? <><dt>Style like</dt><dd>{book.style}</dd></> : null}
                {book.kind === 'fiction' ? <><dt>POV</dt><dd>{book.pov} · {book.tense}</dd></> : null}
              </dl>
              <h3 className="field-label" style={{ marginTop: 16 }}>Premise seed</h3>
              <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{book.premise}</p>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'plan' ? (
        <PlanTab key={book.updated_at} book={book} reload={load} onErr={setErr} onApproved={() => setTab('outline')} />
      ) : null}

      {tab === 'outline' ? (
        <div>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="dim" style={{ fontSize: 13 }}>{forged} of {chapters.length} chapters forged · {fmtWords(totalWords)} words{(() => {
              const scored = chapters.filter((c) => c.review_score != null);
              const parts: string[] = [];
              if (scored.length) {
                const avg = Math.round(scored.reduce((a, c) => a + (c.review_score ?? 0), 0) / scored.length);
                parts.push(`editor: ${scored.length}/${chapters.length} reviewed, avg ${avg}`);
              }
              const written = chapters.filter((c) => (c.written_by ?? '') !== '');
              if (written.length) {
                const uniq = [...new Set(written.map((c) => c.written_by))];
                parts.push(uniq.length === 1 ? `written by ${shortWriter(uniq[0]!)} (${written.length}/${chapters.length})` : `writers: ${uniq.map(shortWriter).join(', ')}`);
              }
              return parts.length ? ` · ${parts.join(' · ')}` : '';
            })()}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button small variant="ghost" onClick={() => setShowAddCh(true)}><Plus size={14} /> Add chapter</Button>
            {forged === chapters.length && chapters.length > 0 ? (
              <Button small variant="soft" onClick={enhanceAll} disabled={!!enh}>
                <Wand2 size={14} /> {enh ? `Enhancing ${enh.i + 1}/${enh.n}…` : 'Enhance all with AI'}
              </Button>
            ) : null}
            {forged > 0 ? (
              <Button small variant="ghost" onClick={reviewAll} disabled={!!rev || !!enh}>
                <ClipboardCheck size={14} /> {rev ? `Reviewing ${rev.i + 1}/${rev.n}…` : 'Review all with AI'}
              </Button>
            ) : null}
            {book.mode === 'engine' && forged < chapters.length ? (
              <Button small onClick={writeAllChapters} disabled={!!wrt || !!busy || !!gateJobId} title="Run Gates 1–6 on every unwritten chapter without stopping">
                <PenLine size={14} /> {wrt ? `Writing ${wrt.i + 1}/${wrt.n}…` : `Fast-write all (${chapters.length - forged} left)`}
              </Button>
            ) : null}
            </div>
          </div>
          {enh ? <div style={{ marginBottom: 12 }}><Progress pct={(enh.i / enh.n) * 100} /></div> : null}
          {rev ? <div style={{ marginBottom: 12 }}><Progress pct={(rev.i / rev.n) * 100} /></div> : null}
          {wrt ? <div style={{ marginBottom: 12 }}><Progress pct={(wrt.i / wrt.n) * 100} /></div> : null}
          {book.mode === 'engine' ? (
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <details style={{ flex: '1 1 320px' }}>
                <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Stage 0 — Story design</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{book.plan?.designMd || 'No design yet.'}</pre>
              </details>
              <details style={{ flex: '1 1 320px' }}>
                <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Stage 1 — Beat map</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{book.plan?.beatmapMd || 'No beat map yet.'}</pre>
              </details>
              <details style={{ flex: '1 1 320px' }}>
                <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Stage 2 — Bible (characters, world, timeline, threads)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{book.bible || 'No bible yet.'}</pre>
              </details>
              <details style={{ flex: '1 1 320px' }}>
                <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Voice contract (style spec)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{book.plan?.styleCondensed || 'No style spec yet.'}</pre>
              </details>
              <details style={{ flex: '1 1 320px' }}>
                <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Running ledger (the book&rsquo;s memory)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{book.ledger || 'No ledger yet.'}</pre>
              </details>
            </div>
          ) : null}
          {chapters.length === 0 ? <EmptyState title="No chapters yet" body="This is a blank shell — add chapters, then draft each one with AI or paste text from your favorite chat." /> : null}
          {chapters.map((c, i) => {
            const st = book.mode === 'engine' ? parseStep(c.step) : { brief: '', cards: '', verdict: '' };
            return (
              <div key={c.id}>
                <Link to={c.words > 0 ? `/read/${c.id}` : '#'} className="ch-row"
                  onClick={c.words > 0 ? undefined : (e) => e.preventDefault()}>
                  <div className="ch-num">{i + 1}</div>
                  <div>
                    <h4>{c.title}</h4>
                    <p>{c.summary}</p>
                  </div>
                  <div className="ch-side">
                    <Badge tone={c.words > 0 ? 'green' : 'dim'}>{c.words > 0 ? `${fmtWords(c.words)}w` : 'outline'}</Badge>
                    {c.review_score != null ? <Badge tone={scoreTone(c.review_score)}>✎ {c.review_score}</Badge> : null}
                    {(c.written_by ?? '') !== '' ? (
                      <Badge tone={c.written_by === 'story-engine' ? 'dim' : 'gold'} title={`Written by ${c.written_by}`}>
                        {c.written_by === 'story-engine' ? 'story engine' : c.written_by === 'import' ? 'imported' : `✦ ${shortWriter(c.written_by)}`}
                      </Badge>
                    ) : c.ai_enhanced ? <Badge tone="gold">✦ AI</Badge> : null}
                    {book.mode === 'engine' && st.brief ? <Badge title="Gate 1 brief on file">G1 ✓</Badge> : null}
                    {book.mode === 'engine' && st.cards ? <Badge title="Gate 2 scene cards on file">G2 ✓</Badge> : null}
                    <button className="row-del" title="Delete chapter" disabled={busy === `delch${c.id}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); delChapter(c); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Link>
                {book.mode === 'engine' ? (
                  <div style={{ margin: '-4px 0 10px 44px', padding: '10px 12px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="dim" style={{ fontSize: 12 }}>Gates:</span>
                      <Button small variant="ghost" onClick={() => runGates(c, 'brief')} disabled={!!busy || !!wrt} title="Gate 1: chapter brief for your approval (no prose)">
                        {busy === `wrt${c.id}` ? 'Working…' : st.brief ? '↻ Brief' : 'Brief'}
                      </Button>
                      <Button small variant="ghost" onClick={() => runGates(c, 'cards')} disabled={!!busy || !!wrt || !st.brief} title="Gate 2: scene cards from the approved brief (no prose)">
                        {st.cards ? '↻ Cards' : 'Cards'}
                      </Button>
                      <Button small variant="soft" onClick={() => runGates(c, 'write')} disabled={!!busy || !!wrt || !st.cards} title="Gates 3–6: draft, self-critique, revise, ledger">
                        <PenLine size={14} /> {c.words > 0 ? '↻ Write' : 'Write'}
                      </Button>
                      <Button small onClick={() => runGates(c, 'fast')} disabled={!!busy || !!wrt} title="Gates 1–6 without stopping (5 AI calls)">
                        Fast 1–6
                      </Button>
                      <input className="input" style={{ flex: '1 1 180px', fontSize: 12 }} placeholder="Note for the next gate run (optional)…"
                        value={gateNotes[c.id] ?? ''} onChange={(e) => setGateNotes((g) => ({ ...g, [c.id]: e.target.value }))} />
                    </div>
                    {st.brief || st.cards || st.verdict ? (
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {st.brief ? (
                          <details style={{ flex: '1 1 240px' }}>
                            <summary className="dim" style={{ fontSize: 12, cursor: 'pointer' }}>Gate 1 brief</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.6, maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 6 }}>{st.brief}</pre>
                          </details>
                        ) : null}
                        {st.cards ? (
                          <details style={{ flex: '1 1 240px' }}>
                            <summary className="dim" style={{ fontSize: 12, cursor: 'pointer' }}>Gate 2 scene cards</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.6, maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 6 }}>{st.cards}</pre>
                          </details>
                        ) : null}
                        {st.verdict ? (
                          <details style={{ flex: '1 1 240px' }}>
                            <summary className="dim" style={{ fontSize: 12, cursor: 'pointer' }}>Gate 5 verdict</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.6, maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 6 }}>{st.verdict}</pre>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'characters' ? (
        <div>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="dim" style={{ fontSize: 13 }}>The cast the plan and Agent Pack are built on — edits reset plan approval.</span>
            <Button small variant="ghost" onClick={() => openCharModal(null)}><Plus size={14} /> Add character</Button>
          </div>
          <div className="char-grid">
            {book.characters.length === 0 ? <EmptyState title="No characters" body="Draft a plan to get a cast, or add characters by hand." /> : null}
            {book.characters.map((c) => (
              <Card key={c.id} className="char-card">
                <div className="row-between">
                  <h4 style={{ margin: 0 }}>{c.name}</h4>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="row-del" title="Edit" onClick={() => openCharModal(c)}><Pencil size={14} /></button>
                    <button className="row-del" title="Remove" disabled={busy === `delchar${c.id}`} onClick={() => delChar(c)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="char-role">{c.role}</div>
                <p>{c.description}</p>
                <div className="arc">{c.arc}</div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'publish' ? (
        <div className="two-col">
          <Card>
            <h3 className="field-label">Export manuscript</h3>
            <div className="export-grid">
              {EXPORT_FORMATS.map(([fmt, ext, label, sub]) => (
                <a
                  key={fmt}
                  className="export-btn"
                  href={api.books.exportUrl(id!, fmt)}
                  download={`${slugify(book?.title ?? 'book')}.${ext}`}
                  title="Downloads the file — or right-click → “Save link as…”"
                  onClick={() => setDlMsg({ tone: 'info', text: `${label} requested — check your downloads folder. Nothing arrives? Use “View & copy” below: it needs no download at all.` })}
                >
                  <Download size={18} /> {label}<small>{sub}</small>
                </a>
              ))}
            </div>
            {dlMsg ? <div className={`alert ${dlMsg.tone}`} style={{ margin: '10px 0 0' }}>{dlMsg.text}</div> : null}
            <p className="dim" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
              Downloads blocked here? <strong>View &amp; copy</strong> needs no download — the full text opens and you copy it out:
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {EXPORT_FORMATS.filter(([f]) => f !== 'epub').map(([fmt, , label]) => (
                <Button key={fmt} small variant="ghost" onClick={() => viewText(fmt, label)} disabled={!!busy}>
                  <Eye size={14} /> {busy === `view-${fmt}` ? 'Loading…' : label}
                </Button>
              ))}
            </div>
            <details style={{ marginTop: 10 }}>
              <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>
                Plain links — open in any browser tab if buttons are blocked here
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {EXPORT_FORMATS.map(([fmt, , label]) => (
                  <div key={fmt} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a href={api.books.exportUrl(id!, fmt)} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12.5, minWidth: 90 }}>
                      <ExternalLink size={12} style={{ verticalAlign: -1 }} /> {label}
                    </a>
                    <code className="dim" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {api.books.exportUrl(id!, fmt)}
                    </code>
                    <Button small variant="ghost" onClick={() => copyPlainLink(fmt, label)}>
                      {copiedLink === fmt ? <Check size={13} /> : <Copy size={13} />} {copiedLink === fmt ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                ))}
              </div>
            </details>
            <h3 className="field-label" style={{ marginTop: 18 }}>KDP categories</h3>
            <div className="kw-list">{book.categories.map((c) => <span key={c} className="kw">{c}</span>)}</div>
            <h3 className="field-label" style={{ marginTop: 14 }}>Keywords (7 slots)</h3>
            <div className="kw-list">{book.keywords.map((k) => <span key={k} className="kw">{k}</span>)}</div>
          </Card>
          <Card>
            <h3 className="field-label">Cover</h3>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div id="publish-cover" style={{ width: 170 }}><Cover title={book.title} author={book.pen_name ?? 'Ghostforge'} cover={book.cover_cfg} seriesLine={seriesLine} /></div>
              <div>
                <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  Faceless covers are generated procedurally — typographic, symbolic, no author photo needed.
                  Download the SVG and upscale to 2400×3840 for KDP.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {coverUrl ? (
                    <a className="btn soft btn-sm" href={coverUrl} download={`${slugify(book.title)}-cover.svg`}>
                      <Download size={14} /> Download cover SVG
                    </a>
                  ) : (
                    <Button small variant="soft" onClick={() => downloadCoverSVG(book.title, book.pen_name ?? 'Ghostforge', book.cover_cfg, seriesLine)}>
                      <Download size={14} /> Download cover SVG
                    </Button>
                  )}
                  <Button small variant="ghost" onClick={copyCover} title="Copies the cover picture as text — paste into a file ending in .svg">
                    {copiedLink === 'cover' ? <Check size={14} /> : <Copy size={14} />} {copiedLink === 'cover' ? 'Copied' : 'Copy SVG'}
                  </Button>
                </div>
              </div>
            </div>
            <h3 className="field-label" style={{ marginTop: 18 }}>Launch checklist</h3>
            <ol className="dim" style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
              <li>Export EPUB + upload to KDP</li>
              <li>Upscale cover to 2400×3840, upload</li>
              <li>Paste blurb from Overview tab</li>
              <li>Set the 7 keywords above</li>
              <li>Request the 2 categories above</li>
              <li>Series starter? Price $0.99–$2.99 or free</li>
            </ol>
          </Card>
        </div>
      ) : null}

      {tab === 'editor' ? <EditorTab bookId={id!} chapters={chapters} reload={load} /> : null}

      {tab === 'audio' ? (chapters.length > 0 ? <AudioTab bookId={id!} bookTitle={book.title} /> : <EmptyState title="No audio yet" body="Add chapters and write them first — narration comes after the draft exists." />) : null}

      {showChar ? (
        <Modal title={editChar ? `Edit ${editChar.name}` : 'Add a character'} onClose={() => setShowChar(false)}>
          <Field label="Name">
            <input className="input" value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} placeholder="e.g. Mara Voss" />
          </Field>
          <Field label="Role">
            <input className="input" value={charForm.role} onChange={(e) => setCharForm({ ...charForm, role: e.target.value })} placeholder="e.g. Protagonist — smuggler with a conscience" />
          </Field>
          <Field label="Description">
            <textarea className="input" value={charForm.description} onChange={(e) => setCharForm({ ...charForm, description: e.target.value })} placeholder="Who they are, what they want…" />
          </Field>
          <Field label="Arc — how they change">
            <textarea className="input" value={charForm.arc} onChange={(e) => setCharForm({ ...charForm, arc: e.target.value })} placeholder="e.g. Learns to trust a crew…" />
          </Field>
          <div className="modal-actions">
            <Button small variant="ghost" onClick={() => setShowChar(false)}>Cancel</Button>
            <Button small onClick={saveChar} disabled={!charForm.name.trim() || busy === 'savechar'}>
              {busy === 'savechar' ? 'Saving…' : editChar ? 'Save' : 'Add'}
            </Button>
          </div>
        </Modal>
      ) : null}

      {showAddCh ? (
        <Modal title="Add a chapter" onClose={() => setShowAddCh(false)}>
          <Field label="Chapter title">
            <input className="input" value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder="e.g. The Night Market" />
          </Field>
          <Field label="Summary — what must happen (optional)" hint="Guides AI drafting and keeps the outline meaningful.">
            <textarea className="input" value={chSummary} onChange={(e) => setChSummary(e.target.value)} placeholder="e.g. Mara follows the map to the night market and meets the fence…" />
          </Field>
          <div className="row-between mt">
            <Button variant="ghost" onClick={() => setShowAddCh(false)}>Cancel</Button>
            <Button onClick={addChapter} disabled={busy === 'addch' || !chTitle.trim()}>{busy === 'addch' ? 'Adding…' : 'Add chapter'}</Button>
          </div>
        </Modal>
      ) : null}

      {showEditBook ? (
        <Modal title="Edit book details" onClose={() => setShowEditBook(false)}>
          <Field label="Title">
            <input className="input" value={editBook.title} onChange={(e) => setEditBook({ ...editBook, title: e.target.value })} />
          </Field>
          <Field label="Subtitle">
            <input className="input" value={editBook.subtitle} onChange={(e) => setEditBook({ ...editBook, subtitle: e.target.value })} />
          </Field>
          <Field label="Genre">
            <input className="input" value={editBook.genre} onChange={(e) => setEditBook({ ...editBook, genre: e.target.value })} />
          </Field>
          <Field label="Logline">
            <textarea className="input" value={editBook.logline} onChange={(e) => setEditBook({ ...editBook, logline: e.target.value })} />
          </Field>
          <Field label="Blurb">
            <textarea className="input" value={editBook.blurb} onChange={(e) => setEditBook({ ...editBook, blurb: e.target.value })} style={{ minHeight: 120 }} />
          </Field>
          <div className="form-grid">
            <Field label="Audience">
              <input className="input" value={editBook.audience} onChange={(e) => setEditBook({ ...editBook, audience: e.target.value })} />
            </Field>
            <Field label="Tone">
              <input className="input" value={editBook.tone} onChange={(e) => setEditBook({ ...editBook, tone: e.target.value })} />
            </Field>
          </div>
          <div className="row-between mt">
            <Button variant="ghost" onClick={() => setShowEditBook(false)}>Cancel</Button>
            <Button onClick={saveBookDetails} disabled={busy === 'editbook'}>{busy === 'editbook' ? 'Saving…' : 'Save details'}</Button>
          </div>
        </Modal>
      ) : null}

      {showDelete ? (
        <Modal title="Delete this book?" onClose={() => setShowDelete(false)}>
          <p className="dim">“{book.title}” and all {chapters.length} chapters will be permanently deleted. This cannot be undone.</p>
          <div className="row-between mt">
            <Button variant="ghost" onClick={() => setShowDelete(false)}>Keep it</Button>
            <Button variant="danger" onClick={doDelete} disabled={busy === 'delete'}>{busy === 'delete' ? 'Deleting…' : 'Delete forever'}</Button>
          </div>
        </Modal>
      ) : null}

      {viewed !== null ? (
        <Modal title={`${viewed.label} — view & copy`} onClose={() => setViewed(null)}>
          <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
            The complete text, no download needed. Press Copy below (or select it all and copy manually), then paste into a file.
          </p>
          <pre style={{
            whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.6, maxHeight: 420, overflowY: 'auto',
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 8, padding: 12,
          }}>{viewed.text}</pre>
          <div className="row-between mt">
            <Button variant="ghost" onClick={() => setViewed(null)}>Close</Button>
            <Button small variant="soft" onClick={copyViewed}>
              {copiedLink === 'viewed' ? <Check size={13} /> : <Copy size={13} />} {copiedLink === 'viewed' ? 'Copied' : 'Copy full text'}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
