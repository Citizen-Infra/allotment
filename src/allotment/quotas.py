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
