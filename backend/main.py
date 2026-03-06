from pathlib import Path
import re

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from auth_db import (
    count_confirmed_enrollments,
    count_waitlisted_enrollments,
    create_appointment,
    create_clinical_trial,
    create_doctor,
    create_doctor_slot,
    create_notification,
    create_patient,
    create_patient_condition,
    create_patient_report,
    create_privacy_log,
    create_report_request,
    create_trial_enrollment,
    deactivate_doctor_slot,
    delete_read_notifications,
    find_doctor_by_email,
    find_patient_by_email,
    get_appointment,
    get_patient_condition,
    get_patient_report,
    get_report_request,
    get_trial_by_id,
    init_db,
    list_all_patient_conditions,
    list_appointments_for_doctor,
    list_appointments_for_patient,
    list_clinical_trials,
    list_doctor_slots,
    list_notifications,
    list_patient_conditions,
    list_privacy_logs,
    list_report_requests_for_patient,
    list_selected_reports_for_patient,
    list_upcoming_available_slots,
    list_verified_reports_for_doctor,
    mark_notification_read,
    slot_has_appointment,
    update_appointment_advice,
    update_patient_report_analysis,
    update_report_request_status,
    verify_doctor,
    verify_patient,
)
from clinical_trial_engine import evaluate_match, rank_trials_with_rejections
from matcher import TrialMatcher
from nlp_parser import parse_eligibility_criteria, qa_eligibility_criteria
from models import (
    AppointmentAdviceInput,
    AppointmentAdviceResponse,
    AppointmentBookInput,
    AppointmentBookResponse,
    AppointmentListResponse,
    AppointmentOptionsResponse,
    AuthResponse,
    ClinicalTrialCreateInput,
    ClinicalTrialResponse,
    CriteriaParseResponse,
    CriteriaQAResponse,
    DemoMetricsResponse,
    DemoRunResponse,
    DoctorPatientMatchResponse,
    DoctorAnalyzeReportInput,
    DoctorAnalyzeReportResponse,
    DoctorReportListResponse,
    DoctorSlotCreateInput,
    DoctorSlotListResponse,
    DoctorAuthResponse,
    DoctorLoginInput,
    DoctorRegisterInput,
    FairnessSnapshotResponse,
    MatchResponse,
    MatchTrialsInput,
    MatchTrialsResponse,
    NotificationListResponse,
    NotificationDeleteReadInput,
    NotificationDeleteReadResponse,
    NotificationReadInput,
    NotificationReadResponse,
    ParseCriteriaInput,
    ParseCriteriaResponse,
    PatientInput,
    PatientConditionCreateInput,
    PatientConditionResponse,
    PatientReportUploadResponse,
    PatientLoginInput,
    PatientRegisterInput,
    PrivacyLogResponse,
    ReportRequestCreateInput,
    ReportRequestResponse,
    TrialApplyInput,
    TrialApplyResponse,
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


@app.post("/parse_criteria", response_model=ParseCriteriaResponse)
def parse_criteria_nlp(payload: ParseCriteriaInput):
    return parse_eligibility_criteria(payload.criteria_text)


@app.post("/criteria/qa", response_model=CriteriaQAResponse)
def criteria_qa(payload: ParseCriteriaInput):
    parsed = parse_eligibility_criteria(payload.criteria_text)
    return qa_eligibility_criteria(payload.criteria_text, parsed)


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


def _row_to_notification(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "message": row["message"],
        "is_read": bool(row["is_read"]),
        "created_at": row["created_at"],
    }


def _row_to_report_request(row):
    return {
        "id": row["id"],
        "doctor_email": row["doctor_email"],
        "patient_id": row["patient_id"],
        "trial_id": row["trial_id"],
        "message": row["message"],
        "required_tests": row["required_tests"],
        "status": row["status"],
    }


def _row_to_doctor_report(row):
    return {
        "report_id": row["id"],
        "patient_id": row["patient_id"],
        "trial_id": row["trial_id"],
        "file_name": row["file_name"],
        "redacted_summary": row["redacted_summary"],
        "analysis_status": row["analysis_status"],
        "selected": bool(row["selected"]),
        "analysis_notes": row["analysis_notes"],
    }


def _row_to_appointment_option(row):
    return {
        "patient_id": row["patient_id"],
        "doctor_email": row["doctor_email"],
        "trial_id": row["trial_id"],
        "hospital": row["hospital"],
        "city": row["city"],
    }


def _row_to_appointment(row):
    return {
        "id": row["id"],
        "patient_id": row["patient_id"],
        "patient_email": row["patient_email"],
        "doctor_email": row["doctor_email"],
        "trial_id": row["trial_id"],
        "appointment_date": row["appointment_date"],
        "appointment_time": row["appointment_time"],
        "doctor_advice": row["doctor_advice"],
        "status": row["status"],
        "doctor_name": row["doctor_name"] if "doctor_name" in row.keys() else None,
    }


def _row_to_slot(row):
    return {
        "id": row["id"],
        "doctor_email": row["doctor_email"],
        "slot_date": row["slot_date"],
        "slot_time": row["slot_time"],
        "is_active": bool(row["is_active"]),
    }


def _row_to_privacy_log(row):
    return {
        "id": row["id"],
        "actor_email": row["actor_email"],
        "entity_type": row["entity_type"],
        "entity_id": row["entity_id"],
        "findings": row["findings"],
        "created_at": row["created_at"],
    }


def _redact_text(text: str) -> str:
    masked = text
    masked = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[REDACTED_EMAIL]", masked)
    masked = re.sub(r"\b\d{10}\b", "[REDACTED_PHONE]", masked)
    masked = re.sub(r"(?i)(name\s*:\s*)([A-Za-z ]+)", r"\1[REDACTED_NAME]", masked)
    return masked


def _scan_phi_findings(text: str) -> list[str]:
    findings = []
    if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text):
        findings.append("email")
    if re.search(r"\b\d{10}\b", text):
        findings.append("phone")
    if re.search(r"(?i)\bname\s*:\s*[A-Za-z ]+", text):
        findings.append("name")
    return findings


