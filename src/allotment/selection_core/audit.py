import hashlib
import json
from datetime import UTC, datetime
from allotment.domain import AuditRecord, DrawResult, Pool, QuotaConfig
from allotment.selection_core.maximin import draw_selection


def canonical_input_hash(pool: Pool, config: QuotaConfig) -> str:
    payload = {
        "candidates": sorted(
            ({"id": c.id, "features": dict(sorted(c.features.items()))} for c in pool.candidates),
            key=lambda d: str(d["id"])),
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


def representativeness_indices(
    config: QuotaConfig, quota_fill: dict[str, int]
) -> tuple[float, float]:
    """How closely the drawn panel matches the centre of each quota band.

    For every quota target the ideal seat count is the band midpoint
    ``(min + max) / 2`` (so a hard target ``min == max`` reduces to the exact
    desired count). The per-target deviation is ``|actual - ideal|``.

    - Accuracy Index: the summed deviations. 0 is a perfect match.
    - Closeness Index: the deviations raised to 1.6 and summed, so a few large
      misses score worse than many small ones. 0 is a perfect match.

    Both follow Gerwin et al., "Designing the Process of Random Selection of
    Citizens' Assemblies" (Journal of Sortition, 2025). With no quota targets
    there is nothing to measure against, so both are 0.
    """
    accuracy = 0.0
    closeness = 0.0
    for t in config.targets:
        actual = quota_fill.get(f"{t.feature}={t.value}", 0)
        ideal = (t.min + t.max) / 2
        deviation = abs(actual - ideal)
        accuracy += deviation
        closeness += deviation**1.6
    return round(accuracy, 2), round(closeness, 2)


def build_audit_record(pool: Pool, config: QuotaConfig, result: DrawResult) -> AuditRecord:
    accuracy, closeness = representativeness_indices(config, result.quota_fill)
    return AuditRecord(
        input_hash=canonical_input_hash(pool, config),
        seed=result.seed,
        panel_size=config.panel_size,
        quota_fill=result.quota_fill,
        accuracy_index=accuracy,
        closeness_index=closeness,
        created_at=datetime.now(UTC),
    )
