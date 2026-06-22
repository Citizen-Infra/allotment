import os
os.environ.setdefault("ALLOTMENT_DATABASE_URL", "sqlite:///./test_allotment.db")

import pytest
from allotment.domain import Candidate, Pool, FeatureSpec


@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    from allotment.db.session import create_all
    create_all()


@pytest.fixture
def sample_pool() -> Pool:
    # 40 candidates, 2 features: gender {F,M}, age {young,old}
    cands = []
    for i in range(40):
        gender = "F" if i % 2 == 0 else "M"
        age = "young" if i % 4 < 2 else "old"
        cands.append(Candidate(id=f"c{i}", features={"gender": gender, "age": age},
                               contact_ref=f"c{i}@example.org"))
    specs = [FeatureSpec(name="gender", values=["F", "M"]),
             FeatureSpec(name="age", values=["young", "old"])]
    return Pool(features=specs, candidates=cands)
