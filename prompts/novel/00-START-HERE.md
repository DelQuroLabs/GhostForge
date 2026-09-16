# NOVEL ENGINE — START HERE

A gated, chapter-by-chapter novel generation system. Genre-agnostic. Built on real story
architecture (Story Grid, Save the Cat, Swain's scene/sequel, MRU sequencing, Gardner's
psychic distance) rather than "write me chapter 3."

**The core idea:** an LLM does not fail at novels because it can't write sentences. It fails
because it has no spine. It drifts, it forgets, it resolves conflicts by coincidence, it
names an emotion instead of dramatizing it, and by chapter 12 the story has quietly stopped
being about anything. This engine exists to supply the spine and enforce it mechanically,
one gate at a time.

---

## The two layers

**Layer 1 — The Brain.** `01-master-system-prompt.md` goes in the *system prompt / project
instructions* field. It defines who the model is and the rules it can never break.

**Layer 2 — The Library.** Everything else gets attached as *knowledge files*. The model
reads them on demand. They are craft law, not suggestions.

| Where | File |
|---|---|
| Project instructions / system prompt | `01-master-system-prompt.md` |
| Knowledge files (attach all) | `02-concept-forge.md`, `03-structure-library.md`, `04-bible-builder.md`, `05-chapter-pipeline.md`, `06-craft-rules.md`, `07-style-engine.md`, `08-ledger-and-templates.md` |
| Keep open yourself | `00-START-HERE.md`, `09-quick-prompts.md` |

**ChatGPT Projects:** create a Project, paste `01` into "Instructions," attach `02`–`08`
under "Knowledge." **Claude Projects:** paste `01` into "Custom Instructions," attach the
rest as "Project Knowledge." Either works. If your tool has only one text field, paste `01`
then `06` then `07` in that order — those three carry most of the behavioral weight.

---

## The five stages

Run them in order. Do not skip. Each stage produces files you keep.

### Stage 0 — Concept Forge (`02-concept-forge.md`)
You give a premise, a fragment, a genre, or literally one image. It interrogates the idea,
finds the engine, and produces the **Story Design Document**: desire/need/ghost/misbelief,
antagonist, stakes ladder, dramatic question, theme as argument, genre obligatory scenes,
and the ending written *first*.

> Send: `STAGE 0 — CONCEPT FORGE. Premise: [...]`
> Out: `story-design.md`

### Stage 1 — Structure (`03-structure-library.md`)
Chooses a narrative architecture from 11 options, maps it to your target word count, and
converts it into a **chapter-numbered beat map** so every chapter knows exactly where it
sits in the book and what its job is.

> Send: `STAGE 1 — STRUCTURE. Use the Story Design Document.`
> Out: `beat-map.md` (the single most important file in the project)

### Stage 2 — Bible (`04-bible-builder.md`)
Generates the story bible as discrete files: characters, world, timeline, glossary, threads,
style spec. These are what stop continuity rot.

> Send: `STAGE 2 — BIBLE.`
> Out: `bible/characters.md`, `bible/world.md`, `bible/timeline.md`, `bible/style-spec.md`, `bible/threads.md`

### Stage 3 — The Chapter Pipeline (`05-chapter-pipeline.md`)
The engine proper. Six gates per chapter. **You approve at Gate 1 and Gate 2. It drafts at
Gate 3. It attacks its own draft at Gate 4. It revises at Gate 5. It updates the ledger at
Gate 6.** Nothing reaches you as prose until it has already been through adversarial review.

> Send: `CHAPTER 1 — GATE 1.`
> Out: `manuscript/ch-001-slug.md`

### Stage 4 — Revision (`09-quick-prompts.md`)
Act-level and manuscript-level passes using the editor kit you already have. The novel
engine writes; the editor kit fixes. They are designed to hand off to each other.

---

## Why gated, not one-shot

A one-shot chapter draft is one decision tree that never gets checked. By the time you see
prose, the structural mistake is already buried under 3,000 polished words — and you will
keep it, because it's written and it's fine and rewriting is expensive.

Gating moves the failure upstream. Catching "this scene doesn't turn a value" at Gate 2
costs you one line of text. Catching it at Gate 5 costs you a chapter.

| Gate | What happens | You approve? |
|---|---|---|
| 1 | Chapter Brief — job, POV, value shift, entry/exit state, plants & payoffs | **Yes** |
| 2 | Scene Cards — 2–4 cards, goal/conflict/disaster + reaction/dilemma/decision | **Yes** |
| 3 | Draft — prose to the cards | no |
| 4 | Self-Critique — adversarial review against craft rules, unseen by you | no |
| 5 | Revise — applies the critique, delivers the chapter | **Yes** |
| 6 | Ledger Delta + next-chapter setup | no |

If you ever want speed over control: `Run Gates 1–6 for chapter N without stopping.` You
still get the self-critique, you just skip the approval checkpoints.

---

## Context management (this is where projects die)

Your tool has a context window and it will not hold a 90,000-word novel. The engine is built
around that constraint, not in denial of it.

**Attach to the project (static, rarely changes):** `01`–`08`, plus `bible/*`.

**Paste at the top of every chapter call (dynamic, changes constantly):**
1. The **Beat Map** — just the current chapter's row plus the 2 chapters before and after
2. The **Locked Brief** — genre, promise, POV/tense, theme, hard constraints
3. The **Style Spec** — the voice contract
4. The **Running Ledger** — continuity ground truth

Sections 10 and 8 of `08-ledger-and-templates.md` give you the exact paste block. Keep it
under ~1,200 words. Prune aggressively; the ledger is a working document, not an archive.

**Download every chapter as a file** and keep the manuscript in your workspace, not in chat
history. Chat history gets truncated and the model will silently forget chapter 4 by
chapter 15.

---

## Output file convention

```
novel-project/
  story-design.md
  beat-map.md
  bible/
    characters.md
    world.md
    timeline.md
    glossary.md
    threads.md
    style-spec.md
  ledger/
    running-ledger.md
  manuscript/
    ch-001-the-slug.md
    ch-002-the-slug.md
```

Every chapter file carries YAML frontmatter (template in `08-ledger-and-templates.md`) with
its chapter number, POV, word count, value shift, and beat position. That frontmatter is
what lets you — or a tool like Novelcrafter — reassemble and re-query the book later.

---

## The five rules that make this work

1. **The ending is written first.** You cannot build tension toward a destination you
   haven't chosen. Stage 0 forces a decision.
2. **Every scene turns a value.** A scene that ends the same polarity it began gets cut or
   merged. No exceptions. This is checked at Gate 1, Gate 4, and in the ledger.
3. **Nothing happens by coincidence.** Complications may arrive by chance. Resolutions may
   not. Enforced at Gate 4.
4. **The voice is a contract, not a vibe.** `07-style-engine.md` makes the model specify
   sentence-length distribution, diction register, figurative domains, and a banned list —
   then holds every draft to it.
5. **The ledger is canonical.** If it isn't in the ledger, it didn't happen. If it's in the
   ledger, later chapters may not contradict it.
