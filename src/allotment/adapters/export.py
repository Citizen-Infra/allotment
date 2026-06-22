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
