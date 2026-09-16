import { pick, type Rng } from './rng.js';
import { titleTerms } from './names.js';
import { actOf, type Act } from './fiction.js';
import { buildSteps } from './nonfiction.js';

export type OutlineChapter = { title: string; summary: string; kind: string; step: string };
export type CharRow = { name: string; role: string; description: string; arc: string };

// ---------------- fiction ----------------
type Slots = {
  H: string; pro: string; A: string; V: string; M: string;
  P1: string; P2: string; O: string; G: string; S: string; t: string;
};

const TITLE_NOUNS: Record<string, string[]> = {
  fantasy: ['Crown', 'Thorn', 'Ember', 'Storm', 'Blade', 'Prophecy', 'Ashes', 'Oath', 'Dragon', 'Veil', 'Sigil', 'Wolf'],
  scifi: ['Signal', 'Drift', 'Orbit', 'Protocol', 'Void', 'Relay', 'Cinder', 'Helix', 'Meridian', 'Echo', 'Horizon', 'Surge'],
  romance: ['Summer', 'Letter', 'Harbor', 'Promise', 'Wildflower', 'Dance', 'Homecoming', 'Sunrise', 'Kiss', 'Memory', 'Tide', 'Song'],
  thriller: ['Target', 'Zero Hour', 'Dead Drop', 'Ghost', 'Wire', 'Blackout', 'Mole', 'Countdown', 'Safehouse', 'Trigger', 'Cipher', 'Cold Trail'],
  mystery: ['Secret', 'Alibi', 'Clue', 'Widow', 'Lantern', 'Confession', 'Footprint', 'Heir', 'Masquerade', 'Riddle', 'Will', 'Stranger'],
  horror: ['Whisper', 'Hollow', 'Cellar', 'Knock', 'Shadow', 'Waking', 'Burial', 'Mirror', 'Fever', 'Haunting', 'Teeth', 'Storm'],
  historical: ['Regiment', 'Crossing', 'Harvest', 'Covenant', 'Frontier', 'Siege', 'Homecoming', 'Rebellion', 'Voyage', 'Legacy', 'Winter', 'Oath'],
  modern: ['Turning', 'Departure', 'Homecoming', 'Reckoning', 'Awakening', 'Crossroads', 'Return', 'Beginner', 'Halfway', 'Long Way', 'Second Act', 'Becoming'],
};
const TITLE_FRAMES = [
  'The {N}', '{N} of {X}', 'The Last {N}', 'A {Adj} {N}', '{N} and {Y}', 'Where {X} {Verb}', 'The {N} {Verb2}',
];
const TITLE_ADJ = ['Broken', 'Silent', 'Burning', 'Hollow', 'Golden', 'Forgotten', 'Crimson', 'Waking', 'Fallen', 'Hidden'];
const TITLE_VERB = ['Fall', 'Rise', 'Gather', 'Wait', 'Break', 'Return'];
const TITLE_VERB2 = ['Awakens', 'Falls', 'Returns', 'Burns', 'Remembers', 'Breaks'];

