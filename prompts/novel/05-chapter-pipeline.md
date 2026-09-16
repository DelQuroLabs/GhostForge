# STAGE 3 — THE CHAPTER PIPELINE

The engine. Six gates per chapter. Gates 1, 2, and 5 stop for your approval.

> **Send:** `CHAPTER N — GATE 1.`
> **Fast mode:** `Run Gates 1-6 for chapter N without stopping.` (you still get the
> self-critique; you skip the checkpoints)

---

## What to paste at the top of every chapter call

```
LOCKED BRIEF: [genre, shelf, promise to the reader, theme-as-argument, POV/tense,
hard constraints]
BEAT MAP ROW: [this chapter's row, plus the 2 before and 2 after]
STYLE SPEC: [bible/style-spec.md]
RUNNING LEDGER: [ledger/running-ledger.md]
LAST 200 WORDS: [the tail of the previous chapter, verbatim]
```

Under ~1,200 words total. The `LAST 200 WORDS` block is what makes chapter joins invisible —
without it, every chapter opens cold and the book reads as thirty short stories.

---

## GATE 1 — CHAPTER BRIEF `[APPROVAL]`

No prose. This is the design step and it is where bad chapters get killed cheaply.

```
CHAPTER N — GATE 1. Produce the Chapter Brief in this exact format. No prose, no
drafting, no "here's a preview."

1. BEAT POSITION — where this chapter sits (percent, act, beat) and what the previous
   chapter ended on.

2. JOB — the one thing this chapter does for the book that no other chapter does. One
   sentence. If you cannot write it, stop and tell me the chapter should not exist.

3. POV — whose head, and why them rather than anyone else present. Psychic distance
   (close / medium / distant) and whether it shifts.

4. VALUE SHIFT — the controlling value at the start and at the end, with polarity.
   e.g. "Hope (+2) → Exposure (-3)". A chapter that does not shift is flagged [NO TURN]
   and I will cut it.

5. ENTERS — the state of the protagonist, the situation, and the reader's knowledge at
   the first line. Where we pick up in time relative to the last chapter.

6. EXITS — the irreversible change. What is different at the last line that cannot be
   undone. What the reader now knows that they didn't.

7. SCENE PLAN — how many scenes (recommend 1-3), and for each: location, characters
   present, the value it turns, and its job.

8. PLANTS — setups introduced here, each with the chapter where it pays off. Nothing gets
   planted without a payoff chapter named.

9. PAYS OFF — setups from earlier chapters that land here. Cite the chapter ID from
   threads.md.

10. THE TURN — the crisis in this chapter: the best-bad choice or the irreconcilable
    goods the POV character faces. State it as the actual dilemma, and state what they
    choose and what it costs. If there is no dilemma, there is no chapter.

11. HOOK — the final beat, and its type: revelation / reversal / decision / arrival /
    threat / unanswered question. It must make continuing easier than stopping.

12. OPENING STRATEGY — the first line's job. What we are NOT starting with (weather,
    waking, a mirror, a summary of the previous chapter, the character's feelings about
    their life). Where in the scene we enter: as late as possible while still being clear.

13. WORD BUDGET — target, and the allocation per scene. If the job needs 1,900 words,
    say 1,900. Do not pad to a round number.

14. CONSTRAINTS — what must NOT happen: characters who cannot appear yet, knowledge the
    POV character does not have, locations not established, facts in the ledger that must
    be respected, tone boundaries.

15. RISK — the most likely way this chapter fails, and your mitigation.

Then STOP and wait for my approval or notes.
```

---

## GATE 2 — SCENE CARDS `[APPROVAL]`

Approved brief in, detailed scene architecture out. Still no prose.

Each scene is built on Swain's **scene / sequel** unit. A *scene* is goal → conflict →
disaster. A *sequel* is reaction → dilemma → decision. Most chapters are one scene plus one
sequel, or two scenes. Getting this wrong is why generated chapters feel like things
happening rather than a story advancing.

