from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.audit import canonical_input_hash, run_draw, build_audit_record


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
