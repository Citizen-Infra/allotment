# ── Stage 1: build the React UI ─────────────────────────────────────────────
FROM node:20 AS ui
WORKDIR /ui
COPY ui/package*.json ./
# npm install (not `npm ci`): the lockfile is authored on Windows and omits the
# Linux-only optional native bindings (rolldown/oxc → @emnapi/*) that `npm ci`
# strictly requires, so `npm ci` fails on the Linux build. `npm install` resolves
# the correct per-platform deps at build time.
RUN npm install --no-audit --no-fund
COPY ui/ ./
RUN npm run build

# ── Stage 2: Python runtime ──────────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install the package. Editable (-e) so the importable `allotment` package
# resolves to /app/src/allotment at runtime — which is where the built UI is
# copied below. A non-editable install would land in site-packages, and
# create_app()'s static lookup (relative to the installed package) would not
# find the UI, leaving "/" as a 404.
COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir -e .

# Copy built UI assets into the package's static directory
COPY --from=ui /ui/dist/ ./src/allotment/static/

EXPOSE 8000

CMD ["uvicorn", "allotment.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