export function fictionTitle(r: Rng, fam: string, terms: string[], used: Set<string>): string {
  const nouns = TITLE_NOUNS[fam] ?? TITLE_NOUNS.modern;
  const tPool = titleTerms(terms);
  for (let tries = 0; tries < 30; tries++) {
    const t = tPool.length && r() < 0.25 ? cap(tPool[Math.floor(r() * tPool.length)] as string) : undefined;
    const frame = pick(r, TITLE_FRAMES);
    let title = frame
      .replace('{N}', pick(r, nouns))
      .replace('{X}', t ?? pick(r, nouns))
      .replace('{Y}', pick(r, nouns))
      .replace('{Adj}', pick(r, TITLE_ADJ))
      .replace('{Verb}', pick(r, TITLE_VERB))
      .replace('{Verb2}', pick(r, TITLE_VERB2));
    if (title === 'The Last' || title.length < 4) continue;
    if (!used.has(title)) {
      used.add(title);
      return title;
    }
  }
  const fb = `Chapter Turning Point ${used.size + 1}`;
  used.add(fb);
  return fb;
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SUMMARIES: Record<Act, string[]> = {
  setup: [
    '{H} arrives in {P1} carrying {O} and a past {pro} cannot outrun. A chance meeting with {A} hints that everything {H} believed about {t} is about to be tested.',
    'Daily life in {P1} is already fraying at the edges when {H} discovers the first clue about {S}. {M} warns {H} to leave it buried — {H} refuses.',
    '{H} tries to keep a low profile in {P1}, but {O} draws the wrong kind of attention. By nightfall, staying invisible is no longer an option.',
  ],
  inciting: [
    'Everything changes when {V} makes a move on {P1}. {H} and {A} escape with {O} — barely — and realize the quiet life is over for good.',
    'A shocking message forces {H} to act: to {G}, starting now, with no preparation and no backup. {M} provides one cryptic piece of guidance.',
    '{H} witnesses something in {P2} that cannot be unseen. The truth about {S} surfaces for the first time, and it points straight at {V}.',
  ],
  rising: [
    '{H} and {A} follow a lead to {P2}, where an uneasy alliance offers help — at a price. Trust is tested when {O} goes missing for one terrifying night.',
    'The plan to {G} hits its first wall: {V} is always one step ahead. {H} improvises a dangerous gambit that buys time but raises the stakes.',
    'Old wounds reopen as {M} reveals part of the truth about {S}. {H} pushes forward anyway, recruiting an unlikely ally in the shadows of {P1}.',
  ],
  midpoint: [
    'The devastating reversal: everything {H} believed about {S} is wrong. Betrayed and exposed, {H} loses {O} and must rebuild the mission from nothing.',
    '{M} disappears without a trace, leaving only a warning behind. {H} realizes the real enemy was never who {pro} thought — and {V} knows {H} knows.',
    'A victory turns to ash in {P2}: the prize {H} fought for is a decoy, and the true {O} is already in {V}\u2019s hands. The second half of the war begins.',
  ],
  escalation: [
    'With {P1} under direct threat, {H} leads a desperate defense. {A} is captured, and the mission to {G} becomes personal in a way it never was before.',
    '{H} infiltrates {V}\u2019s stronghold near {P2} in a high-risk operation. The cost of failure is everything — and failure comes within a breath of happening.',
    'Alliances fracture as the pressure mounts. {H} must choose between saving {A} and protecting {O}, knowing either choice will haunt {pro} forever.',
  ],
  darknight: [
    'Broken and alone in the ruins near {P1}, {H} confronts the full weight of {S}. All seems lost — until {M}\u2019s final lesson returns with new meaning.',
    '{V} offers {H} a way out: surrender {O} and walk away alive. The temptation is real. The refusal defines who {H} has finally become.',
    'At the lowest point, {H} loses nearly everything — but finds the one flaw in {V}\u2019s armor. A last, impossible plan takes shape in the ashes.',
  ],
  climax: [
    'The final confrontation erupts in {P1}: {H} against {V}, with {O} — and the fate of everyone {H} loves — hanging in the balance. Nothing is held back.',
    'Sacrifice and courage collide as {H} executes the impossible plan to {G}. {A} returns at the critical moment, and {S} is finally laid to rest.',
    'In the aftermath, {P1} begins to heal. {H} chooses what comes next — not out of duty, but out of hard-won hope — as a new horizon opens.',
  ],
};

export function fictionChapters(
  r: Rng, fam: string, slots: Slots, count: number, terms: string[],
): OutlineChapter[] {
  const used = new Set<string>();
  const out: OutlineChapter[] = [];
  for (let i = 0; i < count; i++) {
    const act = actOf(i, count);
    const tpl = pick(r, SUMMARIES[act]);
    out.push({
      title: fictionTitle(r, fam, terms, used),
      summary: fill(tpl, slots),
      kind: act,
      step: '',
    });
  }
  return out;
}

function fill(tpl: string, s: Slots): string {
  return tpl
    .split('{H}').join(s.H).split('{pro}').join(s.pro)
    .split('{A}').join(s.A).split('{V}').join(s.V).split('{M}').join(s.M)
    .split('{P1}').join(s.P1).split('{P2}').join(s.P2)
    .split('{O}').join(s.O).split('{G}').join(s.G)
    .split('{S}').join(s.S).split('{t}').join(s.t);
}

export function fictionCharacters(r: Rng, slots: Slots, heroFull: string, allyFull: string, villainFull: string, mentorFull: string): CharRow[] {
  void r;
  return [
    { name: heroFull, role: 'Protagonist', description: `Haunted by ${slots.S}, ${slots.H} wants only to be left alone — but ${slots.O} has other plans. Skilled, stubborn, and running out of places to hide.`, arc: `From avoidance to acceptance: ${slots.H} stops running from the past and chooses to ${slots.G}, whatever it costs.` },
    { name: allyFull, role: 'Ally & Confidant', description: `${slots.A} knows ${slots.P1} better than anyone and owes ${slots.H} a debt that can never quite be repaid. Loyal to a fault, funny when it hurts most.`, arc: `Learns that loyalty means telling hard truths, not just following orders — and pays a real price for it.` },
    { name: mentorFull, role: 'Mentor', description: `${slots.M} has survived one war already and carries its scars. Knows more about ${slots.S} than ${slots.pro === 'she' ? 'she' : 'he'} admits — for reasons that become devastatingly clear.`, arc: `The guide who must let go: ${slots.M} equips ${slots.H} for the final fight, then steps out of the way at the critical hour.` },
    { name: villainFull, role: 'Antagonist', description: `${slots.V} wants ${slots.O} and will burn ${slots.P1} to get it. Charismatic, patient, and absolutely certain that history will call ${slots.pro === 'she' ? 'her' : 'him'} the hero.`, arc: `A mirror of the hero: every refusal to change tightens the trap until there is only one way the story can end.` },
    { name: `${pick(r, ['Wren', 'Silas', 'Odette', 'Casimir', 'Ivo'])} ${pick(r, ['Halloway', 'Vex', 'Marlowe', 'Quill', 'Duskmere'])}`, role: 'Wildcard', description: `A broker of secrets in ${slots.P2} who sells to both sides and trusts no one — least of all ${slots.H}. Funny, dangerous, indispensable.`, arc: `Forced to pick a side at the midpoint; the choice surprises everyone, including them.` },
  ];
}

// ---------------- nonfiction ----------------
export function nfChapters(
  r: Rng, steps: string[], outcome: string,
): OutlineChapter[] {
  const out: OutlineChapter[] = [
    { title: `The Promise: ${cap(outcome)}`, summary: `Why this book exists, who it's for, and the exact transformation on offer — plus how to use the book for maximum results.`, kind: 'promise', step: '' },
    { title: 'The Myths Holding You Back', summary: `The three invisible beliefs that keep readers stuck — motivation myths, information overload, and the readiness trap — demolished with evidence and stories.`, kind: 'problem', step: '' },
  ];
  steps.forEach((s, i) => {
    out.push({ title: `Step ${i + 1}: ${s}`, summary: `Install the principle of "${s}" with the core idea, the science and stories behind it, and a concrete action sequence you can start in ten minutes.`, kind: 'step', step: s });
  });
  out.push(
    { title: 'Proof: Stories From the Field', summary: `Three real-world case studies — the skeptic, the restarter, and the overwhelmed high-achiever — showing the full system working under real-life conditions.`, kind: 'stories', step: '' },
    { title: `Your 30-Day Plan for ${outcome}`, summary: `The complete day-by-day launch plan: ignition week, orbit weeks, measurement, and the final charge to begin before you feel ready.`, kind: 'plan', step: '' },
  );
  void r;
  return out;
}

export function nfCharacters(terms: string[], outcome: string): CharRow[] {
  const t = terms[0] ?? 'growth';
  return [
    { name: 'The Reader (You)', role: 'Hero of this book', description: `Someone who wants ${outcome} and is tired of advice that only works on good days. Smart, busy, skeptical of hype — exactly who this system was built for.`, arc: `From stuck to systematic: follows the 30-day plan and becomes living proof of the method.` },
    { name: 'Jordan (Case Study)', role: 'The Skeptic', description: `Tried everything for ${t}; changed one thing and bent her whole trajectory in ninety days. Proof that small doors open big rooms.`, arc: `From exhausted doubter to unbroken-streak believer.` },
    { name: 'Marcus (Case Study)', role: 'The Restarter', description: `Failed once at ${t}, quit for a year, then returned with the "never miss twice" rule and compounded quietly ever since.`, arc: `From quitter to quiet compounder.` },
    { name: 'Priya (Case Study)', role: 'The Overwhelmed Achiever', description: `Read everything, implemented nothing — until subtraction set her free. Now does less and achieves more.`, arc: `From expert's curse to focused finisher.` },
  ];
}

export { buildSteps };
