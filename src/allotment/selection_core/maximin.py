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
    if pulp.LpStatus[prob.status] != "Optimal":
        raise RuntimeError(f"maximin LP did not solve to optimality: {pulp.LpStatus[prob.status]}")
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
