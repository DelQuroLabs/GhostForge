# The Book Editor Prompt Kit

A reusable, multi-pass editing system. Works for fiction and nonfiction, any genre. Paste the
**Master System Prompt** into your tool's system/custom-instructions field once, then drive it with
the pass prompts below.

## Contents

1. How to use this (30-second version)
2. Master System Prompt → see `master-system-prompt.md`
3. Session Setup prompt (send first, every new project)
4. Pass 0 — Voice & Continuity Calibration
5. Pass 1 — Developmental Edit
6. Pass 2 — Line & Style Edit
7. Pass 3 — Copyedit & Proofread
8. Full-manuscript report (run last)
9. Specialist passes (synopsis, query, dialogue, continuity, beta-reader, red-team)
10. Chunk protocol & the Running Ledger (for full books)
11. Troubleshooting: when the model misbehaves
12. Copy-paste one-liners

---

## 1. How to use this

**Per project:**
1. Paste `master-system-prompt.md` into the system prompt / custom instructions / project instructions field.
2. Send the **Session Setup** prompt with your metadata.
3. Send **Pass 0** with your first chunk. Save its output — it's your style contract for the rest of the book.
4. Run Passes 1–3 on each chunk, in order. Do not merge them. Separate passes catch separate classes of problem, and a model doing all three at once does all three badly.
5. After every chunk, the model appends a **Ledger Delta**. Keep the ledger in one doc and re-paste it at the top of each new chunk.
6. At the end, run the **Full-Manuscript Report**.

**Chunk size:** 3,000–6,000 words per call. Under 3k, it lacks context to judge structure. Over 6k, note quality degrades and it starts skimming. Never paste a whole novel in one go.

**Chunk boundaries:** break at scene or chapter ends, not mid-paragraph. Tell it where the break falls.

---

## 3. Session Setup

> Send this once at the start of a project. Fill in what you know; leave the rest blank and it will ask.

```
NEW PROJECT. Log these parameters and confirm them back to me in a single table before
doing anything else. If a field is blank, ask me for it — all questions in ONE compact
block, max 6 questions, then proceed with reasonable assumptions if I say "assume."

- Working title:
- Category/genre + subgenre:
- Fiction or nonfiction:
- Target word count / current word count:
- Intended audience & shelf:
- Comp titles (3, be specific):
- Draft stage (1st / 2nd / 3rd / pre-submission):
- POV person & tense, and POV count:
- The one-sentence premise or thesis:
- What this book is FOR (what should the reader feel/know/do at the end):
- What I already know is broken:
- HARD CONSTRAINTS — do not suggest changing these:
- Style guide (CMOS / AP / house / none):
- Spelling convention (US / UK):
- Tone of your feedback to me: brutal, no cushioning, ranked by severity.
```

---

## 4. Pass 0 — Voice & Continuity Calibration

> Run this on your FIRST chunk only. This is the highest-leverage step in the kit. It forces the model to measure your voice before it touches it, which is what stops it from sanding you down into generic AI prose.

```
PASS 0 — CALIBRATION. Do not critique yet. Do not suggest a single change. Read the
text below and produce a measurable profile of it, so every later pass edits toward THIS
voice rather than toward an average.

Output exactly these sections:

1. VOICE SIGNATURE
   - Average sentence length (count it, give the number) and its range/variation pattern.
   - Diction register on a 1-10 scale (1 = colloquial, 10 = formal) with 5 quoted examples.
   - Syntax habits: dominant sentence shapes, parataxis vs. hypotaxis, fragment use.
   - Figurative language: frequency per 1,000 words, and the domains it draws from.
   - Distance: how close the narration sits to the POV mind (close/medium/distant) and how it shifts.
   - Rhythm: where the prose accelerates and where it brakes.
   - What is DISTINCTIVE about this voice — the 3 things a reader would recognize blind.

2. CONVENTIONS LOCK
   Tense, person, POV, dialogue punctuation style, number formatting, capitalization habits,
   italics usage, scene-break marker, chapter heading style. List anything INCONSISTENT
   you already see.

3. CONTINUITY SEED
   Every named entity, character, place, date, object, and rule established in this text.
   Table: Item | Type | Fact established | First appearance.

4. OPEN LOOPS
   Questions raised but unanswered, promises planted, foreshadowing, Chekhov's guns loaded.

5. MY CONFIDENCE
   State anything you could not determine from this sample alone.

Then say: "Calibration locked. Ready for Pass 1."

TEXT:
[paste chunk]
```

