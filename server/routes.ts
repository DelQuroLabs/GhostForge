import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { sb, q, now } from './db.js';
import { delTrack, delBookAudio } from './storage.js';
import { forgeBook, forgeBodies, coverForGenre, type ForgedBook } from './engine/fullBook.js';
import { createJob, getJob, listJobs, emitter, launch, type Emit } from './jobs.js';
import { runReviseChapter } from './novelEngine.js';
import { getAiPublic, saveAi, chatComplete, enhanceChapterBody, studioChat, draftChapterBody, draftBookPlan, reviewChapterBody, offlineLint } from './ai.js';
import { buildMarkdown, buildTxt, buildHtml, buildKdp, buildEpub, slug, type ExportBook, type ExportChapter, type ExportChar } from './exporters.js';
import { buildAgentPack, type PackPrev } from './agentPack.js';
import {
  PIPELINE, runStage0, runStage1, runStage2, buildLedgerSeed,
  runGate1, runGate2, runGates34, runGate5, runGate6, pruneLedger,
  parseStep, stringifyStep,
  type NovelAnchors, type NovelPlan, type PasteInput,
} from './novelEngine.js';
import {
  runEditorPass, runFullReport, runSynopsisQuery, editorParamsBlock, seedEditorLedger,
  extractLedgerDelta, stripLedgerDelta, appendEditorLedger, EDITOR_PASSES, type EditorPassId, type EditorParams,
} from './editorChief.js';

export class HError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
const send = (res: Response, data: unknown, status = 200) => res.status(status).json({ data });
// Friendly pointer when the DB predates a migration the route needs.
const migrationGuard = (e: unknown): void => {
  const msg = (e as Error)?.message ?? String(e);
  if (/no such table|no such column|has no column/i.test(msg)) {
    throw new HError(500, 'MIGRATION_NEEDED', 'Your database file is from an older Ghostforge version and is missing a table or column. Restore from a backup into a fresh install, then try again.');
  }
};

export const router = Router();

// ---------- helpers ----------
type BookRow = {
  id: number; title: string; subtitle: string; premise: string; mode: string; kind: string;
  genre: string; audience: string; tone: string; style: string; pov: string; tense: string; target_words: number;
  status: string; pen_name_id: number | null; series_id: number | null; series_number: number | null;
  logline: string; blurb: string; categories: string; keywords: string; cover_cfg: string;
  stage: string; stages_approved: string; plan: string | null; engine_ctx: string | null;
  ledger: string | null; bible: string | null; editor_ledger: string | null;
  created_at: string; updated_at: string;
  pen_name?: string | null; series_title?: string | null;
};
const J = <T>(s: string, fb: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fb;
  }
};
const bookJson = (b: BookRow) => ({
  ...b,
  categories: J<string[]>(b.categories, []),
  keywords: J<string[]>(b.keywords, []),
  cover_cfg: J(b.cover_cfg, {}),
  stages_approved: J<string[]>(b.stages_approved, []),
  plan: J<PlanState | null>(b.plan ?? '', null),
  engine_ctx: undefined as never,
  // Tolerate older database files where these columns may hold NULL.
  ledger: b.ledger ?? null,
  bible: b.bible ?? null,
  editor_ledger: b.editor_ledger ?? null,
});
const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

async function getBookRow(id: number): Promise<BookRow> {
  const r = await q<{
    pen_names: { name: string } | null; series: { title: string } | null;
  } & Omit<BookRow, 'pen_name' | 'series_title'> | null>(
    sb.from('books').select('*,pen_names(name),series(title)').eq('id', id).maybeSingle(),
    'getBook',
  );
  if (!r) throw new HError(404, 'NOT_FOUND', 'Book not found');
  const { pen_names, series, ...rest } = r;
  return { ...rest, pen_name: pen_names?.name ?? null, series_title: series?.title ?? null };
}
export type ChapterRow = {
  id: number; book_id: number; idx: number; title: string; summary: string; kind: string; step: string;
  body: string; words: number; ai_enhanced: number; written_by: string; review_score: number | null; reviewed_at: string | null;
};
async function chaptersOf(bookId: number): Promise<ChapterRow[]> {
  const rows = await q<Array<Omit<ChapterRow, 'review_score' | 'reviewed_at'>>>(
    sb.from('chapters').select('*').eq('book_id', bookId).order('idx'),
    'chaptersOf',
  );
  // Latest review per chapter, merged in JS (portable across Postgres drivers).
  const revs = await q<Array<{ chapter_id: number; score: number; created_at: string }>>(
    sb.from('chapter_reviews').select('chapter_id,score,created_at').eq('book_id', bookId).order('id', { ascending: false }),
    'chaptersOf reviews',
  );
  const byId = new Map<number, { score: number; created_at: string }>();
  for (const r of revs) if (!byId.has(r.chapter_id)) byId.set(r.chapter_id, r);
  return rows.map((c) => ({ ...c, written_by: (c as { written_by?: string }).written_by ?? '', review_score: byId.get(c.id)?.score ?? null, reviewed_at: byId.get(c.id)?.created_at ?? null }));
}
type ReviewRow = { id: number; chapter_id: number; book_id: number; created_at: string; model: string; score: number; summary: string; findings: string };
const reviewJson = (x: ReviewRow) => ({ ...x, findings: J(x.findings, [] as unknown[]) });
const chapterById = async (id: number): Promise<ChapterRow | undefined> => {
  const c = await q<Omit<ChapterRow, 'review_score' | 'reviewed_at'> | null>(
    sb.from('chapters').select('*').eq('id', id).maybeSingle(),
    'chapterById',
  );
  if (!c) return undefined;
  const r = await q<{ score: number; created_at: string } | null>(
    sb.from('chapter_reviews').select('score,created_at').eq('chapter_id', id).order('id', { ascending: false }).limit(1).maybeSingle(),
    'chapterById review',
  );
  return { ...c, written_by: (c as { written_by?: string }).written_by ?? '', review_score: r?.score ?? null, reviewed_at: r?.created_at ?? null };
};
export type CharRow = { id: number; book_id: number; name: string; role: string; description: string; arc: string };
async function charsOf(bookId: number): Promise<CharRow[]> {
  return q<CharRow[]>(sb.from('characters').select('*').eq('book_id', bookId).order('id'), 'charsOf');
}
type PlanState = { beats: string[]; thesis: string; claims: string[]; approved: boolean; approvedAt: string | null; source: string | null };
const emptyPlan = (): PlanState => ({ beats: [], thesis: '', claims: [], approved: false, approvedAt: null, source: null });
async function clearPlanApproval(bookId: number): Promise<void> {
  const b = await q<{ plan: string | null } | null>(
    sb.from('books').select('plan').eq('id', bookId).maybeSingle(),
    'clearPlanApproval',
  );
  if (!b?.plan) return;
  try {
    const p = JSON.parse(b.plan) as PlanState;
    if (!p.approved) return;
    p.approved = false;
    await q(sb.from('books').update({ plan: JSON.stringify(p) }).eq('id', bookId), 'clearPlanApproval update');
  } catch {
    /* corrupted plan json — leave it */
  }
}
async function fullBook(id: number) {
  const b = await getBookRow(id);
  return { ...bookJson(b), chapters: await chaptersOf(id), characters: await charsOf(id) };
}

function bookBrief(b: BookRow): string {
  const lines = [`BOOK: "${b.title}" (${b.genre}, ${b.kind})`, `PREMISE: ${b.premise || '(none yet)'}`];
  if (b.audience) lines.push(`AUDIENCE: ${b.audience}`);
  if (b.tone) lines.push(`TONE: ${b.tone}`);
  if (b.style) lines.push(`STYLE LIKE: ${b.style}`);
  if (b.kind === 'fiction') lines.push(`POV: ${b.pov} · TENSE: ${b.tense}`);
  return lines.join('\n');
}

export function createBookFromForge(forged: ForgedBook, meta: {
  premise: string; mode: string; kind: string; genre: string; audience: string; tone: string; style: string;
  pov: string; tense: string; targetWords: number; status: string; stage: string;
  stagesApproved: string[]; penNameId: number | null; seriesId: number | null; seriesNumber: number | null;
}): Promise<number> {
  const ts = now();
  return q<number>(
    sb.rpc('rpc_forge_create', {
      p_book: {
        title: forged.title, subtitle: forged.subtitle, premise: meta.premise, mode: meta.mode,
        kind: meta.kind, genre: meta.genre, audience: meta.audience, tone: meta.tone, style: meta.style,
        pov: meta.pov, tense: meta.tense, target_words: meta.targetWords, status: meta.status,
        pen_name_id: meta.penNameId, series_id: meta.seriesId, series_number: meta.seriesNumber,
        logline: forged.logline, blurb: forged.blurb, categories: JSON.stringify(forged.categories),
        keywords: JSON.stringify(forged.keywords), cover_cfg: JSON.stringify(forged.cover),
        stage: meta.stage, stages_approved: JSON.stringify(meta.stagesApproved),
        engine_ctx: JSON.stringify(forged.ctx), updated_at: ts, created_at: ts,
      },
      p_chapters: forged.chapters.map((c) => ({
        title: c.title, summary: c.summary, kind: c.kind, step: c.step, body: c.body, words: c.words,
      })),
      p_characters: forged.characters.map((c) => ({
        name: c.name, role: c.role, description: c.description, arc: c.arc,
      })),
    }),
    'forge create',
  );
}

// ---------- books ----------
const CreateBook = z.object({
  title: z.string().max(200).optional(),
  premise: z.string().max(4000).default(''),
  kind: z.enum(['fiction', 'nonfiction']),
  genre: z.string().min(2).max(60),
  audience: z.string().max(200).default(''),
  tone: z.string().max(120).default(''),
  style: z.string().max(160).default(''),
  pov: z.string().max(60).default('Third Person Limited'),
  tense: z.enum(['Past', 'Present']).default('Past'),
  targetWords: z.number().int().min(5000).max(120000).default(30000),
  mode: z.enum(['one-click', 'guided', 'series', 'blank', 'engine']).default('one-click'),
  penNameId: z.number().int().nullable().optional(),
  newPenName: z.string().max(80).optional(),
  seriesId: z.number().int().nullable().optional(),
  newSeries: z.string().max(120).optional(),
  seed: z.string().max(40).optional(),
  anchors: z.object({
    subgenre: z.string().max(120).default(''),
    comps: z.string().max(2000).default(''),
    protagonist: z.string().max(2000).default(''),
    antagonist: z.string().max(2000).default(''),
    stakes: z.string().max(2000).default(''),
    theme: z.string().max(2000).default(''),
    ending: z.string().max(2000).default(''),
    seeds: z.string().max(2000).default(''),
  }).optional(),
});

