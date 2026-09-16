// NOVEL ENGINE — the main build engine. Gated, chapter-by-chapter novel generation.
// Implements the pack in prompts/novel/: Stage 0 Concept Forge → Stage 1 Structure →
// Stage 2 Bible (+ style spec) → Stage 3 six-gate chapter pipeline → Stage 4 hands off
// to the Editor-in-Chief tab. Prompts are read from the pack files at boot so the
// craft law stays editable without code changes.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatComplete } from './ai.js';

export const PIPELINE = 'novel-v1';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = join(HERE, '..', 'prompts', 'novel');
const read = (f: string): string => readFileSync(join(PACK, f), 'utf8');

let P01 = '';
let P02 = '';
let P03 = '';
let P04 = '';
let P05 = '';
let P06 = '';
let P07 = '';
let P08 = '';
const GATES: Record<string, string> = {};
let P07P1 = '';
let P08DELTA = '';

// Split 05 into its six gate blocks by '## GATE n' headers (fallback: whole file).
function splitGates(p05: string): void {
  const parts = p05.split(/^## GATE (\d)/m).slice(1);
  for (let i = 0; i + 1 < parts.length; i += 2) {
    GATES[parts[i].trim()] = `## GATE ${parts[i].trim()}\n${parts[i + 1]}`.trim();
  }
  if (!GATES['1']) {
    for (const n of ['1', '2', '3', '4', '5', '6']) GATES[n] = p05;
  }
}

// Slice a section between two '## ' headers (fallback: whole file).
function sliceSection(doc: string, start: string): string {
  const i = doc.indexOf(start);
  if (i < 0) return doc;
  const rest = doc.slice(i);
  const m = rest.slice(start.length).search(/\n## /);
  return (m < 0 ? rest : rest.slice(0, start.length + m)).trim() || doc;
}

export function loadNovelPack(): void {
  P01 = read('01-master-system-prompt.md');
  P02 = read('02-concept-forge.md');
  P03 = read('03-structure-library.md');
  P04 = read('04-bible-builder.md');
  P05 = read('05-chapter-pipeline.md');
  P06 = read('06-craft-rules.md');
  P07 = read('07-style-engine.md');
  P08 = read('08-ledger-and-templates.md');
  splitGates(P05);
  P07P1 = sliceSection(P07, '## Part 1');
  P08DELTA = sliceSection(P08, '## The Ledger Delta');
  if (!P01 || !P02 || !P03 || !P04 || !P06 || !P07) {
    throw new Error('Novel Engine pack files missing under prompts/novel/.');
  }
}

// ---------- machine blocks ----------

function allFences(text: string): Array<{ label: string; body: string }> {
  const out: Array<{ label: string; body: string }> = [];
  const re = /```([\w-]*)\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ label: (m[1] || '').toLowerCase(), body: (m[2] || '').trim() });
  return out;
}

function tryJsonObj(s: string): string | null {
  try {
    const v = JSON.parse(s) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return s.trim();
  } catch { /* fall through to sanitized retry */ }
  // Sanitized retry: models often emit trailing commas. Strict-first so
  // valid JSON is never mangled by the cleanup.
  try {
    const cleaned = s.replace(/,\s*([}\]])/g, '$1');
    const v = JSON.parse(cleaned) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return cleaned.trim();
  } catch { return null; }
  return null;
}

function missInfo(text: string): string {
  const ticks = (text.match(/```/g) || []).length;
  const labels = allFences(text).map((f) => f.label || '(plain)').join(',').slice(0, 200);
  const flat = text.replace(/\s+/g, ' ');
  return `len=${text.length} fences~${Math.floor(ticks / 2)} labels=[${labels}] head=${flat.slice(0, 400)} tail=${flat.slice(-200)}`;
}

export function extractFence(text: string, label: string): string {
  const fences = allFences(text);
  const want = label.toLowerCase();
  const isJson = want.endsWith('-json');
  const exact = fences.find((f) => f.label === want);
  if (exact && exact.body) return exact.body;
  const plain = fences.find((f) => (f.label === '' || f.label === 'json') && f.body);
  if (plain) return plain.body;
  if (isJson) {
    for (const f of fences) {
      if (f.body.startsWith('{')) {
        const ok = tryJsonObj(f.body);
        if (ok) return ok;
      }
    }
    const a = text.indexOf('{');
    const b = text.lastIndexOf('}');
    if (a >= 0 && b > a) {
      const ok = tryJsonObj(text.slice(a, b + 1));
      if (ok) return ok;
    }
  }
  console.error(`[novel] ${label} miss: ${missInfo(text)}`);
  throw new Error(`The model skipped its ${label} block. Nothing was saved — try again.`);
}

export function extractJson(text: string, label: string): Record<string, unknown> {
  const raw = extractFence(text, label);
  const ok = tryJsonObj(raw);
  if (ok) return JSON.parse(ok) as Record<string, unknown>;
  console.error(`[novel] ${label} broken-JSON: ${missInfo(raw)}`);
  throw new Error(`The model returned a broken ${label} block. Nothing was saved — try again.`);
}

type ChatOpts = { maxTokens?: number; temperature?: number; timeoutMs?: number };