---

## 5. Pass 1 — Developmental Edit

```
PASS 1 — DEVELOPMENTAL. Structure, story logic, and reader experience ONLY. Ignore
sentence-level prose entirely — do not fix grammar, word choice, or rhythm in this pass.
You are reading as a acquisitions editor deciding whether this works.

FIRST, before any critique, state in 3 bullets:
(a) what you believe this section is structurally FOR — its job in the whole;
(b) what the author appears to have been attempting;
(c) where your reading might be wrong. If (b) and the text diverge, that divergence is
    your first note.

THEN deliver, in this order:

1. VERDICT — one paragraph, blunt. Does this section earn its place in the book?
   End with a score: Structure /10, Stakes /10, Pacing /10, Character Agency /10,
   Reader Payoff /10.

2. THE ROOT PROBLEM — if there is one. Name the single underlying failure that
   generates the most downstream symptoms. Distinguish root cause from symptom
   explicitly. Most notes below should trace back to this.

3. FINDINGS — every issue, each in this exact format:
   SEVERITY: [CRITICAL | MAJOR | MINOR]
   LOCATION: quote the first 4-6 words of the offending passage + paragraph number
   DEFECT: what specifically is broken. Name the craft principle violated.
   EVIDENCE: why this is a problem — the reader's experience, the logic gap, the
             continuity break, the payoff that doesn't land.
   FIX: 2-3 concrete options, ranked. Include at least one surgical fix and at least
        one structural fix (cut / move / merge / add / reverse). State the cost of each.
   DO NOT write replacement prose unless I ask.

4. CUT CANDIDATES — passages that should be deleted or compressed. Give word counts
   and total reduction achievable. Be willing to recommend cutting something good
   because the section doesn't need it.

5. MISSING — what the reader needs here that the text doesn't provide: an absent scene,
   an unearned turn, an unstated motivation, a gap in causality, a dropped thread,
   a payoff set up but not delivered.

6. PACING MAP — a beat-by-beat list with a tension rating (1-10) per beat. Flag flat
   stretches, false peaks, and tension that peaks too early.

7. WHAT'S WORKING — max 5 items, each with the reason it works mechanically, not
   praise. If nothing works, say so and say why.

Check against these questions, and report only the failures:
- Is anything happening that the reader can't already predict from the previous page?
- Does every scene change something irreversible? Enter late, leave early?
- Is the POV character wanting something, and being opposed?
- Are characters making decisions, or are things happening to them?
- Is information arriving before the reader needs it (over-explaining) or after (confusion)?
- Is conflict resolved by coincidence, offstage action, or a character suddenly being stupid?
- Are there two scenes doing the same job?
- Is the stakes escalation monotonic, or does it plateau/regress?
- Would a hostile reader put the book down here? Where exactly?
- For nonfiction: does the argument have a through-line, or is it a list of true facts?

RULES: No vague notes ("consider tightening this"). Every note must name a location,
a defect, and a fix. Do not pad. If the section is genuinely strong, say it in two
sentences and stop — inventing problems is a failure mode.

TEXT:
[paste chunk]
```

---

## 6. Pass 2 — Line & Style Edit

