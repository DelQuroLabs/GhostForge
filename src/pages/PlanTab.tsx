import { useState } from 'react';
import { Sparkles, CheckCircle2, Save, FlaskConical } from 'lucide-react';
import { api, errMsg, type Book, type Chapter, type CharRow } from '../lib/api.js';
import { Button, Card, Badge, EmptyState, Field } from '../components/ui.js';

type Full = Book & { chapters: Chapter[]; characters: CharRow[] };
type Props = { book: Full; reload: () => Promise<void>; onErr: (m: string) => void; onApproved: () => void };

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function PlanTab({ book, reload, onErr, onApproved }: Props) {
  const plan = book.plan ?? null;
  const nf = book.kind === 'nonfiction';
  const [logline, setLogline] = useState(book.logline ?? '');
  const [beats, setBeats] = useState((plan?.beats ?? []).join('\n'));
  const [thesis, setThesis] = useState(plan?.thesis ?? '');
  const [claims, setClaims] = useState((plan?.claims ?? []).join('\n'));
  const [numCh, setNumCh] = useState(() =>
    String(book.chapters.length > 0 ? book.chapters.length : Math.max(8, Math.min(48, Math.round(book.target_words / 1500)))),
  );
  const [busy, setBusy] = useState('');

  const init = {
    logline: book.logline ?? '',
    beats: (plan?.beats ?? []).join('\n'),
    thesis: plan?.thesis ?? '',
    claims: (plan?.claims ?? []).join('\n'),
  };
  const dirty = logline !== init.logline || beats !== init.beats || thesis !== init.thesis || claims !== init.claims;
  const hasWords = book.chapters.some((c) => c.words > 0);

  async function draft() {
    const n = Math.max(4, Math.min(48, Number(numCh) || 8));
    if (book.chapters.length > 0 && !window.confirm(
      'Drafting a plan replaces the current chapter outline and cast with fresh AI shells. Continue?',
    )) return;
    setBusy('draft');
    onErr('');
    try {
      await api.books.planDraft(String(book.id), { numChapters: n });
      await reload();
    } catch (e) {
      onErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function save() {
    setBusy('save');
    onErr('');
    try {
      await api.books.planSave(String(book.id), {
        logline: logline.trim(), beats: lines(beats), thesis: thesis.trim(), claims: lines(claims),
      });
      await reload();
    } catch (e) {
      onErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function approve() {
    setBusy('approve');
    onErr('');
    try {
      await api.books.planApprove(String(book.id));
      await reload();
      onApproved();
    } catch (e) {
      onErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <Card>
        <div className="row-between">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Book plan</strong>
            {plan?.approved ? (
              <Badge tone="green">✓ Approved{plan.approvedAt ? ` · ${plan.approvedAt.slice(0, 10)}` : ''}</Badge>
            ) : plan ? (
              <Badge tone="gold">Draft — needs approval</Badge>
            ) : (
              <Badge tone="dim">No plan yet</Badge>
            )}
            {plan?.source ? <Badge>{plan.source === 'ai' ? 'AI-drafted' : 'written by you'}</Badge> : null}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {!plan && !busy ? (
              <>
                <label className="dim" style={{ fontSize: 13 }} htmlFor="plan-nch">Chapters</label>
                <input id="plan-nch" className="input" style={{ width: 70 }} inputMode="numeric"
                  value={numCh} onChange={(e) => setNumCh(e.target.value)} />
                <Button small onClick={draft} disabled={!!busy || hasWords}>
                  <Sparkles size={14} /> {busy === 'draft' ? 'Drafting…' : 'Draft plan with AI'}
                </Button>
              </>
            ) : (
              <>
                <Button small variant="ghost" onClick={save} disabled={!dirty || !!busy}>
                  <Save size={14} /> {busy === 'save' ? 'Saving…' : 'Save edits'}
                </Button>
                <Button small onClick={approve} disabled={!!busy || !!plan?.approved || book.chapters.length === 0}>
                  <CheckCircle2 size={14} /> {busy === 'approve' ? 'Approving…' : plan?.approved ? 'Approved' : 'Approve plan'}
                </Button>
                {plan && !plan.approved ? (
                  <Button small variant="ghost" onClick={draft} disabled={!!busy || hasWords} title="Replace the current outline with a fresh AI draft">
                    <Sparkles size={14} /> {busy === 'draft' ? 'Re-drafting…' : 'Re-draft with AI'}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
        <p className="dim" style={{ fontSize: 13, marginBottom: 0, lineHeight: 1.6 }}>
          {nf
            ? 'Review the logline, thesis, and claims below. Chapters live in the Outline tab, the cast in Characters — edit any of them and approval resets until you approve again.'
            : 'Review the logline and story beats below. Chapters live in the Outline tab, the cast in Characters — edit any of them and approval resets until you approve again.'}
          {hasWords ? ' This book already has written chapters, so AI planning is locked — planning replaces the outline.' : null}
        </p>
      </Card>

      {!plan ? (
        <div className="mt">
          <EmptyState
            title="No plan yet"
            body={hasWords
              ? 'This book was written without a plan. The outline below is your record — you can still approve it to stamp the Agent Pack.'
              : 'Let the AI architect the whole book — outline, cast, and story beats — then edit everything before you approve. Or build chapters by hand in the Outline tab and approve when ready.'}
          />
        </div>
      ) : (
        <div className="two-col mt">
          <div>
            <Card>
              <Field label="Logline — the book in one breath">
                <textarea className="input" value={logline} onChange={(e) => setLogline(e.target.value)}
                  placeholder="e.g. A retired cartographer must redraw the map of a country that keeps moving." />
              </Field>
              {nf ? (
                <Field label="Thesis — the one argument this book proves" hint="A paragraph. Every chapter should serve it.">
                  <textarea className="input plan-lines" value={thesis} onChange={(e) => setThesis(e.target.value)}
                    placeholder="e.g. Small teams outperform large ones when…" />
                </Field>
              ) : (
                <Field label="Story beats — one per line, setup to resolution" hint="The arc the chapters must follow.">
                  <textarea className="input plan-lines" value={beats} onChange={(e) => setBeats(e.target.value)}
                    placeholder={'1. Mara inherits a map that changes overnight\n2. She follows it to the night market…'} />
                </Field>
              )}
            </Card>
          </div>
          <div>
            {nf ? (
              <Card>
                <Field label="Core claims — one per line" hint="Each claim plus the KIND of source needed to prove it. The AI never invents evidence.">
                  <textarea className="input plan-lines" value={claims} onChange={(e) => setClaims(e.target.value)}
                    placeholder={'Deep work beats long hours (cite attention research)\nSleep consolidates skill (cite sleep studies)'} />
                </Field>
                <div className="alert" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>
                  <FlaskConical size={14} style={{ verticalAlign: -2 }} /> Honesty rules are baked in:
                  the planner, chapter drafts, Enhance, and the Agent Pack never invent facts, stats, quotes,
                  studies, or people. Uncertain points are marked <strong>[VERIFY]</strong> so you can check them.
                </div>
              </Card>
            ) : (
              <Card>
                <h3 className="field-label">How approval works</h3>
                <ol className="dim" style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
                  <li>AI drafts the outline, cast &amp; beats (or write them by hand)</li>
                  <li>You edit everything — Outline, Characters, beats</li>
                  <li>You approve — the Agent Pack carries an APPROVED stamp</li>
                  <li>Any structural edit resets approval until you re-approve</li>
                </ol>
              </Card>
            )}
            <Card className="mt">
              <h3 className="field-label">Plan coverage</h3>
              <dl className="kv">
                <dt>Chapters</dt><dd>{book.chapters.length} in outline</dd>
                <dt>Cast</dt><dd>{book.characters.length} characters</dd>
                <dt>{nf ? 'Claims' : 'Beats'}</dt><dd>{nf ? lines(claims).length : lines(beats).length} listed</dd>
              </dl>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
