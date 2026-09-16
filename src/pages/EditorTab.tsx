import { useCallback, useEffect, useState } from 'react';
import {
  Fingerprint, Layers, PenLine, SpellCheck, Quote, Link2, Users, Swords, FileText,
  Copy, Check, Trash2, Play, BookOpenCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errMsg, type Chapter, type EditorState, type EditorReport } from '../lib/api.js';
import { useJob, rememberJob, forgetJob } from '../lib/useJob.js';
import { copyText } from '../lib/clipboard.js';
import CopyFallback from '../components/CopyFallback.js';
import { Button, Card, Badge, Spinner, Progress, EmptyState, Modal, Field } from '../components/ui.js';

const PASSES: Array<{ id: string; title: string; blurb: string; icon: typeof Play; chapter: boolean }> = [
  { id: 'p0', title: 'Pass 0 · Voice calibration', blurb: 'Measures the voice before touching it — the style contract for every later pass. Run on chapter 1.', icon: Fingerprint, chapter: true },
  { id: 'p1', title: 'Pass 1 · Developmental', blurb: 'Structure, story logic, pacing, stakes. Does this chapter earn its place?', icon: Layers, chapter: true },
  { id: 'p2', title: 'Pass 2 · Line edit', blurb: 'Sentence craft in the author\u2019s own voice, with original/revised pairs. Uses Pass 0 automatically.', icon: PenLine, chapter: true },
  { id: 'p3', title: 'Pass 3 · Copyedit', blurb: 'Mechanical correctness + continuity contradictions. Nothing else.', icon: SpellCheck, chapter: true },
  { id: 'dialogue', title: 'Dialogue pass', blurb: 'Every exchange: distinct voices, subtext, no exposition smuggling.', icon: Quote, chapter: true },
  { id: 'continuity', title: 'Continuity sweep', blurb: 'This chapter against the ledger: contradictions, drift, retcons.', icon: Link2, chapter: true },
  { id: 'beta', title: 'Beta readers ×4', blurb: 'Fan, casual, critic, DNF-er: where each bores, confuses, quits.', icon: Users, chapter: true },
  { id: 'redteam', title: 'Red team', blurb: 'Steelman the case for cutting this chapter — then for keeping it. Winner declared.', icon: Swords, chapter: true },
  { id: 'synopsis', title: 'Synopsis + query', blurb: 'Whole book: 1-page synopsis + 350-word query letter, then self-critique.', icon: FileText, chapter: false },
];

const RUN_ALL: Record<string, boolean> = { p1: true, p2: true, p3: true };

