from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from matcher import TrialMatcher
from models import MatchResponse, PatientInput

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


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "CureNova API"}


@app.post("/match", response_model=MatchResponse)
def match_trials(payload: PatientInput):
    matches = matcher.match_trials(payload.model_dump())
    return {"recommended_trials": matches}
