from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.audit import (
    canonical_input_hash,
    run_draw,
    build_audit_record,
    representativeness_indices,
)


def _cfg():
    return QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])


def test_hash_is_order_independent(sample_pool):
    import copy
    p2 = copy.deepcopy(sample_pool)
    p2.candidates.reverse()
    assert canonical_input_hash(sample_pool, _cfg()) == canonical_input_hash(p2, _cfg())


def test_run_draw_reproducible(sample_pool):
    a = run_draw(sample_pool, _cfg(), panel_count=15, seed=3)
    b = run_draw(sample_pool, _cfg(), panel_count=15, seed=3)
    assert a.selection.candidate_ids == b.selection.candidate_ids


def test_audit_record_fields(sample_pool):
    res = run_draw(sample_pool, _cfg(), panel_count=15, seed=3)
    rec = build_audit_record(sample_pool, _cfg(), res)
    assert rec.seed == 3 and rec.panel_size == 10
    assert rec.input_hash == canonical_input_hash(sample_pool, _cfg())
    # Hard 5/5 F/M targets are satisfied exactly, so the panel matches perfectly.
    assert rec.accuracy_index == 0.0
    assert rec.closeness_index == 0.0


def test_indices_perfect_match_is_zero():
    cfg = QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])
    assert representativeness_indices(cfg, {"gender=F": 5, "gender=M": 5}) == (0.0, 0.0)


def test_closeness_penalises_concentrated_deviation():
    # Gerwin et al. Table 1: a 4-seat total deviation scores worse on Closeness
    # when concentrated in one subcategory than when spread across four.
    cfg = QuotaConfig(panel_size=50, targets=[
        QuotaTarget(feature="age", value="a", min=6, max=6),
        QuotaTarget(feature="age", value="b", min=14, max=14),
        QuotaTarget(feature="age", value="c", min=20, max=20),
        QuotaTarget(feature="age", value="d", min=10, max=10)])

    spread = {"age=a": 5, "age=b": 15, "age=c": 19, "age=d": 11}  # each off by 1
    assert representativeness_indices(cfg, spread) == (4.0, 4.0)

    concentrated = {"age=a": 6, "age=b": 14, "age=c": 16, "age=d": 10}  # one off by 4
    assert representativeness_indices(cfg, concentrated) == (4.0, 9.19)


def test_ideal_is_band_midpoint():
    cfg = QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="g", value="F", min=4, max=6)])  # ideal = 5
    assert representativeness_indices(cfg, {"g=F": 5}) == (0.0, 0.0)
    assert representativeness_indices(cfg, {"g=F": 4}) == (1.0, 1.0)


def test_missing_fill_counts_as_zero_and_no_targets_is_zero():
    cfg = QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="g", value="F", min=3, max=3)])
    assert representativeness_indices(cfg, {}) == (3.0, round(3.0**1.6, 2))
    empty = QuotaConfig(panel_size=10, targets=[])
    assert representativeness_indices(empty, {}) == (0.0, 0.0)
