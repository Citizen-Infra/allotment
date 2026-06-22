from typing import Any

import httpx
from allotment.adapters.base import ProvisionResult
from allotment.domain import Pool, Selection


class HarmonicaAdapter:
    def __init__(self, base_url: str, api_key: str, client: httpx.Client | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client = client or httpx.Client()

    def provision(self, pool: Pool, selection: Selection, session_config: dict[str, Any]) -> ProvisionResult:
        resp = self.client.post(
            f"{self.base_url}/api/v1/sessions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={k: session_config.get(k, "") for k in ("topic", "goal", "context")},
        )
        resp.raise_for_status()
        body = resp.json()
        return ProvisionResult(kind="session", session_id=body["id"],
                               join_links={"all": body["url"]})
