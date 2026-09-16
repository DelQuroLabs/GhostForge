import { getSetting, setSetting, delSetting } from './db.js';
import { styleDirective } from './engine/styles.js';

export type AiPublic = { provider: string; baseUrl: string; model: string; hasKey: boolean; last4: string };

export async function getAiPublic(): Promise<AiPublic> {
  const key = (await getSetting('ai_api_key')) || process.env.AI_API_KEY || '';
  return {
    provider: (await getSetting('ai_provider')) || 'openrouter',
    baseUrl: (await getSetting('ai_base_url')) || process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
    model: (await getSetting('ai_model')) || process.env.AI_MODEL || '',
    hasKey: key.length > 0,
    last4: key.length > 4 ? '…' + key.slice(-4) : '',
  };
}

export async function saveAi(input: { provider?: string; baseUrl?: string; model?: string; key?: string; clearKey?: boolean }): Promise<AiPublic> {
  if (input.provider !== undefined) await setSetting('ai_provider', input.provider);
  if (input.baseUrl !== undefined) await setSetting('ai_base_url', input.baseUrl.replace(/\/$/, ''));
  if (input.model !== undefined) await setSetting('ai_model', input.model);
  if (input.clearKey) await delSetting('ai_api_key');
  else if (input.key !== undefined && input.key !== '') await setSetting('ai_api_key', input.key);
  return getAiPublic();
}

export function isLocalProvider(baseUrl: string): boolean {
  return /localhost|127\.0\.0\.1|\.local\b/.test(baseUrl);
}

async function creds(): Promise<{ baseUrl: string; apiKey: string; model: string }> {
  // E2E override: route ALL AI calls to the stub without touching saved settings.
  if (process.env.GF_AI_STUB === '1') {
    return { baseUrl: process.env.AI_BASE_URL || 'http://127.0.0.1:3999', apiKey: 'stub', model: process.env.AI_MODEL || 'stub' };
  }
  const baseUrl = (await getSetting('ai_base_url')) || process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  const local = isLocalProvider(baseUrl);
  // Local providers (Ollama) need no key — send the conventional placeholder.
  const apiKey = (await getSetting('ai_api_key')) || process.env.AI_API_KEY || (local ? 'ollama' : '');
  const model = (await getSetting('ai_model')) || process.env.AI_MODEL || (local ? 'gpt-oss:20b' : '');
  if (!apiKey) {
    const e = new Error('No AI key configured. Add one in Settings to enable AI enhancement.');
    (e as Error & { code: string }).code = 'NO_KEY';
    throw e;
  }
  if (!model) {
    const e = new Error('No AI model configured. Set a model id in Settings (e.g. openai/gpt-4o-mini).');
    (e as Error & { code: string }).code = 'NO_MODEL';
    throw e;
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, model };
}

// Turn a raw provider error body into one readable sentence plus, where we can
// tell what went wrong, what to do about it. Never leak a JSON wall to the UI.
export function humanizeProviderError(status: number, raw: string, model: string): string {
  let inner = raw.slice(0, 500);
  try {
    const j = JSON.parse(raw) as { error?: { message?: string; code?: string } };
    if (j?.error?.message) inner = j.error.message;
  } catch { /* not JSON — use raw text */ }
  inner = inner.replace(/\s+/g, ' ').trim() || `request failed with status ${status}`;
  const low = `${status} ${inner}`.toLowerCase();
  let hint = '';
  if (status === 401 || low.includes('invalid_api_key') || low.includes('incorrect api key') || low.includes('invalid api key')) {
    hint = ' Your AI key was rejected — paste a fresh key in Settings → AI.';
  } else if (low.includes('model_not_found') || low.includes('does not exist') || low.includes('unknown model')) {
    hint = ` The model id “${model}” doesn't exist on this provider or your key can't reach it — check it in Settings → AI.`;
  } else if (low.includes('insufficient_quota') || low.includes('insufficient funds') || low.includes('billing')) {
    hint = ' Your provider account is out of credit — top it up, then try again.';
  } else if (status === 429 || low.includes('rate_limit') || low.includes('rate limit')) {
    hint = ' The provider is rate-limiting you — wait a minute and try again.';
  } else if (low.includes('context_length') || low.includes('maximum context')) {
    hint = ' The chapter plus its context is longer than this model allows — try a larger-context model.';
  }
  return `AI provider error ${status}: ${inner}${hint ? ' ' + hint.trim() : ''}`;
}

