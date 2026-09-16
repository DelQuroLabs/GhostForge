import { pick, pickN, int, countWords, type Rng } from './rng.js';
import { titleTerms } from './names.js';

export type NfInput = {
  r: Rng; terms: string[]; outcome: string; reader: string;
  authorVoice: string; tone: string; styleNf: string[];
};

const STORIES = [
  `A few years ago I met someone — let's call them Jordan — who had tried everything. Courses, planners, midnight motivation videos, the works. Nothing stuck. Then they changed exactly one thing, the thing this chapter is about, and within ninety days their whole trajectory bent. This is the story of that one thing, and how you can steal it.`,
  `Let me tell you about the Tuesday that changed everything for one of my readers. She woke up exhausted, behind on every goal that mattered, convinced she was simply not the kind of person who finishes things. By dinner, she had proof she was wrong — the first real proof in years. What happened between breakfast and dinner is this chapter.`,
  `I used to believe the myth too: that successful people have some secret gear the rest of us are missing. Then I spent two years studying people who had transformed their lives, and I found something better than a secret. I found a pattern. A repeatable, boring, gloriously unsexy pattern. Here it is.`,
  `Picture two people with the same talent, the same twenty-four hours, the same starting line. Five years later, one of them is unrecognizable — thriving, calm, in motion — and the other is exactly where they started, only tireder. I've watched this play out dozens of times. The difference was never talent. It was always what you're about to read.`,
];

const TEACH = [
  `Here's the core idea, stripped of fluff: most people fail not from lack of effort but from effort aimed at the wrong target. They optimize the visible 10 percent — the tools, the hacks, the morning routine aesthetics — while the invisible 90 percent runs their life on autopilot. This chapter hands you the controls to that 90 percent.`,
  `The research is unambiguous, and your own experience already whispers it: willpower is a terrible strategy and a wonderful servant. It fails as a plan because it depletes; it shines as a tool when aimed at single, high-leverage decisions. Everything in this chapter is engineered around that one truth.`,
  `Think of it as compound interest for your attention. A one-percent shift in direction, held for a year, doesn't make you one percent better — it lands you in a different life. The method below is how you pick the direction and how you hold it when motivation inevitably files for divorce.`,
  `There are two kinds of advice in the world: advice that sounds good and advice that works on a bad Tuesday. This book has no interest in the first kind. Every principle here survived contact with real exhaustion, real chaos, real kids, real bosses, real grief. If it couldn't survive a bad Tuesday, it didn't make the book.`,
];

const PRINCIPLES_DEFAULT = [
  'Clarity Before Hustle', 'The One-Lever Rule', 'Design Beats Discipline',
  'Energy Is the Asset', 'Shrink the Change', 'Review, Don\u2019t Regret',
  'Environment Over Willpower', 'Finish Lines Every Week',
];

export function buildSteps(r: Rng, terms: string[], count: number): string[] {
  const fromTerms = titleTerms(terms).slice(0, 3).map((t) => {
    const T = t.charAt(0).toUpperCase() + t.slice(1);
    return pick(r, [`Master Your ${T}`, `The ${T} Advantage`, `The ${T} System`, `Turn ${T} Into Fuel`]);
  });
  const rest = pickN(r, PRINCIPLES_DEFAULT, Math.max(0, count - fromTerms.length));
  const steps = [...fromTerms, ...rest];
  while (steps.length < count) steps.push(pick(r, PRINCIPLES_DEFAULT));
  return steps.slice(0, count);
}

