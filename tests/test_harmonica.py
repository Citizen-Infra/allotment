import httpx
from allotment.domain import Selection
from allotment.adapters.harmonica import HarmonicaAdapter


def test_harmonica_creates_session(sample_pool):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/sessions"
        return httpx.Response(200, json={"id": "sess-123", "url": "https://app.harmonica.chat/chat?s=sess-123"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    adapter = HarmonicaAdapter("https://app.harmonica.chat", "key", client=client)
    sel = Selection(candidate_ids=["c0"], realised_probabilities={})
    res = adapter.provision(sample_pool, sel, {"topic": "T", "goal": "G", "context": "C"})
    assert res.kind == "session" and res.session_id == "sess-123"
    assert res.join_links == {"all": "https://app.harmonica.chat/chat?s=sess-123"}