```
CHAPTER N — GATE 2. Expand the approved brief into scene cards. For each scene:

SCENE [n] — [working title]
  POV / psychic distance:
  Time & place (check against bible/timeline.md):
  Characters present:
  POINT OF ENTRY — the latest possible moment we can start and still be oriented. What we
    cut from the front.
  GOAL — what the POV character wants in this scene, concretely, right now. A scene goal
    must be smaller than and in service of the chapter job.
  CONFLICT — what opposes them. Name the opposing want. Two characters wanting the same
    thing with no opposition is not conflict.
  ESCALATION — how the pressure rises within the scene. Minimum 3 beats of escalation.
  DISASTER / TURN — how the scene ends badly or differently than the goal predicted.
    The goal must NOT be cleanly achieved. Options: yes-but, no, no-and, yes-and-worse.
  VALUE SHIFT: from → to
  REACTION (sequel, if used) — the involuntary emotional response, then the thought, then
    the decision. In that order. Do not skip to the decision.
  DILEMMA — the choice available at the end of the sequel, and why both options cost.
  DECISION — what they choose, which becomes the goal of the next scene.
  EXPOSITION ALLOWED — the specific information this scene must deliver, and the
    justification for delivering it here (the character has a reason to think it, or a
    reason to say it). Nothing else gets explained.
  SENSORY ANCHOR — 2-3 concrete specifics for this location, drawn from the sensory
    palette, filtered through what this POV character would care about.
  DIALOGUE LOAD — none / light / heavy. If heavy, name the subtext: what each speaker
    actually wants from the exchange, which must NOT be what they say.
  WORDS:
  EXIT HOOK:

Then:
- SEQUENCE CHECK — confirm the scenes connect by *therefore* or *but*, never *and then*.
- CUT CHECK — is any scene here doing a job already done by another scene in this chapter
  or the last one? Flag it.
- MRU SPOTLIGHT — identify the 1-2 moments in this chapter that most need slow, physical,
  beat-by-beat treatment, and the transitions that should be handled in summary. Important
  things get scenes; transitions get paragraphs.

STOP and wait for approval.
```

---

## GATE 3 — DRAFT

```
CHAPTER N — GATE 3. Write the chapter to the approved scene cards.

OBEY:
- bible/style-spec.md, absolutely. Sentence-length distribution, diction register,
  figurative domains, banned list.
- The POV contract. One head per scene. No knowledge the character doesn't have.
- MRU order in every moment of impact: stimulus → involuntary physical reaction →
  emotional registration → thought → deliberate action → speech. Do not compress these
  into "she felt angry and told him to leave."
- Enter late, leave early. No throat-clearing openings. No summarizing the previous
  chapter. No weather unless it is doing work.
- Dialogue: subtext over statement. Characters pursue goals in conversation. "Said" and
  "asked" are the only tags unless a different verb is doing real work. Action beats
  instead of tags where possible. One speaker per paragraph.
- Description: 2-3 concrete specifics beat a paragraph of generality. Filter every
  detail through the POV character's concern and mood.
- Never name an emotion the reader can infer. Never explain the theme. Never end a scene
  with a sentence telling the reader what it meant.
- Vary paragraph length deliberately. Long paragraphs slow; short ones accelerate. Use
  this to control the tension curve within the chapter.
- Hit the word budget within 10%. If it runs long, cut description and internal
  restatement first — never cut the disaster or the turn.

OUTPUT:
Write to manuscript/ch-NNN-slug.md with this frontmatter:

---
chapter: N
title: [or leave blank]
pov: [character]
tense: [past|present]
word_count: [actual]
beat: [beat name(s)]
value_shift: [from → to]
plants: [thread IDs]
pays_off: [thread IDs]
status: draft
---

Then the chapter text, with `---` marking scene breaks.

Do not summarize what you wrote. Do not explain your choices. Do not ask if I liked it.
Go directly to GATE 4.
```

---

## GATE 4 — SELF-CRITIQUE (never shown as prose, always run)

The model attacks its own draft. This is the gate that makes the whole system worth using.