// Self-heal: if the model's answer misses (or breaks) the machine block — or
// parses but leaves required fields hollow — show it its own answer plus the
// specific failure and ask for ONLY the block. Cheaper than failing the run
// and making the author retry every stage.
async function chatWithRepair<T>(args: {
  tag: string;
  messages: Array<{ role: string; content: string }>;
  opts: ChatOpts;
  parse: (text: string) => T;
  repairAsk: string;
  repairs?: number;
}): Promise<{ value: T; text: string; model: string }> {
  const first = await chatComplete(args.messages, args.opts);
  let lastErr = '';
  try {
    return { value: args.parse(first.text), text: first.text, model: first.model };
  } catch (e) {
    lastErr = (e as Error).message;
    console.error(`[novel] ${args.tag} parse failed (${lastErr}) — repair asks`);
  }
  const rounds = Math.max(1, args.repairs ?? 1);
  let lastText = first.text;
  for (let i = 0; i < rounds; i++) {
    const next = await chatComplete(
      [...args.messages,
        { role: 'assistant', content: lastText.slice(0, 14000) },
        { role: 'user', content: `${args.repairAsk}\n\nWhy your last answer failed: ${lastErr}` }],
      { ...args.opts, maxTokens: 8000, temperature: 0.3 },
    );
    lastText = next.text;
    try {
      return { value: args.parse(next.text), text: first.text, model: next.model };
    } catch (e) {
      lastErr = (e as Error).message;
      console.error(`[novel] ${args.tag} repair ${i + 1}/${rounds} failed (${lastErr})`);
    }
  }
  throw new Error(lastErr || 'Repair failed.');
}

// Same self-heal idea for free-form gates (brief, cards, ledger delta):
// if the first answer misses the required headers, show the model its own
// answer and ask for the full block again. Cheaper than failing the run.
export async function chatWithKeywordRepair(args: {
  tag: string;
  messages: Array<{ role: string; content: string }>;
  opts: ChatOpts;
  valid: (text: string) => boolean;
  repairAsk: string;
  failMsg: string;
}): Promise<{ text: string; model: string }> {
  const first = await chatComplete(args.messages, args.opts);
  if (args.valid(first.text)) return { text: first.text, model: first.model };
  console.error(`[novel] ${args.tag} keyword miss — one repair ask`);
  const second = await chatComplete(
    [...args.messages,
      { role: 'assistant', content: first.text.slice(0, 14000) },
      { role: 'user', content: args.repairAsk }],
    { ...args.opts, maxTokens: 8000, temperature: 0.3 },
  );
  if (args.valid(second.text)) return { text: second.text, model: second.model };
  throw new Error(args.failMsg);
}

