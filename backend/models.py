from typing import List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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


class PatientRegisterInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    full_name: str = Field(
        ...,
        min_length=2,
        validation_alias=AliasChoices("full_name", "fullName"),
    )
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=130)


class PatientLoginInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    message: str
    patient_id: int
    full_name: str
    email: str


class DoctorRegisterInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    full_name: str = Field(
        ...,
        min_length=2,
        validation_alias=AliasChoices("full_name", "fullName"),
    )
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class DoctorLoginInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class DoctorAuthResponse(BaseModel):
    message: str
    doctor_id: int
    full_name: str
    email: str