router.get('/books', ah(async (_req, res) => {
  const rows = await q<Array<BookRow & { chapters: number; words: number }>>(
    sb.from('v_books_list').select('*').order('updated_at', { ascending: false }),
    'books list',
  );
  send(res, rows.map((b) => ({ ...bookJson(b), chapters: b.chapters, words: b.words })));
}));

async function resolveIds(v: z.infer<typeof CreateBook>): Promise<{ penId: number | null; seriesId: number | null; seriesNumber: number | null }> {
  let penId: number | null = v.penNameId ?? null;
  if (v.newPenName?.trim()) {
    const ex = await q<{ id: number } | null>(
      sb.from('pen_names').select('id').eq('name', v.newPenName.trim()).maybeSingle(),
      'pen lookup',
    );
    penId = ex ? ex.id : (await q<{ id: number }>(
      sb.from('pen_names').insert({ name: v.newPenName.trim(), created_at: now() }).select('id').single(),
      'pen insert',
    )).id;
  } else if (penId) {
    const ex = await q<{ id: number } | null>(
      sb.from('pen_names').select('id').eq('id', penId).maybeSingle(),
      'pen lookup',
    );
    if (!ex) throw new HError(400, 'BAD_PEN', 'Pen name not found');
  }
  let seriesId: number | null = v.seriesId ?? null;
  if (v.newSeries?.trim()) {
    seriesId = (await q<{ id: number }>(
      sb.from('series').insert({ pen_name_id: penId, title: v.newSeries.trim(), created_at: now() }).select('id').single(),
      'series insert',
    )).id;
  } else if (seriesId) {
    const ex = await q<{ id: number } | null>(
      sb.from('series').select('id').eq('id', seriesId).maybeSingle(),
      'series lookup',
    );
    if (!ex) throw new HError(400, 'BAD_SERIES', 'Series not found');
  }
  let seriesNumber: number | null = null;
  if (seriesId) {
    const m = await q<{ series_number: number } | null>(
      sb.from('books').select('series_number').eq('series_id', seriesId).not('series_number', 'is', null).order('series_number', { ascending: false }).limit(1).maybeSingle(),
      'series max',
    );
    seriesNumber = (m?.series_number ?? 0) + 1;
  }
  return { penId, seriesId, seriesNumber };
}

async function runEngineCreate(v: z.infer<typeof CreateBook>, pen: { penId: number | null; seriesId: number | null; seriesNumber: number | null }, emit: Emit): Promise<number> {
  if (v.kind !== 'fiction') throw new HError(400, 'ENGINE_FICTION_ONLY', 'The Novel Engine writes fiction. For nonfiction, use Guided or Blank.');
  const anchors: NovelAnchors = {
    subgenre: v.anchors?.subgenre?.trim() ?? '', comps: v.anchors?.comps?.trim() ?? '',
    protagonist: v.anchors?.protagonist?.trim() ?? '', antagonist: v.anchors?.antagonist?.trim() ?? '',
    stakes: v.anchors?.stakes?.trim() ?? '', theme: v.anchors?.theme?.trim() ?? '',
    ending: v.anchors?.ending?.trim() ?? '', seeds: v.anchors?.seeds?.trim() ?? '',
  };
  const engTitle = v.title?.trim() || 'Untitled Book';
  const novelReq = Math.random().toString(36).slice(2, 8);
  console.log(`[novel ${novelReq}] create start: ${v.genre}, ${v.targetWords}w, "${engTitle.slice(0, 60)}"`);
  try {
    console.log(`[novel ${novelReq}] S0 start`);
  emit('stage-0', 'Stage 0 · Forging the concept…');
    const s0 = await runStage0({
      title: engTitle, genre: v.genre, audience: v.audience, tone: v.tone, style: v.style,
      pov: v.pov, tense: v.tense, targetWords: v.targetWords, premise: v.premise, anchors,
    });
    console.log(`[novel ${novelReq}] S0 ok, S1 start`);
  emit('stage-0', 'Stage 0 · Concept locked.', { dramaticQuestion: s0.design.dramaticQuestion, protagonistWant: s0.design.protagonist.want ?? '', endingClimax: s0.design.ending.climax ?? '' });
  emit('stage-1', 'Stage 1 · Mapping the structure…');
    const s1 = await runStage1({
      designMd: s0.designMd, design: s0.design,
      targetWords: v.targetWords, genre: v.genre, pov: v.pov,
    });
    console.log(`[novel ${novelReq}] S1 ok, S2 start`);
  emit('stage-1', 'Stage 1 · Beat map locked.', { chapterCount: s1.beatmap.chapters.length, architecture: s1.beatmap.architecture.primary });
  emit('stage-2', 'Stage 2 · Writing the bible…');
    const s2 = await runStage2({ designMd: s0.designMd, beatmapMd: s1.beatmapMd });
    console.log(`[novel ${novelReq}] S2 ok, storing book`);
  emit('stage-2', 'Stage 2 · Bible + voice locked.', { cast: s2.bible.characters.map((c) => c.name).slice(0, 12) });
  emit('storing', 'Binding the book — cover, chapters, cast…');
    const forged: ForgedBook = {
      title: engTitle, subtitle: '', totalWords: 0, logline: s0.design.promise.slice(0, 500),
      blurb: s0.design.synopsis.slice(0, 1500),
      categories: [v.genre, anchors.subgenre].filter(Boolean),
      keywords: s0.design.seedList.slice(0, 10),
      cover: coverForGenre(v.genre, v.kind),
      chapters: s1.beatmap.chapters.map((c) => ({
        idx: c.n - 1,
        title: c.title,
        summary: [`Job: ${c.job}`, c.beat ? `Beat: ${c.beat}` : '', c.valueShift ? `Value: ${c.valueShift}` : '', c.enters ? `Enters: ${c.enters}` : '', c.exits ? `Exits: ${c.exits}` : ''].filter(Boolean).join('\n').slice(0, 2000),
        kind: 'engine', step: '', body: '', words: 0,
      })),
      characters: s2.bible.characters.map((c) => ({
        name: c.name, role: c.role || 'cast',
        description: [c.description, c.voice ? `Voice: ${c.voice}` : '', c.physical ? `Physical: ${c.physical}` : '', c.function ? `Function: ${c.function}` : '', c.secret ? `Secret: ${c.secret}` : ''].filter(Boolean).join('\n').slice(0, 4000),
        arc: [c.want ? `Want: ${c.want}` : '', c.need ? `Need: ${c.need}` : '', c.arc].filter(Boolean).join('\n').slice(0, 4000),
      })),
      ctx: {} as ForgedBook['ctx'],
    };
    const id = await createBookFromForge(forged, {
      premise: v.premise, mode: v.mode, kind: v.kind, genre: v.genre, audience: v.audience,
      tone: v.tone, style: v.style, pov: v.pov, tense: v.tense, targetWords: v.targetWords,
      status: 'forging', stage: 'draft',
      stagesApproved: ['premise', 'outline', 'characters'],
      penNameId: pen.penId, seriesId: pen.seriesId, seriesNumber: pen.seriesNumber,
    });
    const plan: NovelPlan & { beats: string[]; thesis: string; claims: string[]; approved: boolean; approvedAt: string | null; source: string } = {
      beats: s1.beatmap.chapters.map((c) => `Ch ${c.n}${c.beat ? ` (${c.beat})` : ''}: ${c.job}`), thesis: '', claims: [], approved: true, approvedAt: now(), source: 'novel-engine',
      pipeline: PIPELINE, anchors,
      design: s0.design, designMd: s0.designMd,
      beatmap: s1.beatmap, beatmapMd: s1.beatmapMd,
      styleCondensed: s2.bible.styleSpec.condensed,
    };
    try {
      await q(sb.from('books').update({
        plan: JSON.stringify(plan),
        ledger: buildLedgerSeed(s0.design, s2.bible, v.targetWords),
        bible: s2.bibleMd, updated_at: now(),
      }).eq('id', id), 'novel stages store');
    } catch (e2) {
      migrationGuard(e2);
      throw e2;
    }
    console.log(`[novel ${novelReq}] stored book ${id}`);
    return id;
  } catch (e) {
    if ((e as HError).code === 'MIGRATION_NEEDED') throw e;
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', 'The Novel Engine needs your AI key — add one in Settings → AI, or use One-Click for the instant offline draft.');
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    console.error(`[novel ${novelReq}] FAILED:`, (e as Error).message);
    throw new HError(502, 'STAGE_FAILED', (e as Error).message);
  }
}

router.post('/books', ah(async (req, res) => {
  const v = CreateBook.parse(req.body);
  const { penId, seriesId, seriesNumber } = await resolveIds(v);
  if (v.mode === 'blank') {
    const ts = now();
    const info = (await q<{ id: number }>(
      sb.from('books').insert({
        title: v.title?.trim() || 'Untitled Book', subtitle: '', premise: v.premise, mode: 'blank',
        kind: v.kind, genre: v.genre, audience: v.audience, tone: v.tone, style: v.style,
        pov: v.pov, tense: v.tense, target_words: v.targetWords, status: 'draft',
        pen_name_id: penId, series_id: seriesId, series_number: seriesNumber,
        logline: '', blurb: '', categories: '[]', keywords: '[]', cover_cfg: '{}',
        stage: 'draft', stages_approved: '[]', engine_ctx: null, updated_at: ts, created_at: ts,
      }).select('id').single(),
      'book insert',
    )).id;
    send(res, await fullBook(info), 201);
    return;
  }
  if (v.premise.trim().length < 20) throw new HError(400, 'BAD_PREMISE', 'Premise needs at least a sentence or two (20+ characters).');
  if (v.mode === 'engine') {
    const id = await runEngineCreate(v, { penId, seriesId, seriesNumber }, () => {});
    send(res, await fullBook(id), 201);
    return;
  }
  const guided = v.mode === 'guided';
  const forged = forgeBook({
    premise: v.premise, kind: v.kind, genre: v.genre, audience: v.audience, tone: v.tone, style: v.style,
    pov: v.pov, tense: v.tense, targetWords: v.targetWords,
    penName: v.newPenName?.trim() || '', seed: v.seed,
  }, !guided);
  const id = await createBookFromForge(forged, {
    premise: v.premise, mode: v.mode, kind: v.kind, genre: v.genre, audience: v.audience,
    tone: v.tone, style: v.style, pov: v.pov, tense: v.tense, targetWords: v.targetWords,
    status: guided ? 'forging' : 'complete', stage: guided ? 'outline' : 'done',
    stagesApproved: guided ? ['premise'] : ['premise', 'outline', 'characters', 'draft'],
    penNameId: penId, seriesId, seriesNumber,
  });
  send(res, await fullBook(id), 201);
}));

