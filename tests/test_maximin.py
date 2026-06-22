from allotment.domain import QuotaConfig, QuotaTarget
from allotment.selection_core.maximin import solve_maximin_weights, draw_selection


def _cfg():
    return QuotaConfig(panel_size=10, targets=[
        QuotaTarget(feature="gender", value="F", min=5, max=5),
        QuotaTarget(feature="gender", value="M", min=5, max=5)])


def test_weights_sum_to_one():
    panels = [frozenset({"a", "b"}), frozenset({"b", "c"})]
    w = solve_maximin_weights(panels, ["a", "b", "c"])
    assert abs(sum(w.values()) - 1.0) < 1e-6


def test_draw_meets_quota_and_size(sample_pool):
    sel, fill = draw_selection(sample_pool, _cfg(), panel_count=20, seed=7)
    assert len(sel.candidate_ids) == 10
    assert fill["gender=F"] == 5
    assert set(sel.realised_probabilities) == {c.id for c in sample_pool.candidates}


def test_draw_is_deterministic(sample_pool):
    a, _ = draw_selection(sample_pool, _cfg(), panel_count=20, seed=7)
    b, _ = draw_selection(sample_pool, _cfg(), panel_count=20, seed=7)
    assert a.candidate_ids == b.candidate_ids


# Step 5: Hypothesis fairness property test
from hypothesis import given, settings, strategies as st, HealthCheck


@settings(max_examples=15, deadline=None,
          suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(seed=st.integers(min_value=0, max_value=10_000))
def test_quota_always_met_under_random_seed(sample_pool, seed):
    sel, fill = draw_selection(sample_pool, _cfg(), panel_count=15, seed=seed)
    assert len(sel.candidate_ids) == 10
    assert fill["gender=F"] == 5 and fill["gender=M"] == 5
