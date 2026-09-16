# STYLE ENGINE

Voice generation and anti-AI-prose enforcement. This is what stops the book from reading
like it came out of a language model — which is the single most common complaint about
AI-assisted fiction, and almost entirely a matter of enforceable rules rather than talent.

> **Send:** `BUILD THE STYLE SPEC.` (Stage 2, after the Story Design Document exists)

---

## Part 1 — Generating the voice

Voice is not a vibe. It is a set of measurable parameters. The model must specify all of
them, with examples, before drafting chapter 1.

```
BUILD THE STYLE SPEC from the Story Design Document. Produce bible/style-spec.md.

1. NARRATIVE POSTURE — person, tense, POV count, psychic distance default, and how close
   the narration sits to the character's own diction (free indirect? reported? detached?).

2. SENTENCE ARCHITECTURE
   - Target average sentence length, in words, with a range.
   - The distribution: what proportion are short (<10), medium (10-20), long (20+)?
   - Sentence shapes favored: cumulative, periodic, balanced, fragmented?
   - Subordination habits: hypotactic (nested clauses) or paratactic (and, and, but)?
   - Fragment use: never / rare / a deliberate weapon?
   - Paragraph length distribution.

3. DICTION — register on a 1-10 scale (1 = colloquial/vulgar, 10 = formal/ornate), with
   5 quoted example words or phrases that pin it down. Vocabulary source: what domain does
   this narrator's language come from? (A sailor, a surgeon, a teenager, a poet, and a
   bureaucrat all describe a storm differently.)

4. FIGURATIVE LANGUAGE
   - Frequency per 1,000 words.
   - Domains it draws from — the metaphor sources. This is the strongest single marker of
     voice. A book about a farmer should reach for growth, weather, animals, machinery,
     and debt, not for oceanography.
   - Simile vs. metaphor preference.
   - Taboos: what this book never compares anything to.

5. RHYTHM SIGNATURE — how the prose accelerates and brakes. Where it uses repetition as a
   device. What a high-tension passage looks like versus a reflective one, in word counts.

6. IMAGERY AND SENSE — the dominant sense, the recurring images, the palette. Which senses
   are foregrounded and which are nearly absent (most AI prose is ~95% visual; fix that).

7. INTERIORITY — how thought is rendered. Free indirect? Italics? Direct interior
   monologue? How often? How long do interior passages run before returning to action?

8. DIALOGUE MECHANICS — tag policy, action-beat frequency, formatting, how much is
   interrupted or trailed off, whether characters speak in complete sentences.

9. THE THREE DISTINCTIVES — the three things a reader would recognize blind. Write them
   as rules the draft must satisfy. If you cannot name three, the voice is not distinct
   enough yet; iterate.

10. DEMONSTRATION — write 300 words of this book, from the opening of chapter 1's first
    scene, as a proof of concept. Then write the same 300 words in a deliberately DIFFERENT
    voice (change register, sentence length, and figurative domain), so I can choose.
    Label them VOICE A and VOICE B. Recommend one. [APPROVAL]

Write to bible/style-spec.md.
```

---

## Part 2 — The banned list

Enforced at Gate 3 (do not write it) and Gate 4 (find it).

### Vocabulary and phrases
`delve` · `tapestry` · `testament to` · `navigate the complexities` · `a mix of X and Y` ·
`it's important to note` · `in today's world` · `the air was thick with` · `a shiver ran
down [my/their] spine` · `little did they know` · `in that moment` · `for what felt like an
eternity` · `something in his eyes` · `time seemed to stop` · `the weight of the silence` ·
`a flicker of [emotion] crossed her face` · `his jaw tightened` (unless it earns it) ·
`she let out a breath she didn't know she was holding` · `the city hummed with energy` ·
`words hung in the air`

### Constructions
- **Triadic lists as a tic.** Three-item lists are rhythmically pleasing, which is exactly
  why models overuse them. Count them. Budget: no more than one per 1,000 words.
- **"Not X, but Y."** A powerful construction used sparingly; a crutch used constantly.
  Budget: no more than 2 per chapter.
- **"It wasn't X. It was Y."** Same construction, worse cadence. Ban it.
- **Em-dash overuse.** Count em-dashes. Budget: under 3 per 1,000 words. If the prose is
  full of them, rewrite with periods and commas.
