from allotment.domain import Candidate, Pool, FeatureSpec, QuotaConfig, QuotaTarget


def test_pool_feature_names(sample_pool):
    assert sample_pool.feature_names() == {"gender", "age"}


def test_quota_config_rejects_min_gt_max():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        QuotaConfig(panel_size=10, targets=[QuotaTarget(feature="gender", value="F", min=6, max=4)])
