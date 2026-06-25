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
