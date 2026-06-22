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
