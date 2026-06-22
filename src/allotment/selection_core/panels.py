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
