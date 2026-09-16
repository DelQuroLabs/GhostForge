# Ghostforge working agreement

How any agent (and human) session works on this repo. Adapted from the
useful core of `MASTER-WEB-BUILD-AGENT-SCRIPT-v15.6.0` — minus its
JSON-schema bureaucracy, which this solo project does not need.
Proportionate rigor is itself one of that spec's rules.

## 1. Evidence honesty

Report verification with exactly one of these states:

- **passed** — ran against current code, assertions met. Record command + timestamp.
- **failed** — ran, assertions not met.
- **blocked** — could not run (missing capability/service). Record the reason.
- **not-run** — not attempted. Never summarize as success.
- **not-applicable** — out of scope, with a one-line reason.

Never upgrade `not-run` / `blocked` / `not-applicable` into a pass by
implication ("should work", "code-reviewed" ≠ passed). "Code-reviewed only"
is an honest `not-run` note, not a pass. After any code change, affected
gates go stale and must be re-run. The ledger lives in `VERIFICATION.md`.

## 2. Secrets and the leak safeguard

- Never ask the user to paste a secret in chat or in `.env`. Setup works
  with the publishable key + user-executed dashboard SQL only (standing rule).
- Never write secret *values* into source, logs, evidence, backups, or chat.
  Key *names* and the UI-visible `hasKey`/`last4` badge are fine.
- Carve-out: `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` are public by
  design (client bundle needs them); they are still git-ignored and never
  printed. Service/secret keys must never exist on this machine.
- **If the user posts something that looks like a real secret, key, token,
  or private credential: stop, warn them immediately, recommend rotation,
  and redact it from anything retained.** Warn first even if they said
  "use this". False positives are harmless; silence is not.

## 3. Destructive actions need explicit confirmation

- Never delete, wipe, or overwrite the user's books, chapters, reports, or
  settings to make testing convenient. The `.e2e.sh` suite wipes the shelf —
  run it **only** on an empty shelf, and say so before running.
- Never deploy, publish, buy, change DNS, spend money, or force-push without
  a current-turn confirmation that names the action, cost, and impact.
- Prefer targeted, reversible probes (create → verify → delete the probe)
  over suite-wide or destructive runs.

## 4. Cost: no spend without an explicit user action

- No AI or TTS call is ever triggered by the agent speculatively: no test
  loops against `/ai/test`, no forge/enhance/review calls "just to check",
  no audio generation of any kind unless the user pressed Forge in the app.
- Batch/billable operations in the app must keep their confirm dialogs.
- Free local checks (tsc, stub-server probes, grep scans) are always fine.

## 5. Memory continuity

`PROJECT-STATE.md` is the durable project memory: live server, shelf,
open items, next actions, decisions, blockers, preferences. Any session
that changes the state of the world updates that file before finishing,
so the next session resumes instead of cold-starting.

## 6. Verification gates (this project's actual set)

| Gate | Command / method | Record in |
|---|---|---|
| typecheck-app | `npx tsc --noEmit` (real exit code, no pipe-masking) | `VERIFICATION.md` |
| typecheck-server | `npx tsc -p tsconfig.server.json --noEmit` | `VERIFICATION.md` |
| stub-smoke | stub :3999 + stub server, targeted create/verify/delete | `VERIFICATION.md` |
| e2e-full | `.e2e.sh` — empty shelf only (§3) | `VERIFICATION.md` |
| secret-scan | pattern grep + hygiene checklist (§2) | `VERIFICATION.md` |
| live-smoke | health/books/ai-cfg/served-strings on :3000 | `VERIFICATION.md` |
| prod-build | `npm run build` — required before any deploy | `VERIFICATION.md` |

## 7. Scope and non-goals

Local single-user dev server. No auth, no rate limiting, no CSRF surface
(no cookie auth) — correct for localhost, and a documented reason to
**never expose this server to the internet without adding auth first**.
A11y/perf/browser-matrix gates are not tracked; the app is a
desktop-first solo tool, and adding them is a future decision, not an
oversight.