export default function EditorTab({ bookId, chapters, reload }: { bookId: string; chapters: Chapter[]; reload?: () => Promise<void> }) {
  const [data, setData] = useState<EditorState | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pass, setPass] = useState('p1');
  const [chapterId, setChapterId] = useState('');
  const [busy, setBusy] = useState('');
  const [prog, setProg] = useState<{ i: number; n: number } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [openBody, setOpenBody] = useState<EditorReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applied, setApplied] = useState<{ chId: number; text: string } | null>(null);
  const [revJobId, setRevJobId] = useState<string | null>(null);
  const { job: revJob, gone: revGone } = useJob(revJobId);

  const load = useCallback(async () => {
    try {
      const d = await api.editor.get(bookId);
      setData(d);
      setChapterId((cur) => {
        if (cur) return cur;
        const written = chapters.filter((c) => c.words > 0);
        return written[0] ? String(written[0].id) : '';
      });
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [bookId, chapters, pass]);
  useEffect(() => {
    load();
  }, [load]);
  // Apply-job watchers. NOTE: hooks must stay ABOVE the early returns below.
  useEffect(() => {
    if (!revJob || revJob.kind !== 'revise') return;
    if (revJob.status === 'done') {
      forgetJob(revJob.id);
      setRevJobId(null);
      const r = revJob.result as { chapterId?: number; words?: number; model?: string } | null;
      const chId = r?.chapterId ?? revJob.chapterId ?? 0;
      const ch = chapters.find((c) => c.id === chId);
      const label = ch ? `Chapter ${ch.idx + 1} (“${ch.title}”)` : 'The chapter';
      setApplied({
        chId,
        text: `${label} revised${r?.model ? ` by ${r.model}` : ''}${r?.words ? ` (${r.words.toLocaleString('en-US')} words)` : ''} from the report.`,
      });
      void reload?.();
    } else if (revJob.status === 'failed') {
      setRevJobId(null);
      setErr(revJob.error?.message ?? 'Applying the report failed.');
    }
  }, [revJob, chapters, reload]);
  useEffect(() => {
    if (revGone && revJobId) {
      setRevJobId(null);
      setErr('The apply run left the server (finished long ago or restarted). Reloading to check whether it landed.');
      void reload?.();
    }
  }, [revGone, revJobId, reload]);

  if (err && !data) return <div className="alert error">{err}</div>;
  if (!data) return <Spinner label="Opening the editor's desk…" />;

  const passDef = PASSES.find((p) => p.id === pass)!;
  const written = chapters.filter((c) => c.words > 0);
  const p1Count = data.reports.filter((r) => r.pass === 'p1').length;
  const applyCh = openBody?.chapter_id != null ? chapters.find((c) => c.id === openBody.chapter_id) : undefined;

  async function setup() {
    setBusy('setup');
    setErr('');
    setMsg('');
    try {
      const r = await api.editor.setup(bookId);
      setData((d) => (d ? { ...d, ledger: r.ledger } : d));
      setMsg(r.started ? 'Session started — parameters logged to the ledger. Every pass now builds on it.' : 'Session already open — ledger kept as-is.');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function runOne() {
    if (!passDef.chapter && pass !== 'synopsis') return;
    const chId = passDef.chapter ? Number(chapterId) : null;
    if (passDef.chapter && !chId) {
      setErr('Pick a chapter first.');
      return;
    }
    setBusy('run');
    setErr('');
    setMsg('');
    setApplied(null);
    try {
      const r = await api.editor.run(bookId, pass, chId);
      await load();
      setMsg(`Done — “${r.title}” saved below${r.ledgerUpdated ? ' + ledger updated' : ''}${pass === 'p2' ? (r.voiceUsed ? ' (Pass 0 voice used)' : ' (no Pass 0 on file — run it on chapter 1 for voice-matched line edits)') : ''}.`);
      openReport(r.reportId);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function runAll() {
    if (!RUN_ALL[pass] || !written.length || prog) return;
    if (!window.confirm(`Run ${passDef.title} on all ${written.length} written chapters? That's ${written.length} AI calls (some large), one per chapter. Takes a while — leave this tab open.`)) return;
    setErr('');
    setMsg('');
    setApplied(null);
    setProg({ i: 0, n: written.length });
    try {
      for (let i = 0; i < written.length; i++) {
        setProg({ i, n: written.length });
        await api.editor.run(bookId, pass, written[i]!.id);
      }
      await load();
      setMsg(`${passDef.title} finished on ${written.length}/${written.length} chapters — reports are listed below, newest first.`);
    } catch (e) {
      setErr(errMsg(e));
      await load();
    } finally {
      setProg(null);
    }
  }

  async function fullReport() {
    const warn = p1Count === 0
      ? 'No Pass 1 runs yet — the full report is far better after Pass 1s. Run it anyway on the ledger alone?'
      : `Write the full-manuscript report from ${p1Count} Pass 1 run(s) + the ledger? One large AI call.`;
    if (!window.confirm(warn)) return;
    setBusy('report');
    setErr('');
    setMsg('');
    try {
      const r = await api.editor.fullReport(bookId);
      await load();
      setMsg(`Full-manuscript report saved (built on ${r.chaptersCovered} chapter verdicts).`);
      openReport(r.reportId);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function startApply() {
    const chId = openBody?.chapter_id;
    if (!chId) return;
    const ch = chapters.find((c) => c.id === chId);
    setShowApply(false);
    setOpenId(null);
    setOpenBody(null);
    setApplied(null);
    setErr('');
    setMsg('');
    setBusy('apply');
    try {
      const notes = (openBody?.body ?? '').slice(0, 4000);
      const { jobId: jid } = await api.engine.jobs.startRevise(chId, [], notes);
      rememberJob({ id: jid, kind: 'revise', label: `Apply report · ch${ch ? ch.idx + 1 : '?'}` });
      setRevJobId(jid);
      setBusy('');
      setMsg(ch
        ? `Applying the report to Chapter ${ch.idx + 1} (“${ch.title}”) — progress shows below; the run lives on the server.`
        : 'Applying the report — progress shows below; the run lives on the server.');
    } catch (e) {
      setErr(errMsg(e));
      setBusy('');
    }
  }

  async function openReport(id: number) {
    setOpenId(id);
    setOpenBody(null);
    setErr('');
    try {
      setOpenBody(await api.editor.report(id));
    } catch (e) {
      setErr(errMsg(e));
      setOpenId(null);
    }
  }

  async function delReport(id: number) {
    if (!window.confirm('Delete this report? The ledger keeps its delta — only the report text goes.')) return;
    setErr('');
    try {
      await api.editor.remove(id);
      if (openId === id) {
        setOpenId(null);
        setOpenBody(null);
      }
      await load();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  function copyBody() {
    if (!openBody) return;
    copyText(openBody.body).then((ok) => {
      if (!ok) {
        setFallbackText(openBody.body);
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <Card>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><BookOpenCheck size={18} /> Editor-in-Chief</h3>
          <Badge tone={data.hasKey && data.aiModel ? 'green' : 'red'}>
            {data.aiModel ? `Runs on ${data.aiModel}` : 'no AI set'}
          </Badge>
        </div>
        <p className="dim" style={{ fontSize: 13.5, lineHeight: 1.65, margin: '0 0 10px' }}>
          A senior trade editor in four passes — developmental, line, copyedit — plus specialists, working
          chapter-by-chapter against a <strong>Running Ledger</strong> so notes never contradict each other.
          Each run costs AI calls: one per chapter for passes, one for the full report.
          Reports never touch your text by themselves — open any report to apply it to its chapter
          (one AI call) or jump straight to the chapter and edit by hand.
          {!data.hasKey ? ' Add your AI key in Settings → AI first.' : null}
        </p>
        {err ? <div className="alert error">{err}</div> : null}
        {msg ? <div className="alert ok">{msg}</div> : null}
        {revJobId ? (
          <div className="alert" style={{ marginBottom: 12 }}>
            {revJob && revJob.events.length ? revJob.events[revJob.events.length - 1]!.msg : 'Apply accepted — starting…'}
          </div>
        ) : null}
        {applied ? (
          <div className="alert ok" style={{ marginBottom: 12 }}>
            {applied.text} {applied.chId ? <Link to={`/read/${applied.chId}`}>Open the revised chapter →</Link> : null}
          </div>
        ) : null}
        <div className="row-between">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button small variant={data.ledger ? 'ghost' : 'soft'} onClick={setup} disabled={!!busy}>
              {busy === 'setup' ? 'Starting…' : data.ledger ? 'Session open ✓' : 'Start session (free)'}
            </Button>
            <Button small variant="ghost" onClick={fullReport} disabled={!!busy || !!prog || !!revJobId}>
              {busy === 'report' ? 'Writing report… (up to a few min)' : 'Full-manuscript report'}
            </Button>
          </div>
          <span className="dim" style={{ fontSize: 12.5 }}>
            {data.reports.length} report{data.reports.length === 1 ? '' : 's'} · {data.voiceOnFile ? 'voice calibrated ✓' : 'no calibration yet'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          <details style={{ flex: '1 1 320px' }}>
            <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Session parameters (auto-filled from your book)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{data.paramsBlock}</pre>
          </details>
          <details style={{ flex: '1 1 320px' }}>
            <summary className="dim" style={{ fontSize: 12.5, cursor: 'pointer' }}>Running Ledger {data.ledger ? '' : '(empty — start a session)'}</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, maxHeight: 260, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>{data.ledger || 'No ledger yet. Start a session, then every pass appends its delta here.'}</pre>
          </details>
        </div>
      </Card>

      <Card className="mt">
        <h3 className="field-label">Run a pass</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {PASSES.map((p) => {
            const Icon = p.icon;
            const sel = pass === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPass(p.id)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left',
                  background: sel ? 'rgba(212,175,55,.08)' : 'transparent',
                  border: `1px solid ${sel ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: 9, padding: '9px 12px', color: 'var(--ink)', cursor: 'pointer',
                }}
              >
                <Icon size={17} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>
                  <strong style={{ fontSize: 13.5 }}>{p.title}</strong>
                  <span className="dim" style={{ fontSize: 12.5, display: 'block', lineHeight: 1.55 }}>{p.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="row-between">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {passDef.chapter ? (
              <Field label="Chapter">
                <select className="input" value={chapterId} onChange={(e) => setChapterId(e.target.value)} style={{ minWidth: 220 }}>
                  <option value="">— pick —</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.words === 0}>
                      Ch {c.idx + 1} · {c.title}{c.words === 0 ? ' (unwritten)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <span className="dim" style={{ fontSize: 13 }}>Whole book — no chapter needed.</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {RUN_ALL[pass] ? (
              <Button small variant="ghost" onClick={runAll} disabled={!!busy || !!prog || !written.length || !!revJobId}>
                {prog ? `Running ${prog.i + 1}/${prog.n}…` : `Run on all ${written.length} chapters`}
              </Button>
            ) : null}
            <Button small onClick={runOne} disabled={!!busy || !!prog || !!revJobId}>
              <Play size={14} /> {busy === 'run' ? 'Editing… (up to a few min)' : 'Run pass'}
            </Button>
          </div>
        </div>
        {prog ? <div style={{ marginTop: 12 }}><Progress pct={(prog.i / prog.n) * 100} /></div> : null}
      </Card>

      <Card className="mt">
        <h3 className="field-label">Reports ({data.reports.length})</h3>
        {data.reports.length === 0 ? (
          <EmptyState title="No reports yet" body="Run Pass 0 on chapter 1 to calibrate the voice, then Pass 1 down the chapters." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.reports.map((r) => (
              <div key={r.id} className="ch-row" style={{ cursor: 'pointer' }} onClick={() => openReport(r.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 13.5 }}>{r.title}</h4>
                  <p style={{ fontSize: 12.5 }}>{r.preview.slice(0, 140)}{r.preview.length > 140 ? '…' : ''}</p>
                </div>
                <div className="ch-side" style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Badge tone="blue">{r.pass}</Badge>
                  {r.chapter_idx != null && chapters.some((c) => c.idx === r.chapter_idx) ? (
                    <Link
                      to={`/read/${chapters.find((c) => c.idx === r.chapter_idx)!.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12 }}
                    >
                      Ch {r.chapter_idx + 1} →
                    </Link>
                  ) : null}
                  <span className="dim" style={{ fontSize: 11.5 }}>{r.model} · {r.created_at.slice(0, 16).replace('T', ' ')}</span>
                  <button className="row-del" title="Delete report"
                    onClick={(e) => { e.stopPropagation(); delReport(r.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {fallbackText !== null ? <CopyFallback text={fallbackText} onClose={() => setFallbackText(null)} /> : null}
      {showApply && openBody?.chapter_id ? (
        <Modal title={`Apply report to Chapter ${applyCh ? applyCh.idx + 1 : ''}?`} onClose={() => setShowApply(false)}>
          <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>
            One AI call. The revision follows this report&apos;s notes and keeps your plot, beats, and voice —
            your current chapter text is replaced, and the report stays on file below.
          </p>
          {applyCh ? (
            <p className="dim" style={{ fontSize: 13 }}>
              Chapter {applyCh.idx + 1} · “{applyCh.title}” · {applyCh.words.toLocaleString('en-US')} words
            </p>
          ) : null}
          <div className="row-between mt">
            <Button variant="ghost" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={startApply} disabled={busy === 'apply'}>{busy === 'apply' ? 'Starting…' : 'Apply & revise'}</Button>
          </div>
        </Modal>
      ) : null}
      {openId !== null ? (
        <Modal title={openBody?.title ?? 'Loading report…'} onClose={() => { setOpenId(null); setOpenBody(null); }}>
          {!openBody ? <Spinner label="Loading…" /> : (
            <div>
              <p className="dim" style={{ fontSize: 12.5, marginTop: 0 }}>{openBody.model} · {openBody.created_at.slice(0, 16).replace('T', ' ')}</p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: 480, overflowY: 'auto', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 12 }}>{openBody.body}</pre>
              <div className="row-between mt">
                <Button variant="ghost" onClick={() => { setOpenId(null); setOpenBody(null); }}>Close</Button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {openBody.chapter_id ? (
                    <>
                      <Button small variant="soft" to={`/read/${openBody.chapter_id}`}>Open chapter</Button>
                      <Button small onClick={() => setShowApply(true)} disabled={!!revJobId}>Apply to chapter…</Button>
                    </>
                  ) : (
                    <span className="dim" style={{ fontSize: 12, alignSelf: 'center' }}>Book-level report — run a chapter pass for editable notes.</span>
                  )}
                  <Button small variant="ghost" onClick={copyBody}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}</Button>
                  <Button small variant="danger" onClick={() => delReport(openBody.id)}><Trash2 size={13} /> Delete</Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