```
CHAPTER N — GATE 4. You are now the developmental editor, not the author. Audit the draft
you just wrote against the brief, the scene cards, and the craft rules. Be genuinely
adversarial: your job is to find what is wrong, not to justify what you did.

Score each 1-10 and give the reason in one line:
  Does the chapter do its JOB? / Does the VALUE TURN? / Is the crisis real?
  Causality / Pacing / POV discipline / Voice fidelity / Dialogue subtext /
  Specificity / Hook strength

Then find, with quoted locations:

A. STRUCTURE — did the scene goals, disasters, and decisions actually land as carded, or
   did the draft drift? Where did the escalation flatten? Is the turn earned or asserted?

B. CAUSALITY VIOLATIONS — anything resolved by coincidence, luck, sudden competence, an
   unestablished ability, a character forgetting what they knew, or an antagonist becoming
   stupid. These are automatic CRITICAL.

C. POV BREACHES — any moment the narrator knows something the POV character cannot, any
   filter word that puts a camera between reader and experience ("she saw," "he noticed,"
   "she realized," "he felt"), any psychic distance jump.

D. TELLING THAT SHOULD BE SHOWING — every named emotion, every explained motive, every
   thematic statement, every scene-ending summary. Quote and fix.

E. DIALOGUE — on-the-nose lines where characters say exactly what they mean; exposition
   smuggling; all speakers sounding like the author; agreement where conflict belongs;
   any line that exists only to inform the reader.

F. PROSE / AI-ese — run the banned list from 07-style-engine.md. Count em-dashes, triadic
   lists, "not X but Y" constructions, and any phrase that sounds like it came from a
   thesaurus. Flag repetitive sentence openings and any stretch of 4+ sentences of
   similar length.

G. PACING — where the chapter drags, where it rushes, where a transition that should be
   summary got dramatized and vice versa. Compare actual word allocation to the budget.

H. CONTINUITY — check every fact against the Ledger. Knowledge boundaries, timeline,
   physical details, object permanence, weather, who is where.

I. THE HONEST QUESTION — if a reader put the book down at the end of this chapter, what
   would they say? Is there any reason to keep reading that isn't inertia?

J. THE BEST LINE AND THE WORST LINE — quote each.

Rank every finding CRITICAL / MAJOR / MINOR. Cap at the 20 highest-impact. If you find
nothing above MINOR, say so — but first, re-read the draft specifically looking for what
you would criticize in someone else's work.

Do NOT revise yet.
```

---

## GATE 5 — REVISE `[APPROVAL]`

```
CHAPTER N — GATE 5. Apply the Gate 4 findings. Fix every CRITICAL and MAJOR. Fix MINOR
where it doesn't cost momentum. Where you disagree with your own critique, say so and
give the reason.

Then output:
1. The revised chapter, to manuscript/ch-NNN-slug.md, frontmatter updated
   (status: revised, word_count corrected).
2. A CHANGE LOG — table: Finding | Severity | What changed | Location. One row per fix.
   Include the findings you chose NOT to fix and why.
3. FINAL VERDICT — 3 sentences: is this chapter publishable as-is, what is its weakest
   remaining point, and what does the next chapter now have to do.
4. WORD COUNT — actual, and whether it hit budget.

STOP and wait for my approval before the ledger update.
```

---

## GATE 6 — LEDGER + NEXT CHAPTER SETUP

```
CHAPTER N — GATE 6. Produce the LEDGER DELTA per 08-ledger-and-templates.md:
new facts, character status changes, timeline advance, thread movements (opened /
advanced / paid / cut), new knowledge acquired by each character who was present,
plants logged with their payoff chapter, motifs used, style decisions made, and
continuity risks for later chapters.

Then:
- BEAT MAP CHECK — did the chapter land where the map said it would? If it drifted, state
  the drift and the downstream effect on the next 3 chapters. Propose the map correction.
  Never silently revise the map. [MACRO if it affects the whole book]
- NEXT CHAPTER SETUP — the Beat Map row for chapter N+1, plus any change to its job
  caused by what actually happened in chapter N.
- FLAG anything that needs a decision from me before chapter N+1 can be briefed.

Write the updated ledger to ledger/running-ledger.md. Then STOP.
```

---

## Chapter-level craft rules (enforced at every gate)

**Openings.** Never with: weather, waking up, a mirror, a character thinking about their
life, a summary of the previous chapter, a dream, or a rhetorical question. Open on a
specific human action in a specific place, with the reader slightly behind and catching up.
The first line should raise a question the second line makes urgent.

**Endings.** Every chapter ends mid-motion. The hook types: *revelation* (new information
that recontextualizes), *reversal* (the value flips), *decision* (a choice is announced but
not executed), *arrival* (someone or something appears), *threat* (danger becomes concrete),
*question* (the reader now needs an answer). Rotate types — four revelations in a row
become noise.

**Length.** Commercial chapters run 2,000–3,500 words. Short chapters accelerate; long
chapters deepen. Vary deliberately: a 900-word chapter after three 3,000-word chapters hits
like a punch. Never pad, never stretch a scene to fill a quota.

**Scene breaks.** Marked with `---`. Time jumps need an anchor in the first sentence of the
new scene — a clock, a season, a light condition, a concrete "three days later" only if the
book's register allows it.

**Summary vs. scene.** Dramatize: any moment that turns a value, any decision, any first
meeting, any confrontation, anything the reader was promised. Summarize: travel, routine,
the passage of time, the second and third example of an established pattern. A common
generated-novel failure is dramatizing three redundant conversations and summarizing the
one that mattered.

**Sequels need air.** After a disaster, the character must react before they decide.
Skipping the reaction is what makes protagonists feel like plot-delivery vehicles. But the
sequel gets paragraphs, not pages — reaction, dilemma, decision, and then move.
