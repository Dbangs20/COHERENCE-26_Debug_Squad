from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from auth_db import (
    create_doctor,
    create_patient,
    find_doctor_by_email,
    find_patient_by_email,
    init_db,
    verify_doctor,
    verify_patient,
)
from matcher import TrialMatcher
from models import (
    AuthResponse,
    DoctorAuthResponse,
    DoctorLoginInput,
    DoctorRegisterInput,
    MatchResponse,
    PatientInput,
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
    matches = matcher.match_trials(payload.model_dump())
    return {"recommended_trials": matches}


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