router.get('/books/:id', ah(async (req, res) => {
  send(res, await fullBook(Number(req.params.id)));
}));

const UpdateBook = z.object({
  title: z.string().min(1).max(200).optional(), subtitle: z.string().max(200).optional(),
  blurb: z.string().max(8000).optional(), logline: z.string().max(1000).optional(),
  status: z.enum(['forging', 'complete', 'published', 'draft']).optional(),
  genre: z.string().max(60).optional(), audience: z.string().max(200).optional(),
  tone: z.string().max(120).optional(),
  style: z.string().max(160).optional(),
}).strict();
router.put('/books/:id', ah(async (req, res) => {
  const v = UpdateBook.parse(req.body);
  await getBookRow(Number(req.params.id));
  const keys = Object.keys(v) as Array<keyof typeof v>;
  if (keys.length) {
    const patch: Record<string, unknown> = { updated_at: now() };
    for (const k of keys) patch[k] = v[k];
    await q(sb.from('books').update(patch).eq('id', Number(req.params.id)), 'book update');
  }
  send(res, await fullBook(Number(req.params.id)));
}));

router.delete('/books/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  await getBookRow(id);
  await q(sb.from('chapter_reviews').delete().eq('book_id', id), 'book delete reviews');
  await q(sb.from('chapters').delete().eq('book_id', id), 'book delete chapters');
  await q(sb.from('characters').delete().eq('book_id', id), 'book delete characters');
  await q(sb.from('audio_tracks').delete().eq('book_id', id), 'book delete tracks');
  await q(sb.from('books').delete().eq('id', id), 'book delete');
  await delBookAudio(id).catch(() => { /* MP3 cleanup is best-effort */ });
  send(res, { deleted: id });
}));

const STAGES = ['premise', 'outline', 'characters', 'draft', 'done'] as const;
router.post('/books/:id/advance', ah(async (req, res) => {
  const v = z.object({ stage: z.enum(['outline', 'characters', 'draft', 'done']) }).parse(req.body);
  const b = await getBookRow(Number(req.params.id));
  if (b.mode === 'engine') throw new HError(400, 'ENGINE_BOOK', 'This book is written by the Novel Engine — use the chapter gates, not the offline forge stages.');
  const cur = STAGES.indexOf(b.stage as never);
  const nxt = STAGES.indexOf(v.stage);
  if (nxt !== cur + 1) throw new HError(400, 'BAD_STAGE', `Cannot move from ${b.stage} to ${v.stage}`);
  if (v.stage === 'draft') {
    const ctx = b.engine_ctx ? JSON.parse(b.engine_ctx) : null;
    if (!ctx) throw new HError(400, 'NO_CTX', 'Engine context missing; cannot forge draft');
    const plan = (await chaptersOf(b.id)).map((c) => ({ title: c.title, summary: c.summary, kind: c.kind, step: c.step }));
    const per = Math.max(700, Math.min(2400, Math.round(b.target_words / Math.max(1, plan.length))));
    const bodies = forgeBodies(ctx, plan, per);
    for (const f of bodies) {
      await q(sb.from('chapters').update({ body: f.body, words: f.words, written_by: 'story-engine' }).eq('book_id', b.id).eq('idx', f.idx), 'advance bodies');
    }
  }
  const approved = [...J<string[]>(b.stages_approved, []), v.stage];
  await q(sb.from('books').update({ stage: v.stage, stages_approved: JSON.stringify(approved), status: v.stage === 'done' ? 'complete' : 'forging', updated_at: now() }).eq('id', b.id), 'advance book');
  send(res, await fullBook(b.id));
}));

router.post('/books/:id/forge-draft', ah(async (req, res) => {
  const v = z.object({ force: z.boolean().optional() }).parse(req.body ?? {});
  const b = await getBookRow(Number(req.params.id));
  if (b.mode === 'engine') throw new HError(400, 'ENGINE_BOOK', 'This book is written by the Novel Engine — use the chapter gates, not the offline forge.');
  const existing = await chaptersOf(b.id);
  if (!v.force && existing.length && existing.every((c) => c.words > 0)) {
    throw new HError(409, 'ALREADY_FORGED', 'Draft already forged. Use force to re-forge.');
  }
  const ctx = b.engine_ctx ? JSON.parse(b.engine_ctx) : null;
  if (!ctx) throw new HError(400, 'NO_CTX', 'Engine context missing; cannot forge draft');
  const plan = existing.map((c) => ({ title: c.title, summary: c.summary, kind: c.kind, step: c.step }));
  const per = Math.max(700, Math.min(2400, Math.round(b.target_words / Math.max(1, plan.length))));
  const bodies = forgeBodies(ctx, plan, per);
  for (const f of bodies) {
    await q(sb.from('chapters').update({ body: f.body, words: f.words, ai_enhanced: 0, written_by: 'story-engine' }).eq('book_id', b.id).eq('idx', f.idx), 'forge bodies');
  }
  await q(sb.from('books').update({ status: 'complete', stage: 'done', updated_at: now() }).eq('id', b.id), 'forge book');
  send(res, await fullBook(b.id));
}));

// ---------- chapters ----------
router.get('/chapters/:id', ah(async (req, res) => {
  const c = await chapterById(Number(req.params.id)) as ChapterRow | undefined;
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const b = await getBookRow(c.book_id);
  const sibs = await q<Array<{ id: number; idx: number }>>(
    sb.from('chapters').select('id,idx').eq('book_id', c.book_id).order('idx'),
    'chapter sibs',
  );
  const i = sibs.findIndex((s) => s.id === c.id);
  send(res, { chapter: c, book: bookJson(b), prevId: sibs[i - 1]?.id ?? null, nextId: sibs[i + 1]?.id ?? null });
}));

router.put('/chapters/:id', ah(async (req, res) => {
  const v = z.object({
    title: z.string().min(1).max(200).optional(), summary: z.string().max(2000).optional(),
    body: z.string().max(200000).optional(), writtenBy: z.string().max(120).optional(),
  }).parse(req.body);
  const c = await chapterById(Number(req.params.id)) as { id: number; book_id: number; body: string } | undefined;
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const body = v.body ?? c.body;
  try {
    await q(sb.from('chapters').update({
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.summary !== undefined ? { summary: v.summary } : {}),
      ...(v.writtenBy !== undefined ? { written_by: v.writtenBy } : {}),
      body, words: countWords(body),
    }).eq('id', c.id), 'chapter update');
  } catch (e) {
    // Pre-migration DBs lack written_by — retry without provenance rather than failing the save.
    if (v.writtenBy !== undefined && /written_by|column .* does not exist|schema cache/i.test((e as Error)?.message ?? '')) {
      await q(sb.from('chapters').update({
        ...(v.title !== undefined ? { title: v.title } : {}),
        ...(v.summary !== undefined ? { summary: v.summary } : {}),
        body, words: countWords(body),
      }).eq('id', c.id), 'chapter update legacy');
    } else throw e;
  }
  if (v.title !== undefined || v.summary !== undefined) await clearPlanApproval(c.book_id);
  await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
  const upd = await chapterById(c.id);
  send(res, upd);
}));

router.post('/books/:id/chapters', ah(async (req, res) => {
  const v = z.object({ title: z.string().min(1).max(200), summary: z.string().max(2000).default('') }).parse(req.body);
  const b = await getBookRow(Number(req.params.id));
  const m = await q<{ idx: number } | null>(
    sb.from('chapters').select('idx').eq('book_id', b.id).order('idx', { ascending: false }).limit(1).maybeSingle(),
    'chapter max idx',
  );
  const info = (await q<{ id: number }>(
    sb.from('chapters').insert({ book_id: b.id, idx: (m?.idx ?? -1) + 1, title: v.title.trim(), summary: v.summary, created_at: now() }).select('id').single(),
    'chapter insert',
  )).id;
  await q(sb.from('books').update({ updated_at: now() }).eq('id', b.id), 'touch book');
  await clearPlanApproval(b.id);
  send(res, await chapterById(info), 201);
}));

router.delete('/chapters/:id', ah(async (req, res) => {
  const c = await chapterById(Number(req.params.id)) as { id: number; book_id: number; idx: number } | undefined;
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  await q(sb.rpc('rpc_chapter_delete', { p_book_id: c.book_id, p_chapter_id: c.id, p_ts: now() }), 'chapter delete');
  await delTrack(c.book_id, c.idx).catch(() => { /* MP3 cleanup is best-effort */ });
  await clearPlanApproval(c.book_id);
  send(res, { deleted: c.id });
}));

async function chapterCount(bookId: number): Promise<number> {
  const r = await sb.from('chapters').select('id', { count: 'exact', head: true }).eq('book_id', bookId);
  if (r.error) throw new Error(`chapter count: ${r.error.message}`);
  return r.count ?? 0;
}

