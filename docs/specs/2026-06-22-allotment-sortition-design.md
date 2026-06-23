# Allotment — a fair-sortition engine for online deliberations

- **Status:** Approved design (brainstorming output). Pre-implementation.
- **Date:** 2026-06-22
- **Owner:** Artem Zhiganov (CIBC)
- **Repo:** public, `Citizen-Infra` org (not yet created — creation is a separate, confirmed step).
- **Name:** *Allotment* (confirmed 2026-06-22). Alternative considered: *Kleroterion*.
- **Licence:** AGPL-3.0 (confirmed 2026-06-22) — keep the engine a protected commons.

## 1. Summary

Allotment is a **self-hostable web app + JSON API** that runs **fair, auditable sortition draws** and hands the selected mini-public to a deliberation tool. It owns the *selection* layer — the civic lottery that Bouricius treats as the legitimacy core of sortition — and deliberately leaves the *deliberation* itself to existing tools, Harmonica first, via a small adapter seam.

It is open-source civic infrastructure: a credible, reproducible lottery that any group running an online citizens' assembly can stand up themselves.

## 2. Motivation

Tools like [Harmonica](https://harmonica.chat/) run the *conversation* — structured async deliberation that turns many voices into a shared summary. What they don't do is decide **who is in the room**. For a deliberation to carry the legitimacy of a citizens' assembly, the participants must be selected by a fair lottery (stratified to mirror the population), not self-selected or hand-picked.

Terry Bouricius's *Democracy Without Politicians* (Routledge, 2026) makes the fair draw the foundation of the whole multi-body design: bodies differ in size and selection method, but all rest on a manipulation-resistant lottery. Allotment builds that primitive as reusable infrastructure. Bouricius's seven bodies (Agenda Council, Interest Panels, Review Panels, Policy Juries, Coordination Council, Rules Council, Oversight Councils) become **saved selection presets** rather than hard-coded software — the book's design is expressible without building the entire legislature.

## 3. Scope and boundary

**v1 does:**
- Import a pool of candidate participants per assembly (CSV/API upload).
- Define stratification quotas (or load a Bouricius preset).
- Run a fair, reproducible draw and produce an auditable record.
- Review/audit the result in the browser.
- Hand the selected cohort to a deliberation tool (Harmonica adapter) or export it (CSV/JSON).

**v1 does not (deferred — see §13):**
- Run the deliberation (Harmonica's job).
- Maintain a standing registry of registered people (later phase on the same core).
- Orchestrate the multi-body pipeline across rounds (the engine only makes bodies *expressible* as presets).
- Recruit / send outreach / manage mailing.
- Ship Polis/Decidim adapters (the interface is ready; only Harmonica + export are built).

## 4. Key decisions (traceability)

| Decision | Choice | Rationale |
|---|---|---|
| v1 core | Sortition **selection engine** | The reusable, concrete, naturally-interoperable primitive; bodies become configs on top. |
| Participant pool | **Imported per run**; standing registry later (phased) | Smallest, privacy-light, matches real recruitment; registry is a separable subsystem. |
| Lottery rigour | **Fair-selection algorithm** (leximin-style) | The fair, auditable draw *is* the legitimacy claim; quota-filling is not sortition. |
| Interop | **Adapter seam**, Harmonica first + CSV/JSON export | Satisfies "interoperable with Harmonica and other tools" with one thin abstraction. |
| Form factor | **Self-hostable web app** | Usable by non-technical organisers; operator stays sole data custodian. |
| Architecture | **One Python service** (FastAPI) + React UI + Postgres | Fewest moving parts to self-host; solver lives where mature solvers are. |
| Hosting | Self-host (Docker/compose); optional CIBC reference instance on Railway | Operator owns their pool data; no mandatory third-party custodian. |

## 5. Architecture — one service

```
            +------------------------------------------+
            |              FastAPI app                 |
 browser -->|  React (Vite) UI  (served as static)     |
   &        |  REST / JSON API  <---- other tools      |
 API users  |  Auth (single-operator, env credential)  |
            |                                          |
            |  selection-core  (pure Python module)    |
            |    leximin solver + seeded sampling      |
            |                                          |
            |  adapters: DeliberationTarget            |
            |    - HarmonicaAdapter (HTTP)             |
            |    - CsvJsonExport                       |
            +-------------------+----------------------+
                                |
                          [ Postgres ]
                 assemblies, pools, quota configs,
                 selections, audit records
```

- **FastAPI app** — exposes the REST/JSON API and serves the built React SPA as static files. One deployable container.
- **selection-core** — a pure Python package with no web or DB dependencies: the fair-selection algorithm and reproducible randomisation. Independently importable and testable; it is the heart of the system and the part most heavily tested.
- **Postgres** — persistence for assemblies, uploaded pools, quota configs, selections, and audit records.
- **adapters** — a `DeliberationTarget` interface with a `HarmonicaAdapter` (calls Harmonica over HTTP) and a `CsvJsonExport` (always available).
- **Auth** — v1 uses a single-operator credential supplied via environment (the organiser runs their own instance). Multi-user accounts/roles are out of scope for v1.
- **Deploy** — a `Dockerfile` plus `docker-compose.yml` (app + Postgres) for one-command self-hosting; Railway-friendly for an optional CIBC-run reference instance.

## 6. Domain model and data flow

Core entities: **Assembly** → **Pool** → **QuotaConfig** → **Draw** → **Selection** + **AuditRecord**.

Operator path:
1. Create an **Assembly** (name + the deliberation question).
2. Upload a **Pool** — CSV with one row per respondent: an opaque `id`, demographic `features`, and a `contact_ref`. Validated against a declared schema (feature names + allowed values).
3. Define a **QuotaConfig** — stratification features with target min/max per category, and the panel size. Optionally load a **Bouricius preset** (e.g. Policy Jury sizing).
4. Run the **Draw** — the solver computes fair selection probabilities meeting the quotas; a seeded RNG samples one panel; the system records a **Selection** and an **AuditRecord** (input hash, quotas, each person's realised selection probability, the random seed, timestamp).
5. **Review/audit** in the UI: who was drawn, quota fill vs targets, fairness statistics, the published seed.
6. **Hand off** via a `DeliberationTarget`: the Harmonica adapter creates the session and returns join/share links, or CSV/JSON export.

## 7. The selection core (the legitimacy heart)

- **Input:** pool (feature vector per person), quota constraints (per feature-value min/max), panel size.
- **Method:** find a distribution over selections that satisfies the quotas while making each eligible person's marginal probability of selection as equal as the quotas allow (a **leximin** fairness objective), then draw one panel from that distribution under a **published random seed**. Reference: Flanigan, Gölz, Hammond, Hennig & Procaccia, "Fair algorithms for selecting citizens' assemblies," *Nature* 596 (2021); the Sortition Foundation's [`sortition-algorithms`](https://github.com/sortitionfoundation/sortition-algorithms) is the reference implementation (prior art, §16). v1 ships **maximin**, the dominant leximin level; full leximin is tracked in issue #6. Solver: Google OR-Tools, or PuLP + CBC (decided in planning; see §14).
- **Output:** selected ids, each person's realised selection probability, a quota-fill report, and a reproducibility bundle (seed + canonical input hash).
- **Properties:** deterministic given the seed; produces an identical selection on re-run with the same inputs + seed; no I/O. These properties are the basis of the test suite (§11).

## 8. Interop contract

```
DeliberationTarget.provision(cohort, session_config)
    -> { join_links | session_id | export_uri }
```

- **HarmonicaAdapter** — calls Harmonica's public REST `/api/v1/sessions` to create the deliberation and return the share/join link. Open question (§14): whether Harmonica supports pre-binding named/selected participants, or whether the adapter creates the session and returns one link the operator distributes to the drawn cohort.
- **CsvJsonExport** — emits the selected cohort as a portable artifact with a documented, versioned schema. The universal fallback; always available regardless of adapter.
- **Future adapters** (Polis, Decidim, …) implement the same interface without touching the core.

## 9. Data model and PII handling

The pool contains real people's demographic data; handle it defensively from day one.

- **Minimise:** store an opaque `id`, only the stratification `features` actually used, and a `contact_ref` — preferably an external token rather than a raw email where the operator can supply one.
- **Encrypt:** the `contact_ref` (and any direct identifier) encrypted at rest.
- **Retention:** auto-purge a pool a configurable window after its draw (default e.g. 30 days), plus on-demand deletion.
- **Custody:** self-hosting means the operator is the sole custodian; no third party holds the data. The data lifecycle is documented prominently in the README.

## 10. Errors and edge cases

- **Infeasible quotas** (no panel can satisfy the constraints): a clear diagnostic naming the conflicting constraints, never a crash or a silently relaxed draw.
- **Pool too small / unfillable quota cell:** warn with the specific shortfall before drawing.
- **Solver timeout or failure:** surfaced explicitly; the draw is not silently degraded to a non-fair fallback.
- **Adapter / Harmonica API failure:** the Selection is persisted first; handoff is retriable; CSV/JSON export always works as the fallback path.
- **Malformed pool upload:** schema validation rejects with row-level error messages.

## 11. Testing strategy

- **selection-core:** property-based tests (Hypothesis) — quotas always met when feasible; each person's selection probability equal within tolerance when quotas allow; determinism given a seed; plus known-answer fixtures derived from the literature. An explicit reproducibility test (same inputs + seed → byte-identical selection).
- **API + adapters:** integration tests against a mocked Harmonica; pool-upload validation tests; auth tests.
- **CI:** run the full suite on every push before the project is considered green.

## 12. Stack and deployment

Python 3.12 · FastAPI · OR-Tools (or PuLP + CBC) · Postgres · React + Vite · Docker + docker-compose · Railway (optional reference instance) · pytest + Hypothesis. When the UI is built, run the `frontend-design` skill (this repo has no DESIGN.md).

## 13. Out of scope for v1 / future phases

- **Standing registry** — accounts, consent management, GDPR/PII-at-rest for a reusable register, re-contact. A later layer on the same selection core.
- **Multi-body orchestrator** — the Bouricius pipeline as a running state machine across rounds and bodies. v1 only makes bodies *expressible* as presets.
- **Additional adapters** — Polis, Decidim, etc. (interface-ready).
- **Recruitment/outreach** — broadcasting the public call, mailing respondents.

## 14. Open questions (resolve during planning)

1. **Harmonica participant binding** — can the REST API pre-bind named participants, or only return one shared session link? Determines the `HarmonicaAdapter` shape (§8).
2. **Solver choice** — OR-Tools vs PuLP+CBC for the leximin optimisation: weigh self-host footprint, licensing, and how cleanly each expresses the iterative leximin objective.
3. ~~Licence~~ — **resolved: AGPL-3.0** (confirmed 2026-06-22).
4. ~~Final name~~ — **resolved: Allotment** (confirmed 2026-06-22).

## 15. Repository and licensing

Public repo under the `Citizen-Infra` GitHub org. Repo creation, licence selection (§14.3), and scaffolding happen *after* this spec is approved and an implementation plan is written — each as a confirmed step.

## 16. Prior art and positioning

Sortition splits into two layers: **selection** (the lottery that picks a representative panel) and **deliberation** (the panel's discussion itself). They are normally separate tools. Allotment lives in the selection layer and hands off to the deliberation layer; its real peers are the other selection tools below, not the deliberation platforms.

**Algorithmic lineage.** The fair-selection method is Flanigan, Gölz, Hammond, Hennig & Procaccia, "Fair algorithms for selecting citizens' assemblies," *Nature* 596 (2021), https://www.nature.com/articles/s41586-021-03788-6. It introduced **leximin**: maximise the minimum individual selection probability subject to the quotas, then lexicographically the next-lowest, and so on. As of 2021 the Sortition Foundation had used it for 40+ real panels.

**Closest existing tools** (all open source, Sortition Foundation unless noted):
- [`sortition-algorithms`](https://github.com/sortitionfoundation/sortition-algorithms) — the current Python library implementing full leximin; the direct analogue of Allotment's `selection_core` and the reference to differential-test against.
- [`stratification-app`](https://github.com/sortitionfoundation/stratification-app) — the older desktop GUI over the same algorithms.
- **StratifySelect** — the Sortition Foundation's hosted / open-source product on top of the library.
- [`groupselect-app`](https://github.com/sortitionfoundation/groupselect-app) — adjacent: splits a selected assembly into balanced small groups.
- **Panelot**, **Sortition Magic** — other web-based selection tools using the same algorithmic idea.

**How Allotment is positioned:**
- **Service, not library.** The peers are a Python package and desktop apps; Allotment is a self-hostable API + UI + Postgres + Docker, with the selection algorithm as one module inside a deployable system.
- **Spans the selection→deliberation handoff.** The `DeliberationTarget` seam (§8) crosses the boundary the selection tools deliberately leave open; no existing tool stitches the lottery directly into an online deliberation runtime.
- **Verifiable reproducibility as the frontier.** The open problem in the field is *transparent* lotteries — publishing the panel and letting anyone verify the draw was fair. Allotment's `(input_hash, seed)` bundle (§7) targets exactly that.
- **maximin = leximin level 1.** v1 ships maximin; full lexicographic leximin (issue #6) is the headline algorithmic roadmap item — the specific property that lets the Sortition Foundation call its draw "the fairest."

**When to use what.** If you only need the selection math as a dependency, use `sortition-algorithms`. Allotment is for operators who want to run the whole draw-to-deliberation flow as a self-hosted system.