def _redact_and_log(text: str, actor_email: str | None, entity_type: str, entity_id: str | None) -> tuple[str, list[str]]:
    redacted = _redact_text(text)
    findings = _scan_phi_findings(text)
    if findings:
        create_privacy_log(
            {
                "actor_email": actor_email,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "original_excerpt": text[:220],
                "redacted_excerpt": redacted[:220],
                "findings": ",".join(findings),
            }
        )
    return redacted, findings


def _age_band(age: int) -> str:
    if age < 18:
        return "<18"
    if age <= 30:
        return "18-30"
    if age <= 45:
        return "31-45"
    if age <= 60:
        return "46-60"
    return "60+"


def _cohort_stats(name: str, items: list[dict], overall_rate: float) -> dict:
    total = len(items)
    matched = sum(1 for item in items if item["matched"])
    rate = (matched / total) if total else 0.0
    skewed = total >= 2 and rate < (overall_rate * 0.6 if overall_rate > 0 else 0)
    return {
        "cohort": name,
        "total": total,
        "matched": matched,
        "match_rate": round(rate, 2),
        "is_skewed": skewed,
    }


def _build_fairness_snapshot() -> dict:
    patients_rows = list_all_patient_conditions()
    trials_rows = list_clinical_trials()
    trials = [_row_to_trial(row) for row in trials_rows]
    cohorts = []
    for row in patients_rows:
        patient = _row_to_patient_condition(row)
        best_score = 0
        for trial in trials:
            result = evaluate_match(patient, trial)
            if result["score"] > best_score:
                best_score = int(result["score"])
        cohorts.append(
            {
                "gender": (patient.get("gender") or "unknown").strip().lower() or "unknown",
                "age_band": _age_band(int(patient.get("age") or 0)),
                "city": (patient.get("city") or "unknown").strip().lower() or "unknown",
                "matched": best_score >= 50,
            }
        )

    if not cohorts:
        return {
            "overall_match_rate": 0.0,
            "by_gender": [],
            "by_age_band": [],
            "by_city": [],
            "alerts": [],
        }

    overall_rate = sum(1 for item in cohorts if item["matched"]) / len(cohorts)
    alerts = []

    by_gender = []
    for gender in sorted({item["gender"] for item in cohorts}):
        stat = _cohort_stats(gender, [item for item in cohorts if item["gender"] == gender], overall_rate)
        if stat["is_skewed"]:
            alerts.append(f"Potential skew detected for gender cohort: {gender}")
        by_gender.append(stat)

    by_age_band = []
    for band in ["<18", "18-30", "31-45", "46-60", "60+"]:
        items = [item for item in cohorts if item["age_band"] == band]
        if not items:
            continue
        stat = _cohort_stats(band, items, overall_rate)
        if stat["is_skewed"]:
            alerts.append(f"Potential skew detected for age cohort: {band}")
        by_age_band.append(stat)

    city_items_map = {}
    for item in cohorts:
        city_items_map.setdefault(item["city"], []).append(item)
    by_city = []
    for city, items in city_items_map.items():
        stat = _cohort_stats(city, items, overall_rate)
        if stat["is_skewed"]:
            alerts.append(f"Potential skew detected for city cohort: {city}")
        by_city.append(stat)

    by_city.sort(key=lambda item: item["total"], reverse=True)
    by_city = by_city[:6]

    return {
        "overall_match_rate": round(overall_rate, 2),
        "by_gender": by_gender,
        "by_age_band": by_age_band,
        "by_city": by_city,
        "alerts": alerts,
    }


