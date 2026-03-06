# CureNova

CureNova is a full-stack hackathon prototype for AI-assisted clinical trial eligibility and matching.
It accepts anonymized patient details, evaluates trial criteria from a CSV dataset, and returns ranked recommendations with explainable reasoning, status labels, and missing-data alerts.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router DOM, Axios
- Backend: FastAPI, Uvicorn, Pydantic, Pandas
- Data: CSV-based trial dataset + SQLite patient auth database

## Core Features

- Patient auth page (`/login`) with register/login modes
- SQLite-backed patient registration and login (`/auth/register`, `/auth/login`)
- Animated loading state (about 2.5 seconds) on login/register submit
- Landing page role selector (`Patient` / `Doctor`)
- Patient must register/login before patient details form is shown
- Rule-based matching engine for age, disease, stage, biomarker, and optional location reasoning
- Eligibility statuses:
  - `Eligible`
  - `Partially Eligible`
  - `Insufficient Data`
  - `Not Eligible`
- Missing-data detection for critical fields (`stage`, `biomarker`)
- Ranked trial result cards with:
  - trial metadata
  - score
  - confidence
  - status badge
  - reason list
  - missing data list
- Geographic preference awareness through optional patient location

## Folder Structure

```text
trial-matcher/
  frontend/
    index.html
    package.json
    vite.config.js
    postcss.config.js
    tailwind.config.js
    src/
      components/
        FeatureCard.jsx
        Footer.jsx
        LoadingSpinner.jsx
        Navbar.jsx
        PatientForm.jsx
        StatusBadge.jsx
        TrialCard.jsx
      pages/
        Landing.jsx
        Login.jsx
        MatchTrials.jsx
      api.js
      App.jsx
      index.css
      main.jsx
  backend/
    auth_db.py
    curenova.db (auto-created locally)
    main.py
    matcher.py
    models.py
    trials.csv
    requirements.txt
  README.md
```

## Matching Logic (Prototype)

Scoring weights:

- Age match: `25`
- Disease match: `30`
- Stage match: `20`
- Biomarker match: `25`

Status rules:

- Score `>= 75` and no critical missing fields -> `Eligible`
- Score `>= 50` and no critical missing fields -> `Partially Eligible`
- Missing critical fields (`stage` or `biomarker`) -> `Insufficient Data`
- Otherwise -> `Not Eligible`

## API

### `POST /match`

Request:

```json
{
  "age": 55,
  "disease": "lung cancer",
  "stage": "III",
  "biomarker": "EGFR+",
  "location": "Mumbai"
}
```

### `POST /auth/register`

Request:

```json
{
  "full_name": "Asha Mehta",
  "email": "asha@example.com",
  "password": "secret123",
  "age": 48,
  "disease": "lung cancer",
  "stage": "III",
  "biomarker": "EGFR+",
  "location": "Mumbai"
}
```

### `POST /auth/login`

Request:

```json
{
  "email": "asha@example.com",
  "password": "secret123"
}
```

Response:

```json
{
  "recommended_trials": [
    {
      "trial_id": "T101",
      "title": "EGFR Lung Cancer Study",
      "location": "Mumbai",
      "score": 100,
      "confidence": 100,
      "status": "Eligible",
      "reasons": [
        "Age matches allowed trial range",
        "Disease matches trial condition",
        "Stage matches trial criteria",
        "Biomarker matches trial criteria",
        "Location preference matches"
      ],
      "missing_data": []
    }
  ]
}
```

## Setup Instructions

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs on: `http://127.0.0.1:8000`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://127.0.0.1:5173`

## Demo Flow

1. Open `/`
2. Click **Patient**
3. Register (first-time patient) or Login (returning patient)
4. Submit patient details form after login
5. Use remaining trial-matching modules in later phases

## Notes

- This project is for hackathon/demo use and not a production medical decision system.
- Use anonymized patient data only.
