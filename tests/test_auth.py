from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from allotment.api.auth import require_operator


def _app():
    app = FastAPI()
    @app.get("/secure")
    def secure(_: None = Depends(require_operator)):
        return {"ok": True}
    return app


def test_rejects_without_token():
    c = TestClient(_app())
    assert c.get("/secure").status_code == 401


def test_accepts_with_token():
    c = TestClient(_app())
    r = c.get("/secure", headers={"Authorization": "Bearer dev-token-change-me"})
    assert r.status_code == 200
