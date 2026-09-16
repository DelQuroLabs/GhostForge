import { hashSeed, mulberry32, pick, int, countWords } from './rng.js';
import { classify, makeCast, place, objectOf, goalOf, extractTerms, shortPremise, titleTerms } from './names.js';
import { writeFictionChapter, cleanBody, lowerFirst } from './fiction.js';
import { writeNfChapter, buildSteps } from './nonfiction.js';
import { fictionChapters, fictionCharacters, nfChapters, nfCharacters, type OutlineChapter, type CharRow } from './outline.js';
import { buildKdp } from './kdp.js';
import { matchStyle } from './styles.js';

export type ForgeInput = {
  premise: string;
  kind: 'fiction' | 'nonfiction';
  genre: string;
  audience: string;
  tone: string;
  style: string;
  pov: string;
  tense: 'Past' | 'Present';
  targetWords: number;
  penName: string;
  seed?: string;
};

export type EngineCtx = {
  kind: 'fiction' | 'nonfiction';
  fam: string;
  heroFirst: string; heroFull: string; heroFemale: boolean;
  allyFirst: string; allyFull: string; villainDisplay: string; villainFull: string; mentorFirst: string; mentorFull: string;
  place1: string; place2: string; object: string; goal: string;
  secret: string; hook: string; terms: string[];
  tense: 'past' | 'present'; pov1: boolean;
  seedNum: number; outcome: string; reader: string; tone: string; style: string;
  steps: string[];
};

export type ForgedChapter = { idx: number; title: string; summary: string; kind: string; step: string; body: string; words: number };
export type ForgedBook = {
  title: string; subtitle: string; logline: string; blurb: string;
  categories: string[]; keywords: string[];
  chapters: ForgedChapter[]; characters: CharRow[];
  totalWords: number; ctx: EngineCtx;
  cover: { bg: string; bg2: string; accent: string; ink: string; motif: string; tagline: string };
};

const BOOK_TITLE_PATTERNS_FICTION = [
  'The {T} of {P}', '{T}fall', 'The Last {T}', 'A {A} {T}', '{P} {T}', 'The {T} {V}', 'Where {T}s {W}', '{T} of {O}',
];
const BOOK_T = ['Ember', 'Thorn', 'Shadow', 'Storm', 'Cinder', 'Hollow', 'Crimson', 'Silent', 'Broken', 'Golden', 'Midnight', 'Iron', 'Ashen', 'Savage', 'Wicked'];
const BOOK_A = ['Forgotten', 'Burning', 'Silent', 'Hidden', 'Fallen', 'Crimson', 'Last', 'Secret'];

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function placeShort(p: string): string {
  return p.replace(/^(the|a) /i, '').split(' ').slice(-1)[0] as string;
}
function objectShort(o: string): string {
  return o.replace(/^(the|a|an) /i, '').split(' ').slice(-1)[0] as string;
}

function fictionBookTitle(r: ReturnType<typeof mulberry32>, terms: string[], place1: string, object: string): string {
  const tPool = titleTerms(terms);
  const fromTerm = tPool.length > 0 && r() < 0.4;
  const T = fromTerm ? cap(tPool[0] as string) : pick(r, BOOK_T);
  const pat = pick(r, fromTerm ? BOOK_TITLE_PATTERNS_FICTION.filter((p) => p !== '{T}fall' && p !== '{P} {T}' && p !== 'Where {T}s {W}') : BOOK_TITLE_PATTERNS_FICTION);
  return pat
    .replace('{T}', T).replace('{P}', placeShort(place1)).replace('{A}', pick(r, BOOK_A))
    .replace('{V}', pick(r, ['Rises', 'Falls', 'Awakens', 'Remembers', 'Burns']))
    .replace('{W}', pick(r, ['Gather', 'Fall', 'Wait', 'Return']))
    .replace('{O}', objectShort(object)).replace('{T}s', `${T}s`);
}

function outcomeOf(terms: string[], r: ReturnType<typeof mulberry32>): string {
  const t1 = terms[0] ?? 'growth';
  return pick(r, [
    `real, lasting ${t1}`, `${t1} on autopilot`, `a life built around ${t1}`,
    `mastery of ${t1} in 30 days`, `unstoppable ${t1}`,
  ]);
}

