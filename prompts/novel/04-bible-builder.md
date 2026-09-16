# STAGE 2 — BIBLE BUILDER

Generates the story bible as discrete files. These are what prevent continuity rot and
character drift — the two failure modes that make AI-written novels fall apart past
chapter 12.

> **Send:** `STAGE 2 — BIBLE.`

The model writes each file below. Nothing here is decorative: every field exists because
the chapter pipeline reads it.

---

## `bible/characters.md`

One block per character. Major characters get the full sheet; walk-ons get name + one
distinguishing detail + function.

```markdown
---
name: [full name]
role: [protagonist | antagonist | B-story | ally | mentor | foil | walk-on]
first_appears: ch-00N
status: [active | dead | offstage | unresolved]
---

## [NAME]

**Function** — what structural job they do. If you can't name it, they shouldn't exist.
**Want** — the external goal, in one concrete sentence.
**Need** — what they actually require; usually opposed to the want.
**Ghost / wound** — the event that made them this way.
**Misbelief** — the lie they act on, phrased as something they'd agree with.
**Voice** — 4 lines max, but specific: vocabulary level, sentence length, verbal tics,
  what they never say, how they behave when lying, their default posture in conflict
  (attack / withdraw / negotiate / perform).
**Physical** — 3 to 5 concrete specifics, one of which is unusual and one of which is
  visible in every scene (a gait, a hand habit, a way of standing). Not "tall, dark,
  handsome." A detail that recurs is worth ten that don't.
**Contradiction** — the thing about them that doesn't fit the pattern. Characters are
  remembered for their contradictions, not their consistency.
**Relationship to protagonist** — and how it changes across the book.
**Secret** — what they are hiding, and from whom.
**Arc** — where they start, the pressure applied, the turn, where they end. Minor
  characters may be flat; that is correct and should be logged as `FLAT — intentional`.
**Knowledge boundary** — what this character does NOT know, and when they learn it.
  This field is mandatory. See the Knowledge Tracker in `08-ledger-and-templates.md`.
```

### Casting rules the model must apply

- **No two major characters share a first initial, name length, syllable count, or ending
  sound.** Readers confuse Kira and Kara constantly. This is a real, boring, mechanical
  problem and it is trivially avoidable.
- **Cast size:** aim for 5–9 named recurring characters in a single-POV novel, up to 12–15
  in a braided epic. Every character above the minimum costs the reader memory.
- **Each major character must be able to want something the protagonist cannot give them.**
  Otherwise they are furniture.
- **Amalgamate on sight:** if two characters serve the same function, merge them and log the
  change. This is the single most common bloat in generated novels.
- **Names should register-appropriate** to era, region, and class, and not alliterative
  unless the book is comic.

---

## `bible/world.md`

Only what the story uses. A worldbuilding dump is a tax on every chapter.

```markdown
## Rules of the world
Anything that differs from the reader's default assumption, stated as a rule with its
LIMIT and its COST. Magic/technology/systems: what it can do, what it cannot do, what it
costs the user, and who has access. Power without limit destroys tension permanently —
establish the limit in the first act and never violate it.

## Geography actually used
Only locations that appear in the Beat Map. For each: what it looks like (3 specifics),
what it smells/sounds like (1 each), travel time to adjacent locations, and what it means
to the POV character who sees it. Place described through a character's concern reads as
atmosphere; place described neutrally reads as a travel brochure.

## Society and power
Who has power, who doesn't, what the taboos are, what people are not allowed to say, what
the economy of the story runs on. Constraints here are plot fuel.

## Period and technology
What exists and what does not. This prevents anachronism, which is the most visible
continuity failure in generated historical and speculative fiction.

## Sensory palette
The 5-8 recurring images, sounds, smells, and textures of this book. Consistency of
sensory palette is what makes a setting feel real rather than described.
```

---

## `bible/timeline.md`

The in-world clock. Generated novels fail at time constantly: it rains on the same Tuesday
three times, a journey takes two days in chapter 4 and two hours in chapter 19, a pregnancy
runs four months.

```markdown
| Chapter | In-world date/time | Season | Weather | Elapsed since previous |
  Location(s) | Time-critical constraint |
```

Plus: **fixed dates** — birthdays, deadlines, festivals, the date of the ghost event, the
date the antagonist's plan completes. And **the clock**: what is counting down, from when,
and what happens at zero. If the story has no clock, say so and recommend whether it needs
one (most commercial novels do).

---

## `bible/glossary.md`

Invented terms, slang, titles, place names, with definition and **capitalization/italics
convention**. Consistency of invented terminology is checked at Pass 3 of the editor kit.
Rule: no more than ~2 invented terms introduced per chapter, and each must be defined in
context by use, never by glossary dump.

---

## `bible/threads.md`

The setup-and-payoff tracker. This is how foreshadowing stops being accidental.

```markdown
| Thread ID | Type (foreshadow / subplot / motif / mystery / promise / Chekhov's gun) |
  Planted in ch | Description | Must pay off by | Status (open / advanced / paid / cut) |
  Payoff note |
```

Rules the pipeline enforces:
- Every thread planted must have a payoff chapter assigned at planting time. If you can't
  say where it pays off, don't plant it.
- A gun loaded in act one that never fires is a broken promise and readers will feel
  cheated. Log it as `CUT` explicitly if it's abandoned.
- **Plant → advance → pay.** A payoff with no plant reads as a cheat. A plant with no
  payoff reads as a mistake. Aim for at least one payoff every 4–6 chapters.
- Motifs from the Stage 0 Seed List get assigned to chapters here.

---

## `bible/style-spec.md`

Generated by `07-style-engine.md`. This is the voice contract and it is attached to every
chapter call. Do not skip it — it is the difference between a book with a voice and a book
with prose.

---

## Output

```
STAGE 2 — BIBLE. Using the Story Design Document and Beat Map, generate all bible files.

Before writing characters, give me the CASTING PLAN: every character who appears in the
Beat Map, their function, and a flag for any two that should be merged. Ask me to approve
the cast before you write the sheets. [APPROVAL]

Then write the files. For any character or location the Beat Map requires but the Story
Design Document does not define, propose them — do not invent silently.

End with a COMPLETENESS AUDIT:
- Any chapter in the Beat Map with no POV character assigned?
- Any POV character with no want, no misbelief, and no voice spec?
- Any location referenced in the Beat Map but absent from world.md?
- Any thread planted with no assigned payoff chapter?
- Any obligatory genre scene with no character capable of carrying it?
- Any rule of the world that the plot will need to bend later? Flag it NOW, before you
  write it into a corner.

Write all files, then STOP.
```