async function postChat(
  baseUrl: string, apiKey: string, model: string,
  body: Record<string, unknown>, signal: AbortSignal,
): Promise<{ status: number; text: string }> {
  let lastErr: unknown = null;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ghostforge.local',
          'X-Title': 'Ghostforge',
        },
        body: JSON.stringify({ model, ...body }),
      });
      return { status: res.status, text: await res.text().catch(() => '') };
    } catch (e) {
      lastErr = e;
      if ((e as Error)?.name === 'AbortError') throw e;
      if (i < 2) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(
    `Could not reach the AI provider at ${baseUrl} (network error — the request never got through). Check your connection and provider status, then try again. (Original: ${(lastErr as Error)?.message ?? String(lastErr)})`,
  );
}

export async function chatComplete(
  messages: Array<{ role: string; content: string }>,
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<{ text: string; model: string }> {
  const { baseUrl, apiKey, model } = await creds();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 180000);
  try {
    // Newer reasoning models (o1/o3/o4, gpt-5+) reject `max_tokens` (they want
    // `max_completion_tokens`) and reject non-default `temperature`. Older and
    // local providers accept only the legacy shape. Start legacy, and if the
    // provider complains about a parameter, adapt and retry — every model works.
    let useNewTokens = false;
    let useTemp = true;
    const maxTokens = opts.maxTokens ?? 4000;
    const temperature = opts.temperature ?? 0.85;
    let lastErr = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const body: Record<string, unknown> = { messages };
      if (useNewTokens) body.max_completion_tokens = maxTokens;
      else body.max_tokens = maxTokens;
      if (useTemp) body.temperature = temperature;
      const { status, text } = await postChat(baseUrl, apiKey, model, body, ctrl.signal);
      if (status >= 200 && status < 300) {
        let json: { choices?: Array<{ message?: { content?: string } }> } = {};
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          throw new Error('AI provider returned an unreadable response. Try again.');
        }
        const content = json.choices?.[0]?.message?.content?.trim() ?? '';
        if (!content) throw new Error('AI provider returned an empty response. Try again — or switch to a non-reasoning model for drafting.');
        return { text: content, model };
      }
      lastErr = humanizeProviderError(status, text, model);
      const low = text.toLowerCase();
      // Adapt to what the provider asked for and retry; otherwise fail fast.
      if (status === 400 && !useNewTokens && low.includes('max_completion_tokens')) {
        useNewTokens = true;
        continue;
      }
      if (status === 400 && useTemp && low.includes('temperature') && (low.includes('unsupported') || low.includes('only') || low.includes('must be'))) {
        useTemp = false;
        continue;
      }
      throw new Error(lastErr);
    }
    throw new Error(lastErr || 'AI provider kept rejecting the request. Try a different model in Settings → AI.');
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (isLocalProvider(baseUrl) && (e as Error)?.name !== 'AbortError') {
      throw new Error(
        `Cannot reach a local AI at ${baseUrl}. Is Ollama running? Start it with \`ollama serve\`, pull a model (\`ollama pull ${model}\`), then try again. (Original: ${msg})`,
      );
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export async function enhanceChapterBody(args: {
  bookTitle: string; genre: string; kind: string; premise: string; style: string;
  chapterNo: number; chapterTitle: string; chapterSummary: string;
  prevSummary: string; currentBody: string; targetWords: number;
}): Promise<string> {
  const { text } = await chatComplete(
    [
      {
        role: 'system',
        content: `You are a world-class ghostwriter forging a publishable book chapter. Write complete, immersive, publishable prose — never meta-commentary, never outlines, never placeholders. Match the book's genre, tone, and continuity exactly.${styleDirective(args.style) ? ' ' + styleDirective(args.style) : ''}${args.kind === 'nonfiction' ? ' ' + NF_HONESTY : ''} No preamble like "Here is your chapter". Start directly with the chapter prose. Use paragraph breaks (blank lines between paragraphs).`,
      },
      {
        role: 'user',
        content: `BOOK: "${args.bookTitle}" (${args.genre}, ${args.kind})
PREMISE: ${args.premise}
CHAPTER ${args.chapterNo}: "${args.chapterTitle}"
THIS CHAPTER MUST COVER: ${args.chapterSummary}
${args.prevSummary ? `PREVIOUS CHAPTER ENDED WITH: ${args.prevSummary}` : 'This is the opening chapter — hook hard.'}

CURRENT DRAFT TO REWRITE, EXPAND AND ELEVATE INTO A COMPLETE CHAPTER OF ~${args.targetWords} WORDS:
---
${args.currentBody.slice(0, 12000)}
---

Rewrite this into a complete, publishable chapter of approximately ${args.targetWords} words. Keep every plot beat from "THIS CHAPTER MUST COVER", deepen characters, add sensory detail and strong dialogue, and end with momentum into the next chapter. Output ONLY the chapter prose.`,
      },
    ],
    { maxTokens: Math.min(16000, Math.round(args.targetWords * 2.4)), temperature: 0.85, timeoutMs: 300000 },
  );
  return text;
}

export async function studioChat(
  bookBrief: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ text: string; model: string }> {
  return chatComplete(
    [
      {
        role: 'system',
        content: `You are Ghostforge's in-house ghostwriter: a world-class novelist and nonfiction writer helping an author develop their book. Be direct, useful, and specific. When asked to write prose, write complete publishable prose — never outlines or placeholders unless asked. When asked for advice, structure, or ideas, answer crisply.${bookBrief ? '\n\n' + bookBrief : ''}`,
      },
      ...messages,
    ],
    { maxTokens: 4000, temperature: 0.8, timeoutMs: 180000 },
  );
}

export async function draftChapterBody(args: {
  bookBrief: string; kind: string; chapterNo: number; chapterTitle: string; chapterSummary: string;
  prevTail: string; prompt: string; targetWords: number;
}): Promise<{ text: string; model: string }> {
  const r = await chatComplete(
    [
      {
        role: 'system',
        content: `You are a world-class ghostwriter forging a publishable book chapter. Write complete, immersive, publishable prose — never meta-commentary, never outlines, never placeholders. No preamble like "Here is your chapter". Start directly with the chapter prose. Use paragraph breaks (blank lines between paragraphs).${args.kind === 'nonfiction' ? ' ' + NF_HONESTY : ''}`,
      },
      {
        role: 'user',
        content: `${args.bookBrief ? args.bookBrief + '\n\n' : ''}CHAPTER ${args.chapterNo}: "${args.chapterTitle}"${args.chapterSummary ? `\nTHIS CHAPTER MUST COVER: ${args.chapterSummary}` : ''}${args.prevTail ? `\n\nPREVIOUS CHAPTER ENDED WITH:\n---\n${args.prevTail}\n---` : ''}\n\nAUTHOR'S DIRECTION: ${args.prompt}\n\nWrite the complete chapter in approximately ${args.targetWords} words. Output ONLY the chapter prose.`,
      },
    ],
    { maxTokens: Math.min(16000, Math.round(args.targetWords * 2.4)), temperature: 0.85, timeoutMs: 300000 },
  );
  return { text: r.text, model: r.model };
}

const NF_HONESTY = `NONFICTION HONESTY — ABSOLUTE RULES: Never invent, fabricate, or embellish any fact, statistic, date, quote, study, person, event, or source. Only state claims supported by real knowledge; if unsure about a detail, either omit it or mark it [VERIFY] instead of asserting it. Never invent citations. End the chapter with a "Sources to check" list naming the real works, studies, or records behind its key claims so the author can verify them.`;

const FICTION_PLANNER = `You are a story architect designing a complete, original book plan. Output ONLY valid JSON — no markdown fences, no commentary, no extra keys. Design a coherent arc across every chapter: specific names, places, and events tied to THIS book's premise — never generic filler. Match this schema exactly: {"logline": string, "characters": [{"name": string, "role": string, "description": string, "arc": string}], "beats": [string], "chapters": [{"title": string, "summary": string}]}`;

const NF_PLANNER = `You are a nonfiction architect designing a complete book plan. Output ONLY valid JSON — no markdown fences, no commentary, no extra keys. ABSOLUTE RULE: never invent facts, statistics, quotes, studies, people, or events — plan structure only. Where a chapter will need evidence, name the KIND of source required (e.g. "cite a peer-reviewed study on habit formation") rather than inventing one. Match this schema exactly: {"logline": string, "thesis": string, "claims": [string], "chapters": [{"title": string, "summary": string}], "characters": [], "beats": []}`;

export type PlanDraft = {
  logline: string; thesis: string; claims: string[]; beats: string[];
  characters: Array<{ name: string; role: string; description: string; arc: string }>;
  chapters: Array<{ title: string; summary: string }>;
};

export async function draftBookPlan(args: {
  kind: string; title: string; genre: string; audience: string; tone: string; style: string;
  pov: string; tense: string; premise: string; numChapters: number;
}): Promise<PlanDraft> {
  const fiction = args.kind === 'fiction';
  const spec = `BOOK: "${args.title}" (${args.genre}, ${args.kind})${args.audience ? `\nAUDIENCE: ${args.audience}` : ''}${args.tone ? `\nTONE: ${args.tone}` : ''}${args.style ? `\nSTYLE LIKE: ${args.style}` : ''}${args.kind === 'fiction' ? `\nPOV: ${args.pov} · TENSE: ${args.tense}` : ''}\nPREMISE: ${args.premise || '(none — invent a fitting premise from the title and genre)'}\n\nPlan ${args.numChapters} chapters.` + (fiction
    ? `\nDeliver: logline (1-2 sentences); 4-8 characters with names, roles, descriptions, and arcs; 7-10 plot beats from setup through resolution; and ${args.numChapters} chapters, each with a title and a 2-4 sentence summary that chains into one coherent arc.`
    : `\nDeliver: logline (1-2 sentences); a one-paragraph thesis; 5-10 core claims the book will defend (each phrased as a claim plus the kind of source needed to prove it); and ${args.numChapters} chapters, each with a title and a 2-4 sentence summary naming which claim(s) it proves and what evidence to consult. No characters, no beats (return empty arrays).`);
  const { text } = await chatComplete(
    [
      { role: 'system', content: fiction ? FICTION_PLANNER : NF_PLANNER },
      { role: 'user', content: spec },
    ],
    { maxTokens: 16000, temperature: 0.7, timeoutMs: 300000 },
  );
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error('AI planner returned invalid JSON. Try again.');
  }
  const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const strArr = (v: unknown, max: number): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean) : []);
  const chapters = (Array.isArray(j.chapters) ? j.chapters : [])
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return { title: str(o.title, 200) || 'Untitled Chapter', summary: str(o.summary, 2000) };
    })
    .filter((c) => c.summary)
    .slice(0, 60);
  if (!chapters.length) throw new Error('AI planner returned no chapters. Try again.');
  const characters = (Array.isArray(j.characters) ? j.characters : [])
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return { name: str(o.name, 200), role: str(o.role, 200), description: str(o.description, 4000), arc: str(o.arc, 4000) };
    })
    .filter((c) => c.name)
    .slice(0, 30);
  return {
    logline: str(j.logline, 1000),
    thesis: str(j.thesis, 4000),
    claims: strArr(j.claims, 2000).slice(0, 60),
    beats: strArr(j.beats, 2000).slice(0, 60),
    characters,
    chapters,
  };
}

