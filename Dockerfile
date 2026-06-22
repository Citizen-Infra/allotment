# ── Stage 1: build the React UI ─────────────────────────────────────────────
FROM node:20 AS ui
WORKDIR /ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# ── Stage 2: Python runtime ──────────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install package dependencies first (layer caching)
COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir .

# Copy built UI assets into the package's static directory
COPY --from=ui /ui/dist/ ./src/allotment/static/

EXPOSE 8000

CMD ["uvicorn", "allotment.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
