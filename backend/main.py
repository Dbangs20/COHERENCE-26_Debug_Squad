from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from auth_db import (
    create_clinical_trial,
    create_doctor,
    create_patient_condition,
    create_patient,
    find_doctor_by_email,
    find_patient_by_email,
    get_patient_condition,
    init_db,
    list_all_patient_conditions,
    list_clinical_trials,
    list_patient_conditions,
    verify_doctor,
    verify_patient,
)
from clinical_trial_engine import evaluate_match, rank_trials
from matcher import TrialMatcher
from models import (
    AuthResponse,
    ClinicalTrialCreateInput,
    ClinicalTrialResponse,
    CriteriaParseResponse,
    DoctorPatientMatchResponse,
    DoctorAuthResponse,
    DoctorLoginInput,
    DoctorRegisterInput,
    MatchResponse,
    MatchTrialsInput,
    MatchTrialsResponse,
    PatientInput,
    PatientConditionCreateInput,
    PatientConditionResponse,
    PatientLoginInput,
    PatientRegisterInput,
)

app = FastAPI(title="CureNova API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET_PATH = Path(__file__).resolve().parent / "trials.csv"
matcher = TrialMatcher(str(DATASET_PATH))
init_db()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "CureNova API"}


@app.post("/match", response_model=MatchResponse)
def match_trials(payload: PatientInput):
    matches, safeguards = matcher.match_trials(payload.model_dump())
    return {"recommended_trials": matches, "safeguards": safeguards}


@app.get("/criteria/parse", response_model=CriteriaParseResponse)
def parse_criteria():
    return {"parsed_trials": matcher.parse_trial_criteria()}


def _row_to_patient_condition(row):
    return {
        "patient_id": row["patient_id"],
        "patient_email": row["patient_email"],
        "age": int(row["age"]),
        "gender": row["gender"],
        "disease": row["disease"],
        "disease_stage": row["disease_stage"],
        "biomarker": row["biomarker"],
        "city": row["city"],
        "diabetes": bool(row["diabetes"]),
        "hypertension": bool(row["hypertension"]),
        "heart_disease": bool(row["heart_disease"]),
        "kidney_disease": bool(row["kidney_disease"]),
        "current_medications": row["current_medications"],
        "smoking_status": row["smoking_status"],
        "pregnancy_status": row["pregnancy_status"],
        "lab_results": row["lab_results"],
    }


def _row_to_trial(row):
    return {
        "trial_id": row["trial_id"],
        "title": row["title"],
        "disease": row["disease"],
        "phase": row["phase"],
        "min_age": row["min_age"],
        "max_age": row["max_age"],
        "stage": row["stage"],
        "biomarker": row["biomarker"],
        "exclusion_conditions": row["exclusion_conditions"],
        "criteria_text": row["criteria_text"],
        "city": row["city"],
        "hospital": row["hospital"],
        "country": row["country"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "max_participants": row["max_participants"],
    }


@app.post("/auth/register", response_model=AuthResponse)
def register_patient(payload: PatientRegisterInput):
    existing = find_patient_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Patient already exists. Please login.")

    patient = create_patient(payload.model_dump())
    return {
        "message": "Registration successful",
        "patient_id": patient["id"],
        "full_name": patient["full_name"],
        "email": patient["email"],
    }


@app.post("/auth/login", response_model=AuthResponse)
def login_patient(payload: PatientLoginInput):
    patient = verify_patient(payload.email, payload.password)
    if not patient:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "message": "Login successful",
        "patient_id": patient["id"],
        "full_name": patient["full_name"],
        "email": patient["email"],
    }


@app.post("/auth/doctor/register", response_model=DoctorAuthResponse)
def register_doctor(payload: DoctorRegisterInput):
    existing = find_doctor_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Doctor already exists. Please login.")

    doctor = create_doctor(payload.model_dump())
    return {
        "message": "Registration successful",
        "doctor_id": doctor["id"],
        "full_name": doctor["full_name"],
        "email": doctor["email"],
    }


@app.post("/auth/doctor/login", response_model=DoctorAuthResponse)
def login_doctor(payload: DoctorLoginInput):
    doctor = verify_doctor(payload.email, payload.password)
    if not doctor:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "message": "Login successful",
        "doctor_id": doctor["id"],
        "full_name": doctor["full_name"],
        "email": doctor["email"],
    }


@app.post("/patient/conditions", response_model=PatientConditionResponse)
def create_condition(payload: PatientConditionCreateInput):
    row = create_patient_condition(payload.model_dump())
    return _row_to_patient_condition(row)


@app.get("/patient/conditions", response_model=list[PatientConditionResponse])
def get_conditions(email: str):
    rows = list_patient_conditions(email)
    return [_row_to_patient_condition(row) for row in rows]


@app.post("/doctor/clinical_trials", response_model=ClinicalTrialResponse)
def create_trial(payload: ClinicalTrialCreateInput):
    row = create_clinical_trial(payload.model_dump())
    return _row_to_trial(row)


@app.get("/doctor/clinical_trials", response_model=list[ClinicalTrialResponse])
def get_trials(email: str):
    rows = list_clinical_trials(email)
    return [_row_to_trial(row) for row in rows]


@app.post("/match_trials", response_model=MatchTrialsResponse)
def match_trials_by_patient(payload: MatchTrialsInput):
    patient_row = get_patient_condition(payload.patient_id)
    if not patient_row:
        raise HTTPException(status_code=404, detail="Patient medical record not found.")

    trials_rows = list_clinical_trials()
    patient = _row_to_patient_condition(patient_row)
    trials = [_row_to_trial(row) for row in trials_rows]

    if payload.disease:
        disease_filter = payload.disease.strip().lower()
        trials = [trial for trial in trials if disease_filter in str(trial.get("disease", "")).lower()]

    recommendations = rank_trials(
        patient,
        trials,
        {
            "city": payload.city,
            "trial_phase": payload.trial_phase,
            "minimum_score": payload.minimum_score,
        },
    )

    return {"recommendations": recommendations}


@app.get("/doctor/matched_patients", response_model=DoctorPatientMatchResponse)
def doctor_matched_patients(email: str, minimum_score: int = 50):
    trials_rows = list_clinical_trials(email)
    patient_rows = list_all_patient_conditions()

    trials = [_row_to_trial(row) for row in trials_rows]
    patients = [_row_to_patient_condition(row) for row in patient_rows]

    best_by_patient = {}
    for patient in patients:
        for trial in trials:
            result = evaluate_match(patient, trial)
            if result["score"] < minimum_score:
                continue
            current = best_by_patient.get(patient["patient_id"])
            if not current or result["score"] > current["score"]:
                best_by_patient[patient["patient_id"]] = {
                    "patient_id": patient["patient_id"],
                    "disease": patient["disease"],
                    "city": patient["city"],
                    "trial_id": result["trial_id"],
                    "trial_title": result["title"],
                    "score": result["score"],
                    "status": result["status"],
                    "explanation": result["explanation"],
                }

    matches = sorted(best_by_patient.values(), key=lambda item: item["score"], reverse=True)
    return {"matches": matches}