export type ReviewFinding = {
  severity: 'error' | 'warning' | 'suggestion'; category: 'accuracy' | 'syntax' | 'cadence';
  quote: string; issue: string; suggestion: string; source: 'ai' | 'offline';
};

// Free mechanical pass — always runs, catches what the model might skim past.
export function offlineLint(body: string): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  const ctx = (i: number, len: number): string => {
    const s = Math.max(0, i - 40);
    return (s > 0 ? '…' : '') + body.slice(s, i + len + 40).replace(/\s+/g, ' ').trim() + '…';
  };
  let n = 0;
  for (const m of body.matchAll(/\b([A-Za-z]{2,})(\s+)\1\b/gi)) {
    if (n++ >= 6) break;
    out.push({ severity: 'suggestion', category: 'syntax', quote: ctx(m.index ?? 0, m[0].length), issue: `Repeated word "${m[1]}".`, suggestion: `Delete one "${m[1]}".`, source: 'offline' });
  }
  n = 0;
  for (const m of body.matchAll(/([.,!?;:])\1+/g)) {
    if (n++ >= 6) break;
    out.push({ severity: 'suggestion', category: 'syntax', quote: ctx(m.index ?? 0, m[0].length), issue: `Repeated punctuation "${m[0]}".`, suggestion: `Replace "${m[0]}" with a single "${m[1]}".`, source: 'offline' });
  }
  n = 0;
  for (const s of body.split(/(?<=[.!?])\s+/)) {
    const words = s.trim().split(/\s+/).filter(Boolean).length;
    if (words <= 60) continue;
    if (n++ >= 5) break;
    out.push({ severity: 'suggestion', category: 'cadence', quote: s.trim().slice(0, 90) + '…', issue: `A ${words}-word sentence — readers lose the thread.`, suggestion: 'Split it into two or three shorter sentences with varied length.', source: 'offline' });
  }
  return out.slice(0, 15);
}

