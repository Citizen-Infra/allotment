import random
import pytest
from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.panels import generate_feasible_panels, InfeasibleError


def _cfg():
    return QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])


def test_panels_meet_quotas(sample_pool):
    rng = random.Random(1)
    panels = generate_feasible_panels(sample_pool, _cfg(), count=5, rng=rng)
    assert panels
    by_id = {c.id: c.features for c in sample_pool.candidates}
    for p in panels:
        assert len(p) == 10
        f_count = sum(1 for cid in p if by_id[cid]["gender"] == "F")
        assert f_count == 5


def test_infeasible_raises(sample_pool):
    rng = random.Random(1)
    bad = QuotaConfig(panel_size=10, targets=[QuotaTarget(feature="gender", value="F", min=9, max=9),
                                              QuotaTarget(feature="gender", value="M", min=9, max=9)])
    with pytest.raises(InfeasibleError):
        generate_feasible_panels(sample_pool, bad, count=3, rng=rng)