```
PASS 2 — LINE EDIT. Sentence-level craft only. Do NOT raise structural, plot, or
argument-level notes — those were Pass 1. Do NOT fix typos or grammar — that's Pass 3.
Your job is clarity, rhythm, force, and fidelity to the Voice Signature from Pass 0.

Re-read the Voice Signature. Re-paste it here if needed: [signature]

Deliver:

1. PROSE VERDICT — 3 sentences. Is the prose above, at, or below the line this book
   needs? Name the dominant weakness in one phrase (e.g. "over-narrated interiority,"
   "adverb dependency," "uniform sentence length").

2. LINE NOTES — every issue, formatted:
   LOCATION: paragraph number + quote the exact sentence
   DEFECT: the specific failure. Use precise craft vocabulary — filter word, psychic
     distance break, nominalization, throat-clearing opener, redundant restatement,
     weak verb + adverb, abstract noun where a concrete image belongs, buried subject,
     misplaced modifier, pronoun ambiguity, echo/repetition, tense drift, POV leak,
     summary where scene is needed, cliché, dead metaphor, mixed metaphor,
     sentimental overreach, tell-don't-show, rhythm collision, filler beat.
   WHY: what it costs the reader.
   FIX: for each, give the ORIGINAL and a REVISED line. The revision must sound like
        the Voice Signature — same register, same sentence-length habits, same figurative
        domain. If you cannot revise it in the author's voice, say "author to revise"
        and describe the change instead. Never substitute your own default style.
   SEVERITY: [MAJOR | MINOR | POLISH]

3. PATTERNS — group the line notes into the 3-5 recurring habits generating them, with
   a count for each and one prescription per habit. Patterns matter more than instances.

4. PARAGRAPH SURGERY — up to 3 paragraphs that would benefit from being re-cut. Show
   the original, then a re-cut that preserves every fact and beat but improves order,
   entry point, and exit point. Explain the reasoning.

5. RHYTHM AUDIT — flag any stretch of 4+ sentences with similar length or similar
   opening construction. Quote it and show the fix.

6. BANNED-LIST SWEEP — flag every occurrence of AI-ese and dead phrasing:
   "delve," "tapestry," "testament to," "it's important to note," "in today's world,"
   "navigate the complexities," "a mix of X and Y," "not only... but also," "very,"
   "really," "just," "actually," "literally," "suddenly," "began to," "started to,"
   "seemed to," "felt," "realized," "noticed," "wondered," triadic lists used as a
   tic, em-dash overuse (count them), "the air was thick with," "a shiver ran down,"
   "little did they know," "in that moment." Report counts and locations. Also flag
   any phrase that sounds like it came from a thesaurus rather than a person.

7. STRONGEST LINES — the 5 sentences worth protecting verbatim from future edits.

RULES: Cap total notes at 40 per chunk; if you exceed that, report the 40 highest-impact
and give me a count of what you suppressed. Precision beats volume. Never propose a
change you can't justify in one sentence.

TEXT:
[paste chunk]
```

---

## 7. Pass 3 — Copyedit & Proofread

```
PASS 3 — COPYEDIT. Mechanical correctness and internal consistency only. Do NOT
comment on style, structure, or whether something should exist. If a sentence is ugly
but correct, leave it alone.

Style authority: [CMOS 17 / AP / house / none — pick one]. Spelling: [US / UK].

Deliver a single table, one row per issue:
| # | Location (para + quoted words) | Type | Original | Correction | Rule/Reason | Confidence |

Type values: spelling, grammar, punctuation, agreement, tense, capitalization, hyphenation,
number format, abbreviation, italics, dialogue tag mechanics, missing word, duplicate word,
transposed word, wrong word, homophone, consistency, continuity, fact-check flag.

Then:

1. CONSISTENCY AUDIT — check against the Ledger and report every drift:
   names and their spelling, nicknames, physical details, ages, dates and elapsed time,
   distances and travel time, weather continuity, character knowledge (who knows what when),
   object permanence, proper nouns, terminology, capitalization of invented terms.

2. CONTINUITY CONTRADICTIONS — anything that conflicts with earlier established fact.
   These are CRITICAL. Quote both passages and the conflict.

3. MECHANICS OF DIALOGUE — punctuation inside/outside quotes, comma vs. period with tags,
   action beats vs. tags, paragraph-per-speaker, speaker attribution ambiguity.

4. FACT-CHECK FLAGS — any verifiable real-world claim (dates, geography, law, medicine,
   history, technology, prices) that you are not certain of. Mark each [VERIFY] with what
   to check. Do NOT silently "correct" a fact you're unsure about; flag it.

5. COUNTS — total issues by type, and an error rate per 1,000 words. If the error rate is
   below ~0.5/1,000, say the text is clean and stop.

RULES: Never change meaning. If a correction would alter sense, flag it instead of making it.
If you're under 90% confident, set Confidence: LOW and explain. Do not invent errors to
look thorough — a clean page should return "No issues found."

TEXT:
[paste chunk]
```

