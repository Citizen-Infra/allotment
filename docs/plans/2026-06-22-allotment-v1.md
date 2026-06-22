# Allotment v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hostable web app + JSON API that runs fair, auditable sortition draws and hands the selected mini-public to a deliberation tool (Harmonica first).

**Architecture:** One Python (FastAPI) service holds a pure `selection_core` package (the fair draw), a SQLAlchemy/Postgres persistence layer, REST endpoints, and pluggable `DeliberationTarget` adapters; it also serves a React (Vite) SPA. Self-hosted via Docker Compose (app + Postgres).

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.x (schema via `create_all` in v1), PuLP + CBC, Postgres 16, pytest + Hypothesis, React + Vite + TypeScript, Docker Compose.

## Global Constraints

- **Python 3.12**; all backend code typed; `ruff` + `mypy` clean.
- **Fairness method (v1):** maximin over a generated set of quota-feasible panels (the dominant level of leximin). Full lexicographic refinement is out of scope for v1.
- **Solver:** PuLP with the bundled CBC backend only (no commercial solver dependency).
- **Reproducibility:** every draw is deterministic given `(canonical_input_hash, seed)`; the seed is stored and shown.
- **Quotas are marginal** (per feature-value min/max), not full intersectional cells, in v1.
- **PII:** store only opaque `id` + the stratification `features` used + a `contact_ref`; encrypt `contact_ref` at rest; pools auto-purge a configurable number of days after their draw (default 30).
- **Licence:** AGPL-3.0 (confirmed). Add `LICENSE` in the deploy task.
- **No AI attribution** in commits or content (CIBC public repo). Conventional-commit style messages.
- **Spec of record:** `docs/specs/2026-06-22-allotment-sortition-design.md`.

---

## File Structure

```
allotment/
  pyproject.toml                 # deps, ruff/mypy/pytest config
  docker-compose.yml             # app + postgres
  Dockerfile                     # python build, copies built UI
  .env.example
  src/allotment/
    __init__.py
    config.py                    # Settings (env): DB url, admin token, retention days, secret key
    domain.py                    # Pydantic models: Candidate, Pool, FeatureSpec, QuotaTarget, QuotaConfig, Selection, DrawResult, AuditRecord
    pool_csv.py                  # parse_pool_csv() + validation
    quotas.py                    # validate_quota_config(), feasibility pre-check
    selection_core/
      __init__.py
      panels.py                  # generate_feasible_panels()
      maximin.py                 # solve_maximin_weights(), draw_selection()
      audit.py                   # canonical_input_hash(), build_audit_record()
    db/
      __init__.py
      models.py                  # SQLAlchemy ORM: AssemblyRow, PoolRow, DrawRow
      session.py                 # engine + session factory
      repo.py                    # AssemblyRepo (CRUD used by the API)
    adapters/
      __init__.py
      base.py                    # DeliberationTarget protocol + ProvisionResult
      export.py                  # CsvJsonExport
      harmonica.py               # HarmonicaAdapter
    api/
      __init__.py
      app.py                     # FastAPI app factory, static-serve UI, router mount
      auth.py                    # single-operator bearer auth dependency
      routes.py                  # endpoints
      schemas.py                 # request/response Pydantic models
    crypto.py                    # encrypt/decrypt contact_ref (Fernet)
  tests/
    conftest.py                  # fixtures: sample pool, test DB, TestClient
    test_pool_csv.py
    test_quotas.py
    test_panels.py
    test_maximin.py
    test_audit.py
    test_repo.py
    test_api.py
    test_export.py
    test_harmonica.py
    test_auth.py
  ui/                            # Vite + React + TS (built into src/allotment/static at Docker build)
    package.json
    src/...
  docs/
    specs/2026-06-22-allotment-sortition-design.md
    plans/2026-06-22-allotment-v1.md
```

---

## Task 0: Project scaffold + CI-able test harness

**Files:**
- Create: `pyproject.toml`, `src/allotment/__init__.py`, `src/allotment/config.py`, `tests/conftest.py`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: `allotment.config.Settings` (pydantic-settings) with fields `database_url: str`, `admin_token: str`, `secret_key: str`, `pool_retention_days: int = 30`. `get_settings() -> Settings`.

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "allotment"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.111", "uvicorn[standard]>=0.30", "pydantic>=2.7",
  "pydantic-settings>=2.3", "sqlalchemy>=2.0",
  "psycopg[binary]>=3.1", "pulp>=2.8", "cryptography>=42", "httpx>=0.27",
]
[project.optional-dependencies]
dev = ["pytest>=8", "hypothesis>=6", "ruff>=0.5", "mypy>=1.10", "pytest-asyncio>=0.23"]

[tool.pytest.ini_options]
addopts = "-q"
testpaths = ["tests"]

[tool.ruff]
line-length = 100

[tool.mypy]
python_version = "3.12"
strict = true
```

- [ ] **Step 2: Write `src/allotment/config.py`**

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ALLOTMENT_", env_file=".env")
    database_url: str = "postgresql+psycopg://allotment:allotment@localhost:5432/allotment"
    admin_token: str = "dev-token-change-me"
    secret_key: str = "dev-secret-change-me-32-bytes-min!!"
    pool_retention_days: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 3: Write `tests/conftest.py` with a sample-pool fixture**

```python
import pytest
from allotment.domain import Candidate, Pool, FeatureSpec


@pytest.fixture
def sample_pool() -> Pool:
    # 40 candidates, 2 features: gender {F,M}, age {young,old}
    cands = []
    for i in range(40):
        gender = "F" if i % 2 == 0 else "M"
        age = "young" if i % 4 < 2 else "old"
        cands.append(Candidate(id=f"c{i}", features={"gender": gender, "age": age},
                               contact_ref=f"c{i}@example.org"))
    specs = [FeatureSpec(name="gender", values=["F", "M"]),
             FeatureSpec(name="age", values=["young", "old"])]
    return Pool(features=specs, candidates=cands)
```

- [ ] **Step 4: Verify the harness collects**

Run: `pip install -e ".[dev]"` then `pytest -q`
Expected: collection succeeds, 0 tests (or import error on `allotment.domain` until Task 1 — acceptable; proceed to Task 1).

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml src/allotment/__init__.py src/allotment/config.py tests/conftest.py .env.example .gitignore
git commit -m "chore: scaffold project, settings, and test harness"
```

---

## Task 1: Domain models

**Files:**
- Create: `src/allotment/domain.py`
- Test: `tests/test_domain.py`