- **Hedged endings.** "…and for the first time, she understood." Delete the sentence.
- **Thematic summary at scene ends.** Any final sentence that tells the reader what the
  scene meant. Delete it. Trust the scene.
- **Anaphora in narration.** Repeating a sentence opener for effect. Rare, deliberate, or
  not at all.
- **Nominalizations.** "made a decision" → "decided." "conducted an investigation" →
  "investigated."
- **Weak verb + adverb.** "said quietly," "walked quickly," "looked intently." Find the
  verb that carries it.

### Filter words
`she saw` · `he heard` · `she noticed` · `he realized` · `she felt` · `he wondered` ·
`she remembered` · `he thought` · `it seemed` · `she knew`

These insert a camera between reader and experience. Delete the filter and state the
perception directly.

> **Filtered:** *She heard the door slam and felt her heart race.*
> **Direct:** *The door slammed. Her heart raced.*

Exceptions: when the act of noticing is itself the point, or in a deliberately distant
psychic register.

### Structural clichés
Opening on weather · opening on waking · opening on a mirror · opening on a dream · opening
with a rhetorical question · opening with dialogue that has no referent · the car
conversation · the villain monologuing their plan · the "we're not so different, you and I"
· the amnesia reveal · the "it was all a simulation/dream/manuscript" ending · characters
describing each other's appearance in conversation · the walk-and-talk that exists only to
deliver exposition.

---

## Part 3 — Positive rules

Banning bad habits leaves a vacuum. These fill it.

1. **Concrete beats abstract, always.** Not "the meal was bad" — "the chicken was the
   colour of a bandage." Not "he was poor" — "he counted the change twice and bought the
   smaller one."
2. **Specific beats general.** Proper nouns, brand names, exact numbers, real streets.
   "A beer" is nothing; "a warm Pabst in a can that had been in the truck since Tuesday"
   is a world.
3. **Behavior beats interiority.** What the hands do tells the reader what the heart is
   doing, faster and better.
4. **Verbs carry the sentence.** If a sentence has a form of "to be" plus a prepositional
   phrase, it can probably be rebuilt around a real verb.
5. **Cut the first sentence of the paragraph.** Usually it's a run-up.
6. **One strong image per paragraph.** Two compete and cancel.
7. **Contractions, always,** unless the register is formal or the character is being
   deliberate. Uncontracted dialogue is the most obvious AI tell in fiction.
8. **Vary the openings.** No three consecutive sentences starting with the same word or the
   same construction (subject-verb, subject-verb, subject-verb).
9. **Asymmetry.** Perfectly balanced prose reads as generated. Deliberately unbalance:
   an unexpectedly short sentence, an oddly specific detail, a slightly wrong word choice
   that a human would make.
10. **Leave something out.** The reader participates when there's a gap. Over-explanation is
    the most common failure in AI prose and the hardest to self-diagnose, because the model
    was trained to be thorough.

---

## Part 4 — The prose self-check (run at Gate 4)

```
PROSE AUDIT on the draft. Report counts and quoted locations. No commentary, just data,
then the 10 highest-impact fixes.

COUNTS:
- Em-dashes: n  (budget: <3 per 1,000 words)
- Triadic lists: n  (budget: <1 per 1,000 words)
- "Not X, but Y" and "It wasn't X. It was Y.": n  (budget: <2 per chapter)
- Filter words (list all instances): n
- Named emotions ("felt", "was angry", "sadness", etc.): n
- Adverbs attached to dialogue tags: n
- Sentences beginning with the same word as the previous sentence: n
- Adjective-before-noun clusters (2+ adjectives): n
- Distinct figurative images, and the domains they come from: n / [domains]
- Average sentence length and its standard deviation: n / n

TESTS:
1. Read any 3 consecutive paragraphs. Could they have been written about a different book
   with the nouns swapped? If yes, the prose is generic. Quote them.
2. Find the most "AI-sounding" sentence in the chapter. Quote it and rewrite it.
3. Find the best sentence in the chapter. Quote it.
4. Does any paragraph end with a sentence that explains the paragraph? Quote and delete.
5. Sample 10 dialogue lines. Are they all complete grammatical sentences? Humans don't
   talk that way. Quote the worst 3.
6. Is there any sentence you wrote because it sounded good rather than because it was
   true to the scene? Quote it.

Then apply the top 10 fixes and re-output the affected paragraphs only.
```
