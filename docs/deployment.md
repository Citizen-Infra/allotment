# Deployment — Railway (CIBC reference instance)

The Citizen Infrastructure Builders Club runs a hosted reference instance of Allotment on Railway. This is the optional CIBC instance described in the design spec; anyone can self-host instead via `docker compose` (see the README).

**Live:** https://allotment-production.up.railway.app

## Railway resources

All under the personal Railway workspace, project **Citizen Infra**:

| Resource | ID |
|---|---|
| Project `Citizen Infra` | `00f7b31b-3246-4100-832a-0fdc01052333` |
| Environment `production` | `10dc8fc5-171b-4928-9b21-61e02297422b` |
| Service `allotment` | `a3172fdf-56f3-466f-9f44-c42e9403e400` |
| Service `Postgres` | `b0e6e121-6937-410e-8d97-901969e6f76e` |

(IDs are resource identifiers, not credentials.)

`allotment` builds from the repo's **Dockerfile** (multi-stage: React UI → FastAPI), source repo `Citizen-Infra/allotment`. Postgres is Railway's managed Postgres template, reached over the private network.

## Environment variables (on the `allotment` service)

| Variable | Value | Notes |
|---|---|---|
| `ALLOTMENT_DATABASE_URL` | `postgresql+psycopg://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` | Composite reference to the Postgres service over the **private** network. The `+psycopg` driver prefix is required (the app uses psycopg v3). |
| `ALLOTMENT_ADMIN_TOKEN` | *(secret — Railway env only)* | Bearer token gating every `/api` write. Not in git. |
| `ALLOTMENT_SECRET_KEY` | *(secret — Railway env only)* | ≥32-byte key; derives the Fernet key that encrypts pool contact data. Not in git. |
| `ALLOTMENT_POOL_RETENTION_DAYS` | `30` | Auto-purge window for uploaded pools. |
| `PORT` | `8000` | See gotcha below. |
| `DEPLOY_NONCE` | `1` | Harmless leftover from forcing rebuilds; the app ignores any non-`ALLOTMENT_`-prefixed var. Safe to delete. |

Secrets were generated with `openssl rand -hex 32`. To rotate, generate a new value and update the variable in Railway (rotating `ALLOTMENT_SECRET_KEY` makes existing encrypted pool data unreadable — only do it on an empty/expendable instance).

The schema is created on first boot by `create_all()` — there is no migration step.

## Gotchas (learned deploying this)

- **`PORT=8000` is required.** Railway injects no `PORT` of its own here and routes the public domain to the `PORT` value, while the container's `CMD` listens on a hardcoded `8000`. Without `PORT=8000` the two don't line up and the edge returns `502 Application failed to respond` even though the app is healthy. (`docker compose` self-hosting doesn't need this — it maps `8000:8000` directly.)
- **Dockerfile uses `npm install`, not `npm ci`.** The committed `ui/package-lock.json` is authored on Windows and omits the Linux-only optional native bindings (`rolldown`/`oxc` → `@emnapi/*`) that `npm ci` strictly requires, so `npm ci` fails on Railway's Linux builder. `npm install` resolves the correct per-platform deps at build time.
- **Git-push auto-deploy did not fire** for this API-created service. A redeploy is reliably triggered by changing any service variable, which rebuilds the **latest** `main` commit. (Or redeploy from the Railway dashboard.)

## Ops

- Build / deploy / HTTP logs and deployment history: Railway dashboard, or the Railway MCP (`get_logs`, `list_deployments`) with the IDs above.
- Health check: `GET /` returns the SPA (200); `GET /api/...` without the bearer token returns 401.
- Purge expired pools manually: run `python -m allotment.cli purge` in the service shell (the app does not schedule it automatically).

## Database tuning (when it grows)

Fine on Railway Postgres defaults while small (verified healthy 2026-06-25: ~8 MB, 3 tables, low load). Once the pool/draw tables hold real data:

- `random_page_cost` is `4.0` (HDD default), but Railway runs on SSDs — set it to `1.1`–`2.0` so the planner prefers index scans: `ALTER SYSTEM SET random_page_cost = 1.5; SELECT pg_reload_conf();` (no restart).
- `pg_stat_statements` is not installed, so there is no slow-query visibility. Enable it via the `use-railway` skill (`python3 scripts/enable-pg-stats.py --service Postgres`, brief restart), which unlocks `analyze-postgres.py` query analysis.
