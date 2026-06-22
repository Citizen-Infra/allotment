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


def build_audit_record(pool: Pool, config: QuotaConfig, result: DrawResult) -> AuditRecord:
    return AuditRecord(
        input_hash=canonical_input_hash(pool, config),
        seed=result.seed,
        panel_size=config.panel_size,
        quota_fill=result.quota_fill,
        created_at=datetime.now(UTC),
    )
