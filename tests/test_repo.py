import pytest
from datetime import UTC, datetime, timedelta
from allotment.db.session import make_session
from allotment.db.repo import AssemblyRepo


@pytest.fixture
def repo():
    s = make_session()  # uses settings.database_url; conftest creates tables
    r = AssemblyRepo(s)
    yield r
    s.rollback()
    s.close()


def test_pool_roundtrip_is_encrypted_at_rest(repo, sample_pool):
    a = repo.create_assembly("Test", "What should we do?")
    repo.save_pool(a.id, sample_pool, purge_after=datetime.now(UTC) + timedelta(days=30))
    repo.session.commit()
    loaded = repo.get_pool(a.id)
    assert loaded.candidates[0].contact_ref == sample_pool.candidates[0].contact_ref
    # the stored blob must not contain the plaintext contact
    raw = repo.raw_pool_blob(a.id)
    assert "c0@example.org" not in raw


def test_purge_expired(repo, sample_pool):
    a = repo.create_assembly("Old", "q")
    repo.save_pool(a.id, sample_pool, purge_after=datetime.now(UTC) - timedelta(days=1))
    repo.session.commit()
    n = repo.purge_expired_pools(datetime.now(UTC))
    repo.session.commit()
    assert n == 1 and repo.get_pool(a.id) is None
