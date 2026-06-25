# Process Notes — allotment

## 2026-06-23 — CI + dependency hardening + prior-art
- **Done:** GitHub Actions CI (ruff/mypy/pytest); cleared 11 ruff + 21 mypy-strict errors; pinned `pulp<4`; bumped `checkout@v5` / `setup-python@v6`. Added prior-art/positioning (Sortition Foundation `sortition-algorithms`, Nature 2021 leximin) to README + design spec §16; reframed issue #6 (full leximin) and filed #13 (transparent/verifiable lottery).
- **Decisions:** Keep mypy `strict` (only a legitimate `pulp` stub override). Land CI via a PR so the workflow self-verifies before merge.
- **State:** `main` green; CI live; issues #2–9 + #13 open.
- **Next:** #2 Docker/Postgres smoke (needs a real container); full leximin (#6).

## 2026-06-24 — Added CLAUDE.md + Railway deploy
- **Done:** Wrote `CLAUDE.md` (commands + architecture). Deployed the CIBC reference instance to Railway (project Citizen Infra: `allotment` + `Postgres`) at https://allotment-production.up.railway.app — verified end-to-end (SPA 200, `/api` 401 unauthenticated, authenticated create writes to DB). Full ops detail in `docs/deployment.md`.
- **Decisions:** Single CIBC Railway project (not a dedicated one); generated Railway domain; secrets in Railway env only.
- **Fixes pushed to ship the Docker build:** `6948acc` sync `ui/package-lock.json`; `e277985` `npm install` not `npm ci` (Windows lockfile omits Linux `@emnapi` optionals).
- **Gotchas (in `deployment.md`):** `PORT=8000` required (Railway injects none → 502); push auto-deploy didn't fire (redeploy via a var change builds latest `main`).
- **Next:** optional custom domain; remove the leftover `DEPLOY_NONCE` var when convenient.

## 2026-06-25 — Impeccable critique → 3 fixes shipped; Railway tooling
- **Done:** Ran `/impeccable critique` (29/40 "Good", not AI-slop). Shipped 3 fixes to the live instance: deliberate-draw + quota validation (PR #14); token-var `ALLOTMENT_ADMIN_TOKEN` + jargon copy (`b4d7d10`); warm/calm visual identity — moss-green-on-paper, Hanken Grotesk, OKLCH tokens — with `PRODUCT.md` + `DESIGN.md` (PR #15). Set up Railway agent tooling (`use-railway` skill + MCP); ran a Postgres health analysis.
- **Decisions:** Brand tone = "calm & approachable" (user's pick over civic-official). `#24`/`#25` shipped without `/impeccable teach`; `teach` run before the visual pass only.
- **Gotchas:** Railway MCP token expired mid-session (fix in `claude-config/memory/reference_railway_agent_tooling.md`). DB fresh/healthy; `random_page_cost=4` (SSD → 1.1–2) and no `pg_stat_statements` noted for when it grows.
- **State:** `main` = `f8bf991`; live instance serves the new identity; leftover `DEPLOY_NONCE` var still set.
- **Next:** `#27` first-timer/auditor guidance; `#28` polish (retire pulse, transform bars, CSV parser); optionally deepen the moss accent.

## 2026-06-25 — Onboarding, research+blog, OG, indices, PG CI, Harmonica fix
- **Done:** Shipped `#27` onboarding (intro + verify Disclosure panels, PR #16) and `#28` polish (retired pulse, scaleX/scaleY bars, RFC-4180 CSV parser, PR #17). Processed the Blue Democracy simulated-annealing paper → research note + issues #18–21; drafted CIBC blog (committed + #22). Fixed link-preview metadata (real title + OG/Twitter, PR #23; #24 tracks og:image + favicon). Built Accuracy/Closeness representativeness indices on the Audit step (PR #25, closed #18). Added Postgres to CI + pinned pg18 (PR #26, closed #3). Fixed the Harmonica adapter vs the live API — `join_url` + required `topic`/`goal` wired from the assembly (PR #27, closed #5).
- **Decisions:** Accuracy "ideal" = quota-band midpoint (`(min+max)/2`). Do **not** offer two sortition algorithms; one leximin engine + a closeness-tolerance dial (composition and fairness are layers, not rivals) — reframed #20. Verified the Harmonica contract with one live call (found `url`→`join_url` and 400 "topic is required").
- **Gotchas:** Prod Postgres is **18.4** (compose was 16). Prod allotment has **no** `ALLOTMENT_HARMONICA_*` env, so handoff is unconfigured there. The `hm_live_` key in `~/.claude.json` is **all-sessions admin** — used once (created test session `984f6c8d`, delete from dashboard). Long-session Windows OOM (paging file) crashed `gh`/CBC/`uv_spawn`; freed ~1.4 GB by killing orphaned LSP node procs, which unblocked the merge.
- **State:** `main` = `f1a840f`; live instance current through #25 (OG metadata, deploy nonce 8); #27 adapter fix merged but not deployed (handoff unreachable in prod regardless).
- **Next:** `#20` target input + dial (unlocks the #19 benchmark); `#2` docker smoke; `#21` prior-art docs; `#24` social images; publish blog `#22`. Delete test session `984f6c8d`; configure a least-privilege Harmonica key before enabling handoff.
