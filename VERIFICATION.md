# Ghostforge verification ledger

States: **passed** · **failed** · **blocked** · **not-run** · **not-applicable**
(per `AGENTS.md` §1 — `not-run` is never a pass). Re-run stale gates after changes.

## Current ledger (2026-09-13)

| Gate | State | Evidence |
|---|---|---|
| typecheck-app | **passed** | `npx tsc --noEmit` EXIT 0, 2026-09-13 |
| typecheck-server | **passed** | `npx tsc -p tsconfig.server.json --noEmit` EXIT 0, 2026-09-13 (after `idx` + `totalWords` engine-literal fix) |
| stub-smoke | **passed** | stub :3999 + server :3101 (2026-09-13, re-run after gates-repair patch): engine create → probe 183 → **brief** 572ch → **cards** 557ch → **write** 592w ledger-updated → **fast** on ch2 592w → probe deleted; shelf back to 181 only. Repair helper `chatWithKeywordRepair` proven 3/3 via scripted miss (happy / miss-then-repair / double-miss-throws). S0-hardening units 5/5; stub S0–S2 regression re-green after calibration (probe 184, deleted). Real-Luna proof in the `real-luna-engine` row below. |
| secret-scan | **passed** | 2026-09-13 pattern grep: 0 secret matches in `src/` + `server/` + `dist-server/`; all client fetches relative (`/api/…`); `localhost` in client = Ollama display/defaults only; `.env` holds key names `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_AUDIO_BUCKET` (public by design, git-ignored); server reads secrets via `process.env` only. `.gitignore` hardened with `*.key`, `*.token`. |
| live-smoke | **passed** | `:3000` health ok; books = 181 'Wickedfall' complete; AI cfg `openai/gpt-5.6-luna/hasKey/last4 …xJIA`; new copy served (veil line, 404 route) |
| real-luna-engine | **passed** | 2026-09-13: S0✓ S1✓(1 repair) S2✓ → book 186 (20ch/10char, design 27K/beatmap 26K/bible 53K) → G1 brief 9K → G2 cards 25K → Write ch1 1,536w → Fast ch2 1,547w; ledger 9.4K; both chapters stamped `gpt-5.6-luna`. First-ever green Novel Engine run on a real model. |
| jobs-e2e | **passed** | 2026-09-13: 6/6 stub probes on `:3101` — instant validation (BAD_PREMISE), async create (9 events, full stage chain → book 188 with 6 chapters), async gates fast (592w), async revise (1 approved fix → 592w, stamped `stub`), JOB_GONE 404, sync brief compat; probe book deleted after. |
| e2e-full | **not-run** | Reason: suite wipes all books; would destroy user shelf (181/185/186/187/190). Last full-green: run #5, 83/83, on an empty shelf. Re-run only on an empty shelf. |
| audio-forge paths | **not-run** | Reason: standing user rule — only on explicit in-app Forge press. Code-reviewed only. |
| prod-build | **passed** | 2026-09-15: `npm run build` green (vite 1595 modules → dist/ + tsc → dist-server/); prod boot on :3201 (`NODE_ENV=production node dist-server/index.js`): Supabase ✓, novel pack ✓ (`prompts/novel` resolves from dist-server), audio bucket ✓, dist/ serving ✓; smoke: /api/health ok, / 200, /books/190 SPA fallback ✓, shelf 6/6 books, /api/engine/jobs ✓, unknown API 404 ✓. Dockerfile + .dockerignore added for Coolify. |
| maintained-scanner | **not-run** | Reason: no gitleaks/trufflehog installed. Pattern-grep (above) is the current control; install a maintained scanner before any public deploy. |
| a11y/perf/visual-matrix | **not-applicable** | Reason: desktop-first solo tool; not tracked (see `AGENTS.md` §7). |

## History

- 2026-09-13: full audit, 8 fixes (`AUDIT.md`); governance files adopted
  from `MASTER-WEB-BUILD-AGENT-SCRIPT-v15.6.0` (working agreement + state +
  this ledger; schemas/waivers/capsules/store-facts deliberately skipped).
- Earlier: E2E run #5 `pass=83 fail=0` on empty shelf (stub AI, free).
- 2026-09-13: async jobs + revise loop shipped (6/6 stub probes); live restarted on the jobs build after 187 landed.
