from allotment.domain import QuotaConfig, QuotaTarget
from allotment.quotas import precheck_feasibility


def test_unknown_feature_flagged(sample_pool):
    cfg = QuotaConfig(panel_size=10, targets=[QuotaTarget(feature="race", value="x", min=1, max=2)])
    warnings = precheck_feasibility(sample_pool, cfg)
    assert any("race" in w for w in warnings)


def test_min_exceeds_supply_flagged(sample_pool):
    # only 20 F in pool; ask for 25 min
    cfg = QuotaConfig(panel_size=30, targets=[QuotaTarget(feature="gender", value="F", min=25, max=30)])
    warnings = precheck_feasibility(sample_pool, cfg)
    assert any("F" in w and "supply" in w.lower() for w in warnings)


def test_clean_config_no_warnings(sample_pool):
    cfg = QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=4, max=6),
        QuotaTarget(feature="gender", value="M", min=4, max=6)])
    assert precheck_feasibility(sample_pool, cfg) == []
