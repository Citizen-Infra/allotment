import pytest
from allotment.pool_csv import parse_pool_csv, PoolValidationError

CSV = "id,contact,gender,age\nc0,c0@x.org,F,young\nc1,c1@x.org,M,old\n"


def test_parse_ok():
    pool = parse_pool_csv(CSV, feature_columns=["gender", "age"])
    assert len(pool.candidates) == 2
    assert pool.feature_names() == {"gender", "age"}
    assert pool.candidates[0].contact_ref == "c0@x.org"


def test_missing_column_raises():
    with pytest.raises(PoolValidationError) as e:
        parse_pool_csv("id,contact,gender\nc0,c0@x.org,F\n", feature_columns=["gender", "age"])
    assert any("age" in m for m in e.value.errors)


def test_duplicate_id_raises():
    bad = "id,contact,gender,age\nc0,a@x,F,young\nc0,b@x,M,old\n"
    with pytest.raises(PoolValidationError):
        parse_pool_csv(bad, feature_columns=["gender", "age"])
