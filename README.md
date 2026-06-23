# Allotment

A self-hostable fair-sortition engine. Allotment selects a representative mini-public from a pool of candidates and hands the cohort to a deliberation tool — [Harmonica](https://harmonica.chat/) first, plus CSV/JSON export.

It owns the *selection* layer — the civic lottery that grounds the legitimacy of any online citizens' assembly — and leaves deliberation to existing tools.

---

## What it does

1. **Import** a candidate pool per assembly (CSV upload or API).
2. **Define quotas** — stratification targets by any categorical feature (age band, gender, region, …), or load a preset.
3. **Draw** — runs a reproducible, auditable lottery. Every draw is identified by `(input_hash, seed)` so results can be independently verified.
4. **Review** the selected panel in the browser and download the full audit trail.
5. **Hand off** the cohort to Harmonica (creates a session via the public API) or export it as CSV/JSON.

---

## Fairness method

The draw uses **maximin over quota-feasible panels**: the solver maximises the minimum selection probability across all candidates, subject to the operator's stratification quotas. This is a leximin-style fair lottery — no candidate who fits a needed category is systematically passed over in favour of another.

The method is the leximin family introduced in Flanigan, Gölz, Hammond, Hennig & Procaccia, ["Fair algorithms for selecting citizens' assemblies"](https://www.nature.com/articles/s41586-021-03788-6) (*Nature*, 2021). Full algorithm specification: [`docs/specs/2026-06-22-allotment-sortition-design.md`](docs/specs/2026-06-22-allotment-sortition-design.md)

---

## Related work

Allotment's draw implements the fair-lottery method that the [Sortition Foundation](https://github.com/sortitionfoundation) uses to select real citizens' assemblies. Their [`sortition-algorithms`](https://github.com/sortitionfoundation/sortition-algorithms) library is the closest prior art — a mature implementation of the full leximin objective.

Allotment differs in shape, not pedigree:

- **A deployable service, not a library.** `sortition-algorithms` is a Python package you import; Allotment is a self-hostable API + web UI + Postgres you stand up, with the selection logic as one module inside it.
- **It carries the cohort across the selection/deliberation boundary.** The `DeliberationTarget` seam hands the drawn panel straight to a deliberation tool (Harmonica today, CSV/JSON always) — the step the selection libraries leave to the operator.
- **v1 does maximin, the dominant level of leximin.** Full lexicographic leximin — the property that makes a lottery provably as fair as the quotas allow — is tracked in [issue #6](https://github.com/Citizen-Infra/allotment/issues/6).

If you only need the selection math as a dependency, use `sortition-algorithms`. Allotment is for running the whole draw-to-deliberation flow as a self-hosted system.

---

## Quickstart — Docker (self-host)

```bash
cp .env.example .env
# Edit .env: set ALLOTMENT_ADMIN_TOKEN and ALLOTMENT_SECRET_KEY to strong random values
docker compose up --build
```

The API is at `http://localhost:8000/api` and the UI at `http://localhost:8000/`.

The `db` service is Postgres 16. All data stays on your machine; no external service is required.

### Purge expired pools (cron)

Add a scheduled task that runs inside the `app` container:

```bash
docker compose exec app python -m allotment.cli purge
```

Or run it directly with the same `ALLOTMENT_DATABASE_URL` environment variable set.

---

## Local development

```bash
# Python 3.12+
py -3.12 -m venv .venv
.venv\Scripts\pip install -e ".[dev]"   # Windows
# source .venv/bin/activate && pip install -e ".[dev]"  # Linux/macOS

# Start a Postgres instance (or set ALLOTMENT_DATABASE_URL=sqlite:///./dev.db for SQLite)
cp .env.example .env

# Run the API server
.venv\Scripts\uvicorn allotment.api.app:create_app --factory --reload

# Build the UI (separate terminal)
cd ui && npm install && npm run dev
```

Run the test suite:

```bash
.venv\Scripts\pytest
```

---

## PII and data lifecycle

- **Contact data encrypted at rest.** The candidate pool blob (names, contact details) is encrypted with Fernet (AES-128-CBC with HMAC authentication), using a key derived from `ALLOTMENT_SECRET_KEY`, before being written to the database. The key never leaves the server.
- **Pools auto-purge.** Each pool row has a `purge_after` timestamp. The `python -m allotment.cli purge` command deletes expired rows. The default retention window is 30 days (`ALLOTMENT_POOL_RETENTION_DAYS`); operators set it per deployment.
- **Operator is sole custodian.** Allotment is self-hosted; no data is sent to any third party by the engine itself. The Harmonica adapter forwards only the selected cohort (names / contact details as configured) when an operator explicitly triggers a hand-off.

---

## Harmonica interop

Allotment integrates with Harmonica through its public API (`/api/v1/sessions`); the adapter needs a valid `ALLOTMENT_HARMONICA_API_KEY` for the target Harmonica workspace (see `.env.example`). Harmonica is one deliberation target — the same `DeliberationTarget` seam covers CSV/JSON export today and other tools later.

---

## Configuration

All settings use the `ALLOTMENT_` prefix and can be set via environment variables or a `.env` file.

| Variable | Default | Description |
|---|---|---|
| `ALLOTMENT_DATABASE_URL` | `postgresql+psycopg://allotment:allotment@localhost:5432/allotment` | SQLAlchemy database URL. SQLite also works for development (`sqlite:///./dev.db`). |
| `ALLOTMENT_ADMIN_TOKEN` | `dev-token-change-me` | Bearer token for all API calls. **Change before any real use.** |
| `ALLOTMENT_SECRET_KEY` | `dev-secret-change-me-32-bytes-min!!` | 32-byte minimum key for pool encryption. **Change before any real use.** |
| `ALLOTMENT_POOL_RETENTION_DAYS` | `30` | Days until a pool row is eligible for purge. |
| `ALLOTMENT_HARMONICA_BASE_URL` | *(empty)* | Harmonica API root, e.g. `https://app.harmonica.chat`. |
| `ALLOTMENT_HARMONICA_API_KEY` | *(empty)* | API key for the Harmonica adapter. |

---

## License

[GNU Affero General Public License v3.0](LICENSE)