function stripFences(text: string): string {
  return text.replace(/```[\w-]*\s*[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

const str = (v: unknown, max: number): string =>
  (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strArr = (v: unknown, max: number): string[] =>
  (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean) : []);

// ---------- shared types ----------

export type NovelAnchors = {
  subgenre: string; comps: string; protagonist: string; antagonist: string;
  stakes: string; theme: string; ending: string; seeds: string;
};
export const EMPTY_ANCHORS: NovelAnchors = {
  subgenre: '', comps: '', protagonist: '', antagonist: '', stakes: '', theme: '', ending: '', seeds: '',
};

export type Stage0Input = {
  title: string; genre: string; audience: string; tone: string; style: string;
  pov: string; tense: string; targetWords: number; premise: string; anchors: NovelAnchors;
};

export type BeatChapter = {
  n: number; title: string; pov: string; beat: string; job: string; valueShift: string;
  enters: string; exits: string; plants: string[]; paysOff: string[]; words: number;
};

export type BibleCharacter = {
  name: string; role: string; want: string; need: string; voice: string; physical: string;
  function: string; secret: string; arc: string; description: string;
};

function anchorsBlock(a: NovelAnchors): string {
  const lines: string[] = [];
  if (a.subgenre) lines.push(`Subgenre: ${a.subgenre}`);
  if (a.comps) lines.push(`Market comps (title — axis):\n${a.comps}`);
  if (a.protagonist) lines.push(`Protagonist want (LOCKED by author): ${a.protagonist}`);
  if (a.antagonist) lines.push(`Antagonist / opposing force (LOCKED by author): ${a.antagonist}`);
  if (a.stakes) lines.push(`Stakes (LOCKED by author): ${a.stakes}`);
  if (a.theme) lines.push(`Theme as argument (LOCKED by author): ${a.theme}`);
  if (a.ending) lines.push(`Ending (LOCKED by author — build backward from this): ${a.ending}`);
  if (a.seeds) lines.push(`Seed images & motifs (Stage 0 seed list — use these):\n${a.seeds}`);
  return lines.length
    ? `AUTHOR'S LOCKED ANSWERS — treat as decided, do not re-ask:\n${lines.join('\n')}`
    : '(No locked answers — interrogate and propose per the knowledge file.)';
}

// ---------- Stage 0: Concept Forge ----------

export type DesignJson = {
  dramaticQuestion: string; promise: string; whyNow: string; instability: string;
  protagonist: Record<string, string>; antagonist: Record<string, string>;
  stakes: Record<string, string>; theme: string;
  genre: { category: string; subgenre: string; expectedLength: string; controllingValue: string; obligatory: string[]; subversion: string; comps: string[] };
  ending: Record<string, string>; seedList: string[]; locked: string[]; open: string[]; synopsis: string;
};

export type Stage0Out = { designMd: string; design: DesignJson; model: string };

// Builds the typed design AND validates completeness. Runs inside the parse
// step so hollow designs trigger a gap-aware repair instead of a dead run.
// Exported for tests (same precedent as extractFence/extractJson).
export function toDesign(j: Record<string, unknown>, anchorsSubgenre: string): DesignJson {
  const obj = (v: unknown, max: number): Record<string, string> => {
    const o = (v ?? {}) as Record<string, unknown>;
    const r: Record<string, string> = {};
    for (const [k, val] of Object.entries(o)) r[k] = str(val, max);
    return r;
  };
  const gj = (j.genre ?? {}) as Record<string, unknown>;
  const design: DesignJson = {
    dramaticQuestion: str(j.dramaticQuestion, 1000),
    promise: str(j.promise, 2000),
    whyNow: str(j.whyNow, 2000),
    instability: str(j.instability, 2000),
    protagonist: obj(j.protagonist, 2000),
    antagonist: obj(j.antagonist, 2000),
    stakes: obj(j.stakes, 2000),
    theme: str(j.theme, 2000),
    genre: {
      category: 'fiction', subgenre: str(gj.subgenre, 200) || anchorsSubgenre,
      expectedLength: str(gj.expectedLength, 200), controllingValue: str(gj.controllingValue, 500),
      obligatory: strArr(gj.obligatory, 500).slice(0, 20),
      subversion: str(gj.subversion, 1000), comps: strArr(gj.comps, 300).slice(0, 6),
    },
    ending: obj(j.ending, 2000),
    seedList: strArr(j.seedList, 500).slice(0, 15),
    locked: strArr(j.locked, 300).slice(0, 20),
    open: strArr(j.open, 300).slice(0, 20),
    synopsis: str(j.synopsis, 6000),
  };
  const gaps: string[] = [];
  if (design.dramaticQuestion.length < 10) gaps.push('dramaticQuestion (one answerable sentence)');
  if (!design.protagonist.want || design.protagonist.want.length < 5) gaps.push('protagonist.want (concrete external goal)');
  if (!design.ending.climax || design.ending.climax.length < 10) gaps.push('ending.climax (lock the ending — propose 3 and pick 1 if unsure)');
  if (design.synopsis.length < 40) gaps.push('synopsis (complete, no placeholders)');
  if (!design.theme || design.theme.length < 10) gaps.push('theme (as an argument, not a topic)');
  const placeholder = /not yet available|to be decided|\bTBD\b|\.\.\.|cannot complet|can't complet|unable to complet|need more information|need you to|must be settled|missing structural|cannot proceed/i;
  for (const [k, v] of [['dramaticQuestion', design.dramaticQuestion], ['synopsis', design.synopsis], ['theme', design.theme]] as const) {
    if (v && placeholder.test(v)) gaps.push(`${k} (contains a placeholder — decide and write the real value)`);
  }
  if (gaps.length) throw new Error(`Stage 0 design is incomplete — missing: ${gaps.join('; ')}. Nothing was saved — fill every field.`);
  return design;
}

export async function runStage0(a: Stage0Input): Promise<Stage0Out> {
  const user = `STAGE 0 — CONCEPT FORGE.\n\nTitle: ${a.title}\nCategory: fiction. Genre: ${a.genre}\nAudience: ${a.audience || 'Adult commercial fiction'} | Tone: ${a.tone || '(decide)'} | Voice like: ${a.style || '(decide)'}\nPOV: ${a.pov} | Tense: ${a.tense} | Target length: ${a.targetWords.toLocaleString('en-US')} words\nPremise: ${a.premise}\n\n${anchorsBlock(a.anchors)}\n\nKNOWLEDGE — follow this file as craft law:\n---\n${P02}\n---\n\nCOMPLETION LAW — this environment runs non-interactively: there are no interrogation rounds and no second chances to ask. Where the knowledge file says to interrogate or ask, OVERRIDE it: for every thin answer or open decision, propose 3 options inline, recommend 1, lock it, and move on. You MUST complete all 10 sections plus the machine block in THIS response. You are FORBIDDEN from stopping early, deferring sections, or writing placeholders like "not yet available" anywhere — an incomplete design is a total failure. The machine block MUST be syntactically valid JSON: no trailing commas, no comments, every field filled.\n\nOUTPUT: the Story Design Document in markdown (all 10 sections, ending with the Locked/Open lists), then this machine block:\n\`\`\`design-json\n{"dramaticQuestion": "...", "promise": "...", "whyNow": "...", "instability": "...", "protagonist": {"want": "...", "need": "...", "ghost": "...", "misbelief": "...", "truth": "..."}, "antagonist": {"who": "...", "argument": "...", "plan": "..."}, "stakes": {"personal": "...", "public": "...", "philosophical": "...", "escalation": "..."}, "theme": "...", "genre": {"category": "fiction", "subgenre": "...", "expectedLength": "...", "controllingValue": "...", "obligatory": [], "subversion": "...", "comps": []}, "ending": {"climax": "...", "resolution": "...", "finalImage": "...", "change": "..."}, "seedList": [], "locked": [], "open": [], "synopsis": "..."}\n\`\`\``;
  const { text, model, value: j } = await chatWithRepair({
    tag: 'S0',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 16000, temperature: 0.7, timeoutMs: 300000 },
    parse: (t) => toDesign(extractJson(t, 'design-json'), a.anchors.subgenre),
    repairs: 2,
    repairAsk: `REPAIR — your last response was missing (or broke) the machine block. Reply with ONLY this fenced block and nothing else: no prose, no headers, no explanation, no apology. Copy the values from the design you just wrote; fill every field. The block must be valid JSON: no trailing commas, no comments.
\`\`\`design-json
{"dramaticQuestion": "...", "promise": "...", "whyNow": "...", "instability": "...", "protagonist": {"want": "...", "need": "...", "ghost": "...", "misbelief": "...", "truth": "..."}, "antagonist": {"who": "...", "argument": "...", "plan": "..."}, "stakes": {"personal": "...", "public": "...", "philosophical": "...", "escalation": "..."}, "theme": "...", "genre": {"category": "fiction", "subgenre": "...", "expectedLength": "...", "controllingValue": "...", "obligatory": [], "subversion": "...", "comps": []}, "ending": {"climax": "...", "resolution": "...", "finalImage": "...", "change": "..."}, "seedList": [], "locked": [], "open": [], "synopsis": "..."}
\`\`\``,
  });
  return { designMd: stripFences(text).slice(0, 60000), design: j, model };
}