function nfBookTitle(r: ReturnType<typeof mulberry32>, terms: string[], outcome: string): { title: string; subtitle: string } {
  const T = cap(titleTerms(terms)[0] ?? terms[0] ?? 'Growth');
  const n = pick(r, [5, 6, 7, 9, 10]);
  const cands: Array<[string, string]> = [
    [`The ${T} System`, `A field guide to ${outcome}`],
    [`The ${T} Method`, `${n} small shifts that create ${outcome}`],
    [`Atomic ${T}`, `Tiny changes, ${outcome}`],
    [`The 30-Day ${T} Reset`, `From stuck to systematic — your plan for ${outcome}`],
    [`Unstoppable ${T}`, `The no-fluff system for ${outcome}`],
  ];
  const [title, subtitle] = pick(r, cands);
  return { title, subtitle };
}

function fictionBlurb(r: ReturnType<typeof mulberry32>, o: { H: string; P1: string; O: string; G: string; V: string; hook: string; genre: string }): string {
  const p1 = pick(r, [
    `${o.H} wanted a quiet life. Then ${o.O} changed everything.`,
    `In ${o.P1}, secrets don't stay buried — and ${o.H} just dug up the biggest one of all.`,
    `They say ${o.hook}. ${o.H} is about to find out the hard way.`,
  ]);
  const p2 = `To ${o.G}, ${o.H} must outwit ${o.V}, survive the ruins and revelations of ${o.P1}, and confront a truth that will shatter everything ${o.H} believed. Time is running out. The enemy is always one step ahead. And the only person ${o.H} can truly count on… is the person ${o.H} is becoming.`;
  const p3 = `A pulse-pounding ${o.genre.toLowerCase()} epic packed with twists, heart, and a finale you won't see coming. Perfect for fans of character-driven adventure who devour books in one sitting.\n\nScroll up and forge your next obsession today.`;
  return `${p1}\n\n${p2}\n\n${p3}`;
}

function nfBlurb(terms: string[], outcome: string, reader: string): string {
  const t1 = terms[0] ?? 'growth';
  const t2 = terms[1] ?? 'focus';
  return `What if ${t1} isn't a personality trait — it's a system?\n\nIf you're ${reader} and tired of advice that only works on good days, this book is your reset button. No fluff. No 4 a.m. heroics. Just a field-tested method for ${outcome} — built for real life, with real exhaustion, real chaos, and real constraints.\n\nInside you'll discover:\n• Why motivation fails (and the "inevitability" reframe that replaces it)\n• The 10-minute starter habit that makes ${t2} automatic\n• The "never miss twice" rule that survives bad weeks\n• A complete 30-day launch plan, scheduled to the day\n\nRead it in a weekend. Use it for a decade. Your future self is already grateful — start today.`;
}

const COVERS: Record<string, { bg: string; bg2: string; accent: string; ink: string; motifs: string[] }> = {
  fantasy: { bg: '#1a1033', bg2: '#3d1f5e', accent: '#f5b942', ink: '#f5efe0', motifs: ['crown', 'dragon', 'tower', 'flame'] },
  scifi: { bg: '#04121f', bg2: '#0b3550', accent: '#4de3ff', ink: '#e8fbff', motifs: ['orbit', 'signal', 'helm', 'grid'] },
  romance: { bg: '#2b0f1e', bg2: '#7a2440', accent: '#ffb3c7', ink: '#fff2f5', motifs: ['bloom', 'tide', 'key', 'letter'] },
  thriller: { bg: '#0a0a0c', bg2: '#2a0d0d', accent: '#ff4d4d', ink: '#f5f5f5', motifs: ['target', 'wire', 'eye', 'slash'] },
  mystery: { bg: '#0e1a14', bg2: '#1e3a2a', accent: '#d8c47a', ink: '#f2f0e4', motifs: ['key', 'lantern', 'eye', 'maze'] },
  horror: { bg: '#050505', bg2: '#1c1c22', accent: '#8a0303', ink: '#e8e4da', motifs: ['eye', 'door', 'thorn', 'moon'] },
  historical: { bg: '#211407', bg2: '#4a2c10', accent: '#d8a75a', ink: '#f7ecd9', motifs: ['compass', 'ship', 'seal', 'sword'] },
  modern: { bg: '#101828', bg2: '#2b3a55', accent: '#ffd166', ink: '#f6f4ee', motifs: ['path', 'sun', 'wave', 'bird'] },
  selfhelp: { bg: '#0b2e1f', bg2: '#14532d', accent: '#ffd166', ink: '#f4fff6', motifs: ['summit', 'sun', 'path', 'bloom'] },
  business: { bg: '#0a1628', bg2: '#1e3a5f', accent: '#4de3ff', ink: '#eef6ff', motifs: ['summit', 'grid', 'compass', 'bolt'] },
  memoir: { bg: '#241610', bg2: '#5b3a1e', accent: '#f0c987', ink: '#faf3e8', motifs: ['path', 'letter', 'sun', 'wave'] },
};

