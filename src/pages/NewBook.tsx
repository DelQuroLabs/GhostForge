import { useEffect, useRef, useState } from 'react';
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus.js';
import { useNavigate } from 'react-router-dom';
import { Zap, ListChecks, LibraryBig, FileText, Dices, Cpu, KeyRound, Brain } from 'lucide-react';
import { api, errMsg, type Pen, type Series, type AiCfg, type Job } from '../lib/api.js';
import { useJob, rememberJob, forgetJob, trackedJobs } from '../lib/useJob.js';
import { randomBundle, randomAnchors } from '../lib/premises.js';
import { Button, Card, Field, Badge } from '../components/ui.js';

const FICTION_GENRES = ['Epic Fantasy', 'Urban Fantasy', 'Science Fiction', 'Space Opera', 'LitRPG', 'Dystopian', 'Romance', 'Romantic Suspense', 'Thriller', 'Crime Thriller', 'Mystery', 'Cozy Mystery', 'Horror', 'Historical Fiction', 'Adventure', 'Literary Fiction'];
const NF_GENRES = ['Self-Help', 'Productivity', 'Business', 'Entrepreneurship', 'Money & Finance', 'Memoir', 'Biography', 'Health & Wellness', 'Parenting', 'History', 'True Crime'];
const WORD_OPTIONS = [
  { v: 12000, label: 'Short Read · ~12k' },
  { v: 30000, label: 'Standard · ~30k' },
  { v: 60000, label: 'Epic · ~60k' },
  { v: 100000, label: 'Saga · ~100k' },
];
const STYLE_IDEAS = [
  'Epic like The Lord of the Rings', 'Grimdark like Game of Thrones', 'Hardboiled noir detective',
  'Cozy mystery like Agatha Christie', 'Romantasy like ACOTAR', 'Cyberpunk like Neuromancer',
  'Space opera like Dune', 'Gothic like Dracula', 'Pacy thriller like Lee Child',
  'Literary like Booker winners', 'Spare like Hemingway', 'YA adventure like Harry Potter',
  'Horror like Stephen King', 'Historical like Ken Follett',
];
const FORGE_LINES = ['Kindling the premise…', 'Casting characters…', 'Architecting the outline…', 'Writing every chapter…', 'Polishing the publish kit…', 'Binding the manuscript…'];
const MODEL_IDEAS = [
  'gpt-oss:20b', 'llama3.1', 'qwen2.5:14b', 'mistral',
  'openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet',
  'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct', 'gpt-4o-mini', 'gpt-4o',
];
const PROVIDER_LABELS: Record<string, string> = { openrouter: 'OpenRouter', openai: 'OpenAI', ollama: 'Ollama (local)', custom: 'Custom' };

const STAGE_STEPS = [
  { id: 'stage-0', label: 'Stage 0 · Concept — dramatic question, protagonist, ending' },
  { id: 'stage-1', label: 'Stage 1 · Structure — beat map, chapter by chapter' },
  { id: 'stage-2', label: 'Stage 2 · Bible + voice — cast, world, style' },
  { id: 'storing', label: 'Binding — cover, chapters, cast on the shelf' },
];

const NEXT_STEPS = [
  'Your book opens with every chapter waiting as an outline.',
  'Chapters tab → Brief → Cards → Write each chapter — or Fast 1–6 / Fast-write all.',
  'Review any chapter → Revise to polish it with your approved fixes.',
];