router.post('/chapters/:id/regenerate', ah(async (req, res) => {
  const c = await chapterById(Number(req.params.id)) as ChapterRow | undefined;
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const b = await getBookRow(c.book_id);
  if (b.mode === 'engine') throw new HError(400, 'ENGINE_BOOK', 'This book is written by the Novel Engine — re-write the chapter from the Chapters tab instead of regenerating offline.');
  const ctx = b.engine_ctx ? JSON.parse(b.engine_ctx) : null;
  if (!ctx) throw new HError(400, 'NO_CTX', 'Engine context missing; cannot regenerate');
  const total = await chapterCount(c.book_id);
  const per = Math.max(700, Math.min(2400, Math.round(b.target_words / Math.max(1, total))));
  const fresh = { ...ctx, seedNum: (ctx.seedNum + Date.now() % 100000 + Math.floor(Math.random() * 99999)) >>> 0 };
  const [f] = forgeBodies(fresh, [{ title: c.title, summary: c.summary, kind: c.kind, step: c.step }], per);
  await q(sb.from('chapters').update({ body: f!.body, words: f!.words, ai_enhanced: 0, written_by: 'story-engine' }).eq('id', c.id), 'chapter regenerate');
  await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
  send(res, await chapterById(c.id));
}));

router.post('/chapters/:id/enhance', ah(async (req, res) => {
  const c = await chapterById(Number(req.params.id)) as ChapterRow | undefined;
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const b = await getBookRow(c.book_id);
  if (!c.body) throw new HError(400, 'EMPTY_CHAPTER', 'Forge the draft before enhancing it.');
  const prev = await q<{ summary: string } | null>(
    sb.from('chapters').select('summary').eq('book_id', c.book_id).eq('idx', c.idx - 1).maybeSingle(),
    'prev summary',
  );
  const total = await chapterCount(c.book_id);
  const target = Math.max(900, Math.min(2200, Math.round(b.target_words / Math.max(1, total)) + 300));
  try {
    const text = await enhanceChapterBody({
      bookTitle: b.title, genre: b.genre, kind: b.kind, premise: b.premise, style: b.style ?? '',
      chapterNo: c.idx + 1, chapterTitle: c.title, chapterSummary: c.summary,
      prevSummary: prev?.summary ?? '', currentBody: c.body, targetWords: target,
    });
    const writer = (await getAiPublic()).model || 'ai';
    await q(sb.from('chapters').update({ body: text, words: countWords(text), ai_enhanced: 1, written_by: writer }).eq('id', c.id), 'chapter enhance');
    await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
    send(res, await chapterById(c.id));
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    throw new HError(502, 'AI_FAILED', (e as Error).message);
  }
}));

router.post('/chapters/:id/review', ah(async (req, res) => {
  const c = await chapterById(Number(req.params.id)) as ChapterRow | undefined;
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const b = await getBookRow(c.book_id);
  if (!c.body?.trim()) throw new HError(400, 'NO_BODY', 'Write the chapter before reviewing it.');
  const prev = await q<{ summary: string } | null>(
    sb.from('chapters').select('summary').eq('book_id', c.book_id).eq('idx', c.idx - 1).maybeSingle(),
    'prev summary',
  );
  const cast = (await charsOf(c.book_id) as Array<{ name: string; role: string }>).slice(0, 20).map((x) => `${x.name}${x.role ? ` (${x.role})` : ''}`);
  const total = await chapterCount(c.book_id);
  try {
    const { review, model } = await reviewChapterBody({
      kind: b.kind, bookTitle: b.title, genre: b.genre, premise: b.premise,
      chapterNo: c.idx + 1, chapterCount: total, chapterTitle: c.title, chapterSummary: c.summary,
      prevSummary: prev?.summary ?? '', cast, body: c.body,
    });
    const findings = [...offlineLint(c.body), ...review.findings];
    const info = (await q<{ id: number }>(
      sb.from('chapter_reviews').insert({
        chapter_id: c.id, book_id: c.book_id, model, score: review.score,
        summary: review.summary, findings: JSON.stringify(findings), created_at: now(),
      }).select('id').single(),
      'review insert',
    )).id;
    await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
    const saved = await q<ReviewRow>(
      sb.from('chapter_reviews').select('*').eq('id', info).single(),
      'review select',
    );
    send(res, reviewJson(saved), 201);
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    throw new HError(502, 'AI_FAILED', (e as Error).message);
  }
}));

router.get('/chapters/:id/reviews', ah(async (req, res) => {
  const c = await q<{ id: number } | null>(
    sb.from('chapters').select('id').eq('id', Number(req.params.id)).maybeSingle(),
    'chapter exists',
  );
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const rows = await q<ReviewRow[]>(
    sb.from('chapter_reviews').select('*').eq('chapter_id', Number(req.params.id)).order('id', { ascending: false }),
    'reviews list',
  );
  send(res, rows.map(reviewJson));
}));


router.post('/books/:id/plan-draft', ah(async (req, res) => {
  const v = z.object({ numChapters: z.number().int().min(4).max(48).optional() }).parse(req.body ?? {});
  const b = await getBookRow(Number(req.params.id));
  const existing = await chaptersOf(b.id);
  if (existing.some((c) => c.words > 0)) throw new HError(409, 'HAS_DRAFT', 'This book already has written chapters. Planning replaces the outline — clear chapter text first, or plan a fresh book.');
  const n = v.numChapters ?? Math.max(8, Math.min(48, Math.round(b.target_words / 1500)));
  try {
    const p = await draftBookPlan({
      kind: b.kind, title: b.title, genre: b.genre, audience: b.audience, tone: b.tone, style: b.style ?? '',
      pov: b.pov, tense: b.tense, premise: b.premise, numChapters: n,
    });
    const plan = JSON.stringify({ beats: p.beats, thesis: p.thesis, claims: p.claims, approved: false, approvedAt: null as string | null, source: 'ai' });
    await q(sb.rpc('rpc_plan_draft', {
      p_book_id: b.id, p_logline: p.logline, p_plan: plan,
      p_chapters: p.chapters.map((c) => ({ title: c.title, summary: c.summary })),
      p_characters: p.characters.map((c) => ({ name: c.name, role: c.role, description: c.description, arc: c.arc })),
      p_ts: now(),
    }), 'plan draft');
    send(res, await fullBook(b.id));
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    throw new HError(502, 'AI_FAILED', (e as Error).message);
  }
}));

router.put('/books/:id/plan', ah(async (req, res) => {
  const v = z.object({
    beats: z.array(z.string().max(2000)).max(60).optional(),
    thesis: z.string().max(4000).optional(),
    claims: z.array(z.string().max(2000)).max(60).optional(),
    logline: z.string().max(1000).optional(),
  }).parse(req.body);
  const b = await getBookRow(Number(req.params.id));
  const cur = J<PlanState | null>(b.plan ?? '', null) ?? emptyPlan();
  if (v.beats !== undefined) cur.beats = v.beats;
  if (v.thesis !== undefined) cur.thesis = v.thesis;
  if (v.claims !== undefined) cur.claims = v.claims;
  cur.approved = false;
  cur.approvedAt = null;
  if (!cur.source) cur.source = 'manual';
  await q(sb.from('books').update({ plan: JSON.stringify(cur), logline: v.logline ?? b.logline, updated_at: now() }).eq('id', b.id), 'plan update');
  send(res, await fullBook(b.id));
}));

router.post('/books/:id/plan/approve', ah(async (req, res) => {
  const b = await getBookRow(Number(req.params.id));
  if (!(await chaptersOf(b.id)).length) throw new HError(400, 'NO_PLAN', 'Add at least one chapter to the plan before approving it.');
  const cur = J<PlanState | null>(b.plan ?? '', null) ?? emptyPlan();
  cur.approved = true;
  cur.approvedAt = new Date().toISOString();
  if (!cur.source) cur.source = 'manual';
  await q(sb.from('books').update({ plan: JSON.stringify(cur), updated_at: now() }).eq('id', b.id), 'plan approve');
  send(res, await fullBook(b.id));
}));

router.post('/books/:id/characters', ah(async (req, res) => {
  const v = z.object({ name: z.string().min(1).max(200), role: z.string().max(200).default(''), description: z.string().max(4000).default(''), arc: z.string().max(4000).default('') }).parse(req.body);
  const b = await getBookRow(Number(req.params.id));
  const created = await q<CharRow>(
    sb.from('characters').insert({ book_id: b.id, name: v.name.trim(), role: v.role, description: v.description, arc: v.arc }).select('*').single(),
    'character insert',
  );
  await q(sb.from('books').update({ updated_at: now() }).eq('id', b.id), 'touch book');
  await clearPlanApproval(b.id);
  send(res, created, 201);
}));
router.put('/characters/:id', ah(async (req, res) => {
  const v = z.object({ name: z.string().min(1).max(200).optional(), role: z.string().max(200).optional(), description: z.string().max(4000).optional(), arc: z.string().max(4000).optional() }).parse(req.body);
  const c = await q<{ id: number; book_id: number } | null>(
    sb.from('characters').select('*').eq('id', Number(req.params.id)).maybeSingle(),
    'character lookup',
  );
  if (!c) throw new HError(404, 'NOT_FOUND', 'Character not found');
  const keys = Object.keys(v) as Array<keyof typeof v>;
  if (keys.length) {
    const patch: Record<string, unknown> = {};
    for (const k of keys) patch[k] = v[k];
    await q(sb.from('characters').update(patch).eq('id', c.id), 'character update');
  }
  await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
  await clearPlanApproval(c.book_id);
  send(res, await q<CharRow | null>(
    sb.from('characters').select('*').eq('id', c.id).maybeSingle(),
    'character select',
  ));
}));
router.delete('/characters/:id', ah(async (req, res) => {
  const c = await q<{ id: number; book_id: number } | null>(
    sb.from('characters').select('*').eq('id', Number(req.params.id)).maybeSingle(),
    'character lookup',
  );
  if (!c) throw new HError(404, 'NOT_FOUND', 'Character not found');
  await q(sb.from('characters').delete().eq('id', c.id), 'character delete');
  await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
  await clearPlanApproval(c.book_id);
  send(res, { deleted: c.id });
}));

