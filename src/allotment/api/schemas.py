from typing import Any

from pydantic import BaseModel, Field
from allotment.domain import QuotaTarget


class CreateAssembly(BaseModel):
    name: str
    question: str


class UploadPool(BaseModel):
    csv: str
    feature_columns: list[str]
    id_column: str = "id"
    contact_column: str = "contact"


class RunDraw(BaseModel):
    panel_size: int
    targets: list[QuotaTarget]
    panel_count: int = 20
    seed: int | None = None


class Handoff(BaseModel):
    target: str
    fmt: str = "csv"
    session_config: dict[str, Any] = Field(default_factory=dict)
