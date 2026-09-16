import { pick, chance, int, countWords, type Rng } from './rng.js';
import type { Family } from './names.js';
import { matchStyle } from './styles.js';

// ---------- verb conjugation (past/present × 1st/3rd person) ----------
const IRR: Record<string, string> = {
  be: 'was', have: 'had', do: 'did', go: 'went', say: 'said', make: 'made', take: 'took',
  come: 'came', see: 'saw', know: 'knew', get: 'got', run: 'ran', find: 'found', feel: 'felt',
  leave: 'left', stand: 'stood', understand: 'understood', think: 'thought', tell: 'told',
  give: 'gave', write: 'wrote', speak: 'spoke', break: 'broke', choose: 'chose', fall: 'fell',
  draw: 'drew', fly: 'flew', grow: 'grew', hide: 'hid', shake: 'shook', steal: 'stole',
  swear: 'swore', tear: 'tore', wear: 'wore', ride: 'rode', drive: 'drove', rise: 'rose',
  shine: 'shone', shoot: 'shot', sing: 'sang', sink: 'sank', sit: 'sat', win: 'won',
  begin: 'began', drink: 'drank', eat: 'ate', forget: 'forgot', freeze: 'froze',
  lie: 'lay', lay: 'laid', set: 'set', put: 'put', cut: 'cut', hit: 'hit', shut: 'shut',
  send: 'sent', spend: 'spent', build: 'built', lend: 'lent', lose: 'lost', sleep: 'slept',
  sweep: 'swept', creep: 'crept', keep: 'kept', meet: 'met', bleed: 'bled', feed: 'fed',
  hang: 'hung', hold: 'held', ring: 'rang', spin: 'spun', strike: 'struck', grin: 'grinned',
  grab: 'grabbed', stop: 'stopped', prefer: 'preferred', wake: 'woke', let: 'let', split: 'split',
  teach: 'taught', squat: 'squatted', nod: 'nodded', step: 'stepped', throw: 'threw', read: 'read',
  burst: 'burst', hear: 'heard', stir: 'stirred',
};
function past(base: string): string {
  if (IRR[base]) return IRR[base];
  if (base.endsWith('e')) return base + 'd';
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ied';
  return base + 'ed';
}
function third(base: string, explicit?: string): string {
  if (explicit) return explicit;
  if (base === 'be') return 'is';
  if (base === 'have') return 'has';
  if (base === 'do') return 'does';
  if (/(s|sh|ch|x|z|o)$/.test(base)) return base + 'es';
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
  return base + 's';
}

export type Ctx = {
  N: string; s: string; S: string; o: string; p: string; r: string;
  hero: string; A: string; V: string; M: string;
  place: string; place2: string; object: string; goal: string;
  secret: string; hook: string; tense: 'past' | 'present'; pov1: boolean;
};

