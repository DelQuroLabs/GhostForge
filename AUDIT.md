# Ghostforge full audit — 2026-09-13

Every page, button, and function traced handler → API → route → DB. Live server: `ghostforge-live-caf36430` on :3000.

## Verdicts

| Area | Result |
|---|---|
| Dashboard, NewBook, Brands, AiStudio, AgentPack, ImportBook, Settings | ✅ all controls wired + errors surfaced |
| BookWorkspace (overview/plan/outline/chars/publish/audio + 4 modals) | ✅ fixed 1 (delete robustness) |
| ChapterReader (save/regen/draft/review/enhance/listen) | ✅ no issues; XSS escape verified |
| PlanTab | ✅ fixed 1 (re-draft gap); stale-state scare disproven (`key={updated_at}` + all 3 plan ops touch `updated_at`, incl. `rpc_plan_draft` line 254) |
| EditorTab | ✅ fixed earlier (modal fetch); cleaned dead ternary; synopsis-null path + PASS_ORDER verified server-side |
| AudioTab + TtsSettings | ✅ fixed 1 (test-now-saves-first trap) |
| Components (ui/ReviewPanel/Cover/CopyFallback/ListenBar) | ✅ `#editor-review` scroll target exists; Button `to` supported |
| App routing | ✅ fixed 1 (added 404 catch-all) |
| Server: 44 routes + 8 audio + health | ✅ every route has UI or E2E coverage; Zod→VALIDATION+fields, HError, NO_KEY envelope verified |
| Gates route | ✅ NO_BEAT/NO_DESIGN/HAS_BODY/NO_BRIEF/NO_CARDS all graceful with clear messages |
| Libs (importSplit/download/clipboard/premises) | ✅ splitter no-throw; premises smoke-tested earlier |

## Bugs found & fixed this audit (8)

1. **Engine books got an empty cover `{}`** → black/blank cover on shelf. New `coverForGenre()` in `fullBook.ts`, used by engine create. Verified live on stub: full Horror palette + motif.
2. **Server tsc red (deploy-blocker).** Engine-create literal was missing `idx` and `totalWords` — `npm run build` would have failed. Fixed; both configs EXIT 0.
3. **TTS "Hear test line" rendered saved settings, not the form** — unsaved voice changes were silently ignored. Test now saves first.
4. **PlanTab had no re-draft** once a plan existed (confirm text implied it). Added "Re-draft with AI".
5. **Book delete had no busy/error handling** — double-click + silent failure. Wrapped.
6. **NewBook veil sub-line stale** ("One large AI call… one at a time"). Now "Three big AI calls… step by step, or Fast 1–6."
7. **Brands deletes were silent on failure** (no try/catch). Wrapped with `setErr`.
8. **No 404 route** (blank page on bad URL). Added "Lost in the stacks".

## Deliberate non-issues (checked, left alone)

- Blank key field after save = by design (badge is proof).
- Enhance works on engine chapters (explicit user action; re-stamps `written_by` honestly).
- Chapter add on engine books beyond beatmap → clean `NO_BEAT` 400, surfaced.
- FEAT: no "forge all audio" without confirm — confirm dialog present; no auto-forge anywhere.
- p2/p3 without priors → clean `PASS_ORDER` 409 with instructions.

## Verification (no real-LLM spend, no user-book risk)

- `tsc` app + server: EXIT 0. Cover unit smoke: OK.
- Stub engine create → book 182 (6 chs, pipeline novel-v1, bible+ledger, real cover) → stub Fast gate 592w ledger-updated → deleted. Shelf back to exactly 181 'Wickedfall' (complete).
- Full 83-check E2E **not** re-run: it wipes all books, which would destroy 181. Re-run only on an empty shelf.
- Live :3000 serves new copy; Luna cfg untouched (`openai/gpt-5.6-luna/hasKey/last4 …xJIA`).

## Still open (unchanged)

- Watched real-Luna Stages retry (transport retry + lenient extractor shipped, awaiting user press).
- AI badge hard-refresh confirm. Migration-03 v2 (list-view backfill).
- Audio forge/file/full/zip paths: code-reviewed only, never run live (per no-audio-without-asks rule).