**Interfaces:**
- Produces:
  - `FeatureSpec(name: str, values: list[str])`
  - `Candidate(id: str, features: dict[str, str], contact_ref: str)`
  - `Pool(features: list[FeatureSpec], candidates: list[Candidate])` with `.feature_names() -> set[str]`
  - `QuotaTarget(feature: str, value: str, min: int, max: int)`
  - `QuotaConfig(panel_size: int, targets: list[QuotaTarget])`
  - `Selection(candidate_ids: list[str], realised_probabilities: dict[str, float])`
  - `DrawResult(selection: Selection, seed: int, quota_fill: dict[str, int])`

- [ ] **Step 1: Write the failing test**

```python
from allotment.domain import Candidate, Pool, FeatureSpec, QuotaConfig, QuotaTarget


def test_pool_feature_names(sample_pool):
    assert sample_pool.feature_names() == {"gender", "age"}


def test_quota_config_rejects_min_gt_max():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        QuotaConfig(panel_size=10, targets=[QuotaTarget(feature="gender", value="F", min=6, max=4)])
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/test_domain.py -v`
Expected: FAIL — `ModuleNotFoundError: allotment.domain`.

- [ ] **Step 3: Implement `src/allotment/domain.py`**

```python
from pydantic import BaseModel, field_validator, model_validator


class FeatureSpec(BaseModel):
    name: str
    values: list[str]


class Candidate(BaseModel):
    id: str
    features: dict[str, str]
    contact_ref: str


class Pool(BaseModel):
    features: list[FeatureSpec]
    candidates: list[Candidate]

    def feature_names(self) -> set[str]:
        return {f.name for f in self.features}


class QuotaTarget(BaseModel):
    feature: str
    value: str
    min: int
    max: int

    @model_validator(mode="after")
    def _min_le_max(self) -> "QuotaTarget":
        if self.min > self.max:
            raise ValueError(f"min {self.min} > max {self.max} for {self.feature}={self.value}")
        return self


class QuotaConfig(BaseModel):
    panel_size: int
    targets: list[QuotaTarget]

    @field_validator("panel_size")
    @classmethod
    def _positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("panel_size must be positive")
        return v


class Selection(BaseModel):
    candidate_ids: list[str]
    realised_probabilities: dict[str, float]


class DrawResult(BaseModel):
    selection: Selection
    seed: int
    quota_fill: dict[str, int]
```

- [ ] **Step 4: Run to verify it passes**

Run: `pytest tests/test_domain.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/allotment/domain.py tests/test_domain.py
git commit -m "feat: domain models for pool, quotas, and selection"
```

---

## Task 2: Pool CSV parsing + validation

**Files:**
- Create: `src/allotment/pool_csv.py`
- Test: `tests/test_pool_csv.py`

**Interfaces:**
- Consumes: `Pool`, `Candidate`, `FeatureSpec` from `domain`.
- Produces: `parse_pool_csv(text: str, feature_columns: list[str], id_column: str = "id", contact_column: str = "contact") -> Pool`. Raises `PoolValidationError(list[str])` (one message per bad row/column).

- [ ] **Step 1: Write the failing test**

```python
import pytest
from allotment.pool_csv import parse_pool_csv, PoolValidationError

CSV = "id,contact,gender,age\nc0,c0@x.org,F,young\nc1,c1@x.org,M,old\n"


def test_parse_ok():
    pool = parse_pool_csv(CSV, feature_columns=["gender", "age"])
    assert len(pool.candidates) == 2
    assert pool.feature_names() == {"gender", "age"}
    assert pool.candidates[0].contact_ref == "c0@x.org"


def test_missing_column_raises():
    with pytest.raises(PoolValidationError) as e:
        parse_pool_csv("id,contact,gender\nc0,c0@x.org,F\n", feature_columns=["gender", "age"])
    assert any("age" in m for m in e.value.errors)


def test_duplicate_id_raises():
    bad = "id,contact,gender,age\nc0,a@x,F,young\nc0,b@x,M,old\n"
    with pytest.raises(PoolValidationError):
        parse_pool_csv(bad, feature_columns=["gender", "age"])
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/test_pool_csv.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/allotment/pool_csv.py`**

```python
import csv
import io
from allotment.domain import Candidate, FeatureSpec, Pool


class PoolValidationError(Exception):
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def parse_pool_csv(
    text: str,
    feature_columns: list[str],
    id_column: str = "id",
    contact_column: str = "contact",
) -> Pool:
    errors: list[str] = []
    reader = csv.DictReader(io.StringIO(text))
    header = reader.fieldnames or []
    for col in [id_column, contact_column, *feature_columns]:
        if col not in header:
            errors.append(f"missing required column: {col}")
    if errors:
        raise PoolValidationError(errors)

    candidates: list[Candidate] = []
    seen: set[str] = set()
    value_sets: dict[str, set[str]] = {f: set() for f in feature_columns}
    for n, row in enumerate(reader, start=2):  # line 1 is header
        cid = (row.get(id_column) or "").strip()
        if not cid:
            errors.append(f"line {n}: empty {id_column}")
            continue
        if cid in seen:
            errors.append(f"line {n}: duplicate id {cid}")
            continue
        seen.add(cid)
        feats = {f: (row.get(f) or "").strip() for f in feature_columns}
        for f, v in feats.items():
            if not v:
                errors.append(f"line {n}: empty feature {f}")
            else:
                value_sets[f].add(v)
        candidates.append(Candidate(id=cid, features=feats,
                                    contact_ref=(row.get(contact_column) or "").strip()))
    if errors:
        raise PoolValidationError(errors)
    specs = [FeatureSpec(name=f, values=sorted(value_sets[f])) for f in feature_columns]
    return Pool(features=specs, candidates=candidates)
```

- [ ] **Step 4: Run to verify it passes**

Run: `pytest tests/test_pool_csv.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/allotment/pool_csv.py tests/test_pool_csv.py
git commit -m "feat: pool CSV parsing with row-level validation"
```

---

## Task 3: Quota feasibility pre-check

**Files:**
- Create: `src/allotment/quotas.py`
- Test: `tests/test_quotas.py`