def _validate_report_against_patient(patient: dict, report_text: str, required_tests: str | None = None) -> tuple[bool, str]:
    text = report_text.lower()
    mismatches = []
    disease = str(patient.get("disease") or "").lower()
    stage = str(patient.get("disease_stage") or "").lower()
    biomarker = str(patient.get("biomarker") or "").lower()

    if disease and disease not in text:
        mismatches.append("disease")
    if stage and stage not in text:
        mismatches.append("disease_stage")
    if biomarker and biomarker not in text:
        mismatches.append("biomarker")

    if required_tests:
        test_items = [item.strip().lower() for item in required_tests.split(",") if item.strip()]
        missing_tests = [test_name for test_name in test_items if test_name not in text]
        if missing_tests:
            mismatches.append(f"required_tests ({', '.join(missing_tests)})")

    if mismatches:
        return False, f"Report data mismatch for fields: {', '.join(mismatches)}"
    return True, "Report fields match patient profile."


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

    recommendations, rejected = rank_trials_with_rejections(
        patient,
        trials,
        {
            "city": payload.city,
            "trial_phase": payload.trial_phase,
            "minimum_score": payload.minimum_score,
        },
    )

    return {"recommendations": recommendations, "rejected_trials": rejected[:8]}


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


@app.post("/doctor/request_report", response_model=ReportRequestResponse)
def doctor_request_report(payload: ReportRequestCreateInput):
    patient = get_patient_condition(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient condition not found.")

    request_row = create_report_request(payload.model_dump())
    tests_msg = f" Required tests: {payload.required_tests}." if payload.required_tests else ""
    create_notification(
        {
            "recipient_email": patient["patient_email"],
            "recipient_role": "patient",
            "title": "Doctor Requested Medical Report",
            "message": (
                f"Doctor is asking for your report for trial {payload.trial_id}. "
                f"Please upload your report.{tests_msg}"
            ),
        }
    )
    return _row_to_report_request(request_row)


@app.get("/patient/report_requests", response_model=list[ReportRequestResponse])
def patient_report_requests(email: str):
    rows = list_report_requests_for_patient(email)
    return [_row_to_report_request(row) for row in rows]


@app.post("/patient/upload_report", response_model=PatientReportUploadResponse)
async def patient_upload_report(
    request_id: int = Form(...),
    patient_email: str = Form(...),
    file: UploadFile = File(...),
):
    req_row = get_report_request(request_id)
    if not req_row:
        raise HTTPException(status_code=404, detail="Report request not found.")
    if req_row["status"] != "requested":
        raise HTTPException(status_code=400, detail="This report request is no longer active.")

    patient = get_patient_condition(req_row["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    if patient["patient_email"].lower().strip() != patient_email.lower().strip():
        raise HTTPException(status_code=403, detail="You are not authorized for this request.")

    content_bytes = await file.read()
    try:
        report_text = content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        report_text = ""

    is_verified, reason = _validate_report_against_patient(
        _row_to_patient_condition(patient),
        report_text,
        req_row["required_tests"],
    )
    redacted_summary, findings = _redact_and_log(
        report_text,
        patient_email,
        "patient_report",
        req_row["patient_id"],
    )
    redacted_summary = redacted_summary[:1500]

    report_row = create_patient_report(
        {
            "patient_id": req_row["patient_id"],
            "patient_email": patient_email,
            "doctor_email": req_row["doctor_email"],
            "trial_id": req_row["trial_id"],
            "file_name": file.filename,
            "report_text": report_text,
            "is_verified": is_verified,
            "mismatch_reason": None if is_verified else reason,
            "redacted_summary": redacted_summary if is_verified else None,
        }
    )

    if is_verified:
        update_report_request_status(request_id, "submitted")
        create_notification(
            {
                "recipient_email": req_row["doctor_email"],
                "recipient_role": "doctor",
                "title": "Verified Patient Report Received",
                "message": f"An anonymized verified report is available for patient {req_row['patient_id']}.",
            }
        )
        findings_msg = f" Privacy redaction performed for: {', '.join(findings)}." if findings else ""
        message = f"Report uploaded and verified. Doctor has been notified.{findings_msg}"
    else:
        message = f"Report uploaded but verification failed: {reason}"

    return {"report_id": report_row["id"], "is_verified": is_verified, "message": message}


@app.get("/doctor/reports", response_model=DoctorReportListResponse)
def doctor_reports(email: str):
    rows = list_verified_reports_for_doctor(email)
    return {"reports": [_row_to_doctor_report(row) for row in rows]}


@app.post("/doctor/analyze_report", response_model=DoctorAnalyzeReportResponse)
def doctor_analyze_report(payload: DoctorAnalyzeReportInput):
    report = get_patient_report(payload.report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if report["doctor_email"].lower().strip() != payload.doctor_email.lower().strip():
        raise HTTPException(status_code=403, detail="You are not authorized to analyze this report.")

    trial = get_trial_by_id(report["trial_id"])
    location = "assigned trial center"
    if trial:
        location = f"{trial['hospital']}, {trial['city']}"

    selected = True
    notes = "Report validated and analyzed. Candidate is selected for the clinical trial."
    update_patient_report_analysis(payload.report_id, selected, notes)

    create_notification(
        {
            "recipient_email": report["patient_email"],
            "recipient_role": "patient",
            "title": "Clinical Trial Selection Update",
            "message": f"You have been selected for trial {report['trial_id']}. Please visit {location}.",
        }
    )

    return {
        "report_id": payload.report_id,
        "selected": selected,
        "analysis_notes": notes,
        "patient_notified": True,
    }


@app.get("/notifications", response_model=NotificationListResponse)
def notifications(email: str, role: str):
    rows = list_notifications(email, role)
    items = [_row_to_notification(row) for row in rows]
    unread = sum(1 for item in items if not item["is_read"])
    return {"notifications": items, "unread_count": unread}


@app.post("/notifications/mark_read", response_model=NotificationReadResponse)
def notifications_mark_read(payload: NotificationReadInput):
    mark_notification_read(payload.notification_id)
    return {"success": True}


@app.post("/notifications/delete_read", response_model=NotificationDeleteReadResponse)
def notifications_delete_read(payload: NotificationDeleteReadInput):
    deleted_count = delete_read_notifications(payload.email, payload.role)
    return {"success": True, "deleted_count": deleted_count}


@app.get("/patient/appointment_options", response_model=AppointmentOptionsResponse)
def patient_appointment_options(email: str):
    rows = list_selected_reports_for_patient(email)
    unique_map = {}
    for row in rows:
        key = f"{row['patient_id']}|{row['doctor_email']}|{row['trial_id']}"
        if key not in unique_map:
            unique_map[key] = _row_to_appointment_option(row)
    return {"options": list(unique_map.values())}


@app.post("/appointments/book", response_model=AppointmentBookResponse)
def appointments_book(payload: AppointmentBookInput):
    if slot_has_appointment(payload.doctor_email, payload.appointment_date, payload.appointment_time):
        suggestions = [
            f"{slot['slot_date']} {slot['slot_time']}"
            for slot in list_upcoming_available_slots(payload.doctor_email, limit=3)
        ]
        return {
            "success": False,
            "message": "Selected slot is already booked. Please choose another available slot.",
            "suggested_slots": suggestions,
        }

    row = create_appointment(payload.model_dump())
    create_notification(
        {
            "recipient_email": payload.patient_email,
            "recipient_role": "patient",
            "title": "Appointment Scheduled",
            "message": (
                f"Appointment booked with doctor {payload.doctor_email} for trial {payload.trial_id} on "
                f"{payload.appointment_date} at {payload.appointment_time}."
            ),
        }
    )
    create_notification(
        {
            "recipient_email": payload.doctor_email,
            "recipient_role": "doctor",
            "title": "New Trial Appointment Booked",
            "message": (
                f"Patient {payload.patient_id} booked an appointment for trial {payload.trial_id} on "
                f"{payload.appointment_date} at {payload.appointment_time}."
            ),
        }
    )
    return {"success": bool(row), "message": "Appointment booked successfully.", "suggested_slots": []}


@app.get("/patient/appointments", response_model=AppointmentListResponse)
def patient_appointments(email: str):
    rows = list_appointments_for_patient(email)
    return {"appointments": [_row_to_appointment(row) for row in rows]}


@app.get("/doctor/appointments", response_model=AppointmentListResponse)
def doctor_appointments(email: str):
    rows = list_appointments_for_doctor(email)
    return {"appointments": [_row_to_appointment(row) for row in rows]}


@app.post("/doctor/appointments/advice", response_model=AppointmentAdviceResponse)
def doctor_appointments_advice(payload: AppointmentAdviceInput):
    appointment = get_appointment(payload.appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appointment["doctor_email"].lower().strip() != payload.doctor_email.lower().strip():
        raise HTTPException(status_code=403, detail="You are not authorized to update this appointment.")

    redacted_advice, findings = _redact_and_log(
        payload.advice,
        payload.doctor_email,
        "doctor_advice",
        str(payload.appointment_id),
    )
    update_appointment_advice(payload.appointment_id, redacted_advice)
    create_notification(
        {
            "recipient_email": appointment["patient_email"],
            "recipient_role": "patient",
            "title": "Doctor Special Advice",
            "message": (
                f"Your doctor shared pre-appointment advice for trial {appointment['trial_id']}: "
                f"{redacted_advice}"
            ),
        }
    )
    create_notification(
        {
            "recipient_email": payload.doctor_email,
            "recipient_role": "doctor",
            "title": "Advice Shared Successfully",
            "message": (
                f"Advice has been sent to patient {appointment['patient_id']} for appointment "
                f"#{payload.appointment_id}. Redaction findings: {', '.join(findings) if findings else 'none'}."
            ),
        }
    )
    return {"success": True}


@app.post("/trial/apply", response_model=TrialApplyResponse)
def trial_apply(payload: TrialApplyInput):
    trial = get_trial_by_id(payload.trial_id)
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found.")

    confirmed_count = count_confirmed_enrollments(payload.trial_id)
    capacity = trial["max_participants"] if trial["max_participants"] is not None else 999999
    enrollment_status = "confirmed" if confirmed_count < int(capacity) else "waitlisted"

    row = create_trial_enrollment(
        payload.trial_id,
        payload.patient_id,
        payload.patient_email,
        enrollment_status,
    )
    status = row["status"] if row else enrollment_status
    if status == "confirmed":
        patient_msg = f"Application confirmed for trial {payload.trial_id}."
        doctor_msg = f"Patient {payload.patient_id} confirmed for trial {payload.trial_id}."
    else:
        patient_msg = f"Trial {payload.trial_id} is currently full. You are added to the waitlist."
        doctor_msg = f"Patient {payload.patient_id} was added to waitlist for trial {payload.trial_id}."

    doctor_email = trial["doctor_email"]
    create_notification(
        {
            "recipient_email": payload.patient_email,
            "recipient_role": "patient",
            "title": "Trial Application Status",
            "message": patient_msg,
        }
    )
    if doctor_email:
        create_notification(
            {
                "recipient_email": doctor_email,
                "recipient_role": "doctor",
                "title": "Patient Trial Application",
                "message": doctor_msg,
            }
        )

    return {
        "trial_id": payload.trial_id,
        "patient_id": payload.patient_id,
        "status": status,
        "message": patient_msg,
    }


@app.get("/analytics/fairness", response_model=FairnessSnapshotResponse)
def analytics_fairness():
    return _build_fairness_snapshot()


@app.post("/doctor/slots", response_model=DoctorSlotListResponse)
def doctor_slots_create(payload: DoctorSlotCreateInput):
    create_doctor_slot(payload.doctor_email, payload.slot_date, payload.slot_time)
    slots = list_doctor_slots(payload.doctor_email)
    return {"slots": [_row_to_slot(slot) for slot in slots]}


@app.get("/doctor/slots", response_model=DoctorSlotListResponse)
def doctor_slots_list(email: str):
    rows = list_doctor_slots(email)
    return {"slots": [_row_to_slot(row) for row in rows]}


@app.get("/privacy/logs", response_model=PrivacyLogResponse)
def privacy_logs(limit: int = 20):
    rows = list_privacy_logs(limit)
    return {"logs": [_row_to_privacy_log(row) for row in rows]}


@app.get("/demo/metrics", response_model=DemoMetricsResponse)
def demo_metrics():
    patient_rows = list_all_patient_conditions()
    trial_rows = list_clinical_trials()

    # For global counters that helper functions don't currently expose, use cheap derivations.
    # total_verified_reports from privacy logs is not accurate; compute by scanning selected reports for all known patients.
    verified_count = 0
    appointment_count = 0
    advice_count = 0
    for patient in patient_rows:
        selected_rows = list_selected_reports_for_patient(patient["patient_email"])
        verified_count += len(selected_rows)
        ap_rows = list_appointments_for_patient(patient["patient_email"])
        appointment_count += len(ap_rows)
        advice_count += sum(1 for ap in ap_rows if ap["doctor_advice"])

    fairness = _build_fairness_snapshot()
    confirmed = sum(count_confirmed_enrollments(trial["trial_id"]) for trial in trial_rows)
    waitlisted = sum(count_waitlisted_enrollments(trial["trial_id"]) for trial in trial_rows)
    return {
        "total_patients": len(patient_rows),
        "total_trials": len(trial_rows),
        "total_verified_reports": verified_count,
        "total_appointments": appointment_count,
        "advice_shared": advice_count,
        "fairness_alerts": len(fairness["alerts"]),
        "confirmed_enrollments": confirmed,
        "waitlisted_enrollments": waitlisted,
    }


@app.post("/demo/run", response_model=DemoRunResponse)
def demo_run():
    patients = list_all_patient_conditions()
    trials = list_clinical_trials()
    if not patients or not trials:
        return {"success": False, "message": "Add at least one patient condition and one trial to run the demo scenario."}

    patient = _row_to_patient_condition(patients[0])
    trial = _row_to_trial(trials[0])
    enrollment = create_trial_enrollment(
        trial["trial_id"],
        patient["patient_id"],
        patient["patient_email"],
        "confirmed",
    )
    if enrollment:
        create_notification(
            {
                "recipient_email": patient["patient_email"],
                "recipient_role": "patient",
                "title": "Demo Scenario Triggered",
                "message": f"Demo flow simulated for trial {trial['trial_id']}.",
            }
        )
    return {
        "success": True,
        "message": f"Demo scenario executed using patient {patient['patient_id']} and trial {trial['trial_id']}.",
    }