// ---------- Stage 1: Structure ----------

export type BeatmapJson = {
  architecture: { primary: string; secondary: string; rejected: string };
  math: { targetWords: number; chapterLength: number; chapterCount: number };
  chapters: BeatChapter[];
  tensionCurve: number[]; subplots: string[]; acts: string[];
};

export type Stage1Out = { beatmapMd: string; beatmap: BeatmapJson; model: string };

export async function runStage1(a: {
  designMd: string; design: DesignJson; targetWords: number; genre: string; pov: string;
}): Promise<Stage1Out> {
  const user = `STAGE 1 — STRUCTURE.\n\nStory Design Document (locked — build on it, do not redo it):\n---\n${a.designMd}\n---\n\nMachine design (authoritative — if the markdown above is thin, build from these locked values):\n${JSON.stringify(a.design)}\n\nTarget: ${a.targetWords.toLocaleString('en-US')} words. Genre: ${a.genre}. POV: ${a.pov}.\n\nKNOWLEDGE — follow this file as craft law:\n---\n${P03}\n---\n\nThis environment runs non-interactively: complete the full beat map in this response; do not stop for approval.\n\nOUTPUT: beat-map.md markdown (architecture choice with reasons + the math shown explicitly + chapter table + tension curve + subplot map + act divisions + audit reporting only failures), then this machine block. Every chapter gets a working title. No chapter without a job.\n\`\`\`beatmap-json\n{"architecture": {"primary": "...", "secondary": "...", "rejected": "..."}, "math": {"targetWords": 0, "chapterLength": 0, "chapterCount": 0}, "chapters": [{"n": 1, "title": "...", "pov": "...", "beat": "...", "job": "...", "valueShift": "...", "enters": "...", "exits": "...", "plants": [], "paysOff": [], "words": 0}], "tensionCurve": [], "subplots": [], "acts": []}\n\`\`\``;
  const { text, model, value: j } = await chatWithRepair({
    tag: 'S1',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 16000, temperature: 0.7, timeoutMs: 300000 },
    parse: (t) => extractJson(t, 'beatmap-json'),
    repairAsk: `REPAIR — your last response was missing (or broke) the machine block. Reply with ONLY this fenced block and nothing else: no prose, no headers, no explanation, no apology. Include one chapters entry per chapter from the beat map you just wrote (all of them, not just the example row).
\`\`\`beatmap-json
{"architecture": {"primary": "...", "secondary": "...", "rejected": "..."}, "math": {"targetWords": 0, "chapterLength": 0, "chapterCount": 0}, "chapters": [{"n": 1, "title": "...", "pov": "...", "beat": "...", "job": "...", "valueShift": "...", "enters": "...", "exits": "...", "plants": [], "paysOff": [], "words": 0}], "tensionCurve": [], "subplots": [], "acts": []}
\`\`\``,
  });
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);
  const mj = (j.math ?? {}) as Record<string, unknown>;
  const chapters = (Array.isArray(j.chapters) ? j.chapters : [])
    .map((c, i) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        n: num(o.n) || i + 1,
        title: str(o.title, 200) || `Chapter ${i + 1}`,
        pov: str(o.pov, 200),
        beat: str(o.beat, 500),
        job: str(o.job, 1000),
        valueShift: str(o.valueShift, 500),
        enters: str(o.enters, 1000),
        exits: str(o.exits, 1000),
        plants: strArr(o.plants, 200).slice(0, 10),
        paysOff: strArr(o.paysOff, 200).slice(0, 10),
        words: num(o.words),
      } as BeatChapter;
    })
    .filter((c) => c.job.length >= 5)
    .slice(0, 60);
  if (chapters.length < 4) throw new Error('Stage 1 returned too few chapter jobs. Nothing was saved — try again.');
  const aj = (j.architecture ?? {}) as Record<string, unknown>;
  return {
    beatmapMd: stripFences(text).slice(0, 60000),
    beatmap: {
      architecture: {
        primary: str(aj.primary, 500), secondary: str(aj.secondary, 500), rejected: str(aj.rejected, 500),
      },
      math: {
        targetWords: num(mj.targetWords) || a.targetWords,
        chapterLength: num(mj.chapterLength),
        chapterCount: chapters.length,
      },
      chapters,
      tensionCurve: (Array.isArray(j.tensionCurve) ? j.tensionCurve : []).map(num).slice(0, 60),
      subplots: strArr(j.subplots, 1000).slice(0, 12),
      acts: strArr(j.acts, 1000).slice(0, 10),
    },
    model,
  };
}

// ---------- Stage 2: Bible (+ style spec) ----------

export type BibleJson = {
  characters: BibleCharacter[];
  world: string; timeline: string; glossary: string; threads: string;
  styleSpec: { text: string; condensed: string };
};

export type Stage2Out = { bibleMd: string; bible: BibleJson; model: string };