**Interfaces:**
- Consumes: `Pool`, `QuotaConfig` from `domain`.
- Produces: `precheck_feasibility(pool: Pool, config: QuotaConfig) -> list[str]` — returns human-readable warnings for obviously-infeasible configs (target references unknown feature/value; sum of mins across a feature's values exceeds panel_size; pool has too few people in a value to meet its min). Empty list = passes the cheap checks (the solver still decides true feasibility).

- [ ] **Step 1: Write the failing test**

```python
from allotment.domain import QuotaConfig, QuotaTarget
from allotment.quotas import precheck_feasibility


def test_unknown_feature_flagged(sample_pool):
    cfg = QuotaConfig(panel_size=10, targets=[QuotaTarget(feature="race", value="x", min=1, max=2)])
    warnings = precheck_feasibility(sample_pool, cfg)
    assert any("race" in w for w in warnings)


def test_min_exceeds_supply_flagged(sample_pool):
    # only 20 F in pool; ask for 25 min
    cfg = QuotaConfig(panel_size=30, targets=[QuotaTarget(feature="gender", value="F", min=25, max=30)])
    warnings = precheck_feasibility(sample_pool, cfg)
    assert any("F" in w and "supply" in w.lower() for w in warnings)


def test_clean_config_no_warnings(sample_pool):
    cfg = QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=4, max=6),
        QuotaTarget(feature="gender", value="M", min=4, max=6)])
    assert precheck_feasibility(sample_pool, cfg) == []
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/test_quotas.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/allotment/quotas.py`**

```python
from collections import Counter
from allotment.domain import Pool, QuotaConfig


def precheck_feasibility(pool: Pool, config: QuotaConfig) -> list[str]:
    warnings: list[str] = []
    known = {f.name: set(f.values) for f in pool.features}
    supply: dict[tuple[str, str], int] = Counter()
    for c in pool.candidates:
        for f, v in c.features.items():
            supply[(f, v)] += 1

    min_sum_by_feature: dict[str, int] = Counter()
    for t in config.targets:
        if t.feature not in known:
            warnings.append(f"target references unknown feature '{t.feature}'")
            continue
        if t.value not in known[t.feature]:
            warnings.append(f"target references unknown value '{t.value}' for feature '{t.feature}'")
            continue
        if supply[(t.feature, t.value)] < t.min:
            warnings.append(
                f"insufficient supply for {t.feature}={t.value}: "
                f"pool has {supply[(t.feature, t.value)]}, min asks {t.min}")
        min_sum_by_feature[t.feature] += t.min

    for feature, total_min in min_sum_by_feature.items():
        if total_min > config.panel_size:
            warnings.append(
                f"sum of minimums for feature '{feature}' is {total_min}, "
                f"exceeds panel_size {config.panel_size}")
    return warnings
```

- [ ] **Step 4: Run to verify it passes**

Run: `pytest tests/test_quotas.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/allotment/quotas.py tests/test_quotas.py
git commit -m "feat: cheap quota feasibility pre-check"
```

---

## Task 4: Feasible-panel generation

**Files:**
- Create: `src/allotment/selection_core/__init__.py`, `src/allotment/selection_core/panels.py`
- Test: `tests/test_panels.py`

**Interfaces:**
- Consumes: `Pool`, `QuotaConfig`.
- Produces: `generate_feasible_panels(pool, config, count, rng) -> list[frozenset[str]]` — each panel is a set of `candidate.id`, size == `config.panel_size`, satisfying every target's min/max. Uses PuLP with a random objective (seeded via `rng`) to diversify panels. Raises `InfeasibleError` if no feasible panel exists. May return fewer than `count` distinct panels if the feasible space is small.

- [ ] **Step 1: Write the failing test**

```python
import random
import pytest
from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.panels import generate_feasible_panels, InfeasibleError


def _cfg():
    return QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])


def test_panels_meet_quotas(sample_pool):
    rng = random.Random(1)
    panels = generate_feasible_panels(sample_pool, _cfg(), count=5, rng=rng)
    assert panels
    by_id = {c.id: c.features for c in sample_pool.candidates}
    for p in panels:
        assert len(p) == 10
        f_count = sum(1 for cid in p if by_id[cid]["gender"] == "F")
        assert f_count == 5


def test_infeasible_raises(sample_pool):
    rng = random.Random(1)
    bad = QuotaConfig(panel_size=10, targets=[QuotaTarget(feature="gender", value="F", min=9, max=9),
                                              QuotaTarget(feature="gender", value="M", min=9, max=9)])
    with pytest.raises(InfeasibleError):
        generate_feasible_panels(sample_pool, bad, count=3, rng=rng)
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/test_panels.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/allotment/selection_core/panels.py`**

```python
import random
import pulp
from allotment.domain import Pool, QuotaConfig


class InfeasibleError(Exception):
    pass


def generate_feasible_panels(
    pool: Pool, config: QuotaConfig, count: int, rng: random.Random
) -> list[frozenset[str]]:
    ids = [c.id for c in pool.candidates]
    feats = {c.id: c.features for c in pool.candidates}
    panels: set[frozenset[str]] = set()

    for _ in range(count * 5):  # over-sample; dedupe; stop early when we have `count`
        prob = pulp.LpProblem("panel", pulp.LpMaximize)
        x = {cid: pulp.LpVariable(f"x_{cid}", cat="Binary") for cid in ids}
        prob += pulp.lpSum(rng.random() * x[cid] for cid in ids)  # random objective
        prob += pulp.lpSum(x.values()) == config.panel_size
        for t in config.targets:
            chosen = [x[cid] for cid in ids if feats[cid].get(t.feature) == t.value]
            prob += pulp.lpSum(chosen) >= t.min
            prob += pulp.lpSum(chosen) <= t.max
        status = prob.solve(pulp.PULP_CBC_CMD(msg=False))
        if pulp.LpStatus[status] != "Optimal":
            if not panels:
                raise InfeasibleError("no panel satisfies the quota configuration")
            break
        panels.add(frozenset(cid for cid in ids if x[cid].value() == 1))
        if len(panels) >= count:
            break
    if not panels:
        raise InfeasibleError("no panel satisfies the quota configuration")
    return list(panels)
```

- [ ] **Step 4: Run to verify it passes**

Run: `pytest tests/test_panels.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/allotment/selection_core/__init__.py src/allotment/selection_core/panels.py tests/test_panels.py
git commit -m "feat: feasible-panel generation via randomized IP"
```

---

## Task 5: Maximin weighting + seeded draw (the heart)

**Files:**
- Create: `src/allotment/selection_core/maximin.py`
- Test: `tests/test_maximin.py`

**Interfaces:**
- Consumes: `generate_feasible_panels`, `Pool`, `QuotaConfig`, `Selection`.
- Produces:
  - `solve_maximin_weights(panels: list[frozenset[str]], candidate_ids: list[str]) -> dict[frozenset[str], float]` — probability weights over panels maximizing the minimum per-candidate marginal selection probability.
  - `draw_selection(pool, config, panel_count, seed) -> tuple[Selection, dict[str,int]]` — generates panels, solves weights, samples one panel with `random.Random(seed)`; returns the `Selection` (with each candidate's realised marginal probability) and a `quota_fill` map (`"feature=value" -> count`).

- [ ] **Step 1: Write the failing tests**

```python
from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.maximin import solve_maximin_weights, draw_selection


def _cfg():
    return QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])


def test_weights_sum_to_one():
    panels = [frozenset({"a", "b"}), frozenset({"b", "c"})]
    w = solve_maximin_weights(panels, ["a", "b", "c"])
    assert abs(sum(w.values()) - 1.0) < 1e-6


def test_draw_meets_quota_and_size(sample_pool):
    sel, fill = draw_selection(sample_pool, _cfg(), panel_count=20, seed=7)
    assert len(sel.candidate_ids) == 10
    assert fill["gender=F"] == 5
    assert set(sel.realised_probabilities) <= {c.id for c in sample_pool.candidates}


def test_draw_is_deterministic(sample_pool):
    a, _ = draw_selection(sample_pool, _cfg(), panel_count=20, seed=7)
    b, _ = draw_selection(sample_pool, _cfg(), panel_count=20, seed=7)
    assert a.candidate_ids == b.candidate_ids
```

- [ ] **Step 2: Run to verify they fail**

Run: `pytest tests/test_maximin.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/allotment/selection_core/maximin.py`**

```python
import random
import pulp
from allotment.domain import Pool, QuotaConfig, Selection
from allotment.selection_core.panels import generate_feasible_panels


def solve_maximin_weights(
    panels: list[frozenset[str]], candidate_ids: list[str]
) -> dict[frozenset[str], float]:
    prob = pulp.LpProblem("maximin", pulp.LpMaximize)
    w = {p: pulp.LpVariable(f"w_{i}", lowBound=0) for i, p in enumerate(panels)}
    z = pulp.LpVariable("z", lowBound=0)
    prob += z
    prob += pulp.lpSum(w.values()) == 1
    for cid in candidate_ids:
        prob += pulp.lpSum(w[p] for p in panels if cid in p) >= z
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    return {p: max(0.0, w[p].value() or 0.0) for p in panels}


def draw_selection(
    pool: Pool, config: QuotaConfig, panel_count: int, seed: int
) -> tuple[Selection, dict[str, int]]:
    rng = random.Random(seed)
    panels = generate_feasible_panels(pool, config, count=panel_count, rng=rng)
    ids = [c.id for c in pool.candidates]
    weights = solve_maximin_weights(panels, ids)

    total = sum(weights.values()) or 1.0
    norm = {p: weights[p] / total for p in panels}
    marginals = {cid: sum(norm[p] for p in panels if cid in p) for cid in ids}

    # sample one panel by weight, deterministically given seed
    r, acc, chosen = rng.random(), 0.0, panels[-1]
    for p in panels:
        acc += norm[p]
        if r <= acc:
            chosen = p
            break

    feats = {c.id: c.features for c in pool.candidates}
    fill: dict[str, int] = {}
    for t in config.targets:
        fill[f"{t.feature}={t.value}"] = sum(
            1 for cid in chosen if feats[cid].get(t.feature) == t.value)

    sel = Selection(
        candidate_ids=sorted(chosen),
        realised_probabilities={cid: round(marginals[cid], 6) for cid in ids},
    )
    return sel, fill
```

- [ ] **Step 4: Run to verify they pass**

Run: `pytest tests/test_maximin.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Add a Hypothesis fairness property test**

```python
# append to tests/test_maximin.py
from hypothesis import given, settings, strategies as st


@settings(max_examples=15, deadline=None)
@given(seed=st.integers(min_value=0, max_value=10_000))
def test_quota_always_met_under_random_seed(sample_pool, seed):
    sel, fill = draw_selection(sample_pool, _cfg(), panel_count=15, seed=seed)
    assert len(sel.candidate_ids) == 10
    assert fill["gender=F"] == 5 and fill["gender=M"] == 5
```

- [ ] **Step 6: Run and commit**

Run: `pytest tests/test_maximin.py -v` → PASS

```bash
git add src/allotment/selection_core/maximin.py tests/test_maximin.py
git commit -m "feat: maximin weighting and seeded fair draw"
```

---

## Task 6: Audit record + reproducibility

**Files:**
- Create: `src/allotment/selection_core/audit.py`
- Test: `tests/test_audit.py`

**Interfaces:**
- Consumes: `Pool`, `QuotaConfig`, `Selection`, `DrawResult`, `draw_selection`.
- Produces:
  - `canonical_input_hash(pool, config) -> str` — stable SHA-256 over a canonical JSON of the pool ids+features and the quota config (independent of dict ordering).
  - `run_draw(pool, config, panel_count, seed) -> DrawResult` — wraps `draw_selection`, returns a `DrawResult` carrying `selection`, `seed`, `quota_fill`.
  - `build_audit_record(pool, config, result) -> AuditRecord` (add `AuditRecord` to `domain.py`: `input_hash: str`, `seed: int`, `panel_size: int`, `quota_fill: dict[str,int]`, `created_at: datetime`).

- [ ] **Step 1: Write the failing test**

```python
from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.audit import canonical_input_hash, run_draw, build_audit_record


def _cfg():
    return QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])