// Genre cover picker shared by the offline forge and the Novel Engine —
// every book gets a real palette + motif, never an empty cover.
export function coverForGenre(genre: string, kind: 'fiction' | 'nonfiction'): ForgedBook['cover'] {
  const fam = kind === 'fiction'
    ? classify(genre)
    : /memoir|biograph/i.test(genre) ? 'memoir' : /business|startup|money|financ|market|leader|entrepren/i.test(genre) ? 'business' : 'selfhelp';
  const cov = COVERS[fam] ?? (kind === 'fiction' ? COVERS.modern : COVERS.selfhelp);
  const r = mulberry32((Math.random() * 2 ** 31) | 0);
  return {
    bg: cov.bg, bg2: cov.bg2, accent: cov.accent, ink: cov.ink,
    motif: pick(r, cov.motifs),
    tagline: kind === 'fiction' ? `A ${genre} epic` : 'A Ghostforge Original',
  };
}

export function planBook(input: ForgeInput): { ctx: EngineCtx; chapters: OutlineChapter[]; characters: CharRow[]; meta: Omit<ForgedBook, 'chapters' | 'characters' | 'totalWords' | 'ctx'> } {
  const seedNum = hashSeed(`${input.premise}|${input.seed ?? 'v1'}|${input.genre}|${input.kind}|${input.penName}`);
  const r = mulberry32(seedNum);
  const terms = extractTerms(input.premise, 6);
  const tense = input.tense === 'Present' ? 'present' : 'past';
  const pov1 = /first/i.test(input.pov);
  const perChapter = 1500;
  const count = Math.max(8, Math.min(48, Math.round(input.targetWords / perChapter)));

  if (input.kind === 'fiction') {
    const fam = classify(input.genre);
    const cast = makeCast(r, fam);
    const heroFirst = cast.hero.split(' ')[0] as string;
    const allyFirst = cast.ally.split(' ')[0] as string;
    const villainDisplay = (cast.villain.split(' ').slice(-1)[0] as string);
    const mentorFirst = cast.mentor.split(' ')[0] as string;
    const place1 = place(r, fam);
    let place2 = place(r, fam);
    if (place2 === place1) place2 = place(r, fam);
    const object = objectOf(r, fam);
    const goal = goalOf(r, fam);
    const secret = pick(r, [
      `the truth about ${heroFirst}\u2019s bloodline`, `what really happened in ${place2}`,
      `why ${mentorFirst} left the order`, `the price ${villainDisplay} paid for power`,
      `who betrayed the family ten years ago`, `what ${object} actually is`,
    ]);
    const hook = tense === 'present' ? pick(r, [
      `everything ${heroFirst} knows about ${terms[0] ?? 'the world'} is about to change`,
      `${place1} is hiding something no one dares name`,
      `the war over ${object} has already begun`,
      `some doors, once opened in ${place1}, can never be closed again`,
    ]) : pick(r, [
      `everything ${heroFirst} knew about ${terms[0] ?? 'the world'} was about to change`,
      `${place1} was hiding something no one dared name`,
      `the war over ${object} had already begun`,
      `some doors, once opened in ${place1}, can never be closed again`,
    ]);
    const slots = {
      H: heroFirst, pro: cast.heroFemale ? 'she' : 'he', A: allyFirst, V: villainDisplay, M: mentorFirst,
      P1: place1, P2: place2, O: object, G: goal, S: secret, t: terms[0] ?? 'everything',
    };
    const chapters = fictionChapters(r, fam, slots, count, terms);
    const characters = fictionCharacters(r, slots, cast.hero, cast.ally, cast.villain, cast.mentor);
    const title = fictionBookTitle(r, terms, place1, object);
    const subtitle = `${/^[aeiou]/i.test(input.genre.trim()) ? 'An' : 'A'} ${input.genre} Novel`;
    const logline = `${heroFirst} must ${goal} — before ${villainDisplay} turns ${place1} to ash. ${cap(shortPremise(input.premise, 110))}`;
    const blurb = fictionBlurb(r, { H: heroFirst, P1: place1, O: object, G: goal, V: villainDisplay, hook, genre: input.genre });
    const kdp = buildKdp(r, 'fiction', input.genre, input.premise, title);
    const cov = COVERS[fam] ?? COVERS.modern;
    const ctx: EngineCtx = {
      kind: 'fiction', fam, heroFirst, heroFull: cast.hero, heroFemale: cast.heroFemale,
      allyFirst, allyFull: cast.ally, villainDisplay, villainFull: cast.villain, mentorFirst, mentorFull: cast.mentor,
      place1, place2, object, goal, secret, hook, terms, tense, pov1, seedNum,
      outcome: '', reader: input.audience, tone: input.tone, style: input.style, steps: [],
    };
    return {
      ctx, chapters, characters,
      meta: {
        title, subtitle, logline, blurb,
        categories: kdp.categories, keywords: kdp.keywords,
        cover: { bg: cov.bg, bg2: cov.bg2, accent: cov.accent, ink: cov.ink, motif: pick(r, cov.motifs), tagline: `A ${input.genre} epic` },
      },
    };
  }

  // nonfiction
  const famKey = /memoir|biograph/i.test(input.genre) ? 'memoir' : /business|startup|money|financ|market|leader|entrepren/i.test(input.genre) ? 'business' : 'selfhelp';
  const outcome = outcomeOf(terms, r);
  const steps = buildSteps(r, terms, Math.max(3, count - 4));
  const chapters = nfChapters(r, steps, outcome);
  const characters = nfCharacters(terms, outcome);
  const { title, subtitle } = nfBookTitle(r, terms, outcome);
  const logline = `A no-fluff system for ${outcome} — built for ${input.audience.toLowerCase() || 'busy people'} who are tired of advice that only works on good days.`;
  const blurb = nfBlurb(terms, outcome, input.audience || 'busy and ambitious');
  const kdp = buildKdp(r, 'nonfiction', input.genre, input.premise, title);
  const cov = COVERS[famKey] ?? COVERS.selfhelp;
  const ctx: EngineCtx = {
    kind: 'nonfiction', fam: famKey, heroFirst: '', heroFull: '', heroFemale: false,
    allyFirst: '', allyFull: '', villainDisplay: '', villainFull: '', mentorFirst: '', mentorFull: '',
    place1: '', place2: '', object: '', goal: '', secret: '', hook: '', terms, tense, pov1: false,
    seedNum, outcome, reader: input.audience || 'busy and ambitious', tone: input.tone, style: input.style, steps,
  };
  return {
    ctx, chapters, characters,
    meta: {
      title, subtitle, logline, blurb,
      categories: kdp.categories, keywords: kdp.keywords,
      cover: { bg: cov.bg, bg2: cov.bg2, accent: cov.accent, ink: cov.ink, motif: pick(r, cov.motifs), tagline: 'A Ghostforge Original' },
    },
  };
}

