import json

import httpx
from allotment.domain import Selection
from allotment.adapters.harmonica import HarmonicaAdapter


def test_harmonica_creates_session(sample_pool):
    """Mirror the live contract: POST /api/v1/sessions returns 201 with
    `id` + `join_url` (verified against app.harmonica.chat for issue #5)."""
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/sessions"
        assert request.headers["Authorization"] == "Bearer key"
        captured.update(json.loads(request.content))
        return httpx.Response(201, json={
            "id": "984f6c8d",
            "topic": "T", "goal": "G", "status": "active",
            "participant_count": 0,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "join_url": "https://pro.harmonica.chat/chat?s=984f6c8d",
        })

    client = httpx.Client(transport=httpx.MockTransport(handler))
    adapter = HarmonicaAdapter("https://app.harmonica.chat", "key", client=client)
    sel = Selection(candidate_ids=["c0"], realised_probabilities={})
    res = adapter.provision(sample_pool, sel, {"topic": "T", "goal": "G", "context": "C"})

    assert res.kind == "session" and res.session_id == "984f6c8d"
    assert res.join_links == {"all": "https://pro.harmonica.chat/chat?s=984f6c8d"}
    # The adapter must forward the API-required topic + goal.
    assert captured["topic"] == "T" and captured["goal"] == "G"