function cap1(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function render(tpl: string, c: Ctx): string {
  let s = tpl
    .replace(/\{v:([a-z]+)(?::([a-z]+))?\}/g, (_, b: string, t: string) =>
      c.tense === 'past' ? past(b) : b === 'be' ? (c.pov1 ? 'am' : 'is') : c.pov1 ? b : third(b, t))
    .replace(/\{w:([a-z]+)(?::([a-z]+))?\}/g, (_, b: string, t: string) =>
      c.tense === 'past' ? past(b) : third(b, t))
    .replace(/\{u:([a-z]+)\}/g, (_, b: string) => (c.tense === 'past' ? past(b) : b))
    .replace(/\{b:([a-z]+)\}/g, (_, b: string) => b);
  const map: Record<string, string> = {
    '{N}': c.N, '{s}': c.s, '{S}': c.S, '{o}': c.o, '{p}': c.p,
    '{hero}': c.hero, '{A}': c.A, '{V}': c.V, '{M}': c.M,
    '{place}': c.place, '{place2}': c.place2, '{object}': c.object, '{goal}': c.goal,
    '{secret}': c.secret, '{hook}': c.hook,
    '{is}': c.tense === 'past' ? 'was' : c.pov1 ? 'am' : 'is',
    '{Is}': c.tense === 'past' ? 'Was' : c.pov1 ? 'Am' : 'Is',
    '{is3}': c.tense === 'past' ? 'was' : 'is',
    '{are}': c.tense === 'past' ? 'were' : 'are',
    '{has}': c.tense === 'past' ? 'had' : c.pov1 ? 'have' : 'has',
    '{has3}': c.tense === 'past' ? 'had' : 'has',
    '{does}': c.tense === 'past' ? 'did' : c.pov1 ? 'do' : 'does',
    '{have}': c.tense === 'past' ? 'had' : 'have',
    '{does3}': c.tense === 'past' ? 'did' : 'does',
    '{G}': cap1(c.goal),
    '{O}': cap1(c.object),
    '{H}': cap1(c.hook),
    '{Pc}': cap1(c.place),
    '{r}': c.r,
  };
  for (const [k, v] of Object.entries(map)) s = s.split(k).join(v);
  return s;
}

// ---------- template pools ----------
const OPENERS = [
  `{N} {v:know} something {is3} wrong the moment {s} {v:step} into {place}. The air itself {is3} holding its breath.`,
  `The trouble {w:start} — as trouble always {does3} — with {object}. {S} {v:stare} at it for a long moment, wishing {s} had never come to {place}.`,
  `"Don't move," {A} {w:whisper}, and {N} {v:freeze} mid-step, one hand already reaching for what {s} {v:hope} {s} wouldn't need.`,
  `Nobody in {place} {w:remember} the last time the bells {u:ring} at dawn. {N} {v:count} them anyway — seven — and {v:feel} each one land like a stone in {p} chest.`,
  `{S} {v:wake} to the smell of smoke and the certainty that {hook}. {N} {v:throw} back the covers and {v:reach} for {p} boots.`,
  `Three days. That {is3} all the time {N} {v:have} left, and {place} {is3} already closing in like a fist.`,
  `The letter {w:arrive} at dusk, unsigned, smelling faintly of rain. {N} {v:read} it twice, then {v:fold} it into {p} pocket next to {object}.`,
  `"You came," {A} {w:say}, stepping out of the shadows of {place}. "I am honestly surprised — and a little afraid for you."`,
  `{N} {v:tell} {r} the same lie every morning: today {is3} the day everything {w:change}. This morning, for the first time, it {is3} true.`,
  `Thunder {w:roll} over {place2}, low and patient, and {N} {v:understand} with sudden clarity that there {is3} no going back.`,
  `Every scar {N} {v:carry} {has3} a story. The newest one — earned last night in {place} — {is3} the only one that {w:matter} now.`,
  `{H} — that {is3} what {M} always {w:say}. Standing in the ruins of {place}, {N} finally {v:believe} it.`,
];
const MISSIONS = [
  `The task ahead {is3} brutally simple, which {is3} exactly why it {w:terrify} {o}: {mission}. No backup. No second chances.`,
  `{S} {v:turn} the plan over in {p} mind until its edges {u:wear} smooth: {mission}. Simple on paper. Suicide in practice.`,
  `{A} {w:lay} it out in a whisper: {mission}. {N} {v:nod} slowly, already counting the ways it could go wrong.`,
];
const SETTING = [
  `{Pc} {w:stretch} out before {o} in layers of shadow and lamplight, every window a watching eye. Somewhere below, water {w:slap} against stone, steady as a pulse. {N} {v:pull} {p} coat tighter and {v:keep} walking.`,
  `The light in {place} {w:fall} wrong — too gold, too thick, like honey poured over everything it {w:touch}. Dust {w:hang} in the beams. {N} {v:watch} it drift and {v:try} to ignore the weight of {object} in {p} pack.`,
  `Rain {w:hammer} the rooftops of {place}, turning the streets to black mirrors. {N} {v:splash} through them, {p} reflection breaking and reforming with every step — a stranger wearing {p} face.`,
  `Morning {w:creep} over {place2} in shades of ash and rose. Fires {u:crackle} in a dozen hearths. The smell of bread and iron {w:mix} in the air, and for one stolen moment {N} {v:allow} {r} to feel almost safe.`,
  `Silence {w:settle} over {place} like snow — the wrong kind of silence, the kind with something underneath it. {N} {v:slow} {p} breathing and {v:listen}. There. Footsteps. Then nothing. Then footsteps again, closer.`,
  `Heat {w:shimmer} off the stones of {place}, and the whole world {w:smell} of dust and hot metal. {N} {v:wipe} sweat from {p} brow and {v:squat} in the thin shade, studying the ground the way {M} taught {o} to study people.`,
];
const ACTION = [
  `{N} {v:move} before {s} {v:think} — shoulder down, weight forward, straight through the door. Wood {w:splinter}. Someone {w:shout}. {O} {is3} there, exactly where {A} {w:promise} it would be, and {N} {v:snatch} it with hands that {u:refuse} to shake.`,
  `{N} {v:move} before {s} {v:think} — shoulder down, weight forward. {S} {v:come} up swinging, and the second man {w:drop} before he {w:know} what {w:hit} him. Adrenaline {w:burn} clean through the fear.`,
  `{A} {w:grab} {p} sleeve. "This way — now." They {u:run} through the dark of {place}, breath ragged, the shouting behind them swelling and fading like a tide. {N} {v:risk} one glance back and immediately {v:wish} {s} hadn't.`,
  `Time {w:slow} the way it always {does3} when everything {w:matter}. {N} {v:count} heartbeats — one, two, three — then {v:act}. Later {s} would barely remember the details, only the sound of {p} own breathing and the strange, cold calm at the center of it.`,
  `The lock {w:give} with a click {N} {v:feel} more than {s} {v:hear}. Inside: darkness, dust, and the shape of {object} waiting like a held breath. "Got you," {s} {v:breathe}, and the words {w:hang} there, half prayer, half dare.`,
  `"Down!" {A} {w:scream}, and {N} {v:hit} the floor as the world above {o} {w:explode} into noise and heat. Plaster {w:rain} down. {S} {v:cover} {p} head, {v:taste} blood and smoke, and {v:laugh} — actually {v:laugh} — because {s} {is} still alive.`,
  `{N} {v:run} the rooftops of {place} the way other people {u:walk} hallways — no hesitation, no looking down. The gap between the buildings {w:yawn} black below. {S} {v:leap}, {v:catch} the far ledge with scraped palms, and {v:haul} {r} over as the shutters {w:burst} open behind {o}.`,
  `Steel {w:ring} on steel. {N} {v:parry}, {v:spin}, {v:strike} — every lesson {M} ever {w:drill} into {o} surfacing at once. "Is that all?" {V} {w:sneer}, circling. {S} {v:grin} through split lips. "I am just getting warm."`,
];
const DIALOGUE = [
  `"You don't understand what you're asking," {A} {w:say}, voice low. {N} {v:meet} {A}'s eyes without flinching. "Then explain it to me. Slowly. Because I am doing this with or without you." A long silence. Then: "Fine. But when it goes wrong — and it will — remember I warned you."`,
  `"Tell me about {secret}," {N} {v:say}. The color {w:drain} from {A}'s face. "Where did you hear that name — that phrase? Who told you?" "{M} did. Right before everything burned." The silence that {w:follow} {is3} worse than shouting.`,
  `"We {u:have} two choices," {M} {w:say}, spreading weathered hands. "The smart one, and the one where we {u:live} with ourselves after." {N} {v:study} the map of {place} one more time. "When {has3} smart ever worked for us?" Despite everything, {M} {w:smile}. "That's my line."`,
  `"I know what you are," {V} {w:say} pleasantly, examining his nails. "The question is whether you do." {N} {v:feel} ice slide down {p} spine but {v:keep} {p} voice level. "I am the person who's going to stop you. That's all you need to know." {V} {w:laugh} — genuinely delighted. "Oh, good. I am so tired of boring heroes."`,
  `"Promise me something," {A} {w:whisper} as they {u:crouch} in the dark. "Anything." "When this is over — win or lose — tell the truth about what happened here. All of it." {N} {v:take} {A}'s hand. "I swear it. On {object} itself."`,
  `"You've changed," {M} {w:observe}, and it {is3} not a compliment. {N} {v:look} away, toward the lights of {place2}. "The world changed first. I am just catching up." "Just make sure there's something left of you when it's done." That {w:land} harder than any blow.`,
];
const REFLECT = [
  `{S} {v:think} about what {M} once told {o}: that courage {is3} not the absence of fear but the refusal to let fear {b:drive}. {N} {v:turn} the words over like a coin, checking both sides for the lie. There {is3} no lie. There {is3} only the next step, and the next, and the next.`,
  `Somewhere along the way, the quest to {goal} {w:stop} being a mission and {w:start} being the only thing {N} {v:know} how to want. {S} {v:wonder} what {s} would even be without it — probably someone happier, probably someone smaller. {S} {v:decide} {s} {v:prefer} the wanting.`,
  `{N} {v:remember} {place} the way it always {is3} — or the way {s} {v:need} it to have been — and the memory {w:ache} like an old wound in cold weather. Grief, {s} {v:realize}, {is3} just love with nowhere left to go. {S} {v:give} it somewhere to go: forward.`,
  `Funny, the things the mind {w:offer} up at a time like this. Not the grand moments — not {object}, not the prophecy, not the war. Just small things. Bread. Laughter. {A}'s terrible singing. {N} {v:hold} them close like candles in wind. They {are} the whole reason. They {have} always been the reason.`,
  `There {is3} a version of this story where {N} {v:walk} away. {S} {v:see} it clearly: the quiet life, the unscarred hands, the sleep without dreams. {S} {v:let} {r} want it for exactly three seconds. Then {s} {v:pick} up {object} and {v:walk} toward the fire instead.`,
];
const SENSORY: Record<Family, string[]> = [
  'the iron tang of blood and rain', 'woodsmoke and old parchment', 'cold stone and candle wax',
].length ? {
  fantasy: ['woodsmoke and old parchment', 'cold stone and candle wax', 'rain on hot iron', 'pine resin and horse sweat', 'the iron tang of blood and rain'],
  scifi: ['ozone and recycled air', 'hot circuitry and cold metal', 'engine grease and burnt coffee', 'sterile medbay and copper fear-sweat', 'ion discharge like a struck match'],
  romance: ['fresh bread and lavender', 'salt air and sunscreen', 'old books and bergamot tea', 'rain on warm pavement', 'vanilla and cut grass'],
  thriller: ['gun oil and cheap coffee', 'wet concrete and exhaust', 'adrenaline copper on the tongue', 'leather and jet fuel', 'rain on hot asphalt'],
  mystery: ['dust and lemon polish', 'pipe smoke and damp wool', 'old paper and Earl Grey', 'wet leaves and turned earth', 'gaslight and beeswax'],
  horror: ['mildew and something sweet underneath', 'copper and rot', 'damp earth and candle smoke', 'stale air and old sweat', 'bleach failing to cover something worse'],
  historical: ['horse and harness leather', 'woodsmoke and boiled wool', 'ink and pipe tobacco', 'fresh-turned earth and rain', 'tallow and sea salt'],
  modern: ['espresso and rain', 'cut grass and gasoline', 'old paperbacks and dust', 'salt wind off the water', 'fresh paint and possibility'],
} : ({} as Record<Family, string[]>);

const TWISTS: Record<string, string[]> = {
  setup: [
    `But something {is3} off — a detail {N} can't quite {v:place}. A face in the crowd at {place} that {w:vanish} when {s} {v:look} twice. A wrongness, humming just below hearing.`,
    `{S} {v:notice} it the way you {u:notice} a skipped heartbeat: small, and then everything after it {is3} different. In {place}, someone {w:watch}. Someone {w:wait}.`,
  ],
  inciting: [
    `Everything {w:change} in a single breath. One moment the world {is3} ordinary; the next, {object} {is3} burning cold in {p} hands and nothing will ever be ordinary again.`,
    `The message {w:arrive} like a slap: {hook}. {N} {v:read} it three times, hoping the words will rearrange themselves into something survivable. They {u:refuse}.`,
  ],
  rising: [
    `The plan {w:survive} exactly eleven minutes. Then {A} {w:burst} through the door, wild-eyed: "They moved it. {O} isn't in {place} anymore." {N} {v:close} {p} eyes. Of course it isn't.`,
    `A complication {N} never {v:see} coming: {V} already {w:know}. Every step, every whisper, every careful secret — known. {S} {v:feel} the ground tilt under {p} feet and {v:force} {r} to keep standing.`,
  ],
  midpoint: [
    `And then the truth {w:detonate} like a bomb in a quiet room: everything {N} {v:believe} about {secret} {is3} a lie. {A}'s face {w:tell} {o} it {is3} true before a single word {w:confirm} it. The war {N} {v:think} {s} {v:fight} {is3} not the war at all.`,
    `{M} {is3} gone. No note, no body, no explanation — just an empty chair and {object} sitting where {s} once {w:sit}. {N} {v:stare} at it until {p} vision {w:blur}. The rules just {u:change}, and nobody {w:tell} {o} the new ones.`,
  ],
  escalation: [
    `The cost {w:rise} with every hour. {Pc} {is3} burning — actually burning, smoke staining the sky — and {N} {v:understand} that winning and surviving might be two different things now.`,
    `"They took {A}," the messenger {w:gasp}, collapsing. Just like that, the mission {w:stop} being about the quest to {goal}. It {is3} about one person, one friend, one debt {N} {v:refuse} to leave unpaid.`,
  ],
  darknight: [
    `In the darkest hour, {N} {v:sit} alone in the ruins of {place} and {v:count} everything lost. The list {is3} long. The hope {is3} thin. And yet — and yet — {p} hand {w:close} around {object} one more time. One more try. Always one more try.`,
    `Defeated. Broken. {V} {w:stand} over {o}, victorious, and {w:offer} the killing words like a gift: "Give up." {N} {v:look} up through blood and ash — and {v:smile}. Because {s} finally {v:see} it. The flaw. The one narrow crack in the armor. Give up? Never.`,
  ],
  climax: [
    `This {is3} it. Everything {w:narrow} to this single moment in {place}: {N} and {V}, and {object} hanging in the balance between them. No more plans. No more running. Just the truth, the courage, and whatever comes next.`,
    `With the last of {p} strength, {N} {v:do} the one thing nobody — not {A}, not {M}, not even {V} — {w:expect}. The impossible thing. The thing that {w:change} everything, forever, starting now.`,
  ],
};

const CLOSERS_HOOK = [
  `And somewhere in the dark beyond {place}, something ancient {w:stir} — and {w:turn} its attention toward {o}.`,
  `{N} {v:sleep} badly that night, and {v:wake} to find {object} humming with cold light. Whatever {w:come} next, it {w:start} now.`,
  `The last thing {s} {v:hear} before sleep {w:take} {o} {is3} {A}'s voice, very small: "It's already begun, hasn't it?" Yes. God help them all, yes.`,
  `Behind {o}, unheard, a door {w:close} softly in {place}. Ahead, the road {w:split} — and both paths {u:disappear} into shadow. {N} {v:choose} without hesitation. There {is3} no other way to choose anymore.`,
  `Morning would bring answers. {N} {v:know} that the way {s} {v:know} {p} own name. What {s} {v:fear} — what {s} truly {v:fear} — {are} the questions that would come with them.`,
];
const CLOSERS_END = [
  `{G} — done. The words {u:feel} strange in {p} mouth, too small for what they {u:hold}. {N} {v:stand} in the quiet of {place} and {v:let} the peace {b:settle} over {o} like something {s} might finally be allowed to keep.`,
  `Later, they would ask what it {w:feel} like. {N} would never find the right words. Only this: that {hook}, and that love — stubborn, unreasonable love — {w:turn} out to be the whole of it.`,
  `{A} {w:find} {o} at dawn, sitting among the ruins and the new green shoots pushing through them. "It's over," {A} {w:say}. {N} {v:smile} — tired, whole, alive. "No," {s} {v:say}. "It's just beginning. The good part, this time."`,
];

export type Act = 'setup' | 'inciting' | 'rising' | 'midpoint' | 'escalation' | 'darknight' | 'climax';
export function actOf(idx: number, total: number): Act {
  const p = total <= 1 ? 1 : idx / (total - 1);
  if (p < 0.1) return 'setup';
  if (p < 0.24) return 'inciting';
  if (p < 0.45) return 'rising';
  if (p < 0.58) return 'midpoint';
  if (p < 0.78) return 'escalation';
  if (p < 0.9) return 'darknight';
  return 'climax';
}

export type FictionCtxInput = {
  r: Rng; fam: Family; heroFirst: string; heroFull: string; heroFemale: boolean;
  allyFirst: string; villainDisplay: string; mentorFirst: string;
  place: string; place2: string; object: string; goal: string;
  secret: string; hook: string; tense: 'past' | 'present'; pov1: boolean; style: string;
};

export function writeFictionChapter(
  inp: FictionCtxInput, idx: number, total: number, mission: string, targetWords: number,
): string {
  const { r } = inp;
  const c: Ctx = {
    N: inp.pov1 ? 'I' : inp.heroFirst,
    s: inp.pov1 ? 'I' : inp.heroFemale ? 'she' : 'he',
    S: inp.pov1 ? 'I' : inp.heroFemale ? 'She' : 'He',
    o: inp.pov1 ? 'me' : inp.heroFemale ? 'her' : 'him',
    p: inp.pov1 ? 'my' : inp.heroFemale ? 'her' : 'his',
    r: inp.pov1 ? 'myself' : inp.heroFemale ? 'herself' : 'himself',
    hero: inp.heroFull, A: inp.allyFirst, V: inp.villainDisplay, M: inp.mentorFirst,
    place: inp.place, place2: inp.place2, object: inp.object, goal: inp.goal,
    secret: inp.secret, hook: inp.hook, tense: inp.tense, pov1: inp.pov1,
  };
  const act = actOf(idx, total);
  const isFinale = idx === total - 1;
  const paras: string[] = [];
  paras.push(render(pick(r, OPENERS), c));
  if (!isFinale || chance(r, 0.4)) {
    paras.push(render(pick(r, MISSIONS), c).replace('{mission}', mission));
  }
  paras.push(render(pick(r, SETTING), c));
  // style pack ("write like …"): sensory palette + one flavor beat per chapter
  const pack = matchStyle(inp.style);
  const sensoryPool = pack && pack.sensory.length ? pack.sensory : SENSORY[inp.fam];
  // sensory texture line woven in
  paras.push(render(`The whole of {place} {w:smell} of ${pick(r, sensoryPool)}, and {N} {v:find} the smell settling into {p} clothes, {p} hair, {p} memory — the perfume of the days when everything {w:change}.`, c));
  const usedA = new Set<number>();
  const usedD = new Set<number>();
  const usedR = new Set<number>();
  const usedS = new Set<number>();
  function fresh<T>(pool: readonly T[], used: Set<number>): T {
    if (used.size >= pool.length) used.clear();
    let i = Math.floor(r() * pool.length);
    let guard = 0;
    while (used.has(i) && guard++ < 24) i = Math.floor(r() * pool.length);
    used.add(i);
    return pool[i] as T;
  }
  const middles: Array<() => string> = [
    () => render(fresh(ACTION, usedA), c),
    () => render(fresh(DIALOGUE, usedD), c),
    () => render(fresh(REFLECT, usedR), c),
    () => render(fresh(ACTION, usedA), c),
    () => render(fresh(DIALOGUE, usedD), c),
    () => render(fresh(SETTING, usedS), c),
    () => render(fresh(REFLECT, usedR), c),
    () => render(fresh(ACTION, usedA), c),
  ];
  let mi = 0;
  paras.push(middles[mi++]());
  paras.push(middles[mi++]());
  paras.push(render(pick(r, TWISTS[act]), c));
  if (pack && pack.flavor.length) paras.push(render(pick(r, pack.flavor), c));
  paras.push(middles[mi++]());
  const extra = Math.min(60, Math.max(10, Math.ceil((targetWords - 800) / 40)));
  while (countWords(paras.join('\n\n')) < targetWords && mi < middles.length + extra) {
    paras.push(render(mi % 2 ? fresh(DIALOGUE, usedD) : fresh(ACTION, usedA), c));
    mi++;
    if (chance(r, 0.35)) paras.push(render(fresh(REFLECT, usedR), c));
  }
  paras.push(render(pick(r, isFinale ? CLOSERS_END : chance(r, 0.75) ? CLOSERS_HOOK : CLOSERS_END), c));
  return paras.join('\n\n');
}

export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// fix a typo guard: templates must not contain the accidental artifact
export function cleanBody(s: string): string {
  return s.replace(/kickìng — no\. /g, '');
}
