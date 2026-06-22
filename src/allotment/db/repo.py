import json
from datetime import datetime, UTC, timezone
from allotment.crypto import encrypt, decrypt
from allotment.db.models import AssemblyRow, PoolRow, DrawRow
from allotment.domain import Pool, DrawResult, QuotaConfig


def _as_naive_utc(dt: datetime) -> datetime:
    """Normalize a datetime to naive UTC.

    SQLite stores DateTime(timezone=True) as naive UTC strings and returns
    naive datetimes on read.  To compare consistently across SQLite (naive)
    and Postgres (tz-aware), strip the UTC offset before building SQL
    comparisons — safe because every datetime we write is UTC.
    """
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


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
        # Normalize to naive UTC so comparisons work on both SQLite (naive)
        # and Postgres (tz-aware stored as UTC by the driver).
        cutoff = _as_naive_utc(now)
        rows = self.session.query(PoolRow).filter(PoolRow.purge_after < cutoff).all()
        for r in rows:
            self.session.delete(r)
        return len(rows)
