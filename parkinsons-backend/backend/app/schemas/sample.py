import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SampleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    drawing_type: str
    uploaded_at: datetime.datetime


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sample_id: int
    predicted_label: str
    confidence: float
    severity_band: str
    cnn_score: Optional[float]
    classical_score: Optional[float]
    tremor_index: Optional[float]
    smoothness_score: Optional[float]
    emailed_at: Optional[datetime.datetime]
    generated_at: datetime.datetime


class HistoryItem(BaseModel):
    sample: SampleOut
    report: Optional[ReportOut]


class BatchAnalyzeRequest(BaseModel):
    """Body for POST /samples/batch-analyze - list of sample_ids to analyze
    together as one batch (e.g. 5 spiral + 5 wave upload IDs)."""
    sample_ids: List[int] = Field(..., min_length=2)


class BatchReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    final_label: str
    votes_parkinson: int
    votes_healthy: int
    total_samples: int
    avg_confidence: float
    avg_cnn_score: Optional[float]
    avg_classical_score: Optional[float]
    avg_tremor_index: Optional[float]
    avg_smoothness_score: Optional[float]
    severity_band: str
    emailed_at: Optional[datetime.datetime]
    generated_at: datetime.datetime
    reports: List[ReportOut] = []