export async function runStage2(a: { designMd: string; beatmapMd: string }): Promise<Stage2Out> {
  const user = `STAGE 2 — BIBLE (+ STYLE SPEC).\n\nStory Design Document:\n---\n${a.designMd}\n---\n\nBeat Map:\n---\n${a.beatmapMd}\n---\n\nThis environment runs non-interactively: give the casting plan inline (with any merges already applied and logged), then write the sheets. For the voice demonstration, write Voice A only (300 words), pick it or state the single alternative briefly, and move on — do not stop for approval.\n\nKNOWLEDGE — follow these files as craft law:\n---\n${P04}\n---\n---\n${P07P1}\n---\n\nOUTPUT: the bible markdown under ## headers (## bible/characters.md, ## bible/world.md, ## bible/timeline.md, ## bible/glossary.md, ## bible/threads.md, ## bible/style-spec.md), ending with the completeness audit, then this machine block:\n\`\`\`bible-json\n{"characters": [{"name": "...", "role": "...", "want": "...", "need": "...", "voice": "...", "physical": "...", "function": "...", "secret": "...", "arc": "...", "description": "..."}], "world": "...", "timeline": "...", "glossary": "...", "threads": "...", "styleSpec": {"text": "...", "condensed": "..."}}\n\`\`\`\nThe condensed style spec is one block: register n/10, avg sentence n words, figurative domains, three distinctives, budgets (em-dash, triads, not-X-but-Y). It is pasted into every chapter call.`;
  const { text, model, value: j } = await chatWithRepair({
    tag: 'S2',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 16000, temperature: 0.7, timeoutMs: 300000 },
    parse: (t) => extractJson(t, 'bible-json'),
    repairAsk: `REPAIR — your last response was missing (or broke) the machine block. Reply with ONLY this fenced block and nothing else: no prose, no headers, no explanation, no apology. Copy the values from the bible you just wrote; include every character; the condensed style spec is one block (register n/10, avg sentence n words, figurative domains, three distinctives, budgets).
\`\`\`bible-json
{"characters": [{"name": "...", "role": "...", "want": "...", "need": "...", "voice": "...", "physical": "...", "function": "...", "secret": "...", "arc": "...", "description": "..."}], "world": "...", "timeline": "...", "glossary": "...", "threads": "...", "styleSpec": {"text": "...", "condensed": "..."}}
\`\`\``,
  });
  const characters = (Array.isArray(j.characters) ? j.characters : [])
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        name: str(o.name, 200), role: str(o.role, 200), want: str(o.want, 1000),
        need: str(o.need, 1000), voice: str(o.voice, 2000), physical: str(o.physical, 2000),
        function: str(o.function, 1000), secret: str(o.secret, 1000),
        arc: str(o.arc, 4000), description: str(o.description, 4000),
      } as BibleCharacter;
    })
    .filter((c) => c.name)
    .slice(0, 20);
  if (!characters.length) throw new Error('Stage 2 returned no characters. Nothing was saved — try again.');
  const sj = (j.styleSpec ?? {}) as Record<string, unknown>;
  const condensed = str(sj.condensed, 4000);
  if (condensed.length < 50) throw new Error('Stage 2 returned no condensed style spec. Nothing was saved — try again.');
  return {
    bibleMd: stripFences(text).slice(0, 80000),
    bible: {
      characters,
      world: str(j.world, 20000),
      timeline: str(j.timeline, 20000),
      glossary: str(j.glossary, 20000),
      threads: str(j.threads, 20000),
      styleSpec: { text: str(sj.text, 20000), condensed },
    },
    model,
  };
}

export function buildLedgerSeed(design: DesignJson, bible: BibleJson, targetWords: number): string {
  const cast = bible.characters.slice(0, 12).map((c) => `- ${c.name} (${c.role || 'cast'}): wants ${c.want || '?'}`).join('\n');
  return `# RUNNING LEDGER\nLast updated: ch-000 (seed) | Words so far: 0 / ${targetWords.toLocaleString('en-US')}\n\n## 1. POSITION\n- Current chapter: none written yet (0 of 0)\n- Dramatic question: ${design.dramaticQuestion || '?'}\n- Promise to the reader: ${(design.promise || '?').slice(0, 500)}\n\n## 2. CHARACTER STATUS\n${cast || '- (cast pending)'}\n\n## 3. KNOWLEDGE TRACKER\n| Fact / event | Who knows it | Who does NOT know it | When they learn it |\n| The premise situation | (per chapter 1) | (per chapter 1) | ch-001 |\n\n## 4. TIMELINE\n| Ch | In-world date | Elapsed | Season/weather | Fixed dates & the clock |\n| 0 | (unset — chapter 1 sets the clock) | — | — | ${((design.ending as Record<string, string>).climax || '?').slice(0, 200)} |\n\n## 5. ESTABLISHED FACTS\n- Theme (argued, never stated): ${(design.theme || '?').slice(0, 500)}\n- Controlling value: ${design.genre.controllingValue || '?'}\n\n## 6. THREADS\n${(bible.threads || '(threads file at Stage 2 — see bible)').slice(0, 1500)}\n\n## 7. RELATIONSHIPS\n- (chapter 1 establishes)\n\n## 8. MOTIFS & SEEDS\n${design.seedList.map((s) => `- SEED (unused): ${s}`).join('\n') || '- (none seeded)'}\n\n## 9. STYLE DECISIONS\n- (none settled yet — style spec governs)\n\n## 10. RISKS\n- Open design items: ${(design.open.join('; ') || 'none').slice(0, 800)}`;
}

// ---------- Stage 3: gates ----------

export type NovelPlan = {
  pipeline?: string; anchors?: NovelAnchors;
  design?: DesignJson; designMd?: string;
  beatmap?: BeatmapJson; beatmapMd?: string;
  styleCondensed?: string;
};

