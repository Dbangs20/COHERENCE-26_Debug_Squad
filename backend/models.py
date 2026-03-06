from typing import Dict, List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class PatientInput(BaseModel):
    age: int = Field(..., ge=0, le=130)
    disease: str = Field(..., min_length=2)
    stage: Optional[str] = None
    biomarker: Optional[str] = None
    location: Optional[str] = None
    clinical_notes: Optional[str] = None
    preferred_locations: List[str] = Field(default_factory=list)
    geographic_filter_mode: str = "prefer"
    top_k: int = Field(default=8, ge=1, le=20)


class TrialMatch(BaseModel):
    trial_id: str
    title: str
    location: str
    rule_score: int
    ml_score: int
    score: int
    confidence: int
    status: str
    reasons: List[str]
    missing_data: List[str]
    criteria_logic: Dict[str, str]


class MatchResponse(BaseModel):
    recommended_trials: List[TrialMatch]
    safeguards: List[str]


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


class CriteriaParseItem(BaseModel):
    trial_id: str
    title: str
    structured_logic: Dict[str, str]


class CriteriaParseResponse(BaseModel):
    parsed_trials: List[CriteriaParseItem]


class PatientConditionCreateInput(BaseModel):
    patient_email: str
    age: int = Field(..., ge=0, le=130)
    gender: str
    disease: str
    disease_stage: Optional[str] = None
    biomarker: Optional[str] = None
    city: Optional[str] = None
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    kidney_disease: bool = False
    current_medications: Optional[str] = None
    smoking_status: Optional[str] = None
    pregnancy_status: Optional[str] = None
    lab_results: Optional[str] = None


class PatientConditionResponse(BaseModel):
    patient_id: str
    patient_email: str
    age: int
    gender: str
    disease: str
    disease_stage: Optional[str] = None
    biomarker: Optional[str] = None
    city: Optional[str] = None
    diabetes: bool
    hypertension: bool
    heart_disease: bool
    kidney_disease: bool
    current_medications: Optional[str] = None
    smoking_status: Optional[str] = None
    pregnancy_status: Optional[str] = None
    lab_results: Optional[str] = None


class ClinicalTrialCreateInput(BaseModel):
    doctor_email: str
    trial_id: str
    title: str
    disease: str
    phase: str
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    stage: Optional[str] = None
    biomarker: Optional[str] = None
    exclusion_conditions: Optional[str] = None
    criteria_text: Optional[str] = None
    city: Optional[str] = None
    hospital: Optional[str] = None
    country: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_participants: Optional[int] = None


class ClinicalTrialResponse(BaseModel):
    trial_id: str
    title: str
    disease: str
    phase: str
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    stage: Optional[str] = None
    biomarker: Optional[str] = None
    exclusion_conditions: Optional[str] = None
    criteria_text: Optional[str] = None
    city: Optional[str] = None
    hospital: Optional[str] = None
    country: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_participants: Optional[int] = None


class MatchTrialsInput(BaseModel):
    patient_id: str
    city: Optional[str] = None
    disease: Optional[str] = None
    trial_phase: Optional[str] = None
    minimum_score: int = Field(default=0, ge=0, le=100)


class TrialRecommendation(BaseModel):
    trial_id: str
    title: str
    hospital: Optional[str] = None
    city: Optional[str] = None
    phase: Optional[str] = None
    score: int
    status: str
    explanation: List[str]


class MatchTrialsResponse(BaseModel):
    recommendations: List[TrialRecommendation]


class DoctorPatientMatch(BaseModel):
    patient_id: str
    disease: str
    city: Optional[str] = None
    trial_id: str
    trial_title: str
    score: int
    status: str
    explanation: List[str]


class DoctorPatientMatchResponse(BaseModel):
    matches: List[DoctorPatientMatch]