// ---------- pen names & series ----------
router.get('/pen-names', ah(async (_req, res) => {
  const rows = await q(sb.from('v_pen_names_list').select('*').order('name'), 'pens list');
  send(res, rows);
}));
router.post('/pen-names', ah(async (req, res) => {
  const v = z.object({ name: z.string().min(1).max(80), bio: z.string().max(2000).default(''), genres: z.string().max(200).default('') }).parse(req.body);
  try {
    const created = await q(
      sb.from('pen_names').insert({ name: v.name.trim(), bio: v.bio, genres: v.genres, created_at: now() }).select('*').single(),
      'pen insert',
    );
    send(res, created, 201);
  } catch {
    throw new HError(409, 'DUP_PEN', 'That pen name already exists');
  }
}));
router.put('/pen-names/:id', ah(async (req, res) => {
  const v = z.object({ name: z.string().min(1).max(80).optional(), bio: z.string().max(2000).optional(), genres: z.string().max(200).optional() }).parse(req.body);
  const keys = Object.keys(v) as Array<keyof typeof v>;
  if (keys.length) {
    const patch: Record<string, unknown> = {};
    for (const k of keys) patch[k] = v[k];
    await q(sb.from('pen_names').update(patch).eq('id', Number(req.params.id)), 'pen update');
  }
  send(res, await q(
    sb.from('pen_names').select('*').eq('id', Number(req.params.id)).maybeSingle(),
    'pen select',
  ));
}));
router.delete('/pen-names/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  await q(sb.from('books').update({ pen_name_id: null }).eq('pen_name_id', id), 'pen unlink books');
  await q(sb.from('series').update({ pen_name_id: null }).eq('pen_name_id', id), 'pen unlink series');
  await q(sb.from('pen_names').delete().eq('id', id), 'pen delete');
  send(res, { deleted: id });
}));

router.get('/series', ah(async (_req, res) => {
  const rows = await q(sb.from('v_series_list').select('*').order('title'), 'series list');
  send(res, rows);
}));
router.post('/series', ah(async (req, res) => {
  const v = z.object({ title: z.string().min(1).max(120), penNameId: z.number().int().nullable().optional(), description: z.string().max(2000).default('') }).parse(req.body);
  const created = await q(
    sb.from('series').insert({ pen_name_id: v.penNameId ?? null, title: v.title.trim(), description: v.description, created_at: now() }).select('*').single(),
    'series insert',
  );
  send(res, created, 201);
}));
router.put('/series/:id', ah(async (req, res) => {
  const v = z.object({ title: z.string().min(1).max(120).optional(), penNameId: z.number().int().nullable().optional(), description: z.string().max(200).optional() }).parse(req.body);
  const map: Record<string, unknown> = {};
  if (v.title !== undefined) map.title = v.title;
  if (v.penNameId !== undefined) map.pen_name_id = v.penNameId;
  if (v.description !== undefined) map.description = v.description;
  const keys = Object.keys(map);
  if (keys.length) {
    const patch: Record<string, unknown> = {};
    for (const k of keys) patch[k] = map[k];
    await q(sb.from('series').update(patch).eq('id', Number(req.params.id)), 'series update');
  }
  send(res, await q(
    sb.from('series').select('*').eq('id', Number(req.params.id)).maybeSingle(),
    'series select',
  ));
}));
router.delete('/series/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  await q(sb.from('books').update({ series_id: null, series_number: null }).eq('series_id', id), 'series unlink books');
  await q(sb.from('series').delete().eq('id', id), 'series delete');
  send(res, { deleted: id });
}));

// ---------- AI settings ----------
router.get('/settings/ai', ah(async (_req, res) => {
  send(res, await getAiPublic());
}));
router.put('/settings/ai', ah(async (req, res) => {
  const v = z.object({
    provider: z.string().max(40).optional(), baseUrl: z.string().url().max(200).optional(),
    model: z.string().max(120).optional(), key: z.string().max(300).optional(), clearKey: z.boolean().optional(),
  }).parse(req.body);
  send(res, await saveAi(v));
}));
router.post('/ai/test', ah(async (_req, res) => {
  try {
    const r = await chatComplete([{ role: 'user', content: 'Reply with exactly: FORGE OK' }], { maxTokens: 20, temperature: 0, timeoutMs: 60000 });
    send(res, { ok: true, model: r.model, sample: r.text.slice(0, 120) });
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    throw new HError(502, 'AI_FAILED', (e as Error).message);
  }
}));

router.post('/ai/chat', ah(async (req, res) => {
  const v = z.object({
    bookId: z.number().int().nullable().optional(),
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(60000) })).min(1).max(30),
  }).parse(req.body);
  const brief = v.bookId ? bookBrief(await getBookRow(v.bookId)) : '';
  try {
    const r = await studioChat(brief, v.messages);
    send(res, { text: r.text, model: r.model });
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    throw new HError(502, 'AI_FAILED', (e as Error).message);
  }
}));

router.post('/ai/draft', ah(async (req, res) => {
  const v = z.object({
    bookId: z.number().int().nullable().optional(),
    chapterId: z.number().int().nullable().optional(),
    prompt: z.string().min(1).max(6000),
    targetWords: z.number().int().min(200).max(4000).default(1500),
  }).parse(req.body);
  let brief = '';
  let kind = '';
  let chapterNo = 1;
  let chapterTitle = 'Untitled Chapter';
  let chapterSummary = '';
  let prevTail = '';
  if (v.chapterId) {
    const row = await chapterById(v.chapterId) as ChapterRow | undefined;
    if (!row) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
    const bk = await getBookRow(row.book_id);
    brief = bookBrief(bk);
    kind = bk.kind;
    chapterNo = row.idx + 1;
    chapterTitle = row.title;
    chapterSummary = row.summary;
    const prev = await q<{ body: string } | null>(
      sb.from('chapters').select('body').eq('book_id', row.book_id).eq('idx', row.idx - 1).maybeSingle(),
      'prev body',
    );
    if (prev?.body) prevTail = prev.body.slice(-1500);
  } else if (v.bookId) {
    const bk = await getBookRow(v.bookId);
    brief = bookBrief(bk);
    kind = bk.kind;
  }
  try {
    const r = await draftChapterBody({ bookBrief: brief, kind, chapterNo, chapterTitle, chapterSummary, prevTail, prompt: v.prompt, targetWords: v.targetWords });
    send(res, { text: r.text, model: r.model, words: countWords(r.text) });
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    throw new HError(502, 'AI_FAILED', (e as Error).message);
  }
}));

router.get('/books/:id/agent-pack', ah(async (req, res) => {
  const b = await getBookRow(Number(req.params.id));
  const chs = await chaptersOf(b.id);
  const chars = await charsOf(b.id) as Array<{ name: string; role: string; description: string; arc: string }>;
  let prev: PackPrev[] = [];
  if (b.series_id) {
    const mine = b.series_number ?? 999999;
    const sibs = await q<Array<{ id: number; title: string; premise: string; logline: string; series_number: number | null }>>(
      sb.from('books').select('id,title,premise,logline,series_number').eq('series_id', b.series_id).neq('id', b.id).order('series_number', { nullsFirst: false }).order('id'),
      'pack sibs',
    );
    prev = [];
    for (const sib of sibs.filter((x) => (x.series_number ?? 999999) < mine)) {
      const titles = await q<Array<{ title: string }>>(
        sb.from('chapters').select('title').eq('book_id', sib.id).order('idx'),
        'pack titles',
      );
      prev.push({
        series_number: sib.series_number, title: sib.title, premise: sib.premise, logline: sib.logline,
        chapterTitles: titles.map((x) => x.title),
      });
    }
  }
  const q2 = z.object({ build: z.enum(['serial', 'full']).default('serial') }).parse(req.query);
  const text = buildAgentPack({ ...b, plan: J<PlanState | null>(b.plan ?? '', null) }, chs, chars, prev, { build: q2.build });
  const filename = q2.build === 'full' ? `${slug(b.title)}-agent-pack-full.md` : `${slug(b.title)}-agent-pack.md`;
  send(res, { bookId: b.id, title: b.title, filename, text });
}));

router.post('/books/:id/import', ah(async (req, res) => {
  const v = z.object({
    mode: z.enum(['replace', 'append', 'fill']),
    chapters: z.array(z.object({
      title: z.string().max(200).default(''),
      body: z.string().max(200000),
    })).min(1).max(200),
  }).parse(req.body);
  const b = await getBookRow(Number(req.params.id));
  await chaptersOf(b.id);
  const docs = v.chapters.map((c, i) => {
    const title = c.title.trim() || `Chapter ${i + 1}`;
    const body = c.body.trim();
    return { title, body, words: countWords(body) };
  });
  if (docs.some((c) => !c.body)) throw new HError(400, 'EMPTY_IMPORT', 'Every imported chapter needs body text.');
  await q(sb.rpc('rpc_import', { p_book_id: b.id, p_mode: v.mode, p_docs: docs, p_ts: now() }), 'import');
  await clearPlanApproval(b.id);
  send(res, await fullBook(b.id));
}));

const RestoreBook = z.object({
  title: z.string().min(1).max(200), subtitle: z.string().max(200).default(''), premise: z.string().max(4000).default(''),
  mode: z.string().max(20), kind: z.string().max(20), genre: z.string().max(60),
  audience: z.string().max(200).default(''), tone: z.string().max(120).default(''), style: z.string().max(160).default(''),
  pov: z.string().max(60).default(''), tense: z.string().max(20).default('Past'), target_words: z.number().int().min(0).max(500000).default(30000),
  status: z.string().max(20).default('draft'),
  pen_name: z.string().max(80).nullable().default(null),
  series_title: z.string().max(120).nullable().default(null),
  series_number: z.number().int().nullable().default(null),
  logline: z.string().max(8000).default(''), blurb: z.string().max(8000).default(''),
  categories: z.array(z.string().max(120)).max(30).default([]), keywords: z.array(z.string().max(120)).max(30).default([]),
  cover_cfg: z.record(z.unknown()).default({}),
  stage: z.string().max(20).default('draft'), stages_approved: z.array(z.string().max(20)).max(20).default([]),
  engine_ctx: z.string().max(500000).nullable().default(null),
  ledger: z.string().max(60000).nullable().default(null),
  bible: z.string().max(200000).nullable().default(null),
  editor_ledger: z.string().max(60000).nullable().default(null),
  chapters: z.array(z.object({
    idx: z.number().int().min(0).max(500), title: z.string().min(1).max(200), summary: z.string().max(2000).default(''),
    kind: z.string().max(40).default(''), step: z.string().max(200000).default(''), body: z.string().max(200000).default(''),
    words: z.number().int().min(0).max(100000).default(0), ai_enhanced: z.number().int().min(0).max(1).default(0),
    written_by: z.string().max(120).default(''),
  })).max(250).default([]),
  editor: z.array(z.object({
    chapter_idx: z.number().int().min(0).max(500).nullable().default(null),
    pass: z.string().max(20).default(''), title: z.string().max(300).default(''),
    body: z.string().max(200000).default(''), model: z.string().max(120).default(''),
    created_at: z.string().max(40).default(''),
  })).max(500).default([]),
  characters: z.array(z.object({
    name: z.string().min(1).max(200), role: z.string().max(200).default(''), description: z.string().max(4000).default(''), arc: z.string().max(4000).default(''),
  })).max(100).default([]),
  plan: z.string().max(100000).nullable().default(null),
  reviews: z.array(z.object({
    chapter_idx: z.number().int().min(0).max(500), created_at: z.string().max(40).default(''), model: z.string().max(120).default(''),
    score: z.number().int().min(0).max(100).default(0), summary: z.string().max(4000).default(''),
    findings: z.array(z.object({
      severity: z.string().max(20).default('suggestion'), category: z.string().max(20).default('syntax'),
      quote: z.string().max(500).default(''), issue: z.string().max(2000).default(''), suggestion: z.string().max(2000).default(''),
      source: z.string().max(20).default('ai'),
    })).max(60).default([]),
  })).max(500).default([]),
});

