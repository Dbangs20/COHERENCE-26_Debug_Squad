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
    detailed_checks: List[Dict] = Field(default_factory=list)
    rejection_reasons: List[str] = Field(default_factory=list)


class MatchTrialsResponse(BaseModel):
    recommendations: List[TrialRecommendation]
    rejected_trials: List[TrialRecommendation] = Field(default_factory=list)


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


class ParseCriteriaInput(BaseModel):
    criteria_text: str


class ParseCriteriaResponse(BaseModel):
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    disease: Optional[str] = None
    stage: Optional[str] = None
    exclude_conditions: List[str] = Field(default_factory=list)
    biomarker: Optional[str] = None
    status: str
    message: str


class CriteriaQAResponse(BaseModel):
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    completeness_score: int = Field(default=0, ge=0, le=100)


class ReportRequestCreateInput(BaseModel):
    doctor_email: str
    patient_id: str
    trial_id: str
    message: Optional[str] = None
    required_tests: Optional[str] = None


class ReportRequestResponse(BaseModel):
    id: int
    doctor_email: str
    patient_id: str
    trial_id: str
    message: Optional[str] = None
    required_tests: Optional[str] = None
    status: str


class DoctorAnalyzeReportInput(BaseModel):
    doctor_email: str
    report_id: int


class DoctorAnalyzeReportResponse(BaseModel):
    report_id: int
    selected: bool
    analysis_notes: str
    patient_notified: bool


class NotificationItem(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count: int


class NotificationReadInput(BaseModel):
    notification_id: int


class NotificationReadResponse(BaseModel):
    success: bool


class NotificationDeleteReadInput(BaseModel):
    email: str
    role: str


class NotificationDeleteReadResponse(BaseModel):
    success: bool
    deleted_count: int


class PatientReportUploadResponse(BaseModel):
    report_id: int
    is_verified: bool
    message: str


class DoctorReportItem(BaseModel):
    report_id: int
    patient_id: str
    trial_id: str
    file_name: Optional[str] = None
    redacted_summary: Optional[str] = None
    analysis_status: str
    selected: bool
    analysis_notes: Optional[str] = None


class DoctorReportListResponse(BaseModel):
    reports: List[DoctorReportItem]


class AppointmentOptionItem(BaseModel):
    patient_id: str
    doctor_email: str
    trial_id: str
    hospital: Optional[str] = None
    city: Optional[str] = None


class AppointmentOptionsResponse(BaseModel):
    options: List[AppointmentOptionItem]


class AppointmentBookInput(BaseModel):
    patient_email: str
    patient_id: str
    doctor_email: str
    trial_id: str
    appointment_date: str
    appointment_time: str


class AppointmentBookResponse(BaseModel):
    success: bool
    message: str
    suggested_slots: List[str] = Field(default_factory=list)


class AppointmentItem(BaseModel):
    id: int
    patient_id: str
    patient_email: str
    doctor_email: str
    trial_id: str
    appointment_date: str
    appointment_time: str
    doctor_advice: Optional[str] = None
    status: str
    doctor_name: Optional[str] = None


class AppointmentListResponse(BaseModel):
    appointments: List[AppointmentItem]


class AppointmentAdviceInput(BaseModel):
    appointment_id: int
    doctor_email: str
    advice: str


class AppointmentAdviceResponse(BaseModel):
    success: bool


class TrialApplyInput(BaseModel):
    patient_email: str
    patient_id: str
    trial_id: str


class TrialApplyResponse(BaseModel):
    trial_id: str
    patient_id: str
    status: str
    message: str


class FairnessCohortItem(BaseModel):
    cohort: str
    total: int
    matched: int
    match_rate: float
    is_skewed: bool


class FairnessSnapshotResponse(BaseModel):
    overall_match_rate: float
    by_gender: List[FairnessCohortItem]
    by_age_band: List[FairnessCohortItem]
    by_city: List[FairnessCohortItem]
    alerts: List[str] = Field(default_factory=list)


class DoctorSlotCreateInput(BaseModel):
    doctor_email: str
    slot_date: str
    slot_time: str


class DoctorSlotItem(BaseModel):
    id: int
    doctor_email: str
    slot_date: str
    slot_time: str
    is_active: bool


class DoctorSlotListResponse(BaseModel):
    slots: List[DoctorSlotItem]


class PrivacyLogItem(BaseModel):
    id: int
    actor_email: Optional[str] = None
    entity_type: str
    entity_id: Optional[str] = None
    findings: Optional[str] = None
    created_at: str


class PrivacyLogResponse(BaseModel):
    logs: List[PrivacyLogItem]


class DemoMetricsResponse(BaseModel):
    total_patients: int
    total_trials: int
    total_verified_reports: int
    total_appointments: int
    advice_shared: int
    fairness_alerts: int
    confirmed_enrollments: int
    waitlisted_enrollments: int


class DemoRunResponse(BaseModel):
    success: bool
    message: str