def test_hash_is_order_independent(sample_pool):
    import copy
    p2 = copy.deepcopy(sample_pool)
    p2.candidates.reverse()
    assert canonical_input_hash(sample_pool, _cfg()) == canonical_input_hash(p2, _cfg())


def test_run_draw_reproducible(sample_pool):
    a = run_draw(sample_pool, _cfg(), panel_count=15, seed=3)
    b = run_draw(sample_pool, _cfg(), panel_count=15, seed=3)
    assert a.selection.candidate_ids == b.selection.candidate_ids


def test_audit_record_fields(sample_pool):
    res = run_draw(sample_pool, _cfg(), panel_count=15, seed=3)
    rec = build_audit_record(sample_pool, _cfg(), res)
    assert rec.seed == 3 and rec.panel_size == 10
    assert rec.input_hash == canonical_input_hash(sample_pool, _cfg())
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/test_audit.py -v`
Expected: FAIL — module + `AuditRecord` missing.

- [ ] **Step 3: Add `AuditRecord` to `domain.py` and implement `audit.py`**

Add to `src/allotment/domain.py`:

```python
from datetime import datetime, UTC


class AuditRecord(BaseModel):
    input_hash: str
    seed: int
    panel_size: int
    quota_fill: dict[str, int]
    created_at: datetime
```

Create `src/allotment/selection_core/audit.py`:

```python
import hashlib
import json
from datetime import UTC, datetime
from allotment.domain import AuditRecord, DrawResult, Pool, QuotaConfig
from allotment.selection_core.maximin import draw_selection