export function forgeBodies(ctx: EngineCtx, chapters: OutlineChapter[], perChapterWords: number): ForgedChapter[] {
  const total = chapters.length;
  return chapters.map((ch, i) => {
    const r = mulberry32((ctx.seedNum + i * 7919) >>> 0);
    let body: string;
    if (ctx.kind === 'fiction') {
      body = cleanBody(writeFictionChapter(
        {
          r, fam: ctx.fam as never, heroFirst: ctx.heroFirst, heroFull: ctx.heroFull, heroFemale: ctx.heroFemale,
          allyFirst: ctx.allyFirst, villainDisplay: ctx.villainDisplay, mentorFirst: ctx.mentorFirst,
          place: ctx.place1, place2: ctx.place2, object: ctx.object, goal: ctx.goal,
          secret: ctx.secret, hook: ctx.hook, tense: ctx.tense, pov1: ctx.pov1, style: ctx.style ?? '',
        },
        i, total, ch.summary.replace(/\s+/g, ' ').trim().replace(/\.$/, ''), perChapterWords + int(r, -150, 250),
      ));
    } else {
      body = writeNfChapter(
        { r, terms: ctx.terms, outcome: ctx.outcome, reader: ctx.reader, authorVoice: '', tone: ctx.tone, styleNf: matchStyle(ctx.style)?.nf ?? [] },
        ch.kind as never, ch.step, i + 1, Math.round(perChapterWords * 0.95), ctx.outcome,
      );
    }
    return { idx: i, title: ch.title, summary: ch.summary, kind: ch.kind, step: ch.step, body, words: countWords(body) };
  });
}

export function forgeBook(input: ForgeInput, withBodies = true): ForgedBook {
  const { ctx, chapters, characters, meta } = planBook(input);
  const perChapter = Math.max(700, Math.min(2400, Math.round(input.targetWords / chapters.length)));
  const full = withBodies
    ? forgeBodies(ctx, chapters, perChapter)
    : chapters.map((ch, i) => ({ idx: i, title: ch.title, summary: ch.summary, kind: ch.kind, step: ch.step, body: '', words: 0 }));
  return { ...meta, chapters: full, characters, totalWords: full.reduce((a, c) => a + c.words, 0), ctx };
}
