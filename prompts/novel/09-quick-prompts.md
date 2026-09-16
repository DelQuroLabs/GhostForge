# QUICK PROMPTS & TROUBLESHOOTING

---

## Driving the engine

| Send this | Get this |
|---|---|
| `STAGE 0 — CONCEPT FORGE. Premise: [...]` | Story Design Document |
| `STAGE 0. I have no premise. Interrogate me.` | Guided concept development |
| `STAGE 1 — STRUCTURE.` | Architecture choice + Beat Map |
| `STAGE 2 — BIBLE.` | All bible files + casting plan |
| `BUILD THE STYLE SPEC.` | Voice spec + two sample openings to choose from |
| `CHAPTER N — GATE 1.` | Chapter Brief (approval) |
| `CHAPTER N — GATE 2.` | Scene Cards (approval) |
| `CHAPTER N — GATE 3.` | Draft |
| `CHAPTER N — GATE 4.` | Self-critique |
| `CHAPTER N — GATE 5.` | Revised chapter + change log |
| `CHAPTER N — GATE 6.` | Ledger delta + next-chapter setup |
| `Run Gates 1-6 for chapter N without stopping.` | Full chapter, fast mode |
| `ACT AUDIT — chapters x through y.` | Act-level structural review |
| `PRUNE THE LEDGER.` | Compressed ledger under 1,200 words |

---

## Mid-chapter controls

- **`Rewrite scene 2 only. Keep everything else byte-identical.`**
- **`The turn didn't land. Diagnose why before you rewrite.`**
- **`Cut 20% from this chapter. Tell me what you cut and why.`**
- **`More interiority in the disaster beat. Full MRU treatment.`**
- **`Less interiority. Get out of their head and back into the room.`**
- **`The dialogue is on the nose. Add subtext — nobody says what they mean.`**
- **`Slow this moment down. Expand to 3x length without adding new information.`**
- **`Speed this up. Same events, half the words.`**
- **`Change POV to [character]. What does this chapter become?`**
- **`Rewrite the first and last paragraph only. Both are weak.`**

---

## Recovery prompts

**The middle is sagging**
```
The middle of this book is sagging. Diagnose before prescribing. Read the Beat Map rows
for chapters [x]-[y] and tell me: which chapters have no value turn, which repeat a job
already done, where the complications stopped escalating, whether the midpoint was a real
context shift or just a bigger event, and whether the antagonist has been applying pressure
or has gone passive. Then give me 3 structural options: compress, inject a new
complication, or reorder. State the cost of each.
```

**The book drifted from the plan**
```
Compare what the Beat Map said chapters [x]-[y] would do against what the Ledger says they
actually did. List every divergence. Then tell me: is the drift better or worse than the
plan, which divergences should be adopted as the new plan, and what the downstream
consequences are for the remaining chapters. Update the Beat Map only after I approve.
```

**A character has gone flat**
```
[Character] has become a plot function. Re-read their character sheet and every scene
they've appeared in per the Ledger. Where did they stop acting on their own want? Give me
the 3 moments that broke them, and how to repair each without changing the plot events.
```

**It keeps writing the same scene**
```
You have written functionally the same scene [n] times: [describe]. Identify the pattern —
same beats, same value shift, same dialogue shape. Then tell me what varies nothing, and
propose 3 genuinely different versions of this scene's job.
```

**Voice has drifted**
```
Run the prose audit from 07-style-engine.md Part 4 on the last three chapters and compare
the counts against the Style Spec. Report every parameter that has moved, quote evidence,
and rewrite the worst 500 words to spec.
```

**Everything is too long**
```
This chapter is [n] words and should be [m]. Cut without losing the turn, the value shift,
or the hook. Cut order: description restated, interior rumination that repeats a feeling
already shown, dialogue that confirms what was already established, throat-clearing
openings, summarizing endings. Show me the cut list before the rewrite.
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Prose reads like AI wrote it | Style spec not attached, or not enforced at Gate 4 | Paste `bible/style-spec.md` into the chapter block; run the prose audit |
| Every chapter feels the same | Beat Map rows all say "advance the plot" | Rewrite each row's Job to name what *only* this chapter does |
| Story drifts and forgets | Ledger not pasted, or unpruned and truncated | Paste the pruned ledger every call; prune at act breaks |
| Characters know things they shouldn't | Knowledge Tracker not being checked | Add: `Audit every line against the Knowledge Tracker. Quote any breach.` |
| Middle collapses around 40–60% | No midpoint context shift; complications stopped escalating | Re-run the sagging-middle recovery prompt |
| Endings arrive too easily | Crisis isn't a real best-bad choice | `Rewrite the crisis as two options that both cost the protagonist something they cannot replace.` |
| Conflicts resolve by luck | Causality rule not enforced | Add: `Any resolution by coincidence, sudden competence, or antagonist error is CRITICAL. Find them.` |
| Dialogue is exposition | No subtext requirement at Gate 2 | Fill in the `DIALOGUE LOAD — subtext` field on every card before drafting |
| Chapters run 2x the target | No word budget allocation per scene | Set per-scene budgets at Gate 2, not just a chapter total |
| It writes past the approval gate | Gate discipline broke | Add: `Stop at [APPROVAL] gates. Do not draft until I approve. If you have drafted, delete it.` |
| It agrees with all your notes | Directive 11 not firing | Add: `Tell me which of my notes would damage the book, and why, before you implement them.` |
| Emotions get named constantly | Tell-don't-show | Add: `Strike every named emotion. Replace with behavior or physical response. List what you struck.` |
| Output truncates mid-chapter | Context overflow | Split the chapter into two scenes, draft separately, then: `Smooth the seam.` |
| Scenes are all the same length | No rhythm direction | `Vary scene lengths: one long, one short, one very short. Rhythm is a tool.` |
| It invents new characters mid-book | Bible not treated as closed | Add: `The cast is closed. Any new named character requires [MACRO] flag and my approval.` |

---

## Handoff to the editor kit

Once the draft is complete, switch tools. The novel engine is a writer; the editor kit
(`book-editor-prompt-kit.md`) is a critic. Using the writer to critique its own book at
manuscript scale produces soft notes.

1. Run `Session Setup — Auto-Detect` on the finished manuscript. It re-reads the book cold,
   which catches drift you can no longer see.
2. Run Pass 0 to profile the voice the book actually ended up with, versus the spec.
3. Run Pass 1 (developmental) chunk by chunk with the ledger.
4. Run the Full-Manuscript Report.
5. Then Passes 2 and 3.

The Ledger you built during generation is directly reusable as the editor kit's ledger — the
formats match deliberately.