function listBlock(r: Rng, step: string, terms: string[]): string {
  const t = terms[0] ?? 'growth';
  const items = [
    `Name the smallest version of "${step}" you could do in under ten minutes — then do only that. Momentum loves small doors.`,
    `Attach it to something you already do daily. After coffee, after lunch, after shutdown — behavior sticks to existing rails.`,
    `Track it with one mark per day. No apps required. A wall calendar and a pen beat a dashboard you never open.`,
    `Tell one person. Social promises are guardrails; private intentions are wishes. Pick your guardrail this week.`,
    `Review every Sunday for fifteen minutes: what moved the needle on ${t}, what didn't, and what you'll change. Then forgive the misses and keep the lessons.`,
  ];
  return pickN(r, items, 4).map((it, i) => `${i + 1}. ${it}`).join('\n');
}

export function writeNfChapter(
  inp: NfInput, kind: 'promise' | 'problem' | 'step' | 'stories' | 'plan',
  stepName: string, chapNo: number, targetWords: number, outcome: string,
): string {
  const { r, terms } = inp;
  const t1 = terms[0] ?? 'growth';
  const t2 = terms[1] ?? 'focus';
  const paras: string[] = [];
  if (kind === 'promise') {
    paras.push(pick(r, STORIES));
    paras.push(`This book exists for one reason: to take you from where you are to ${outcome} — not someday, not "when things calm down," but through a series of small, specific moves starting today. If you're ${inp.reader}, and you've ever felt that ${t1} was meant to be bigger in your life than it currently is, you're holding the right book.`);
    paras.push(`Here's my promise, stated plainly so you can hold me to it: by the final chapter you will have a complete, personal operating system for ${t1} — the mindset, the method, and the weekly rhythm — plus a 30-day launch plan. No fluff, no theory without practice, no chapter that ends without telling you exactly what to do next.`);
    paras.push(`A quick note on how to read this book. Each chapter ends with one action — just one — designed to take less than twenty minutes. Do them. Readers who do the actions report dramatically better results than readers who merely highlight them, and I would rather you read slowly and act than read fast and admire. Deal? Good. Turn the page. Your ${t2} will thank you.`);
  } else if (kind === 'problem') {
    paras.push(`Before we build, we demolish. Because standing between you and ${outcome} is not laziness, not bad luck, and not lack of talent — it's a set of invisible myths about ${t1} that nearly everyone absorbs and almost nobody questions. This chapter names them so they lose their power.`);
    paras.push(`Myth one: that transformation requires massive motivation. It doesn't. It requires a system that works at 40 percent energy, because 40 percent energy is what real life serves most days. Myth two: that you need more information. You don't. You need fewer options executed consistently. Myth three: that successful people feel ready. They never do. Readiness is a rumor started by people who already started.`);
    paras.push(pick(r, TEACH));
    paras.push(`So let's draw the line here, together: from this chapter forward, we stop asking "how do I get motivated?" and start asking "how do I make this inevitable?" That single reframe — from motivation to inevitability — is the engine of everything that follows. Keep it in your pocket. You'll need it in every chapter ahead.`);
  } else if (kind === 'step') {
    paras.push(pick(r, STORIES));
    paras.push(`THE PRINCIPLE\n${stepName} sounds simple. That's the point — and that's the trap. Simple is easy to dismiss and hard to master. In this chapter we master it: what it means, why it works, and exactly how to install it into a life that's already full.`);
    paras.push(pick(r, TEACH));
    paras.push(`Let's make it concrete for ${t1}. Most people approach ${t1} like a sprint they keep postponing. You'll approach it like brushing your teeth — unglamorous, non-negotiable, automatic. The difference between sprint-thinking and systems-thinking is the difference between bursts of ${t2} and a life reorganized around it. Below is your installation sequence.`);
    paras.push(listBlock(r, stepName, terms));
    paras.push(`The most common objection I hear at this point: "But what if I fall off?" You will. Everyone does. The method accounts for it: missing once is an accident, missing twice is the start of a new (bad) habit, so the only rule is never miss twice. One stumble changes nothing. The comeback is the system working as designed.`);
  } else if (kind === 'stories') {
    paras.push(`Theory convinces; stories convert. So before your launch plan, meet three people who walked this road with the same doubts you have — about ${t1}, about ${t2}, about whether people like them get results like these. Names changed, numbers real.`);
    paras.push(`CASE ONE — THE SKEPTIC. Jordan ran a household and a career and had exactly zero spare hours. She started with the smallest version of the method — ten minutes, attached to her morning coffee. Ninety days later she had the first unbroken streak of her adult life and, more importantly, proof of identity: I am someone who follows through. The streak has since survived a house move and a flu season.`);
    paras.push(`CASE TWO — THE RESTART. After a failed first attempt at ${t1}, Marcus did what most people do: quit for a year. What brought him back was the "never miss twice" rule and a Sunday review ritual. Eighteen months later, his results compound quietly in the background while his effort stays modest. His quote: "I stopped trying to be impressive and started trying to be consistent. Everything changed."`);
    paras.push(`CASE THREE — THE OVERWHELMED HIGH-ACHIEVER. Priya had read everything and implemented nothing — classic expert's curse. Her breakthrough was subtraction: she deleted four competing goals and aimed all her systems at one — ${t1}. Within six months she reported the paradox every minimalist discovers: doing less, achieving more, enjoying it most of all.`);
    paras.push(`Three people, three starting lines, one pattern: shrink the change, attach it to rails, track it simply, review weekly, never miss twice. You've now seen the pattern from the inside. Next, we turn it into your personal 30-day launch plan — your first month of ${outcome}, scheduled to the day.`);
  } else {
    paras.push(`This is where reading becomes doing. Below is your 30-day launch plan for ${outcome}, built from every principle in this book. It's deliberately front-loaded with easy wins: Days 1–7 install one habit. Days 8–14 add the review ritual. Days 15–21 attach your second habit. Days 22–30 run the full system and measure. Small, sequenced, survivable.`);
    paras.push(`WEEK ONE — IGNITION. Day 1: define your ${t1} target in one sentence and tell one person. Day 2: install your ten-minute starter habit. Day 3: set up your one-mark tracker. Day 4: do the starter habit at 40 percent energy to prove the system survives bad days. Day 5: repeat. Day 6: repeat. Day 7: fifteen-minute Sunday review — celebrate the streak, note one lesson, forgive everything else.`);
    paras.push(`WEEKS TWO TO FOUR — ORBIT. Week two adds the Sunday review as a locked appointment and your first deliberate "never miss twice" rescue if you stumble. Week three attaches habit two to a second daily rail. Week four is a full-system run: both habits, weekly review, one relationship strengthened by telling someone your goal. Measure three numbers at day 30: streak days, lessons logged, and how different ${t2} feels. Then simply begin month two — the system is now yours.`);
    paras.push(`A final word. You don't need to be extraordinary to get extraordinary results from ordinary days. You need a direction, a system, and the willingness to begin before you feel ready. You have all three now — the direction is ${outcome}, the system is in your hands, and readiness was always a rumor. Start today. Future you is already grateful.`);
  }
  if (inp.styleNf.length) paras.push(pick(r, inp.styleNf).split('{t}').join(t1).split('{outcome}').join(outcome));
  paras.push(`YOUR ONE ACTION\nBefore you read another page, do this: write down the single sentence this chapter demands of you — your target, your starter habit, or your lesson — and put it where tomorrow-morning-you will trip over it. Twenty minutes, done imperfectly, beats twenty highlights. Go.`);
  const usedTeach = new Set<number>();
  while (countWords(paras.join('\n\n')) < targetWords) {
    if (usedTeach.size >= TEACH.length) usedTeach.clear();
    let ti = Math.floor(r() * TEACH.length);
    let guard = 0;
    while (usedTeach.has(ti) && guard++ < 12) ti = Math.floor(r() * TEACH.length);
    usedTeach.add(ti);
    paras.splice(paras.length - 1, 0, TEACH[ti] as string);
  }
  return paras.join('\n\n');
}