export type StepState = { brief: string; cards: string; verdict: string; changelog: string };
export function parseStep(step: string): StepState {
  const out: StepState = { brief: '', cards: '', verdict: '', changelog: '' };
  if (!step || step[0] !== '{') return out;
  try {
    const o = JSON.parse(step) as Partial<StepState>;
    if (typeof o.brief === 'string') out.brief = o.brief;
    if (typeof o.cards === 'string') out.cards = o.cards;
    if (typeof o.verdict === 'string') out.verdict = o.verdict;
    if (typeof o.changelog === 'string') out.changelog = o.changelog;
    return out;
  } catch {
    return out;
  }
}
export function stringifyStep(s: StepState): string {
  return JSON.stringify({
    brief: s.brief.slice(0, 20000), cards: s.cards.slice(0, 30000),
    verdict: s.verdict.slice(0, 2000), changelog: s.changelog.slice(0, 4000),
  });
}

export type PasteInput = {
  design: DesignJson; beatmap: BeatmapJson; styleCondensed: string; ledger: string;
  chapterNo: number; prevTail: string;
};

export function buildPasteBlock(p: PasteInput): string {
  const rows = p.beatmap.chapters
    .filter((c) => Math.abs(c.n - p.chapterNo) <= 2)
    .map((c) => `| ${c.n} | ${c.beat || '—'} | ${c.pov || '—'} | ${c.job} | ${c.valueShift || '—'} | ${(c.plants || []).join('; ') || '—'} | ${(c.paysOff || []).join('; ') || '—'} | ${c.words || '—'} |`)
    .join('\n');
  const words = p.ledger.split(/\s+/).filter(Boolean).length;
  const ledger = words > 1800
    ? `(ledger pruned for length — ${words} words on file, showing the latest)\n${p.ledger.split(/\s+/).slice(-1300).join(' ')}`
    : p.ledger;
  return `=== PROJECT STATE — chapter ${p.chapterNo} ===\n\nLOCKED BRIEF\nGenre/shelf: ${p.design.genre.subgenre || 'fiction'} | Promise to the reader: ${p.design.promise.slice(0, 400)}\nTheme-as-argument: ${p.design.theme.slice(0, 400)} | Controlling value: ${p.design.genre.controllingValue || '?'}\nHard constraints (never change these): ${p.design.dramaticQuestion.slice(0, 300)} | Ending locks: ${(p.design.ending.climax || '').slice(0, 300)}\n\nBEAT MAP — current\n| Ch | Beat | POV | Job | Value shift | Plants | Pays | Words |\n${rows}\n\nSTYLE SPEC — condensed\n${p.styleCondensed}\n\nRUNNING LEDGER\n${ledger}\n\nLAST 200 WORDS OF CHAPTER ${p.chapterNo - 1}\n${p.prevTail || '(this is chapter 1 — no previous tail)'}\n\n=== END PROJECT STATE ===`;
}

export async function runGate1(p: PasteInput & { beat: BeatChapter; note: string }): Promise<{ brief: string; model: string }> {
  const user = `CHAPTER ${p.chapterNo} — GATE 1. Produce the Chapter Brief in the exact format. No prose, no drafting.\n\nBeat row for this chapter: Ch ${p.beat.n} "${p.beat.title}" — job: ${p.beat.job} | beat: ${p.beat.beat} | value: ${p.beat.valueShift} | enters: ${p.beat.enters} | exits: ${p.beat.exits} | words: ${p.beat.words || 'per budget'}.\n${p.note ? `AUTHOR NOTE (obey unless it breaks the story — if it breaks the story, say so and give the cost): ${p.note}\n` : ''}\n${buildPasteBlock(p)}\n\nKNOWLEDGE — this gate only:\n---\n${GATES['1']}\n---`;
  const { text, model } = await chatWithKeywordRepair({
    tag: 'G1',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 8000, temperature: 0.6, timeoutMs: 300000 },
    valid: (t) => t.length >= 200 && /JOB/i.test(t) && /VALUE SHIFT/i.test(t),
    repairAsk: 'REPAIR — your Chapter Brief was missing its required headers. Reply with the FULL brief again, complete and in the exact format, including the JOB and VALUE SHIFT sections. No prose, no drafting.',
    failMsg: 'Gate 1 returned no usable brief (missing JOB / VALUE SHIFT). Nothing was saved — try again.',
  });
  return { brief: text.trim().slice(0, 20000), model };
}

export async function runGate2(p: PasteInput & { beat: BeatChapter; brief: string; note: string }): Promise<{ cards: string; model: string }> {
  const user = `CHAPTER ${p.chapterNo} — GATE 2. Expand the approved brief into scene cards. Still no prose.\n\nAPPROVED BRIEF:\n---\n${p.brief}\n---\n${p.note ? `AUTHOR NOTE (obey unless it breaks the story — if it breaks the story, say so and give the cost): ${p.note}\n` : ''}\n${buildPasteBlock(p)}\n\nKNOWLEDGE — this gate only:\n---\n${GATES['2']}\n---`;
  const { text, model } = await chatWithKeywordRepair({
    tag: 'G2',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 8000, temperature: 0.6, timeoutMs: 300000 },
    valid: (t) => t.length >= 200 && /GOAL/i.test(t) && /DISASTER/i.test(t),
    repairAsk: 'REPAIR — your scene cards were missing their required headers. Reply with the FULL scene cards again, complete and in the exact format, including the GOAL and DISASTER sections. Still no prose.',
    failMsg: 'Gate 2 returned no usable scene cards (missing GOAL / DISASTER). Nothing was saved — try again.',
  });
  return { cards: text.trim().slice(0, 30000), model };
}

