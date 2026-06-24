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