// ---------- AI book engine ----------
async function runGateChapter(bookId: number, chapterId: number, mode: 'brief' | 'cards' | 'write' | 'fast', note: string | undefined, force: boolean | undefined, emit: Emit): Promise<Record<string, unknown>> {
  const b = await getBookRow(bookId);
  const c = await chapterById(chapterId);
  if (!c || c.book_id !== b.id) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const plan = J<NovelPlan | null>(b.plan ?? '', null);
  const beatmap = plan?.beatmap;
  const design = plan?.design;
  if (b.mode !== 'engine' || !beatmap || !design) {
    throw new HError(400, 'NO_DESIGN', 'This book has no Novel Engine design — gates need a book built by the Novel Engine (Stages 0-2).');
  }
  const beat = beatmap.chapters.find((x) => x.n === c.idx + 1) ?? beatmap.chapters[c.idx];
  if (!beat) throw new HError(400, 'NO_BEAT', 'This chapter has no beat-map row.');
  if ((mode === 'write' || mode === 'fast') && c.words > 0 && !force) {
    throw new HError(409, 'HAS_BODY', 'Chapter already has text. Confirm overwrite to re-run the gates.');
  }
  const step = parseStep(c.step);
  if (mode === 'cards' && !step.brief) throw new HError(409, 'NO_BRIEF', 'Run the Gate 1 brief first — Gate 2 expands it.');
  if (mode === 'write' && !step.cards) throw new HError(409, 'NO_CARDS', 'Run the Gate 2 scene cards first — the draft is written to the cards.');
  const sibs = await chaptersOf(b.id);
  const prev = sibs.find((s) => s.idx === c.idx - 1);
  const prevTail = prev?.body ? prev.body.split(/\s+/).slice(-200).join(' ') : '';
  const paste: PasteInput = {
    design, beatmap, styleCondensed: plan?.styleCondensed ?? '',
    ledger: b.ledger ?? '', chapterNo: c.idx + 1, prevTail,
  };
  const noteText = (note ?? '').trim();
  let model = '';
  try {
    if (mode === 'brief' || mode === 'fast') {
      const r = await runGate1({ ...paste, beat, note: noteText });
      step.brief = r.brief; model = r.model;
      await q(sb.from('chapters').update({ step: stringifyStep(step) }).eq('id', c.id), 'gate1 store');
    emit('brief', `Gate 1 brief saved (ch ${c.idx + 1}).`, { briefLen: step.brief.length });
      if (mode === 'brief') {
        return { chapter: await chapterById(c.id), mode: mode, words: 0, model, brief: r.brief, ledgerUpdated: false };
      }
    }
    if (mode === 'cards' || mode === 'fast') {
      const r = await runGate2({ ...paste, beat, brief: step.brief, note: noteText });
      step.cards = r.cards; model = r.model;
      await q(sb.from('chapters').update({ step: stringifyStep(step) }).eq('id', c.id), 'gate2 store');
    emit('cards', `Gate 2 scene cards saved (ch ${c.idx + 1}).`, { cardsLen: step.cards.length });
      if (mode === 'cards') {
        return { chapter: await chapterById(c.id), mode: mode, words: 0, model, brief: step.brief, cards: r.cards, ledgerUpdated: false };
      }
    }
    const draft = await runGates34({ ...paste, beat, brief: step.brief, cards: step.cards });
    emit('draft', `Draft + self-critique done (${draft.words.toLocaleString('en-US')} words).`, { draftWords: draft.words });
    model = draft.model;
    const rev = await runGate5({ chapterNo: c.idx + 1, draft: draft.body, critique: draft.critique, words: beat.words });
    step.verdict = rev.verdict; step.changelog = rev.changelog;
    await q(sb.from('chapters').update({ body: rev.body, words: rev.words, ai_enhanced: 1, written_by: rev.model, step: stringifyStep(step) }).eq('id', c.id), 'gates chapter save');
    emit('revise', `Revision saved (${rev.words.toLocaleString('en-US')} words).`, { words: rev.words, model });
    const g6 = await runGate6({ ...paste, beat, revised: rev.body });
    const merged = `${b.ledger ?? ''}\n\n--- ch-${String(c.idx + 1).padStart(3, '0')} delta ---\n${g6.delta}`.trim().slice(0, 30000);
    let ledger = merged;
    try {
      const pruned = await pruneLedger(merged);
      if (pruned) ledger = pruned.ledger;
    } catch { /* prune is best-effort — the unpruned ledger still works */ }
    await q(sb.from('books').update({ ledger, updated_at: now() }).eq('id', b.id), 'gates ledger save');
    emit('ledger', 'Ledger updated — chapter memory stored.', { ledgerUpdated: true });
    const after = await chaptersOf(b.id);
    if (after.length && after.every((x) => x.words > 0)) {
      await q(sb.from('books').update({ status: 'complete', stage: 'done', updated_at: now() }).eq('id', b.id), 'gates book complete');
    }
    return {
      chapter: await chapterById(c.id), mode: mode, words: rev.words, model,
      brief: step.brief, cards: step.cards, verdict: rev.verdict, nextSetup: g6.nextSetup,
      drift: g6.drift, ledgerUpdated: true,
    };
  } catch (e) {
    if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
    if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
    if (e instanceof HError) throw e;
    throw new HError(502, 'GATE_FAILED', (e as Error).message);
  }
}

router.post('/books/:id/engine/gates', ah(async (req, res) => {
  const v = z.object({
    chapterId: z.number().int(),
    mode: z.enum(['brief', 'cards', 'write', 'fast']),
    note: z.string().max(2000).optional(),
    force: z.boolean().optional(),
  }).parse(req.body);
  send(res, await runGateChapter(Number(req.params.id), v.chapterId, v.mode, v.note, v.force, () => {}));
}));

// ---------- engine jobs (long runs, decoupled from the request) ----------
// Stages, chapter gates, and revisions run for minutes — longer than a tab
// or proxy waits on one request. POST starts the run and returns a job id
// at once; the client polls status and can reattach after a dropped tab.

async function gateReady(bookId: number, chapterId: number, mode: 'write' | 'fast', force?: boolean): Promise<void> {
  const b = await getBookRow(bookId);
  const c = await chapterById(chapterId);
  if (!c || c.book_id !== b.id) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  const plan = J<NovelPlan | null>(b.plan ?? '', null);
  if (b.mode !== 'engine' || !plan?.beatmap || !plan?.design) {
    throw new HError(400, 'NO_DESIGN', 'This book has no Novel Engine design — gates need a book built by the Novel Engine (Stages 0-2).');
  }
  const beat = plan.beatmap.chapters.find((x) => x.n === c.idx + 1) ?? plan.beatmap.chapters[c.idx];
  if (!beat) throw new HError(400, 'NO_BEAT', 'This chapter has no beat-map row.');
  if (c.words > 0 && !force) throw new HError(409, 'HAS_BODY', `Chapter ${c.idx + 1} already has text. Confirm overwrite to re-run.`);
  if (mode === 'write' && !parseStep(c.step).cards) {
    throw new HError(409, 'NO_CARDS', 'Run the Gate 2 scene cards first — the draft is written to the cards.');
  }
}

const JobStart = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), book: CreateBook }),
  z.object({
    kind: z.literal('gates'), bookId: z.number().int(),
    chapterIds: z.array(z.number().int()).min(1).max(60),
    mode: z.enum(['write', 'fast']), force: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('revise'), chapterId: z.number().int(),
    fixes: z.array(z.object({
      quote: z.string().max(2000), issue: z.string().max(2000), suggestion: z.string().max(2000),
    })).max(20).default([]),
    notes: z.string().max(4000).default(''),
  }),
]);

