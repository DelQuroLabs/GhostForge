# Ghostforge project state (durable memory)

Update this file whenever a session changes the state of the world.
Last updated: 2026-09-13 (async jobs + revise loop live; 187 'Respawn Point' landed).

## Live server

- Process `ghostforge-b92a4a6d`, `:3000`, jobs build (async create/gates/revise + live progress + Reader revise loop).
- AI config: `openai` / `gpt-5.6-luna` / `hasKey=true` / `last4 …xJIA` (verified via API, badge-visible only).

## Shelf

- **181 'Wickedfall'**, one-click, complete. Pen 6 (`William DelQuro`), series 7 (`Cash^3`).
- **185 'The Apocalypse of Keep'**, one-click, complete (user-forged).
- **186 'The Tutorial Lies'**, ENGINE, forging — Stages 0–2 + ch1 (Brief→Cards→Write)
  + ch2 (Fast) all on real Luna. 2/20 chapters written (1,536w + 1,547w),
  both stamped `gpt-5.6-luna`, ledger 9,388 chars. Design 27K / beatmap 26K / bible 53K.
- **187 'Respawn Point'**, ENGINE (LitRPG 30kw, user's 5th press): Stages 0–2
  landed on the shelf while the user's tab/proxy had already given up — the
  incident that motivated the async jobs system (below).
- **190 'F-Tier'**, ENGINE (user's 6th press): Stages 0–2 landed (design +
  15 chapters), 0 chapters written yet — ready for gates.
- Real-Luna engine history: #1 S0 fence-miss → lenient extractor; #2 S0
  `fetch failed` → transport retry; #3 S0 refusal + trailing comma →
  completion law + tolerant JSON; #4 (`wmzi2s`) FULL GREEN S0→S1→S2.

## Open items

1. Book 186 chapters 3–20: user runs gates (step-by-step or Fast-write all) in the Chapters tab.
2. ~~AI badge hard-refresh confirm (user saw stale "no key")~~ — DONE: badges now self-heal (`useRefetchOnFocus` re-checks on mount/tab-focus/tab-visible + manual ↻ button in Settings & AI Studio; NewBook AI section too).
3. Migration-03 v2 (list-view backfill for ledger/bible).
4. Full 83-check E2E: only on an empty shelf — never while user books exist.
5. Audio forge/file/full/zip paths: code-reviewed only, never run live (standing rule).

## Next actions

1. User opens book 186 → Chapters tab → writes ch3+ (or Fast-write all 18).
2. User confirms Settings badge shows `key set …xJIA` after hard refresh.
3. Draft + user-run migration-03 v2 SQL in Supabase dashboard.
4. User tries any long run on the jobs build (live checklist, tab-drop safe); confirms revise loop on a reviewed chapter.
5. PRODUCTION: user creates private GitHub repo from `ghostforge-deploy.zip`, pushes, connects Coolify on Contabo (see `DEPLOY.md` §1–4), locks the front door (basic auth or unguessable subdomain).

## Decisions (durable)

- No audio generation without an explicit in-app Forge press (TTS costs money).
- No secrets in chat or `.env`; publishable key + dashboard SQL only.
- E2E suite wipes the shelf → empty-shelf-only; targeted stub probes otherwise.
- Engine create stores beats from beatmap; backup reads `books` directly, not `v_books_list`.
- Editor report modal fetches the body on open (`openReport`).
- AI transport failures retry 3× (1s/2s backoff); AbortError passes through.
- Gates 1/2/6 self-heal on missing headers (`chatWithKeywordRepair`, proven
  3/3); Gate 4 critique gets its own repair round; draft floor is
  budget-aware (400w full-length, scaled for short chapters).
- S0 forces completion: COMPLETION LAW overrides P02's interrogation rounds
  (propose-3/recommend-1/lock, never stop); JSON tolerates trailing commas;
  `toDesign` validates completeness inside parse so gaps trigger gap-aware
  repair (2 rounds for S0); S1 gets the typed design as authoritative backup.
- PROVEN 2026-09-13 on real Luna (`wmzi2s` + agent-run gates): S0✓, S1✓ via
  1 repair, S2✓ → book 186; G1 brief 9K, G2 cards 25K, Write ch1 1,536w,
  Fast ch2 1,547w, ledger 9.4K. `missInfo` now logs fence labels.
- Long runs are async jobs (`POST /api/engine/jobs` kind=create|gates|revise →
  202 + poll `GET /api/engine/jobs/:id`); in-memory store, 10-min retention,
  server restart drops runs (client shows JOB_GONE + shelf check). Sync
  create/gates routes kept for API compat; brief/cards stay sync (one call).
- Revise loop: Reader "Revise…" modal → approve findings + notes → revise job
  runs `runReviseChapter` (approved fixes ONLY, fence-first draft, 15%
  length match) → chapter body replaced, stamped with the model.
- React hooks must ALL run above any early return (`if (!book) return …`)
  — effects placed after one blank-screened every book/chapter open
  ("rendered more hooks", fixed 2026-09-13). `ErrorBoundary` around Routes
  + load-fail retry UI are the safety nets; never remove them.
- Editor-in-Chief reports are advisory only — the edit paths live in the
  report modal: "Open chapter" (free, jump to reader) and "Apply to
  chapter…" (1 AI call, revise job fed by the report body, then a link to
  the revised chapter). Chapter passes only; book-level reports stay read-only.
- Governance: adopted evidence-honesty, leak safeguard, destructive-action
  confirms, cost policy, and this memory file from the v15.6.0 agent script;
  skipped its JSON schemas, waivers, capsules, store facts, and A11Y gates
  as disproportionate (see `AGENTS.md` §7).

## Blockers

- None. (Real-Luna Stages 0–2 outcome is user-action-gated, not blocked.)

## Preferences (user-stated, standing)

- Never build/generate audio unless explicitly asked inside the audio studio.
- Never ask for service keys or any secret.
- Plain-English, ELI10 explanations for setup steps.

## Pointers

- `AGENTS.md` — working agreement · `VERIFICATION.md` — gate ledger ·
  `AUDIT.md` — 2026-09-13 full-audit report · `SUPABASE*.sql/.md`, `DEPLOY.md` — setup.