const REVIEWER_SYS = `You are a meticulous book editor doing a revision pass on one chapter. Output ONLY valid JSON — no markdown fences, no commentary, no extra keys. Match this schema exactly: {"score": number 0-100, "summary": string, "findings": [{"severity": "error"|"warning"|"suggestion", "category": "accuracy"|"syntax"|"cadence", "quote": string, "issue": string, "suggestion": string}]}. Review three dimensions: ACCURACY — continuity and internal consistency (names, facts, timeline, promises vs payoff; does it honor the chapter summary and the previous chapter?); SYNTAX — grammar, punctuation, word choice, typos, awkward phrasing; CADENCE — rhythm, sentence variety, paragraph flow, pacing (rushed or dragging?). Rules: quote = the exact shortest excerpt showing the problem (max ~25 words); issue = what is wrong in one sentence; suggestion = the concrete fix (replacement wording where short, else precise direction). Severity: error = must fix (contradicts the book, ungrammatical, unreadable); warning = should fix (inconsistency risk, clunky, pacing drag); suggestion = polish. At most 25 findings, ordered worst-first. score = overall publish-readiness (90+ nearly clean, 70s needs a pass, below 60 needs real work). summary = 2-3 sentences: verdict plus top priority.`;
const REVIEWER_NF = ` NONFICTION RULES: treat every factual claim (fact, statistic, date, quote, study, person, event) as guilty until proven innocent — flag claims that need a checkable source as accuracy warnings whose suggestion names the KIND of source needed and marks the spot [VERIFY]. Never invent the "correct" fact yourself.`;