router.post('/engine/jobs', ah(async (req, res) => {
  const v = JobStart.parse(req.body);
  if (v.kind === 'create') {
    if (v.book.mode !== 'engine') throw new HError(400, 'BAD_JOB', 'Create jobs run the Novel Engine only.');
    if (v.book.kind !== 'fiction') throw new HError(400, 'ENGINE_FICTION_ONLY', 'The Novel Engine writes fiction. For nonfiction, use Guided or Blank.');
    if (v.book.premise.trim().length < 20) throw new HError(400, 'BAD_PREMISE', 'Premise needs at least a sentence or two (20+ characters).');
    const ids = await resolveIds(v.book);
    const job = createJob('create', `Stages 0–2 · ${v.book.title?.trim() || v.book.genre}`, null);
    const emit = emitter(job);
    emit('queued', 'Run accepted — Stage 0 starting…');
    launch(job, async () => {
      const id = await runEngineCreate(v.book, ids, emit);
      job.bookId = id;
      return { bookId: id };
    });
    send(res, { jobId: job.id }, 202);
    return;
  }
  if (v.kind === 'gates') {
    const b = await getBookRow(v.bookId);
    if (b.mode !== 'engine') throw new HError(400, 'NO_DESIGN', 'This book has no Novel Engine design — gates need a book built by the Novel Engine (Stages 0-2).');
    for (const cid of v.chapterIds) await gateReady(v.bookId, cid, v.mode, v.force);
    const chapters = await chaptersOf(v.bookId);
    const byId = new Map(chapters.map((c) => [c.id, c]));
    const job = createJob('gates', v.chapterIds.length > 1 ? `Chapters × ${v.chapterIds.length} · ${v.mode}` : `Chapter · ${v.mode}`, v.bookId);
    const emit = emitter(job);
    launch(job, async () => {
      let wordsTotal = 0;
      let model = '';
      const done: number[] = [];
      const n = v.chapterIds.length;
      for (let i = 0; i < n; i++) {
        const cid = v.chapterIds[i]!;
        const ch = byId.get(cid);
        emit('chapter', `Chapter ${ch ? ch.idx + 1 : '?'} (${i + 1}/${n})…`, { i, n, chapterId: cid, chapterTitle: ch?.title ?? '' });
        const r = await runGateChapter(v.bookId, cid, v.mode, undefined, v.force || undefined, (stage, msg, facts) =>
          emit(stage, msg, { ...facts, i, n, chapterId: cid }));
        wordsTotal += (r.words as number) || 0;
        model = (r.model as string) || model;
        done.push(cid);
      }
      return { chapterIds: done, wordsTotal, model };
    });
    send(res, { jobId: job.id }, 202);
    return;
  }
  const c = await chapterById(v.chapterId);
  if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
  if (!c.body?.trim()) throw new HError(400, 'EMPTY_CHAPTER', 'Write the chapter before revising it.');
  if (!v.fixes.length && !v.notes.trim()) throw new HError(400, 'NO_FEEDBACK', 'Approve at least one fix (or add a note) before revising.');
  const bk = await getBookRow(c.book_id);
  const job = createJob('revise', `Revise ch${c.idx + 1} · ${v.fixes.length} fix${v.fixes.length === 1 ? '' : 'es'}`, bk.id, c.id);
  const emit = emitter(job);
  emit('queued', `Revision accepted — applying ${v.fixes.length} approved fix${v.fixes.length === 1 ? '' : 'es'}…`);
  launch(job, async () => {
    emit('revise', `Revising chapter ${c.idx + 1}…`);
    const r = await runReviseChapter({
      chapterNo: c.idx + 1, chapterTitle: c.title, currentBody: c.body as string,
      fixes: v.fixes, notes: v.notes.trim(),
    });
    await q(sb.from('chapters').update({ body: r.body, words: r.words, ai_enhanced: 1, written_by: r.model }).eq('id', c.id), 'revise save');
    await q(sb.from('books').update({ updated_at: now() }).eq('id', c.book_id), 'touch book');
    return { chapterId: c.id, words: r.words, model: r.model };
  });
  send(res, { jobId: job.id }, 202);
}));

router.get('/engine/jobs/:id', ah(async (req, res) => {
  const j = getJob(req.params.id);
  if (!j) throw new HError(404, 'JOB_GONE', 'This run is no longer on the server (finished long ago or the server restarted).');
  send(res, j);
}));

router.get('/engine/jobs', ah(async (req, res) => {
  const raw = req.query.bookId;
  const bookId = raw !== undefined ? Number(raw) : undefined;
  send(res, listJobs(bookId));
}));

// ---------- editor-in-chief ----------
type EditorRow = {
  id: number; book_id: number; chapter_id: number | null; pass: string;
  title: string; body: string; model: string; created_at: string;
};

async function editorParamsOf(bookId: number): Promise<{ params: EditorParams; chs: ChapterRow[] }> {
  const b = await getBookRow(bookId);
  const chs = await chaptersOf(bookId);
  const params: EditorParams = {
    title: b.title, genre: b.genre, kind: b.kind, audience: b.audience, tone: b.tone,
    style: b.style ?? '', pov: b.pov ?? '', tense: b.tense ?? 'Past',
    targetWords: b.target_words, currentWords: chs.reduce((a, c) => a + c.words, 0),
    chapterCount: chs.length, premise: b.premise ?? '', logline: b.logline ?? '', broken: '',
  };
  return { params, chs };
}

function precedingBlock(chs: ChapterRow[], idx: number): string {
  const prev = chs.find((c) => c.idx === idx - 1);
  if (!prev) return '';
  const tail = prev.body ? prev.body.slice(-300).replace(/\s+/g, ' ').trim() : '';
  return `- Ch ${prev.idx + 1} "${prev.title}": ${prev.summary || '(no summary)'}${tail ? `\n- It ended with: "${tail}"` : ''}\n- Open threads per the ledger above.`;
}

router.get('/books/:id/editor', ah(async (req, res) => {
  try {
    const b = await getBookRow(Number(req.params.id));
    const { params, chs } = await editorParamsOf(b.id);
    const ai = await getAiPublic();
    const rows = await q<EditorRow[]>(
      sb.from('editor_reports').select('*').eq('book_id', b.id).order('id', { ascending: false }).limit(200),
      'editor list',
    );
    const idxById = new Map(chs.map((c) => [c.id, c]));
    const voice = rows.find((r) => r.pass === 'p0');
    send(res, {
      aiModel: ai.model, aiProvider: ai.provider, hasKey: ai.hasKey,
      ledger: b.editor_ledger ?? '',
      paramsBlock: editorParamsBlock(params),
      voiceOnFile: !!voice,
      reports: rows.map((r) => {
        const ch = r.chapter_id != null ? idxById.get(r.chapter_id) : undefined;
        return {
          id: r.id, pass: r.pass, title: r.title, model: r.model, created_at: r.created_at,
          chapter_idx: ch?.idx ?? null, chapter_title: ch?.title ?? null,
          preview: r.body.slice(0, 300),
        };
      }),
    });
  } catch (e) {
    migrationGuard(e);
    throw e;
  }
}));

router.get('/editor-reports/:id', ah(async (req, res) => {
  try {
    const r = await q<EditorRow | null>(
      sb.from('editor_reports').select('*').eq('id', Number(req.params.id)).maybeSingle(),
      'editor get',
    );
    if (!r) throw new HError(404, 'NOT_FOUND', 'Report not found');
    send(res, r);
  } catch (e) {
    migrationGuard(e);
    throw e;
  }
}));

router.delete('/editor-reports/:id', ah(async (req, res) => {
  try {
    const r = await q<EditorRow | null>(
      sb.from('editor_reports').select('id').eq('id', Number(req.params.id)).maybeSingle(),
      'editor del lookup',
    );
    if (!r) throw new HError(404, 'NOT_FOUND', 'Report not found');
    await q(sb.from('editor_reports').delete().eq('id', r.id), 'editor del');
    send(res, { deleted: r.id });
  } catch (e) {
    migrationGuard(e);
    throw e;
  }
}));

router.post('/books/:id/editor/setup', ah(async (req, res) => {
  try {
    const b = await getBookRow(Number(req.params.id));
    if (b.editor_ledger) {
      send(res, { ledger: b.editor_ledger, started: false });
      return;
    }
    const { params } = await editorParamsOf(b.id);
    const ledger = seedEditorLedger(params);
    await q(sb.from('books').update({ editor_ledger: ledger, updated_at: now() }).eq('id', b.id), 'editor setup');
    send(res, { ledger, started: true });
  } catch (e) {
    migrationGuard(e);
    throw e;
  }
}));

const EditorRun = z.object({
  pass: z.enum(['p0', 'p1', 'p2', 'p3', 'dialogue', 'continuity', 'beta', 'redteam', 'synopsis']),
  chapterId: z.number().int().nullable().optional(),
});

router.post('/books/:id/editor/run', ah(async (req, res) => {
  const v = EditorRun.parse(req.body);
  try {
    const b = await getBookRow(Number(req.params.id));
    const { params, chs } = await editorParamsOf(b.id);
    const ts = now();
    if (v.pass === 'synopsis') {
      const outline = chs.map((c) => `Ch ${c.idx + 1}: "${c.title}" — ${c.summary || '(no summary)'}`).join('\n');
      if (!chs.length) throw new HError(400, 'NO_CHAPTERS', 'The book has no chapters to summarize.');
      try {
        const r = await runSynopsisQuery({ params, outline, ledger: b.editor_ledger ?? '' });
        const body = stripLedgerDelta(r.text);
        const id = (await q<{ id: number }>(
          sb.from('editor_reports').insert({
            book_id: b.id, chapter_id: null, pass: 'synopsis', title: 'Synopsis + query letter',
            body, model: r.model, created_at: ts,
          }).select('id').single(), 'editor synopsis insert',
        )).id;
        send(res, { reportId: id, title: 'Synopsis + query letter', model: r.model, ledgerUpdated: false }, 201);
        return;
      } catch (e) {
        if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
        if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
        throw new HError(502, 'EDITOR_FAILED', (e as Error).message);
      }
    }
    if (!v.chapterId) throw new HError(400, 'NO_CHAPTER', 'Pick a chapter for this pass.');
    const c = chs.find((x) => x.id === v.chapterId);
    if (!c) throw new HError(404, 'NOT_FOUND', 'Chapter not found');
    if (!c.body?.trim()) throw new HError(400, 'NO_BODY', 'Write the chapter before editing it.');
    const pass = v.pass as EditorPassId;
    if (pass === 'p2' || pass === 'p3') {
      const need = pass === 'p2' ? 'p1' : 'p2';
      const prior = await q<EditorRow | null>(
        sb.from('editor_reports').select('id').eq('book_id', b.id).eq('chapter_id', c.id).eq('pass', need).limit(1).maybeSingle(),
        'editor order check',
      );
      if (!prior) throw new HError(409, 'PASS_ORDER', `Run ${need === 'p1' ? 'Pass 1' : 'Pass 2'} on this chapter before ${pass === 'p2' ? 'Pass 2' : 'Pass 3'} — each pass builds on the last.`);
    }
    let voiceSignature = '';
    let voiceUsed = false;
    if (pass === 'p2') {
      const p0 = await q<EditorRow | null>(
        sb.from('editor_reports').select('body').eq('book_id', b.id).eq('pass', 'p0').order('id', { ascending: false }).limit(1).maybeSingle(),
        'editor voice lookup',
      );
      if (p0?.body) {
        voiceSignature = p0.body.slice(0, 6000);
        voiceUsed = true;
      }
    }
    try {
      const r = await runEditorPass(pass, {
        params,
        ledger: b.editor_ledger ?? '',
        chunkLabel: `Chapter ${c.idx + 1} of ${chs.length} — "${c.title}" (${c.words.toLocaleString('en-US')} words)`,
        preceding: precedingBlock(chs, c.idx),
        text: c.body,
        voiceSignature,
      });
      const body = stripLedgerDelta(r.text);
      const delta = extractLedgerDelta(r.text);
      let ledgerUpdated = false;
      if (delta) {
        const header = `${EDITOR_PASSES[pass].title} · Ch ${c.idx + 1} "${c.title}" · ${ts.slice(0, 16).replace('T', ' ')}`;
        await q(sb.from('books').update({ editor_ledger: appendEditorLedger(b.editor_ledger ?? '', header, delta), updated_at: ts }).eq('id', b.id), 'editor ledger append');
        ledgerUpdated = true;
      }
      const title = `${EDITOR_PASSES[pass].title} — Ch ${c.idx + 1} "${c.title}"`;
      const id = (await q<{ id: number }>(
        sb.from('editor_reports').insert({
          book_id: b.id, chapter_id: c.id, pass, title, body, model: r.model, created_at: ts,
        }).select('id').single(), 'editor report insert',
      )).id;
      await q(sb.from('books').update({ updated_at: ts }).eq('id', b.id), 'touch book');
      send(res, { reportId: id, title, model: r.model, ledgerUpdated, voiceUsed }, 201);
    } catch (e) {
      if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
      if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
      throw new HError(502, 'EDITOR_FAILED', (e as Error).message);
    }
  } catch (e) {
    if (e instanceof HError) throw e;
    migrationGuard(e);
    throw e;
  }
}));

