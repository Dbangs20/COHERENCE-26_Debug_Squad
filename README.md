# CureNova - AI Clinical Trial Eligibility & Matching Engine

CureNova is a full-stack healthcare prototype with role-based dashboards for patients and doctors.
The system stores anonymized patient medical records, allows doctors to register clinical trials, and matches patients to trials using explainable rule-based eligibility logic.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router DOM, Axios
- Backend: FastAPI, SQLite, Pydantic, Pandas, scikit-learn

## Core Functionalities Implemented

### 1) Role-based authentication
- Patient register/login
- Doctor register/login
- SQLite persistence

### 2) Patient medical record form (anonymized)
Stored fields:
- `patient_id` (auto-generated)
- `age`, `gender`, `disease`, `disease_stage`, `biomarker`, `city`
- medical history flags: `diabetes`, `hypertension`, `heart_disease`, `kidney_disease`
- `current_medications`, `smoking_status`, `pregnancy_status`, `lab_results`

### 3) Doctor clinical trial registration
Doctors can register trials with:
- `trial_id`, `title`, `disease`, `phase`
- inclusion logic inputs (`min_age`, `max_age`, `stage`, `biomarker`)
- exclusion conditions (`diabetes`, `heart_disease`, `pregnancy`)
- location (`hospital`, `city`, `country`)
- duration (`start_date`, `end_date`)
- `max_participants`, `criteria_text`

### 4) Clinical trial database table
`clinical_trials` table created in SQLite with required columns:
- `trial_id`, `title`, `disease`, `phase`, `min_age`, `max_age`, `stage`, `biomarker`, `exclusion_conditions`, `criteria_text`, `city`, `hospital`, `start_date`, `end_date`, `max_participants`

### 5) Matching engine (`POST /match_trials`)
Input:
- `patient_id`
- optional filters: `city`, `disease`, `trial_phase`, `minimum_score`

Scoring:
- Age match: +20
- Disease match: +30
- Stage match: +20
- Biomarker match: +20
- Location match: +10
- Exclusion conflicts reduce score and are explained

Statuses:
- `score >= 80` -> `Strong Match`
- `score >= 50` -> `Moderate Match`
- `score < 50` -> `Low Match`

### 6) Explainable output
Each recommendation includes:
- `trial_id`, `title`, `hospital`, `city`
- `score`, `status`
- `explanation[]`

### 7) Patient dashboard updates
- Save/view patient medical records
- Fill form again for new condition
- Start matching for any saved `patient_id`
- Recommended Clinical Trials cards with:
  - title, hospital, city, score, status badge
  - `View Explanation`
  - `Apply for Trial`

### 8) Filter options
Patient-side matching filters:
- city
- disease
- trial phase
- minimum score

## API Endpoints

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/doctor/register`
- `POST /auth/doctor/login`

Patient records:
- `POST /patient/conditions`
- `GET /patient/conditions?email=...`

Doctor trials:
- `POST /doctor/clinical_trials`
- `GET /doctor/clinical_trials?email=...`

Matching:
- `POST /match_trials`

Legacy/extended engine endpoints retained:
- `POST /match`
- `GET /criteria/parse`

## Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## End-to-End Testing Guide

1. Open app: `http://127.0.0.1:5173`
2. Register/login as doctor.
3. Fill **Clinical Trial Registration** and save at least 1 trial.
4. Register/login as patient.
5. Fill **Anonymized Patient Condition Form** and save.
6. In patient records list, click **Start Matching**.
7. Verify **Recommended Clinical Trials** cards appear.
8. Check each card has score + status + explanation.
9. Use filters (`city`, `disease`, `trial phase`, `min score`) and run matching again.
10. Click **Apply for Trial** and verify the button state changes.

## Notes

- Prototype for hackathon/demo use.
- Uses anonymized records and does not include real clinical decision support validation.