def canonical_input_hash(pool: Pool, config: QuotaConfig) -> str:
    payload = {
        "candidates": sorted(
            ({"id": c.id, "features": dict(sorted(c.features.items()))} for c in pool.candidates),
            key=lambda d: d["id"]),
        "config": {
            "panel_size": config.panel_size,
            "targets": sorted(
                ([t.feature, t.value, t.min, t.max] for t in config.targets)),
        },
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(blob).hexdigest()


def run_draw(pool: Pool, config: QuotaConfig, panel_count: int, seed: int) -> DrawResult:
    sel, fill = draw_selection(pool, config, panel_count, seed)
    return DrawResult(selection=sel, seed=seed, quota_fill=fill)


def build_audit_record(pool: Pool, config: QuotaConfig, result: DrawResult) -> AuditRecord:
    return AuditRecord(
        input_hash=canonical_input_hash(pool, config),
        seed=result.seed,
        panel_size=config.panel_size,
        quota_fill=result.quota_fill,
        created_at=datetime.now(UTC),
    )
```

- [ ] **Step 4: Run to verify it passes**

Run: `pytest tests/test_audit.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/allotment/domain.py src/allotment/selection_core/audit.py tests/test_audit.py
git commit -m "feat: canonical input hash, reproducible run_draw, and audit record"
```

---

## Task 7: Persistence (SQLAlchemy + Postgres) and crypto

**Files:**
- Create: `src/allotment/crypto.py`, `src/allotment/db/__init__.py`, `src/allotment/db/models.py`, `src/allotment/db/session.py`, `src/allotment/db/repo.py`, `docker-compose.yml`
- Test: `tests/test_repo.py`

**Interfaces:**
- Produces:
  - `crypto.encrypt(text: str) -> str`, `crypto.decrypt(token: str) -> str` (Fernet keyed from `settings.secret_key`).
  - ORM rows: `AssemblyRow(id, name, question, created_at)`, `PoolRow(id, assembly_id, features_json, candidates_json_encrypted, purge_after)`, `DrawRow(id, assembly_id, config_json, selection_json, audit_json, seed, created_at)`.
  - `AssemblyRepo(session)` with `create_assembly`, `save_pool`, `get_pool`, `save_draw`, `get_draw`, `purge_expired_pools(now)`.

- [ ] **Step 1: Write `docker-compose.yml`** (Postgres for local tests + run)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: allotment
      POSTGRES_PASSWORD: allotment
      POSTGRES_DB: allotment
    ports: ["5432:5432"]
```

- [ ] **Step 2: Write the failing test**

```python
import pytest
from datetime import UTC, datetime, timedelta
from allotment.db.session import make_session
from allotment.db.repo import AssemblyRepo


@pytest.fixture
def repo():
    s = make_session()  # uses settings.database_url; conftest creates tables
    r = AssemblyRepo(s)
    yield r
    s.rollback(); s.close()


def test_pool_roundtrip_is_encrypted_at_rest(repo, sample_pool):
    a = repo.create_assembly("Test", "What should we do?")
    repo.save_pool(a.id, sample_pool, purge_after=datetime.now(UTC) + timedelta(days=30))
    repo.session.commit()
    loaded = repo.get_pool(a.id)
    assert loaded.candidates[0].contact_ref == sample_pool.candidates[0].contact_ref
    # the stored blob must not contain the plaintext contact
    raw = repo.raw_pool_blob(a.id)
    assert "c0@example.org" not in raw


def test_purge_expired(repo, sample_pool):
    a = repo.create_assembly("Old", "q")
    repo.save_pool(a.id, sample_pool, purge_after=datetime.now(UTC) - timedelta(days=1))
    repo.session.commit()
    n = repo.purge_expired_pools(datetime.now(UTC))
    repo.session.commit()
    assert n == 1 and repo.get_pool(a.id) is None
```

- [ ] **Step 3: Implement crypto, models, session, repo**

`src/allotment/crypto.py`:

```python
import base64, hashlib
from cryptography.fernet import Fernet
from allotment.config import get_settings


def _fernet() -> Fernet:
    key = hashlib.sha256(get_settings().secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt(text: str) -> str:
    return _fernet().encrypt(text.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()
```

`src/allotment/db/models.py`:

```python
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import uuid


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


class AssemblyRow(Base):
    __tablename__ = "assemblies"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    question: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PoolRow(Base):
    __tablename__ = "pools"
    assembly_id: Mapped[str] = mapped_column(ForeignKey("assemblies.id"), primary_key=True)
    features_json: Mapped[str] = mapped_column(Text)
    candidates_blob: Mapped[str] = mapped_column(Text)  # encrypted JSON
    purge_after: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DrawRow(Base):
    __tablename__ = "draws"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    assembly_id: Mapped[str] = mapped_column(ForeignKey("assemblies.id"))
    config_json: Mapped[str] = mapped_column(Text)
    selection_json: Mapped[str] = mapped_column(Text)
    audit_json: Mapped[str] = mapped_column(Text)
    seed: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
```

`src/allotment/db/session.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from allotment.config import get_settings
from allotment.db.models import Base

_engine = create_engine(get_settings().database_url, future=True)
_Session = sessionmaker(bind=_engine, class_=Session, expire_on_commit=False)


def create_all() -> None:
    Base.metadata.create_all(_engine)


def make_session() -> Session:
    return _Session()
```

`src/allotment/db/repo.py`:

```python
import json
from datetime import datetime, UTC
from allotment.crypto import encrypt, decrypt
from allotment.db.models import AssemblyRow, PoolRow, DrawRow
from allotment.domain import Pool, DrawResult, QuotaConfig


class AssemblyRepo:
    def __init__(self, session) -> None:
        self.session = session

    def create_assembly(self, name: str, question: str) -> AssemblyRow:
        row = AssemblyRow(name=name, question=question, created_at=datetime.now(UTC))
        self.session.add(row); self.session.flush()
        return row

    def save_pool(self, assembly_id: str, pool: Pool, purge_after: datetime) -> None:
        blob = encrypt(json.dumps([c.model_dump() for c in pool.candidates]))
        self.session.merge(PoolRow(
            assembly_id=assembly_id,
            features_json=json.dumps([f.model_dump() for f in pool.features]),
            candidates_blob=blob, purge_after=purge_after))

    def get_pool(self, assembly_id: str) -> Pool | None:
        row = self.session.get(PoolRow, assembly_id)
        if row is None:
            return None
        cands = json.loads(decrypt(row.candidates_blob))
        return Pool(features=json.loads(row.features_json), candidates=cands)

    def raw_pool_blob(self, assembly_id: str) -> str:
        row = self.session.get(PoolRow, assembly_id)
        return row.candidates_blob if row else ""

    def save_draw(self, assembly_id: str, config: QuotaConfig,
                  result: DrawResult, audit_json: str) -> DrawRow:
        row = DrawRow(assembly_id=assembly_id, config_json=config.model_dump_json(),
                      selection_json=result.selection.model_dump_json(),
                      audit_json=audit_json, seed=result.seed, created_at=datetime.now(UTC))
        self.session.add(row); self.session.flush()
        return row

    def get_draw(self, draw_id: str) -> DrawRow | None:
        return self.session.get(DrawRow, draw_id)

    def purge_expired_pools(self, now: datetime) -> int:
        rows = self.session.query(PoolRow).filter(PoolRow.purge_after < now).all()
        for r in rows:
            self.session.delete(r)
        return len(rows)
```

- [ ] **Step 4: Wire table creation into `conftest.py`** (add a session-scoped autouse fixture)

```python
# add to tests/conftest.py
@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    from allotment.db.session import create_all
    create_all()
```

- [ ] **Step 5: Run (needs Postgres up)**

Run: `docker compose up -d db` then `pytest tests/test_repo.py -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/allotment/crypto.py src/allotment/db tests/test_repo.py tests/conftest.py docker-compose.yml
git commit -m "feat: encrypted persistence layer and pool purge"
```

---

## Task 8: Deliberation adapters (interface + export)

**Files:**
- Create: `src/allotment/adapters/__init__.py`, `src/allotment/adapters/base.py`, `src/allotment/adapters/export.py`
- Test: `tests/test_export.py`

**Interfaces:**
- Produces:
  - `base.ProvisionResult(kind: Literal["links","session","export"], session_id: str | None, join_links: dict[str,str] | None, export: str | None)`
  - `base.DeliberationTarget` (Protocol): `provision(pool, selection, session_config) -> ProvisionResult`
  - `export.CsvJsonExport(fmt: Literal["csv","json"])` implementing the protocol; returns `ProvisionResult(kind="export", export=<string>)` containing only the selected candidates (id + contact_ref + features).

- [ ] **Step 1: Write the failing test**

```python
from allotment.domain import Selection
from allotment.adapters.export import CsvJsonExport


def test_csv_export_contains_only_selected(sample_pool):
    sel = Selection(candidate_ids=["c0", "c2"], realised_probabilities={})
    res = CsvJsonExport("csv").provision(sample_pool, sel, {})
    assert res.kind == "export"
    assert "c0" in res.export and "c2" in res.export and "c1" not in res.export.splitlines()[1:][0]
```

- [ ] **Step 2: Run to verify it fails** → `pytest tests/test_export.py -v` → FAIL (module missing).

- [ ] **Step 3: Implement `base.py` and `export.py`**

```python
# src/allotment/adapters/base.py
from typing import Literal, Protocol
from pydantic import BaseModel
from allotment.domain import Pool, Selection


class ProvisionResult(BaseModel):
    kind: Literal["links", "session", "export"]
    session_id: str | None = None
    join_links: dict[str, str] | None = None
    export: str | None = None


class DeliberationTarget(Protocol):
    def provision(self, pool: Pool, selection: Selection,
                  session_config: dict) -> ProvisionResult: ...
```

```python
# src/allotment/adapters/export.py
import csv, io, json
from typing import Literal
from allotment.adapters.base import ProvisionResult
from allotment.domain import Pool, Selection


class CsvJsonExport:
    def __init__(self, fmt: Literal["csv", "json"] = "csv") -> None:
        self.fmt = fmt

    def provision(self, pool: Pool, selection: Selection, session_config: dict) -> ProvisionResult:
        chosen = [c for c in pool.candidates if c.id in set(selection.candidate_ids)]
        feature_names = [f.name for f in pool.features]
        if self.fmt == "json":
            data = json.dumps([{"id": c.id, "contact": c.contact_ref, **c.features} for c in chosen])
        else:
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(["id", "contact", *feature_names])
            for c in chosen:
                w.writerow([c.id, c.contact_ref, *[c.features.get(f, "") for f in feature_names]])
            data = buf.getvalue()
        return ProvisionResult(kind="export", export=data)
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit**

```bash
git add src/allotment/adapters/__init__.py src/allotment/adapters/base.py src/allotment/adapters/export.py tests/test_export.py
git commit -m "feat: deliberation-target interface and CSV/JSON export"
```

---

## Task 9: Harmonica adapter

**Files:**
- Create: `src/allotment/adapters/harmonica.py`
- Test: `tests/test_harmonica.py`

**Decision (resolves spec §14.1):** v1 creates a Harmonica session via REST `POST /api/v1/sessions` (sending `topic`, `goal`, `context` from `session_config`) and returns the share URL from the response as a single join link under key `"all"`. Pre-binding individual named participants is deferred; the operator distributes the link to the drawn cohort (whose contacts come from the export). The base URL and API key are injected, so the test mocks `httpx`.

**Interfaces:**
- Consumes: `DeliberationTarget`, `ProvisionResult`.
- Produces: `HarmonicaAdapter(base_url: str, api_key: str, client: httpx.Client | None = None)` implementing `provision(...) -> ProvisionResult(kind="session", session_id=..., join_links={"all": <url>})`.

- [ ] **Step 1: Write the failing test (mocked transport)**

```python
import httpx
from allotment.domain import Selection
from allotment.adapters.harmonica import HarmonicaAdapter


def test_harmonica_creates_session(sample_pool):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/sessions"
        return httpx.Response(200, json={"id": "sess-123", "url": "https://app.harmonica.chat/chat?s=sess-123"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    adapter = HarmonicaAdapter("https://app.harmonica.chat", "key", client=client)
    sel = Selection(candidate_ids=["c0"], realised_probabilities={})
    res = adapter.provision(sample_pool, sel, {"topic": "T", "goal": "G", "context": "C"})
    assert res.kind == "session" and res.session_id == "sess-123"
    assert res.join_links == {"all": "https://app.harmonica.chat/chat?s=sess-123"}
```

- [ ] **Step 2: Run to verify it fails** → FAIL (module missing).

- [ ] **Step 3: Implement `src/allotment/adapters/harmonica.py`**

```python
import httpx
from allotment.adapters.base import ProvisionResult
from allotment.domain import Pool, Selection


class HarmonicaAdapter:
    def __init__(self, base_url: str, api_key: str, client: httpx.Client | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client = client or httpx.Client()

    def provision(self, pool: Pool, selection: Selection, session_config: dict) -> ProvisionResult:
        resp = self.client.post(
            f"{self.base_url}/api/v1/sessions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={k: session_config.get(k, "") for k in ("topic", "goal", "context")},
        )
        resp.raise_for_status()
        body = resp.json()
        return ProvisionResult(kind="session", session_id=body["id"],
                               join_links={"all": body["url"]})
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit**

```bash
git add src/allotment/adapters/harmonica.py tests/test_harmonica.py
git commit -m "feat: Harmonica adapter (create session, return share link)"
```

> **Execution note:** before merging, run a real `POST /api/v1/sessions` against a Harmonica test key to confirm the response keys (`id`, `url`) match; adjust the parse if the live contract differs. This is the spec §14.1 verification step.

---

## Task 10: Auth dependency

**Files:**
- Create: `src/allotment/api/__init__.py`, `src/allotment/api/auth.py`
- Test: `tests/test_auth.py`

**Interfaces:**
- Produces: `require_operator` — FastAPI dependency that checks `Authorization: Bearer <settings.admin_token>`; raises 401 otherwise.

- [ ] **Step 1: Write failing test** (uses a tiny app)

```python
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from allotment.api.auth import require_operator


def _app():
    app = FastAPI()
    @app.get("/secure")
    def secure(_: None = Depends(require_operator)):
        return {"ok": True}
    return app


def test_rejects_without_token():
    c = TestClient(_app())
    assert c.get("/secure").status_code == 401


def test_accepts_with_token():
    c = TestClient(_app())
    r = c.get("/secure", headers={"Authorization": "Bearer dev-token-change-me"})
    assert r.status_code == 200
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement `src/allotment/api/auth.py`**

```python
from fastapi import Header, HTTPException
from allotment.config import get_settings


def require_operator(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {get_settings().admin_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="operator auth required")
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit**

```bash
git add src/allotment/api/__init__.py src/allotment/api/auth.py tests/test_auth.py
git commit -m "feat: single-operator bearer auth"
```

---

## Task 11: REST API (assembly -> pool -> quotas -> draw -> handoff)

**Files:**
- Create: `src/allotment/api/schemas.py`, `src/allotment/api/routes.py`, `src/allotment/api/app.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Endpoints (all behind `require_operator`):
  - `POST /api/assemblies` `{name, question}` -> `{assembly_id}`
  - `POST /api/assemblies/{id}/pool` `{csv, feature_columns, id_column?, contact_column?}` -> `{candidate_count, features, warnings_preview?}`
  - `POST /api/assemblies/{id}/draw` `{panel_size, targets, panel_count?, seed?}` -> `{draw_id, selection, quota_fill, audit, warnings}` (422 with warnings if `precheck_feasibility` non-empty AND solver infeasible; otherwise runs)
  - `GET /api/draws/{draw_id}` -> stored `{selection, audit, config}`
  - `POST /api/draws/{draw_id}/handoff` `{target: "export"|"harmonica", fmt?, session_config?}` -> `ProvisionResult`
- Produces: `create_app() -> FastAPI` mounting routes and serving `static/` (the built UI) at `/`.

- [ ] **Step 1: Write the failing end-to-end test**

```python
from fastapi.testclient import TestClient
from allotment.api.app import create_app

H = {"Authorization": "Bearer dev-token-change-me"}
CSV = "id,contact,gender,age\n" + "\n".join(
    f"c{i},c{i}@x.org,{'F' if i%2==0 else 'M'},{'young' if i%4<2 else 'old'}" for i in range(40))


def test_full_flow():
    c = TestClient(create_app())
    a = c.post("/api/assemblies", json={"name": "T", "question": "Q?"}, headers=H).json()
    c.post(f"/api/assemblies/{a['assembly_id']}/pool",
           json={"csv": CSV, "feature_columns": ["gender", "age"]}, headers=H)
    d = c.post(f"/api/assemblies/{a['assembly_id']}/draw",
               json={"panel_size": 10, "panel_count": 15, "seed": 5,
                     "targets": [{"feature": "gender", "value": "F", "min": 5, "max": 5},
                                 {"feature": "gender", "value": "M", "min": 5, "max": 5}]},
               headers=H)
    assert d.status_code == 200
    body = d.json()
    assert len(body["selection"]["candidate_ids"]) == 10
    assert body["quota_fill"]["gender=F"] == 5
    hand = c.post(f"/api/draws/{body['draw_id']}/handoff",
                  json={"target": "export", "fmt": "json"}, headers=H)
    assert hand.json()["kind"] == "export"
```

- [ ] **Step 2: Run** → FAIL (modules missing).

- [ ] **Step 3: Implement `schemas.py`, `routes.py`, `app.py`**

```python
# src/allotment/api/schemas.py
from pydantic import BaseModel
from allotment.domain import QuotaTarget


class CreateAssembly(BaseModel):
    name: str
    question: str


class UploadPool(BaseModel):
    csv: str
    feature_columns: list[str]
    id_column: str = "id"
    contact_column: str = "contact"


class RunDraw(BaseModel):
    panel_size: int
    targets: list[QuotaTarget]
    panel_count: int = 20
    seed: int | None = None


class Handoff(BaseModel):
    target: str
    fmt: str = "csv"
    session_config: dict = {}
```

```python
# src/allotment/api/routes.py
import json, secrets
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, HTTPException
from allotment.api.auth import require_operator
from allotment.api.schemas import CreateAssembly, UploadPool, RunDraw, Handoff
from allotment.config import get_settings
from allotment.db.session import make_session
from allotment.db.repo import AssemblyRepo
from allotment.domain import QuotaConfig
from allotment.pool_csv import parse_pool_csv, PoolValidationError
from allotment.quotas import precheck_feasibility
from allotment.selection_core.audit import run_draw, build_audit_record
from allotment.selection_core.panels import InfeasibleError
from allotment.adapters.export import CsvJsonExport
from allotment.adapters.harmonica import HarmonicaAdapter

router = APIRouter(prefix="/api", dependencies=[Depends(require_operator)])


def _repo():
    s = make_session()
    try:
        yield AssemblyRepo(s)
        s.commit()
    finally:
        s.close()


@router.post("/assemblies")
def create_assembly(body: CreateAssembly, repo=Depends(_repo)):
    a = repo.create_assembly(body.name, body.question)
    return {"assembly_id": a.id}


@router.post("/assemblies/{assembly_id}/pool")
def upload_pool(assembly_id: str, body: UploadPool, repo=Depends(_repo)):
    try:
        pool = parse_pool_csv(body.csv, body.feature_columns, body.id_column, body.contact_column)
    except PoolValidationError as e:
        raise HTTPException(422, detail=e.errors)
    days = get_settings().pool_retention_days
    repo.save_pool(assembly_id, pool, purge_after=datetime.now(UTC) + timedelta(days=days))
    return {"candidate_count": len(pool.candidates),
            "features": [f.model_dump() for f in pool.features]}


@router.post("/assemblies/{assembly_id}/draw")
def draw(assembly_id: str, body: RunDraw, repo=Depends(_repo)):
    pool = repo.get_pool(assembly_id)
    if pool is None:
        raise HTTPException(404, detail="pool not found (uploaded? purged?)")
    config = QuotaConfig(panel_size=body.panel_size, targets=body.targets)
    warnings = precheck_feasibility(pool, config)
    seed = body.seed if body.seed is not None else secrets.randbelow(2**31)
    try:
        result = run_draw(pool, config, body.panel_count, seed)
    except InfeasibleError as e:
        raise HTTPException(422, detail={"error": str(e), "warnings": warnings})
    audit = build_audit_record(pool, config, result)
    row = repo.save_draw(assembly_id, config, result, audit.model_dump_json())
    return {"draw_id": row.id, "selection": result.selection.model_dump(),
            "quota_fill": result.quota_fill, "audit": audit.model_dump(mode="json"),
            "warnings": warnings}


@router.get("/draws/{draw_id}")
def get_draw(draw_id: str, repo=Depends(_repo)):
    row = repo.get_draw(draw_id)
    if row is None:
        raise HTTPException(404, detail="draw not found")
    return {"selection": json.loads(row.selection_json),
            "audit": json.loads(row.audit_json), "config": json.loads(row.config_json)}


@router.post("/draws/{draw_id}/handoff")
def handoff(draw_id: str, body: Handoff, repo=Depends(_repo)):
    row = repo.get_draw(draw_id)
    if row is None:
        raise HTTPException(404, detail="draw not found")
    pool = repo.get_pool(row.assembly_id)
    if pool is None:
        raise HTTPException(409, detail="pool purged; cannot hand off")
    from allotment.domain import Selection
    selection = Selection(**json.loads(row.selection_json))
    if body.target == "export":
        return CsvJsonExport(body.fmt).provision(pool, selection, {}).model_dump()  # type: ignore[arg-type]
    if body.target == "harmonica":
        s = get_settings()
        adapter = HarmonicaAdapter(s.harmonica_base_url, s.harmonica_api_key)  # add to Settings
        return adapter.provision(pool, selection, body.session_config).model_dump()
    raise HTTPException(400, detail="unknown target")
```

```python
# src/allotment/api/app.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from allotment.api.routes import router
from allotment.db.session import create_all


def create_app() -> FastAPI:
    create_all()
    app = FastAPI(title="Allotment")
    app.include_router(router)
    static_dir = Path(__file__).resolve().parent.parent / "static"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="ui")
    return app
```

- [ ] **Step 4: Add `harmonica_base_url` / `harmonica_api_key` to `Settings`** (default empty string).

- [ ] **Step 5: Run (Postgres up)** → `pytest tests/test_api.py -v` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/allotment/api/schemas.py src/allotment/api/routes.py src/allotment/api/app.py src/allotment/config.py tests/test_api.py
git commit -m "feat: REST API for assembly, pool, draw, and handoff"
```

---

## Task 12: React UI (Vite + TS)

**Files:**
- Create: `ui/package.json`, `ui/vite.config.ts`, `ui/src/main.tsx`, `ui/src/api.ts`, `ui/src/App.tsx`, and one component per step of the flow: `ui/src/steps/{Assembly,Pool,Quotas,Draw,Audit,Handoff}.tsx`
- Test: build smoke (`npm run build`) + one component test optional.

**Before writing UI code, invoke the `frontend-design` skill** (this repo has no DESIGN.md) to set typography, palette, and layout direction. The component contracts below are fixed; the visual treatment comes from that skill.

**Interfaces:**
- `ui/src/api.ts` exposes typed functions mirroring Task 11 endpoints: `createAssembly`, `uploadPool`, `runDraw`, `getDraw`, `handoff`, each sending the `Authorization: Bearer <token>` header (token entered in the UI and kept in memory).

- [ ] **Step 1: Scaffold Vite app** — `npm create vite@latest ui -- --template react-ts` then add the API client.

- [ ] **Step 2: Implement `ui/src/api.ts`** (typed fetch wrappers; one function per endpoint; throws on non-2xx with the server `detail`).

- [ ] **Step 3: Implement the five-step flow in `App.tsx`** — a linear wizard: (1) operator token + create assembly; (2) paste/upload CSV + pick feature columns; (3) define quota targets + panel size (+ "load Bouricius preset" dropdown that fills targets); (4) run draw, show selection table + quota-fill vs targets + the seed; (5) audit view (input hash, seed, realised-probability histogram) and handoff (export download or "create Harmonica session" button showing the returned link).

- [ ] **Step 4: Build smoke** — `cd ui && npm run build` → succeeds; output in `ui/dist`.

- [ ] **Step 5: Commit**

```bash
git add ui
git commit -m "feat: React wizard UI for the selection flow"
```

> Detailed component code is produced during execution with `frontend-design`; the API contract in `ui/src/api.ts` and the five-step structure above are the fixed spec.

---

## Task 13: Packaging, deploy, docs

**Files:**
- Create: `Dockerfile`, `README.md`, `LICENSE`, `.dockerignore`, a `purge` entrypoint (`src/allotment/cli.py` with `purge_pools()`), update `docker-compose.yml` to add the `app` service.

- [ ] **Step 1: Write `src/allotment/cli.py`** — `purge_pools()` opens a session, calls `AssemblyRepo.purge_expired_pools(now)`, commits, prints count. (Intended for a cron / scheduled task.)

- [ ] **Step 2: Write `Dockerfile`** — multi-stage: node stage builds `ui/` into `src/allotment/static`; python stage installs the package and runs `uvicorn allotment.api.app:create_app --factory --host 0.0.0.0 --port 8000`.

```dockerfile
FROM node:20 AS ui
WORKDIR /ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir .
COPY --from=ui /ui/dist/ ./src/allotment/static/
EXPOSE 8000
CMD ["uvicorn", "allotment.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Add the `app` service to `docker-compose.yml`** (build context `.`, depends_on `db`, env `ALLOTMENT_DATABASE_URL`, `ALLOTMENT_ADMIN_TOKEN`, `ALLOTMENT_SECRET_KEY`).

- [ ] **Step 4: Write `README.md`** — what it is, the fairness method (maximin over feasible panels; link the spec), quickstart (`docker compose up`), the data lifecycle/PII note (encrypted contact, auto-purge), and a "not affiliated with / wraps Harmonica via its public API" note.

- [ ] **Step 5: Add `LICENSE`** — AGPL-3.0 (pending confirmation per spec §14.3).

- [ ] **Step 6: Smoke test the stack** — `docker compose up --build`, then `curl` the full flow against `localhost:8000` with the admin token; confirm a draw returns 10 ids and the UI loads at `/`.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml README.md LICENSE src/allotment/cli.py
git commit -m "chore: Docker packaging, compose stack, purge CLI, and docs"
```

---

## Done criteria

- `pytest` green (selection-core, persistence, API, adapters, auth).
- `docker compose up --build` serves the UI at `/` and the API under `/api`.
- A full flow (create -> upload -> draw -> audit -> export/Harmonica) works end-to-end with the operator token.
- The draw is reproducible from `(input_hash, seed)`; quotas are met or a clear infeasibility error is returned.
- README documents the fairness method, the PII lifecycle, and the Harmonica interop.

## Deferred (post-v1, per spec §13)

Standing registry; full lexicographic leximin refinement; multi-body orchestrator; Polis/Decidim adapters; recruitment/outreach.