export function extractDraft(text: string, budget = 3000): { front: string; body: string } {
  const raw = extractFence(text, 'draft');
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  const body = (m ? m[2] : raw).replace(/\n{3,}/g, '\n\n').trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  // Full-length chapters must clear 400 words; short-budget chapters scale
  // down so a correct short draft can't fall into a retry trap.
  const floor = Math.min(400, Math.max(150, Math.round(budget * 0.25)));
  if (words < floor) throw new Error(`The draft came back under ${floor} words. Nothing was saved — try again.`);
  return { front: m ? m[1].trim().slice(0, 2000) : '', body };
}

export type DraftOut = { body: string; words: number; critique: string; model: string };

export async function runGates34(p: PasteInput & {
  beat: BeatChapter; brief: string; cards: string;
}): Promise<DraftOut> {
  const user = `CHAPTER ${p.chapterNo} — GATES 3+4. Write the chapter to the approved scene cards, then immediately audit it as the developmental editor. Do not revise yet.\n\nAPPROVED BRIEF:\n---\n${p.brief}\n---\n\nAPPROVED SCENE CARDS:\n---\n${p.cards}\n---\n\nWord budget for this chapter: ${(p.beat.words || 3000).toLocaleString('en-US')} words (within 10%).\n\n${buildPasteBlock(p)}\n\nKNOWLEDGE:\n---\n${GATES['3']}\n---\n---\n${GATES['4']}\n---\n---\n${P06}\n---\n---\n${P07}\n---\n\nOUTPUT: first the draft in a \`\`\`draft fence (chapter-template frontmatter, then prose, --- between scenes), then the Gate 4 self-critique with scores and CRITICAL / MAJOR / MINOR findings.`;
  const { text, model, value: draft0 } = await chatWithRepair({
    tag: 'G34',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 16000, temperature: 0.8, timeoutMs: 300000 },
    parse: (t) => extractDraft(t, p.beat.words || 3000),
    repairAsk: `REPAIR — your last response was missing (or broke) the draft fence. Reply with ONLY the fenced block and nothing else: no critique, no headers, no explanation, no apology.
\`\`\`draft
---
chapter: ${p.chapterNo}
title: ...
pov: ...
value_shift: ...
word_count: ...
---

(full chapter prose here, --- between scenes)
\`\`\``,
  });
  const { body } = draft0;
  let critique = stripFences(text);
  if (critique.length < 200 || !/CRITICAL|MAJOR|MINOR/i.test(critique)) {
    console.error('[novel] G34 critique miss — one repair ask');
    const rep = await chatComplete(
      [{ role: 'system', content: P01 }, { role: 'user', content: user },
        { role: 'assistant', content: text.slice(0, 14000) },
        { role: 'user', content: 'REPAIR — your Gate 4 self-critique was missing or unreadable. Reply with ONLY the self-critique in plain markdown (no code fences): scores, then CRITICAL / MAJOR / MINOR findings against the draft above.' }],
      { maxTokens: 8000, temperature: 0.3, timeoutMs: 300000 },
    );
    critique = stripFences(rep.text);
  }
  if (critique.length < 200 || !/CRITICAL|MAJOR|MINOR/i.test(critique)) {
    throw new Error('Gate 4 returned no usable critique. Nothing was saved — try again.');
  }
  return { body, words: body.split(/\s+/).filter(Boolean).length, critique: critique.slice(0, 20000), model };
}

export type ReviseOut = { body: string; words: number; changelog: string; verdict: string; model: string };

export async function runGate5(p: {
  chapterNo: number; draft: string; critique: string; words: number;
}): Promise<ReviseOut> {
  const user = `CHAPTER ${p.chapterNo} — GATE 5. Apply the Gate 4 findings. Fix every CRITICAL and MAJOR. Fix MINOR where it does not cost momentum. Where you disagree with the critique, say so and give the reason.\n\nDRAFT:\n---\n${p.draft}\n---\n\nGATE 4 CRITIQUE:\n---\n${p.critique}\n---\n\nWord budget: ${(p.words || 3000).toLocaleString('en-US')} words.\n\nKNOWLEDGE — this gate only:\n---\n${GATES['5']}\n---\n\nOUTPUT: the revised chapter in a \`\`\`draft fence, then CHANGE LOG (Finding | Severity | What changed | Location, plus findings NOT fixed and why), then FINAL VERDICT (3 sentences), then WORD COUNT.`;
  const { text, model, value: draft0 } = await chatWithRepair({
    tag: 'G5',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 16000, temperature: 0.7, timeoutMs: 300000 },
    parse: (t) => extractDraft(t, p.words || 3000),
    repairAsk: `REPAIR — your last response was missing (or broke) the revised-draft fence. Reply with ONLY the fenced block and nothing else: no change log, no verdict, no headers, no explanation, no apology.
\`\`\`draft
---
chapter: ${p.chapterNo}
title: ...
status: revised
---

(full revised chapter prose here, --- between scenes)
\`\`\``,
  });
  const { body } = draft0;
  const rest = stripFences(text);
  const vAt = rest.search(/FINAL VERDICT/i);
  const cAt = rest.search(/CHANGE LOG/i);
  const verdict = (vAt >= 0 ? rest.slice(vAt) : rest).trim().slice(0, 2000);
  const changelog = (cAt >= 0 ? rest.slice(cAt, vAt >= 0 && vAt > cAt ? vAt : cAt + 4000) : '').trim().slice(0, 4000);
  if (!verdict) throw new Error('Gate 5 returned no verdict. Nothing was saved — try again.');
  return { body, words: body.split(/\s+/).filter(Boolean).length, changelog, verdict, model };
}

