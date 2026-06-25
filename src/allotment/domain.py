from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime


class FeatureSpec(BaseModel):
    name: str
    values: list[str]


class Candidate(BaseModel):
    id: str
    features: dict[str, str]
    contact_ref: str


class Pool(BaseModel):
    features: list[FeatureSpec]
    candidates: list[Candidate]

    def feature_names(self) -> set[str]:
        return {f.name for f in self.features}


class QuotaTarget(BaseModel):
    feature: str
    value: str
    min: int
    max: int

    @model_validator(mode="after")
    def _min_le_max(self) -> "QuotaTarget":
        if self.min > self.max:
            raise ValueError(f"min {self.min} > max {self.max} for {self.feature}={self.value}")
        return self


class QuotaConfig(BaseModel):
    panel_size: int
    targets: list[QuotaTarget]

    @field_validator("panel_size")
    @classmethod
    def _positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("panel_size must be positive")
        return v


class Selection(BaseModel):
    candidate_ids: list[str]
    realised_probabilities: dict[str, float]


class DrawResult(BaseModel):
    selection: Selection
    seed: int
    quota_fill: dict[str, int]


class AuditRecord(BaseModel):
    input_hash: str
    seed: int
    panel_size: int
    quota_fill: dict[str, int]
    accuracy_index: float
    closeness_index: float
    created_at: datetime
