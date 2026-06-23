# Process Notes — allotment

## 2026-06-23 — CI + dependency hardening + prior-art
- **Done:** GitHub Actions CI (ruff/mypy/pytest); cleared 11 ruff + 21 mypy-strict errors; pinned `pulp<4`; bumped `checkout@v5` / `setup-python@v6`. Added prior-art/positioning (Sortition Foundation `sortition-algorithms`, Nature 2021 leximin) to README + design spec §16; reframed issue #6 (full leximin) and filed #13 (transparent/verifiable lottery).
- **Decisions:** Keep mypy `strict` (only a legitimate `pulp` stub override). Land CI via a PR so the workflow self-verifies before merge.
- **State:** `main` green; CI live; issues #2–9 + #13 open.
- **Next:** #2 Docker/Postgres smoke (needs a real container); full leximin (#6).