---

## 8. Full-Manuscript Report

> Run after all chunks. Paste the accumulated ledger + all Pass 1 verdicts.

```
FULL-MANUSCRIPT REPORT. Using the Ledger and the Pass 1 notes below, zoom out.
I want the editorial letter a senior editor would send an author before revision.

1. THE LETTER — 600-900 words, addressed to me, blunt. Cover: what this book actually
   is vs. what it's trying to be; the single change that would improve it most; whether
   the problem is fixable in revision or is load-bearing; and the honest market
   assessment. No cushioning, no "overall this is a strong manuscript" unless true.

2. MACRO DIAGNOSIS — the 3 root problems of the whole book, ranked. For each: how it
   manifests across sections, what it costs, and the revision strategy. Distinguish
   cosmetic from structural.

3. ARC AUDIT — chart the protagonist's/argument's trajectory across the whole: opening
   state → pressure points → turn → resolution. Where does it stall? Where does it jump?
   Which chapters could be cut or merged? Which are load-bearing?

4. CHAPTER-BY-CHAPTER SCORECARD — table: Ch | Job it does | Does it succeed | Tension
   (1-10) | Words | Cut/Keep/Compress/Merge/Expand | One-line note.

5. REVISION PLAN — a sequenced work plan in the order I should actually execute it,
   with the reason for the order. Split into: Pass A (structural surgery), Pass B
   (scene-level), Pass C (line), Pass D (polish). Estimate effort per item in hours.

6. KILL LIST — everything that should be deleted from the book. Word count total and
   percentage of manuscript. Defend each cut in one sentence.

7. PUBLISHABILITY — blunt assessment: as-is / with revision / needs rethinking.
   Who would buy it, who wouldn't, and what's blocking the "yes."

8. THE THREE THINGS — if I only do three things, what are they.

LEDGER:
[paste]

PASS 1 NOTES:
[paste]
```

---

## 9. Specialist passes

**Dialogue pass**
```
DIALOGUE PASS. Extract and evaluate every exchange below. For each: does each speaker
sound like a distinct person, or are they all the author? Check for: exposition smuggling
("as you know, Bob"), on-the-nose speech where characters say exactly what they mean,
missing subtext, agreement where conflict belongs, uniform rhythm and length across
speakers, filler ("hello," "how are you," small talk), characters who explain their own
emotions, and dialogue that advances nothing. Give each named speaker a voice profile
in 2 lines and flag every line that breaks it. Show ORIGINAL / REVISED for the worst 15.
```

**Continuity bible check**
```
CONTINUITY SWEEP. Read this text against the Ledger. List every contradiction, drift,
retcon, and unreferenced change. Include: character knowledge that shouldn't exist yet,
timeline math (dates, seasons, elapsed time, travel), physical detail drift, object
permanence, relationship state, and terminology inconsistency. For each: quote both
passages. Then output an updated Ledger with all new facts appended.
```

**Beta-reader simulation**
```
SIMULATE 4 READERS on this text: (1) a devoted fan of the genre, (2) a casual reader who
picked this up at an airport, (3) a skeptical critic, (4) a reader who DNF'd three books
this year. For each: where they got bored (exact paragraph), where they got confused,
where they stopped trusting the author, what they'd say to a friend, and whether they
finish. Then tell me which reader I should be writing for and whether this text serves them.
```

