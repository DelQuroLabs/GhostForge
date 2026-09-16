# LEDGER, TRACKERS & TEMPLATES

The continuity system. Generated novels fail on continuity far more visibly than on prose
quality, because a reader forgives a flat sentence and does not forgive a dead character
walking into a room.

The rule: **if it isn't in the Ledger, it didn't happen. If it's in the Ledger, no later
chapter may contradict it.**

---

## The Running Ledger — `ledger/running-ledger.md`

This is the file you paste at the top of every chapter call. Keep it under ~1,200 words by
pruning. It is a working document, not an archive.

```markdown
# RUNNING LEDGER
Last updated: ch-NNN | In-world date: [date/time] | Words so far: [n] / [target]

## 1. POSITION
- Current chapter in the Beat Map: N of M (act X, beat Y)
- Where we are: [location, time, who is present]
- Previous chapter ended on: [the exact state, one line]

## 2. CHARACTER STATUS
| Name | Where | Physical state | Emotional state | What they want right now |
  Status (active/offstage/dead) | Last scene |
Only characters who matter to the next 3 chapters. Archive the rest.

## 3. KNOWLEDGE TRACKER  ← the most important table in the project
| Fact / event | Who knows it | Who does NOT know it | When they learn it |
Every significant secret, reveal, clue, and lie. Generated fiction breaks when a character
reasons from information they were never given. Check this at Gate 1 (constraint #14) and
Gate 4 (audit H) every time.

## 4. TIMELINE
| Ch | In-world date | Elapsed | Season/weather | Fixed dates & the clock |
Plus: travel times established, and any deadline counting down.

## 5. ESTABLISHED FACTS
Physical details, names and their spelling, world rules invoked, objects in play, wounds,
possessions, money, distances. One line each. Only what could be contradicted later.

## 6. THREADS
| ID | Type | Planted ch | Description | Pays off ch | Status |
Status values: OPEN / ADVANCED / PAID / CUT. Anything CUT gets a one-line reason.

## 7. RELATIONSHIPS
Current state between each significant pair, and what changed it. One line per pair.

## 8. MOTIFS & SEEDS
Which of the Stage 0 seed images have been used, where, and which remain. Recurring motifs
must recur at intervals — a motif used once is a detail, used three times is a pattern.

## 9. STYLE DECISIONS
Conventions settled during drafting that aren't in the style spec: how a specific character
swears, how scene breaks are marked, whether a term is italicized, a place name settled on
chapter 7. These prevent drift.

## 10. RISKS
Continuity traps set for later chapters, unresolved questions, anything the author needs to
decide, and any Beat Map drift in force.
```

---

## The Ledger Delta

Every response that produces story content ends with one. The model appends it to the
master file.

```
LEDGER DELTA — ch-NNN
NEW FACTS: [what is now established that wasn't]
CHARACTER CHANGES: [status, location, physical, want, relationships]
KNOWLEDGE MOVED: [who learned what, who was present, who was not] ← mandatory, even if empty
TIMELINE: [in-world date now, elapsed since last chapter]
THREADS: OPENED [id, payoff ch] / ADVANCED [id] / PAID [id] / CUT [id + reason]
MOTIFS USED: [which seed, where]
STYLE DECISIONS: [anything settled ad hoc]
RISKS FOR LATER: [traps, unresolved questions, decisions needed]
BEAT MAP: [on plan / drifted — if drifted, the correction needed]
WORD COUNT: [actual] / [budget]
[MACRO] items: [anything affecting the whole book rather than this chapter]
```

---

## Pruning protocol

The ledger grows faster than your context window. Prune at every act break:

- Collapse PAID and CUT threads to a single line each: `T-004 PAID ch-14 (the letter was forged).`
- Archive characters who have left the story to a separate `bible/archive.md`.
- Merge ESTABLISHED FACTS into one dense paragraph per category rather than a bullet list.
- Keep KNOWLEDGE TRACKER, TIMELINE, POSITION, and RISKS in full, always. Those are the four
  that cause real damage when lost.
- Target: ≤1,200 words. If it exceeds 1,800, prune immediately.

---

## Chapter file template — `manuscript/ch-NNN-slug.md`

```markdown
---
chapter: 1
title: ""
slug: the-slug
pov: [character name]
person: third
tense: past
beat: [Catalyst]
act: 1
percent: 10
value_shift: "Safety (+2) → Exposure (-3)"
word_count: 2940
target_words: 3000
plants: [T-006, T-007]
pays_off: []
location: [place]
in_world_date: "Day 3, late October"
status: revised        # draft | revised | approved
last_edited: 2026-09-13
---

[chapter text]

---

[scene break marker — use --- between scenes]

---

## EDITORIAL NOTES (not part of the manuscript)
- Gate 4 findings still open:
- Deferred to later chapter:
- Author decisions pending:
```

Naming: `ch-001`, `ch-002` — zero-padded to three digits so files sort correctly. Slugs
lowercase, hyphenated, from the chapter's central image or event.

---

## The chapter paste block

Copy this at the top of every chapter call. Everything in it is dynamic.

```
=== PROJECT STATE — chapter N ===

LOCKED BRIEF
Genre/shelf: [x] | Audience: [x] | Promise to the reader: [x]
Theme-as-argument: [x] | POV/tense: [x] | Target length: [x]
Hard constraints (never change these): [x]
Controlling value: [x]

BEAT MAP — current
| Ch | Beat | POV | Job | Value shift | Plants | Pays | Words |
[rows for N-2, N-1, N, N+1, N+2]

STYLE SPEC — condensed
Register: [n]/10 | Avg sentence: [n] words | Figurative domains: [x]
Three distinctives: [1] [2] [3]
Budgets: em-dash <3/1k · triads <1/1k · "not X but Y" <2/chapter

RUNNING LEDGER
[paste — pruned, ≤1,200 words]

LAST 200 WORDS OF CHAPTER N-1
[paste verbatim]

=== END PROJECT STATE ===
```

---

## Reassembly and handoff

At every act break, run:

```
ACT AUDIT — chapters [x] through [y]. Read the Ledger and the chapter frontmatter for
these chapters and report:
1. Does the act's question get answered? What was it, and what happened to it?
2. Tension curve: the actual 1-10 rating per chapter versus what the Beat Map planned.
   Where did they diverge and why?
3. Value shifts: list them. Flag any chapter with no turn.
4. Threads: opened, advanced, paid, cut, and any that are overdue for their payoff.
5. POV distribution: who got how many chapters and how many words. Is any POV character
   overexposed or underdeveloped relative to their function?
6. Continuity: every contradiction found across the act.
7. Pacing: which chapters could be merged, which should be cut, which need expansion.
8. Voice drift: compare a sample from the first chapter of the act to the last. Has the
   register, sentence length, or figurative domain moved? Quote evidence.
9. The honest question: would a reader who stopped at the end of this act come back?
Rank findings by severity. Recommend the specific revisions before I continue.
```

Then hand the manuscript to the **editor kit** (`book-editor-prompt-kit.md`) for full
developmental, line, and copyedit passes. The engine writes; the kit fixes. They share the
same ledger format, so nothing is lost in the handoff.