router.post('/books/:id/editor/report', ah(async (req, res) => {
  try {
    const b = await getBookRow(Number(req.params.id));
    const { params, chs } = await editorParamsOf(b.id);
    const p1s = await q<EditorRow[]>(
      sb.from('editor_reports').select('*').eq('book_id', b.id).eq('pass', 'p1').order('id', { ascending: false }).limit(60),
      'editor p1 gather',
    );
    // Latest Pass 1 per chapter, in chapter order.
    const seen = new Set<number>();
    const byId = new Map(chs.map((c) => [c.id, c]));
    const verdicts = p1s
      .filter((r) => r.chapter_id != null && !seen.has(r.chapter_id) && byId.has(r.chapter_id) && (seen.add(r.chapter_id), true))
      .map((r) => {
        const c = byId.get(r.chapter_id!)!;
        return { chapterNo: c.idx + 1, title: c.title, words: c.words, verdict: r.body };
      })
      .sort((a, c2) => a.chapterNo - c2.chapterNo);
    try {
      const r = await runFullReport({ params, ledger: b.editor_ledger ?? '', passOnes: verdicts });
      const ts = now();
      const id = (await q<{ id: number }>(
        sb.from('editor_reports').insert({
          book_id: b.id, chapter_id: null, pass: 'report', title: 'Full-manuscript report',
          body: stripLedgerDelta(r.text), model: r.model, created_at: ts,
        }).select('id').single(), 'editor full report insert',
      )).id;
      send(res, { reportId: id, title: 'Full-manuscript report', model: r.model, chaptersCovered: verdicts.length }, 201);
    } catch (e) {
      if ((e as { code?: string }).code === 'NO_KEY') throw new HError(409, 'NO_KEY', (e as Error).message);
      if ((e as { code?: string }).code === 'NO_MODEL') throw new HError(400, 'NO_MODEL', (e as Error).message);
      throw new HError(502, 'EDITOR_FAILED', (e as Error).message);
    }
  } catch (e) {
    if (e instanceof HError) throw e;
    migrationGuard(e);
    throw e;
  }
}));

router.get('/backup', ah(async (_req, res) => {
  const rawBooks = await q<Array<Omit<BookRow, 'pen_name' | 'series_title'> & { pen_names: { name: string } | null; series: { title: string } | null }>>(
    sb.from('books').select('*,pen_names(name),series(title)').order('id'),
    'backup books',
  );
  const books = rawBooks.map((r) => {
    const { pen_names, series, ...rest } = r;
    return { ...rest, pen_name: pen_names?.name ?? null, series_title: series?.title ?? null };
  });
  const out = [];
  for (const b of books) {
    const full = await chaptersOf(b.id);
    const chIds = new Map(full.map((c) => [c.id, c.idx]));
    const chs = full.map((c) => ({ idx: c.idx, title: c.title, summary: c.summary, kind: c.kind, step: c.step, body: c.body, words: c.words, ai_enhanced: c.ai_enhanced, written_by: c.written_by ?? '' }));
    const allRevs = await q<ReviewRow[]>(
      sb.from('chapter_reviews').select('*').eq('book_id', b.id).order('id'),
      'backup reviews',
    );
    const revs = allRevs
      .filter((r) => chIds.has(r.chapter_id))
      .sort((a, c2) => chIds.get(a.chapter_id)! - chIds.get(c2.chapter_id)! || a.id - c2.id)
      .map((r) => ({
        chapter_idx: chIds.get(r.chapter_id)!, created_at: r.created_at, model: r.model,
        score: r.score, summary: r.summary, findings: J(r.findings, [] as unknown[]),
      }));
    const chrs = ((await charsOf(b.id)) as Array<{ name: string; role: string; description: string; arc: string }>).map((c) => ({ name: c.name, role: c.role, description: c.description, arc: c.arc }));
    let ed: Array<{ chapter_idx: number | null; pass: string; title: string; body: string; model: string; created_at: string }> = [];
    try {
      const edRows = await q<EditorRow[]>(
        sb.from('editor_reports').select('*').eq('book_id', b.id).order('id'),
        'backup editor',
      );
      ed = edRows.map((r) => ({
        chapter_idx: r.chapter_id != null ? chIds.get(r.chapter_id) ?? null : null,
        pass: r.pass, title: r.title, body: r.body, model: r.model, created_at: r.created_at,
      }));
    } catch {
      /* pre-migration DBs have no editor_reports — back up the rest */
    }
    out.push({
      title: b.title, subtitle: b.subtitle, premise: b.premise, mode: b.mode, kind: b.kind, genre: b.genre,
      audience: b.audience, tone: b.tone, style: b.style, pov: b.pov, tense: b.tense, target_words: b.target_words,
      status: b.status, pen_name: b.pen_name ?? null, series_title: b.series_title ?? null, series_number: b.series_number,
      logline: b.logline, blurb: b.blurb, categories: J<string[]>(b.categories, []), keywords: J<string[]>(b.keywords, []),
      cover_cfg: J(b.cover_cfg, {}), stage: b.stage, stages_approved: J<string[]>(b.stages_approved, []),
      engine_ctx: b.engine_ctx, plan: b.plan, ledger: (b as { ledger?: string | null }).ledger ?? null,
      bible: (b as { bible?: string | null }).bible ?? null,
      editor_ledger: (b as { editor_ledger?: string | null }).editor_ledger ?? null,
      chapters: chs, reviews: revs, characters: chrs, editor: ed,
    });
  }
  const pens = await q(sb.from('pen_names').select('name,bio,genres').order('name'), 'backup pens');
  const series = await q(
    sb.from('v_series_list').select('title,description,pen_name').order('title'),
    'backup series',
  );
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ghostforge-backup-${stamp}.json"`);
  return void res.json({ version: 1, exportedAt: new Date().toISOString(), books: out, pens, series });
}));

router.post('/restore', ah(async (req, res) => {
  const v = z.object({
    books: z.array(RestoreBook).min(1).max(200),
    pens: z.array(z.object({ name: z.string().min(1).max(80), bio: z.string().max(2000).default(''), genres: z.string().max(200).default('') })).max(100).default([]),
    series: z.array(z.object({ title: z.string().min(1).max(120), description: z.string().max(2000).default(''), pen_name: z.string().max(80).nullable().default(null) })).max(100).default([]),
  }).parse(req.body);
  const out = await q<{ chapters: number; reviews: number; editor?: number }>(
    sb.rpc('rpc_restore', { p_payload: { books: v.books, pens: v.pens, series: v.series }, p_ts: now() }),
    'restore',
  );
  send(res, { restoredBooks: v.books.length, restoredChapters: out.chapters, restoredReviews: out.reviews, restoredEditor: out.editor ?? 0 });
}));

// ---------- export ----------
router.get('/books/:id/export', ah(async (req, res) => {
  const fmt = z.enum(['md', 'txt', 'html', 'epub', 'json', 'kdp']).parse(req.query.format ?? 'md');
  const b = await getBookRow(Number(req.params.id));
  const chs = await chaptersOf(b.id) as ExportChapter[];
  const chars = await charsOf(b.id) as unknown as ExportChar[];
  const eb: ExportBook = {
    id: b.id, title: b.title, subtitle: b.subtitle, premise: b.premise, kind: b.kind, genre: b.genre,
    penName: b.pen_name ?? '', seriesTitle: b.series_title ?? '', seriesNumber: b.series_number,
    logline: b.logline, blurb: b.blurb, categories: J<string[]>(b.categories, []),
    keywords: J<string[]>(b.keywords, []), created_at: b.created_at,
  };
  const name = slug(b.title);
  if (fmt === 'md') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.md"`);
    return void res.send(buildMarkdown(eb, chs, chars));
  }
  if (fmt === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.txt"`);
    return void res.send(buildTxt(eb, chs));
  }
  if (fmt === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.html"`);
    return void res.send(buildHtml(eb, chs, chars));
  }
  if (fmt === 'kdp') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-kdp-kit.txt"`);
    return void res.send(buildKdp(eb));
  }
  if (fmt === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.json"`);
    return void res.json({ data: await fullBook(b.id) });
  }
  const buf = await buildEpub(eb, chs);
  res.setHeader('Content-Type', 'application/epub+zip');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.epub"`);
  return void res.send(buf);
}));