**Red team**
```
RED-TEAM THIS. Argue the strongest possible case that this section should be cut from the
book entirely, that the premise is derivative, and that the author is fooling themselves.
Steelman it — no hedging, no balancing. Then argue the strongest case for keeping it.
Then tell me which argument actually won and why.
```

**Synopsis / query**
```
Write a 1-page synopsis (present tense, protagonist-forward, causally linked, spoiler the
ending) and a 350-word query letter for this. The query must open on the character's
want and the inciting disruption, state the stakes concretely, and avoid rhetorical
questions and "in a world where." Then critique your own query: what's weak, what an
agent would skip, and what comp titles would actually position this.
```

---

## 10. Chunk protocol & the Running Ledger

The ledger is what makes long-manuscript editing possible. Without it, the model forgets
everything between calls and gives you notes that contradict each other.

**Every call, paste at the top:**
```
CONTEXT: Book = [title]. This is chunk [n] of [total], chapters [x-y], words [a-b].
Immediately preceding events (3 bullets): ...
CURRENT LEDGER:
[paste ledger]
```

**Every call, the model must end with:**
```
LEDGER DELTA — append to the master ledger:
- New characters: name | role | physical | voice trait | status at end of chunk
- New facts/rules established:
- Timeline: current in-world date/time, elapsed since last chunk
- Threads: OPENED / ADVANCED / CLOSED / ABANDONED (flag abandoned ones)
- Foreshadowing: PLANTED (what, where) / PAID OFF (what, where)
- Motifs & callbacks:
- Style decisions made in this edit:
- Continuity risks for later chunks:
```

Keep the ledger in a separate doc. Prune it when it exceeds ~1,500 words: collapse resolved
threads into one line each, keep characters/facts/timeline in full.

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| It rewrites everything into bland AI prose | Re-run Pass 0 and paste the Voice Signature into every subsequent call. Add: "Your revisions must be indistinguishable in register from the original. If you can't match it, describe the change instead of writing it." |
| Notes are vague ("consider tightening") | Add: "Reject your own draft. Any note without a quoted location, a named craft defect, and a concrete fix must be deleted before you send." |
| It invents problems to seem useful | Add: "A clean page must return 'No issues found.' Manufacturing notes is a failure. I would rather get 3 real notes than 25 invented ones." |
| It goes soft / over-praises | Add: "Remove every compliment that isn't load-bearing analysis. Do not soften a verdict with a compliment sandwich." |
| It loses continuity between chunks | You're skipping the ledger. Paste it every call. |
| Pass quality drops on long chunks | Cut chunk size to ~3,000 words. |
| It edits the wrong layer (grammar notes in Pass 1) | Add: "Any note about a layer outside this pass must be logged in a one-line 'Deferred' list and not expanded." |
| It agrees with everything I say | Add: "Disagree with me where I'm wrong. If my stated intent is the problem, say so." |
| Output gets truncated | Ask for Pass 1 sections 1–3, then 4–7, in two calls. |

---

## 12. Copy-paste one-liners

- **"Give me the brutal version."** → `Rerun that, removing all hedging, all compliments, and all suggested-option padding. One verdict, ranked fixes, nothing else.`
- **"Stop rewriting, start diagnosing."** → `No replacement prose. Only: location, defect, principle violated, and a description of the change. I'll write the fix.`
- **"Compress."** → `Same analysis, one-third the length. Cut every sentence that doesn't change what I do next.`
- **"Second opinion."** → `Argue against your own report. Which of your notes are wrong, taste rather than craft, or lower priority than you implied?`
- **"Prioritize."** → `Rank your notes by impact-per-hour-of-revision. Give me the top 10 and tell me what to ignore for now.`
- **"Am I done?"** → `Is this chunk publishable as-is? Answer yes or no first. If no, name the minimum set of changes that would make it yes.`
