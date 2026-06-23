# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Allotment is a self-hostable **fair-sortition engine**: it draws a representative mini-public from a candidate pool via an auditable civic lottery, then hands the cohort to a deliberation tool (Harmonica first, CSV/JSON always). It owns the *selection* layer only and leaves the deliberation itself to other tools. One Python (FastAPI) service + React/Vite SPA + Postgres, shipped as a single container. AGPL-3.0; public repo `Citizen-Infra/allotment`.

Full rationale + algorithm spec: `docs/specs/2026-06-22-allotment-sortition-design.md`. User-facing overview and the full `ALLOTMENT_*` config table: `README.md`.

## Commands

Bootstrap (Python 3.12+):

```
py -3.12 -m venv .venv
.venv\Scripts\pip install -e ".[dev]"     # Windows
# pip install -e ".[dev]"                  # Linux/macOS (venv activated)
```

The three CI checks — these run on every push to `main` and every PR (`.github/workflows/ci.yml`); keep them green and run them locally before pushing:

```
ruff check .
mypy            # reads files=["src"] from pyproject — pass NO args
pytest
```

Single test / subset:

```
pytest tests/test_maximin.py
pytest tests/test_maximin.py::test_name
pytest -k maximin
```

Run locally as two processes (API + UI dev server):

```
.venv\Scripts\uvicorn allotment.api.app:create_app --factory --reload   # API at :8000/api
cd ui && npm install && npm run dev                                       # Vite dev server, calls the API
```

UI from `ui/`: `npm run build` (→ `dist/`), `npm run lint`.

Production shape (self-host): `docker compose up --build` builds the UI, copies it into the package's static dir, and serves API + SPA on one container at `:8000`. Purge expired pools: `docker compose exec app python -m allotment.cli purge`.

## Architecture

One FastAPI service does everything. `create_app()` (`api/app.py`) is a factory: it calls `create_all()` to build tables, mounts the REST API under `/api`, and — if `src/allotment/static/` exists — serves the built React SPA at `/`. In dev the SPA runs separately under Vite; in the Docker image it is built and copied into `static/`.

Four layers, each importable and tested on its own:

1. **`selection_core/`** — the legitimacy heart; pure Python, no web/DB. `panels.generate_feasible_panels` samples quota-feasible panels; `maximin.solve_maximin_weights` builds a PuLP/CBC linear program that maximises the minimum candidate selection probability (`z`) over a panel-weight distribution summing to 1; `maximin.draw_selection` normalises the weights, computes each candidate's realised marginal probability, and samples one panel under a **seeded** `random.Random(seed)`. `audit.run_draw` / `build_audit_record` orchestrate this and emit the reproducibility bundle. This is **maximin = leximin level 1**, not full lexicographic leximin (tracked in issue #6) — do not describe it as full leximin.

2. **`api/`** — `routes.py` is the operator flow as REST: create assembly → upload pool → draw → get draw → handoff. Every `/api` route is gated by `Depends(require_operator)` (a single bearer token, `ALLOTMENT_ADMIN_TOKEN`; there is no multi-user model). Each handler receives an `AssemblyRepo` through the `_repo()` dependency, which opens a session, commits on success, and closes. `schemas.py` holds the Pydantic request bodies.

3. **`db/`** — SQLAlchemy 2.0. `session.create_all()` builds the schema directly: there is **no Alembic / migrations layer**, so changing a model changes the live schema on the next `create_all`. `repo.AssemblyRepo` is the only persistence entry point the routes use. Postgres in production (`postgresql+psycopg://…`); SQLite works for dev (`sqlite:///./dev.db`).

4. **`adapters/`** — the selection→deliberation seam. `base.DeliberationTarget` is a `Protocol`: `provision(pool, selection, session_config) -> ProvisionResult`. `harmonica.HarmonicaAdapter` creates a Harmonica session over its public REST API; `export.CsvJsonExport` is the always-available fallback. New deliberation targets implement the same Protocol without touching the core.

`domain.py` (`Pool`, `Candidate`, `QuotaConfig`, `Selection`, …) holds the shared types that cross all four layers.

### Data flow

`Assembly → Pool → QuotaConfig → Draw → Selection + AuditRecord`. A draw is identified by `(input_hash, seed)` so anyone can re-run it and get a byte-identical selection — the verifiability claim the whole project rests on. Determinism is a tested invariant: preserve it (seeded RNG, sorted outputs) whenever you touch `selection_core`.

### UI

React 19 + Vite. A step wizard under `ui/src/steps/` (`Assembly`, `Pool`, `Quotas`, `Draw`, `Audit`, `Handoff`) talks to the API through `ui/src/api.ts`. There is no `DESIGN.md` — run the `frontend-design` skill before any UI/visual work.

## Gotchas

- **`pulp` is pinned `<4`.** 4.0 is breaking; don't unpin without porting the LP in `maximin.py`.
- **`mypy` is `strict` and covers `src/` only** (tests are not type-checked); `pulp.*` has a missing-imports override. Run `mypy` with no args so it reads `files` from pyproject.
- **The install must be editable (`-e`) for the SPA to serve.** `create_app()` locates the UI at `static/` *relative to the installed package*; a non-editable install lands in site-packages and leaves `/` a 404. The Dockerfile installs `-e` deliberately for this.
- **PII is encrypted at rest.** Contact data is Fernet-encrypted with a key derived from `ALLOTMENT_SECRET_KEY` (`crypto.py`); pools carry a `purge_after` and are deleted by `cli purge`. Be deliberate when editing `crypto.py`, retention, or anything that widens what gets stored.
- **Infeasible quotas raise, never silently relax.** `panels.InfeasibleError` surfaces as HTTP 422 naming the conflicting constraints; a draw must never degrade to a non-fair fallback.

## Conventions

- Tracker is **GitHub Issues on `Citizen-Infra/allotment`** (not Linear). The headline roadmap item is full leximin (#6).
- AGPL-3.0 by design — keep the engine copyleft.
- Config is env-var driven with the `ALLOTMENT_` prefix (`config.py`, `.env.example`); see the README table for the full list.
