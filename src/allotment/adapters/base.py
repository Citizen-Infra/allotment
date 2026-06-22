from typing import Literal, Protocol
from pydantic import BaseModel
from allotment.domain import Pool, Selection


class ProvisionResult(BaseModel):
    kind: Literal["links", "session", "export"]
    session_id: str | None = None
    join_links: dict[str, str] | None = None
    export: str | None = None


class DeliberationTarget(Protocol):
    def provision(self, pool: Pool, selection: Selection,
                  session_config: dict) -> ProvisionResult: ...