export type ChapterReviewResult = { score: number; summary: string; findings: ReviewFinding[] };

export async function reviewChapterBody(args: {
  kind: string; bookTitle: string; genre: string; premise: string;
  chapterNo: number; chapterCount: number; chapterTitle: string; chapterSummary: string;
  prevSummary: string; cast: string[]; body: string;
}): Promise<{ review: ChapterReviewResult; model: string }> {
  const nf = args.kind === 'nonfiction';
  const spec = `BOOK: "${args.bookTitle}" (${args.genre}, ${args.kind})\nPREMISE: ${args.premise || '(none)'}\n`
    + (args.cast.length ? `CAST: ${args.cast.join('; ')}\n` : '')
    + `REVIEWING: Chapter ${args.chapterNo} of ${args.chapterCount} — "${args.chapterTitle}"\nCHAPTER PLAN: ${args.chapterSummary || '(none)'}\n`
    + (args.prevSummary ? `PREVIOUS CHAPTER ENDED: ${args.prevSummary}\n` : '')
    + `\nCHAPTER TEXT:\n${args.body}`;
  const { text, model } = await chatComplete(
    [
      { role: 'system', content: REVIEWER_SYS + (nf ? REVIEWER_NF : '') },
      { role: 'user', content: spec },
    ],
    { maxTokens: 8000, temperature: 0.2, timeoutMs: 300000 },
  );
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error('AI reviewer returned an invalid response. Try again.');
  }
  const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const sev = (v: unknown): ReviewFinding['severity'] => (v === 'error' || v === 'warning' || v === 'suggestion' ? v : 'suggestion');
  const cat = (v: unknown): ReviewFinding['category'] => (v === 'accuracy' || v === 'syntax' || v === 'cadence' ? v : 'syntax');
  const score = typeof j.score === 'number' && Number.isFinite(j.score) ? Math.max(0, Math.min(100, Math.round(j.score))) : 0;
  const findings = (Array.isArray(j.findings) ? j.findings : [])
    .map((f) => {
      const o = (f ?? {}) as Record<string, unknown>;
      return { severity: sev(o.severity), category: cat(o.category), quote: str(o.quote, 300), issue: str(o.issue, 1000), suggestion: str(o.suggestion, 1000), source: 'ai' as const };
    })
    .filter((f) => f.issue)
    .slice(0, 25);
  return { review: { score, summary: str(j.summary, 2000), findings }, model };
}