function EngineProgress({ job, model, chapters }: { job: Job | null; model: string | undefined; chapters: number }) {
  const done = job?.status === 'done';
  const seen = new Set((job?.events ?? []).map((e) => e.stage));
  const lastIdx = STAGE_STEPS.reduce((acc, s, i) => (seen.has(s.id) ? i : acc), -1);
  const events = job?.events ?? [];
  // Proof of life: an elapsed clock (from the server start time, so even a
  // reattached tab shows the true total) plus a poll heartbeat that proves
  // this page is still talking to the run between slow stages.
  const mountedAt = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [lastPoll, setLastPoll] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setLastPoll(Date.now());
  }, [job]);
  const startAt = job?.startedAt ? new Date(job.startedAt).getTime() : mountedAt.current;
  const elapsed = Math.max(0, Math.floor((now - startAt) / 1000));
  const ago = Math.max(0, Math.floor((now - lastPoll) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, '0');
  // Honest progress: the bar moves ONLY on real locked stages — never faked
  // in between. The shimmer + ticking clock carry the "still alive" signal.
  const pct = done ? 100 : !job ? 4 : lastIdx < 0 ? 8 : lastIdx >= STAGE_STEPS.length - 1 ? 92 : Math.round(((lastIdx + 1) / STAGE_STEPS.length) * 100);
  const feed = events.slice(-3);
  return (
    <>
      <p>{done
        ? 'All three stages locked — design, beat map, and bible are bound into your book. Opening it now…'
        : `${model || 'Your AI model'} is running Stages 0–2: concept → structure (~${chapters} chapters) → bible + voice. This takes a few minutes — and the run lives on the server, so a closed tab can't kill it.`}</p>
      <ul style={{ textAlign: 'left', margin: '12px auto', maxWidth: 430, paddingLeft: 22, fontSize: 14, lineHeight: 1.9 }}>
        {STAGE_STEPS.map((s, i) => (
          <li key={s.id} style={{ opacity: i <= lastIdx ? 1 : 0.55 }}>
            {i < lastIdx || done ? '✓' : i === lastIdx ? '…' : '○'} {s.label}
          </li>
        ))}
      </ul>
      <div className="gf-progress-track" title={`${pct}% — the bar moves as each stage locks`}>
        <div className="gf-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontSize: 12 }} className="dim">{mm}:{ss} elapsed · {pct}% · checked {ago < 5 ? 'just now' : `${ago}s ago`}</p>
      {feed.length > 0 ? (
        <div style={{ textAlign: 'left', margin: '8px auto 0', maxWidth: 430, fontSize: 12 }} className="dim">
          {feed.map((e, i) => (
            <div key={`${e.t}-${i}`} style={{ opacity: i === feed.length - 1 ? 1 : 0.6 }}>· {e.msg}</div>
          ))}
        </div>
      ) : null}
      <p style={{ fontSize: 12 }} className="dim">Most books take 5–10 minutes — the bar jumps at each locked stage.</p>
      <div style={{ textAlign: 'left', margin: '12px auto 0', maxWidth: 430, border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '10px 14px', background: 'rgba(255,255,255,.03)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{done ? 'Your next steps:' : 'What happens next:'}</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
          {NEXT_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </>
  );
}

export default function NewBook() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'one-click' | 'guided' | 'series' | 'blank' | 'engine'>('one-click');
  const [workTitle, setWorkTitle] = useState('');
  const [kind, setKind] = useState<'fiction' | 'nonfiction'>('fiction');
  const [genre, setGenre] = useState('Epic Fantasy');
  const [premise, setPremise] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [style, setStyle] = useState('');
  const [pov, setPov] = useState('Third Person Limited');
  const [tense, setTense] = useState<'Past' | 'Present'>('Past');
  const [targetWords, setTargetWords] = useState(30000);
  const [aSubgenre, setASubgenre] = useState('');
  const [aComps, setAComps] = useState('');
  const [aProtagonist, setAProtagonist] = useState('');
  const [aAntagonist, setAAntagonist] = useState('');
  const [aStakes, setAStakes] = useState('');
  const [aTheme, setATheme] = useState('');
  const [aEnding, setAEnding] = useState('');
  const [aSeeds, setASeeds] = useState('');
  const [pens, setPens] = useState<Pen[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [penPick, setPenPick] = useState('');
  const [newPen, setNewPen] = useState('');
  const [seriesPick, setSeriesPick] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const [forging, setForging] = useState(false);
  const [forgeLine, setForgeLine] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const { job, gone } = useJob(jobId);
  const [resume, setResume] = useState(() => trackedJobs().find((t) => t.kind === 'create') ?? null);
  const [err, setErr] = useState('');
  const [aiCfg, setAiCfg] = useState<AiCfg | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState('openrouter');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiMsg, setAiMsg] = useState('');
  const [aiMsgTone, setAiMsgTone] = useState<'ok' | 'error'>('ok');
  const [aiBusy, setAiBusy] = useState('');

  useEffect(() => {
    Promise.all([api.pens.list(), api.series.list()]).then(([p, s]) => {
      setPens(p);
      setAllSeries(s);
    }).catch((e) => setErr(errMsg(e)));
  }, []);
  function loadAi() {
    api.ai.get().then((c) => {
      setAiCfg(c);
      setAiProvider(c.provider);
      setAiBaseUrl(c.baseUrl);
      setAiModel(c.model);
    }).catch(() => {});
  }
  // Re-checks on mount, tab focus, and tab visible — a failed fetch while
  // the server naps can never strand the AI section on defaults again.
  useRefetchOnFocus(loadAi);
  useEffect(() => {
    setGenre(kind === 'fiction' ? 'Epic Fantasy' : 'Self-Help');
    setPov(kind === 'fiction' ? 'Third Person Limited' : 'Second Person');
  }, [kind]);
  useEffect(() => {
    if (!forging) return;
    const t = setInterval(() => setForgeLine((i) => (i + 1) % FORGE_LINES.length), 1400);
    return () => clearInterval(t);
  }, [forging]);
  useEffect(() => {
    if (!job || job.kind !== 'create') return;
    if (job.status === 'done') {
      // Linger on the done screen so the completion + next steps actually
      // get read, then walk into the book.
      forgetJob(job.id);
      const bookId = job.result?.bookId as number | undefined;
      const t = setTimeout(() => {
        if (bookId) nav(`/books/${bookId}`);
        else {
          setErr('The run finished but the new book id was lost — check the shelf.');
          setForging(false);
        }
      }, 3000);
      return () => clearTimeout(t);
    }
    if (job.status === 'failed') {
      setErr(job.error?.message ?? 'The run failed.');
      setForging(false);
    }
  }, [job, nav]);
  useEffect(() => {
    if (gone && forging) {
      setErr('The run left the server (it finished long ago or the server restarted). If the book landed, it is on the shelf.');
      setForging(false);
    }
  }, [gone, forging]);

  const estChapters = Math.max(8, Math.min(48, Math.round(targetWords / 1500)));

  function pickProvider(p: string) {
    setAiProvider(p);
    if (p === 'openrouter') setAiBaseUrl('https://openrouter.ai/api/v1');
    else if (p === 'openai') setAiBaseUrl('https://api.openai.com/v1');
    else if (p === 'ollama') {
      setAiBaseUrl('http://localhost:11434/v1');
      setAiModel((m) => m || 'gpt-oss:20b');
    }
  }
  async function saveAi() {
    setAiMsg('');
    setAiBusy('save');
    try {
      const c = await api.ai.save({ provider: aiProvider, baseUrl: aiBaseUrl, model: aiModel, key: aiKey || undefined });
      setAiCfg(c);
      setAiKey('');
      setAiMsgTone('ok');
      setAiMsg(`AI saved: ${c.provider} · ${c.model || 'no model set'}${c.hasKey ? ` · key set ${c.last4}` : ' · no key'}.`);
    } catch (e) {
      setAiMsgTone('error');
      setAiMsg(errMsg(e));
    } finally {
      setAiBusy('');
    }
  }
  async function testAi() {
    setAiMsg('');
    setAiBusy('test');
    try {
      const r = await api.ai.test();
      setAiMsgTone('ok');
      setAiMsg(`Key works. Model “${r.model}” replied: “${r.sample}”`);
    } catch (e) {
      setAiMsgTone('error');
      setAiMsg(errMsg(e));
    } finally {
      setAiBusy('');
    }
  }

  async function forge() {
    setErr('');
    if (mode !== 'blank' && premise.trim().length < 20) {
      setErr('Give the forge a little more to work with — at least a sentence or two of premise.');
      return;
    }
    setForging(true);
    setForgeLine(0);
    try {
      const payload = {
        title: mode === 'blank' || mode === 'engine' ? workTitle.trim() || undefined : undefined,
        premise: premise.trim(), kind, genre,
        audience: audience.trim(), tone: tone.trim(), style: style.trim(), pov, tense, targetWords, mode,
        ...(mode === 'engine' ? {
          anchors: {
            subgenre: aSubgenre.trim(), comps: aComps.trim(), protagonist: aProtagonist.trim(),
            antagonist: aAntagonist.trim(), stakes: aStakes.trim(), theme: aTheme.trim(),
            ending: aEnding.trim(), seeds: aSeeds.trim(),
          },
        } : {}),
        penNameId: penPick ? Number(penPick) : null,
        newPenName: newPen.trim() || undefined,
        seriesId: seriesPick ? Number(seriesPick) : null,
        newSeries: newSeriesName.trim() || undefined,
      };
      if (mode === 'engine') {
        // Stages 0–2 run for minutes — start a job and poll it, so a dropped
        // tab or proxy never kills the run. (The sync route stays for API use.)
        const { jobId: id } = await api.engine.jobs.startCreate(payload);
        rememberJob({ id, kind: 'create', label: 'Stages 0–2' });
        setResume(null);
        setJobId(id);
        return;
      }
      const b = await api.books.create(payload);
      nav(`/books/${b.id}`);
    } catch (e) {
      setErr(errMsg(e));
      setForging(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Forge a Book</h1>
          <p>Forge a full book instantly — or start a blank shell and write with your own models.</p>
        </div>
      </div>
      {err ? <div className="alert error">{err}</div> : null}
      {resume && !forging && !jobId ? (
        <div className="alert" style={{ marginBottom: 12 }}>
          A Stages 0–2 run (“{resume.label}”, started {new Date(resume.at).toLocaleTimeString()}) may still be going on the server.
          {' '}<Button onClick={() => { setMode('engine'); setJobId(resume.id); setForging(true); }}>Reattach</Button>
          {' '}<Button onClick={() => { forgetJob(resume.id); setResume(null); }}>Dismiss</Button>
        </div>
      ) : null}

      <h3 className="field-label" style={{ marginBottom: 10 }}>1 · How should the forge run?</h3>
      <div className="mode-grid" style={{ marginBottom: 22 }}>
        <button className={`mode-card ${mode === 'one-click' ? 'selected' : ''}`} onClick={() => setMode('one-click')}>
          <span className="mode-icon"><Zap size={19} /></span>
          <h3>One-Click Epic</h3>
          <p>Premise → full book instantly. Outline, characters, every chapter, publish kit. Maximum velocity.</p>
        </button>
        <button className={`mode-card ${mode === 'guided' ? 'selected' : ''}`} onClick={() => setMode('guided')}>
          <span className="mode-icon"><ListChecks size={19} /></span>
          <h3>Guided Build</h3>
          <p>You approve premise → outline → characters, then the forge writes the full draft. Maximum control.</p>
        </button>
        <button className={`mode-card ${mode === 'series' ? 'selected' : ''}`} onClick={() => setMode('series')}>
          <span className="mode-icon"><LibraryBig size={19} /></span>
          <h3>Series Installment</h3>
          <p>Attach to a pen name + series with auto-numbering. Built for faceless catalog velocity.</p>
        </button>
        <button className={`mode-card ${mode === 'blank' ? 'selected' : ''}`} onClick={() => setMode('blank')}>
          <span className="mode-icon"><FileText size={19} /></span>
          <h3>Blank Shell</h3>
          <p>Empty book, zero chapters. You add chapters and write them with your own models — the app keeps it all organized.</p>
        </button>
        <button className={`mode-card ${mode === 'engine' ? 'selected' : ''}`} onClick={() => { setMode('engine'); setKind('fiction'); }}>
          <span className="mode-icon"><Brain size={19} /></span>
          <h3>Novel Engine</h3>
          <p>Your AI model builds concept → structure → bible, then writes chapter-by-chapter through six quality gates. Fiction only. Best quality, billed per call.</p>
        </button>
      </div>

      {mode === 'engine' ? (
        <Card>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Brain size={18} /> Novel Engine — how it runs</h3>
            {aiCfg ? <Badge tone={aiCfg.hasKey && aiCfg.model ? 'green' : 'red'}>{aiCfg.model ? `Writer: ${aiCfg.model}` : 'no AI set'}</Badge> : null}
          </div>
          <ol className="dim" style={{ fontSize: 13.5, lineHeight: 1.8, paddingLeft: 20, margin: '0 0 8px' }}>
            <li><strong>Today ({aiCfg?.model || 'your AI model'}, ~3 big calls, a few minutes):</strong> Stage 0 locks the concept (dramatic question, want/need, antagonist, stakes, theme, ending first), Stage 1 picks a structure and maps every beat to a chapter (≈{estChapters} chapters at this length), Stage 2 writes the bible (characters, world, timeline, threads, voice contract) and seeds the ledger.</li>
            <li><strong>Then, per chapter:</strong> approve the Brief (Gate 1) and Scene Cards (Gate 2), the engine drafts, attacks its own draft, revises, and updates the ledger (Gates 3–6). Or press Fast to run all six gates at once.</li>
            <li><strong>Proof:</strong> every chapter is stamped with the model that wrote it — visible on each chapter row.</li>
          </ol>
          {!aiCfg?.hasKey || !aiCfg?.model ? (
            <div className="alert error" style={{ marginBottom: 0 }}>The Novel Engine needs your AI key + model below before it can build anything.</div>
          ) : (
            <p className="dim" style={{ fontSize: 13, margin: 0 }}>
              Anything you lock in Story anchors below is treated as decided. Anything you leave blank, Stage 0 proposes (3 options, one recommendation).
            </p>
          )}
        </Card>
      ) : null}

      <Card>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Cpu size={18} /> Which engine writes it?</h3>
          {aiCfg ? <Badge tone={aiCfg.model ? 'green' : 'dim'}>{aiCfg.model ? `${aiCfg.provider} · ${aiCfg.model}` : 'no AI set'}</Badge> : null}
        </div>
        <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65, margin: '0 0 10px' }}>
          One-Click, Guided, and Series run on the <strong>offline Story Engine</strong> — instant and free, no key needed.
          Your AI below powers <strong>Enhance</strong>, <strong>Draft with AI</strong>, <strong>AI Studio</strong>, audiobook narration —
          and the <strong>Novel Engine</strong> mode, where your model builds the concept, structure, and bible, then writes the entire book through quality gates.
        </p>
        {!aiOpen ? (
          <Button small variant="ghost" onClick={() => setAiOpen(true)}><KeyRound size={14} /> {aiCfg?.model ? 'Change AI model' : 'Set up my AI'}</Button>
        ) : (
          <div>
            <div className="form-grid">
              <Field label="Provider">
                <div className="seg">
                  {Object.keys(PROVIDER_LABELS).map((p) => (
                    <button key={p} className={aiProvider === p ? 'selected' : ''} onClick={() => pickProvider(p)}>{PROVIDER_LABELS[p]}</button>
                  ))}
                </div>
              </Field>
              <Field label="Model id">
                <input className="input" value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                  placeholder="e.g. gpt-4o-mini" list="ai-models-new" />
                <datalist id="ai-models-new">
                  {MODEL_IDEAS.map((m) => <option key={m} value={m} />)}
                </datalist>
              </Field>
            </div>
            <Field label="API base URL">
              <input className="input" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} />
            </Field>
            <Field label={aiProvider === 'ollama' ? 'API key (not needed for Ollama)' : aiCfg?.hasKey ? 'New key (leave blank to keep current)' : 'API key'}>
              <input className="input" type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
            </Field>
            {aiMsg ? <div className={`alert ${aiMsgTone}`}>{aiMsg}</div> : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button small onClick={saveAi} disabled={aiBusy === 'save'}>{aiBusy === 'save' ? 'Saving…' : 'Save AI'}</Button>
              <Button small variant="soft" onClick={testAi} disabled={aiBusy === 'test'}>{aiBusy === 'test' ? 'Testing…' : 'Test key'}</Button>
              <Button small variant="ghost" onClick={() => setAiOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="field-label" style={{ marginBottom: 10 }}>2 · What are we forging?</h3>
        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={kind === 'fiction' ? 'selected' : ''} onClick={() => setKind('fiction')}>Fiction</button>
          <button className={kind === 'nonfiction' ? 'selected' : ''} onClick={() => setKind('nonfiction')} disabled={mode === 'engine'} title={mode === 'engine' ? 'The Novel Engine writes fiction only' : undefined}>Nonfiction</button>
        </div>
        {mode === 'blank' || mode === 'engine' ? (
          <Field label="Working title" hint="You can rename it anytime.">
            <input className="input" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} placeholder="e.g. The Clockwork Heir" />
          </Field>
        ) : null}
        <Field label="Premise — the seed of the whole book" hint="2–4 sentences works best: who, what they want, what's in the way.">
          <textarea className="input" value={premise} onChange={(e) => setPremise(e.target.value)}
            placeholder="e.g. A retired thief must steal back a cursed crown from the immortal warlord who murdered her family…" />
        </Field>
        <div style={{ margin: '-6px 0 14px' }}>
          <Button small variant="ghost" onClick={() => {
              let b = randomBundle(kind, genre);
              for (let i = 0; b.premise === premise && i < 5; i++) b = randomBundle(kind, genre);
              setWorkTitle(b.title);
              setPremise(b.premise);
              setAudience(b.audience);
              setTone(b.tone);
              setStyle(b.style);
              if (kind === 'fiction') {
                setPov(b.pov);
                setTense(b.tense);
              }
              if (mode === 'engine') {
                const a = randomAnchors(genre);
                setASubgenre(a.subgenre);
                setAComps(a.comps);
                setAProtagonist(a.protagonist);
                setAAntagonist(a.antagonist);
                setAStakes(a.stakes);
                setATheme(a.theme);
                setAEnding(a.ending);
                setASeeds(a.seeds);
              }
            }}>
            <Dices size={14} /> Surprise me
          </Button>
          <span className="dim" style={{ fontSize: 12, marginLeft: 8 }}>Fills every field from the genre — title, premise, audience, tone, style, POV, tense{mode === 'engine' ? ', story anchors' : ''}</span>
        </div>
        <div className="form-grid">
          <Field label="Genre">
            <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
              {(kind === 'fiction' ? FICTION_GENRES : NF_GENRES).map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Target length">
            <div className="seg">
              {WORD_OPTIONS.map((o) => (
                <button key={o.v} className={targetWords === o.v ? 'selected' : ''} onClick={() => setTargetWords(o.v)}>{o.label}</button>
              ))}
            </div>
            <span className="field-hint">≈ {estChapters} chapters · about 1,500 words each (sagas run longer)</span>
          </Field>
          <Field label="Audience">
            <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Adult fantasy readers" />
          </Field>
          <Field label="Tone">
            <input className="input" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Gritty yet hopeful" />
          </Field>
          <Field label="Style like… (optional)" hint="Name an author, book, or series — the forge steers its voice that way.">
            <input className="input" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. Suspense like Dan Brown" list="style-ideas" />
            <datalist id="style-ideas">
              {STYLE_IDEAS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
          {kind === 'fiction' ? (
            <>
              <Field label="Point of view">
                <select className="input" value={pov} onChange={(e) => setPov(e.target.value)}>
                  <option>Third Person Limited</option>
                  <option>First Person</option>
                  <option>Third Person Omniscient</option>
                </select>
              </Field>
              <Field label="Tense">
                <div className="seg">
                  <button className={tense === 'Past' ? 'selected' : ''} onClick={() => setTense('Past')}>Past</button>
                  <button className={tense === 'Present' ? 'selected' : ''} onClick={() => setTense('Present')}>Present</button>
                </div>
              </Field>
            </>
          ) : null}
        </div>

        {mode === 'engine' ? (
          <details style={{ marginTop: 6 }} open>
            <summary className="dim" style={{ fontSize: 13.5, cursor: 'pointer', marginBottom: 10 }}>
              Story anchors (optional) — anything you lock here, Stage 0 treats as decided
            </summary>
            <div className="form-grid">
              <Field label="Subgenre" hint="e.g. cozy mystery, progression fantasy, space opera.">
                <input className="input" value={aSubgenre} onChange={(e) => setASubgenre(e.target.value)} placeholder="e.g. Heist fantasy" />
              </Field>
              <Field label="Ending — if you know it" hint="The engine builds backward from the ending. One or two sentences.">
                <input className="input" value={aEnding} onChange={(e) => setAEnding(e.target.value)} placeholder="e.g. She burns the crown instead of wearing it" />
              </Field>
            </div>
            <Field label="Protagonist want" hint="External and concrete — not “redemption”, but “get her name back on the deed”.">
              <textarea className="input" value={aProtagonist} onChange={(e) => setAProtagonist(e.target.value)} placeholder="What do they want, specifically?" />
            </Field>
            <Field label="Antagonist / opposing force" hint="Who or what opposes them — and why it thinks it's right.">
              <textarea className="input" value={aAntagonist} onChange={(e) => setAAntagonist(e.target.value)} placeholder="e.g. The immortal warlord, who believes peace requires one eternal ruler" />
            </Field>
            <Field label="Stakes" hint="What is lost if the protagonist fails — personal, public, philosophical.">
              <textarea className="input" value={aStakes} onChange={(e) => setAStakes(e.target.value)} placeholder="e.g. Her crew hangs; the city falls; mercy itself dies" />
            </Field>
            <Field label="Theme — as an argument" hint="Not a topic (“grief”) — a debatable proposition the plot will argue for or against.">
              <textarea className="input" value={aTheme} onChange={(e) => setATheme(e.target.value)} placeholder="e.g. Mercy without cost is just sentiment" />
            </Field>
            <Field label="Comp titles" hint="One per line: TITLE — what axis it compares on (voice, plot, market).">
              <textarea className="input" value={aComps} onChange={(e) => setAComps(e.target.value)} placeholder={'e.g. The Lies of Locke Lamora — voice\nSix of Crows — crew structure'} />
            </Field>
            <Field label="Seed images & motifs" hint="Images, lines, objects, moments you want in the book. One per line — the engine will place them.">
              <textarea className="input" value={aSeeds} onChange={(e) => setASeeds(e.target.value)} placeholder={'e.g. A lighthouse that shines inland\nThe smell of rust and oranges'} />
            </Field>
          </details>
        ) : null}

        <h3 className="field-label" style={{ margin: '14px 0 10px' }}>3 · Whose name goes on it? {mode === 'series' ? '(series mode)' : '(optional)'}</h3>
        <div className="form-grid">
          <Field label="Pen name">
            <select className="input" value={penPick} onChange={(e) => setPenPick(e.target.value)}>
              <option value="">— none yet —</option>
              {pens.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="…or create one">
            <input className="input" value={newPen} onChange={(e) => setNewPen(e.target.value)} placeholder="e.g. Elena Cross" />
          </Field>
          <Field label="Series">
            <select className="input" value={seriesPick} onChange={(e) => setSeriesPick(e.target.value)}>
              <option value="">— standalone —</option>
              {allSeries.map((s) => <option key={s.id} value={s.id}>{s.title}{s.pen_name ? ` (${s.pen_name})` : ''}</option>)}
            </select>
          </Field>
          <Field label="…or start one">
            <input className="input" value={newSeriesName} onChange={(e) => setNewSeriesName(e.target.value)} placeholder="e.g. Emberfall Saga" />
          </Field>
        </div>

        <div className="row-between mt">
          <span className="dim" style={{ fontSize: 13 }}>
            {mode === 'engine'
              ? `Runs Stages 0–2 now (3 big AI calls, a few minutes), then ~${estChapters} chapters through Gates 1–6 — step by step, or Fast 1–6.`
              : 'Forging is instant and unlimited — the Story Engine runs on this machine.'}
          </span>
          <Button onClick={forge} disabled={forging}>
            {mode === 'blank' ? 'Create blank book' : mode === 'engine' ? 'Run Stages 0–2' : 'Forge the whole book'}
          </Button>
        </div>
      </Card>

      {forging && mode !== 'blank' ? (
        <div className="forge-veil">
          <div className="forge-box">
            <div className="forge-flame">🔥</div>
            <h2>{mode === 'engine' ? (job?.status === 'done' ? 'Stages 0–2 complete ✓' : 'Running Stages 0–2…') : 'Forging your epic…'}</h2>
            {mode === 'engine' ? <EngineProgress job={job} model={aiCfg?.model} chapters={estChapters} /> : (
              <>
                <p>{FORGE_LINES[forgeLine]}</p>
                <p style={{ fontSize: 12 }}>{`Writing ~${estChapters} full chapters. Real manuscript, no placeholders.`}</p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
