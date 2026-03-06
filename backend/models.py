from typing import List, Optional

from pydantic import BaseModel, Field


class PatientInput(BaseModel):
    age: int = Field(..., ge=0, le=130)
    disease: str = Field(..., min_length=2)
    stage: Optional[str] = None
    biomarker: Optional[str] = None
    location: Optional[str] = None


class TrialMatch(BaseModel):
    trial_id: str
    title: str
    location: str
    score: int
    confidence: int
    status: str
    reasons: List[str]
    missing_data: List[str]


class MatchResponse(BaseModel):
    recommended_trials: List[TrialMatch]