export type LedgerOut = { delta: string; nextSetup: string; drift: string; model: string };

export async function runGate6(p: PasteInput & {
  beat: BeatChapter; revised: string;
}): Promise<LedgerOut> {
  const user = `CHAPTER ${p.chapterNo} — GATE 6. Produce the ledger delta, check the beat map, set up the next chapter.\n\nREVISED CHAPTER:\n---\n${p.revised}\n---\n\nCURRENT LEDGER:\n---\n${p.ledger}\n---\n\nBEAT MAP ROWS:\n${p.beatmap.chapters.filter((c) => Math.abs(c.n - p.chapterNo) <= 3).map((c) => `Ch ${c.n} "${c.title}": ${c.job}`).join('\n')}\n\nKNOWLEDGE:\n---\n${GATES['6']}\n---\n---\n${P08DELTA}\n---`;
  const { text, model } = await chatWithKeywordRepair({
    tag: 'G6',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 8000, temperature: 0.5, timeoutMs: 300000 },
    valid: (t) => /LEDGER DELTA/i.test(t) && /KNOWLEDGE MOVED/i.test(t),
    repairAsk: 'REPAIR — your ledger update was missing its required headers. Reply with the FULL update again, complete and in the exact format, including the LEDGER DELTA and KNOWLEDGE MOVED sections.',
    failMsg: 'Gate 6 returned no usable ledger delta (missing LEDGER DELTA / KNOWLEDGE MOVED). Nothing was saved — try again.',
  });
  const dAt = text.search(/LEDGER DELTA/i);
  const nAt = text.search(/NEXT CHAPTER SETUP/i);
  const bAt = text.search(/BEAT MAP CHECK/i);
  const delta = text.slice(dAt, bAt > dAt ? bAt : (nAt > dAt ? nAt : dAt + 6000)).trim().slice(0, 6000);
  const nextSetup = (nAt >= 0 ? text.slice(nAt) : '').trim().slice(0, 1500);
  const drift = (bAt >= 0 ? text.slice(bAt, nAt > bAt ? nAt : bAt + 1500) : '').trim().slice(0, 1500);
  return { delta, nextSetup, drift, model };
}

export type ReviseFix = { quote: string; issue: string; suggestion: string };
export type ReviseChapterOut = { body: string; words: number; model: string };

// Revision pass: applies ONLY the author-approved fixes (plus author notes)
// to an existing chapter. Same plot, beats, scenes, voice — a better copy,
// not a new chapter.
export async function runReviseChapter(p: {
  chapterNo: number; chapterTitle: string; currentBody: string;
  fixes: ReviseFix[]; notes: string;
}): Promise<ReviseChapterOut> {
  const words = p.currentBody.split(/\s+/).filter(Boolean).length;
  const fixList = p.fixes.map((f, i) =>
    `${i + 1}. QUOTE: "${f.quote || '(whole chapter)'}"\n   ISSUE: ${f.issue}\n   FIX: ${f.suggestion || '(use your judgment)'}`).join('\n');
  const user = `CHAPTER ${p.chapterNo} "${p.chapterTitle}" — REVISION PASS.\n\nCURRENT CHAPTER (${words} words):\n---\n${p.currentBody}\n---\n\nAPPROVED FIXES (apply these and ONLY these — each is an editor note the author approved):\n---\n${fixList || '(none — follow the author notes below)'}\n---\n${p.notes ? `AUTHOR NOTES (obey):\n---\n${p.notes}\n---\n` : ''}RULES: keep the plot, beats, scenes, and voice identical except where a fix requires change. Do not add new subplots, characters, or scenes. Match the current length within 15%.\n\nOUTPUT: the full revised chapter in a \`\`\`draft fence (frontmatter --- header then prose, --- between scenes), nothing else outside the fence.`;
  const { model, value } = await chatWithRepair({
    tag: 'REV',
    messages: [{ role: 'system', content: P01 }, { role: 'user', content: user }],
    opts: { maxTokens: 16000, temperature: 0.6, timeoutMs: 300000 },
    parse: (t) => extractDraft(t, words),
    repairAsk: `REPAIR — your last response was missing (or broke) the revised-draft fence. Reply with ONLY the fenced block and nothing else: no headers, no explanation, no apology.\n\`\`\`draft\n---\nchapter: ${p.chapterNo}\ntitle: ...\nstatus: revised\n---\n\n(full revised chapter prose here, --- between scenes)\n\`\`\``,
  });
  return { body: value.body, words: value.body.split(/\s+/).filter(Boolean).length, model };
}

export async function pruneLedger(ledger: string): Promise<{ ledger: string; model: string } | null> {
  const words = ledger.split(/\s+/).filter(Boolean).length;
  if (words <= 1800) return null;
  const { text, model } = await chatComplete(
    [
      { role: 'system', content: P01 },
      {
        role: 'user',
        content: `PRUNE THE LEDGER. Compress this running ledger to 1,200 words or fewer using the pruning protocol below. Keep KNOWLEDGE TRACKER, TIMELINE, POSITION, and RISKS in full, always. Collapse PAID/CUT threads to one line each. Merge established facts into dense paragraphs.\n\nLEDGER:\n---\n${ledger}\n---\n\nPROTOCOL:\n${sliceSection(read('08-ledger-and-templates.md'), '## Pruning protocol')}`,
      },
    ],
    { maxTokens: 8000, temperature: 0.3, timeoutMs: 300000 },
  );
  if (!/KNOWLEDGE TRACKER/i.test(text) || text.split(/\s+/).filter(Boolean).length > 2000) return null;
  return { ledger: text.trim().slice(0, 15000), model };
}
