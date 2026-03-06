import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent / "curenova.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                age INTEGER NOT NULL,
                disease TEXT NOT NULL,
                stage TEXT,
                biomarker TEXT,
                location TEXT,
                created_at TEXT NOT NULL,
                last_login_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS patient_conditions (
                patient_id TEXT PRIMARY KEY,
                patient_email TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                disease TEXT NOT NULL,
                disease_stage TEXT,
                biomarker TEXT,
                city TEXT,
                diabetes INTEGER DEFAULT 0,
                hypertension INTEGER DEFAULT 0,
                heart_disease INTEGER DEFAULT 0,
                kidney_disease INTEGER DEFAULT 0,
                current_medications TEXT,
                smoking_status TEXT,
                pregnancy_status TEXT,
                lab_results TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS clinical_trials (
                trial_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                disease TEXT NOT NULL,
                phase TEXT NOT NULL,
                min_age INTEGER,
                max_age INTEGER,
                stage TEXT,
                biomarker TEXT,
                exclusion_conditions TEXT,
                criteria_text TEXT,
                city TEXT,
                hospital TEXT,
                country TEXT,
                start_date TEXT,
                end_date TEXT,
                max_participants INTEGER,
                doctor_email TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def find_patient_by_email(email: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM patients WHERE email = ?", (email.lower().strip(),)).fetchone()
    return row


def create_patient(payload: dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    email = payload["email"].lower().strip()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO patients (
                full_name, email, password_hash, age, disease, stage, biomarker, location, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["full_name"].strip(),
                email,
                hash_password(payload["password"]),
                payload["age"],
                "not provided",
                None,
                None,
                None,
                timestamp,
            ),
        )
        conn.commit()
        patient_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()

    return row


def verify_patient(email: str, password: str) -> Optional[sqlite3.Row]:
    patient = find_patient_by_email(email)
    if not patient:
        return None

    if patient["password_hash"] != hash_password(password):
        return None

    with get_connection() as conn:
        conn.execute(
            "UPDATE patients SET last_login_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), patient["id"]),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM patients WHERE id = ?", (patient["id"],)).fetchone()

    return row


def find_doctor_by_email(email: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM doctors WHERE email = ?", (email.lower().strip(),)).fetchone()
    return row


def create_doctor(payload: dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    email = payload["email"].lower().strip()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO doctors (
                full_name, email, password_hash, created_at
            ) VALUES (?, ?, ?, ?)
            """,
            (
                payload["full_name"].strip(),
                email,
                hash_password(payload["password"]),
                timestamp,
            ),
        )
        conn.commit()
        doctor_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,)).fetchone()

    return row


def verify_doctor(email: str, password: str) -> Optional[sqlite3.Row]:
    doctor = find_doctor_by_email(email)
    if not doctor:
        return None

    if doctor["password_hash"] != hash_password(password):
        return None

    with get_connection() as conn:
        conn.execute(
            "UPDATE doctors SET last_login_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), doctor["id"]),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM doctors WHERE id = ?", (doctor["id"],)).fetchone()

    return row


def create_patient_condition(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    patient_id = f"P-{int(datetime.utcnow().timestamp() * 1000)}"

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO patient_conditions (
                patient_id, patient_email, age, gender, disease, disease_stage, biomarker, city,
                diabetes, hypertension, heart_disease, kidney_disease,
                current_medications, smoking_status, pregnancy_status, lab_results, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                payload["patient_email"].lower().strip(),
                payload["age"],
                payload["gender"].strip(),
                payload["disease"].strip(),
                payload.get("disease_stage"),
                payload.get("biomarker"),
                payload.get("city"),
                1 if payload.get("diabetes") else 0,
                1 if payload.get("hypertension") else 0,
                1 if payload.get("heart_disease") else 0,
                1 if payload.get("kidney_disease") else 0,
                payload.get("current_medications"),
                payload.get("smoking_status"),
                payload.get("pregnancy_status"),
                payload.get("lab_results"),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM patient_conditions WHERE patient_id = ?", (patient_id,)).fetchone()
    return row


def list_patient_conditions(patient_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM patient_conditions WHERE patient_email = ? ORDER BY created_at DESC",
            (patient_email.lower().strip(),),
        ).fetchall()
    return rows


def list_all_patient_conditions() -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM patient_conditions ORDER BY created_at DESC").fetchall()
    return rows


def get_patient_condition(patient_id: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM patient_conditions WHERE patient_id = ?", (patient_id,)).fetchone()
    return row


def create_clinical_trial(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO clinical_trials (
                trial_id, title, disease, phase, min_age, max_age, stage, biomarker, exclusion_conditions,
                criteria_text, city, hospital, country, start_date, end_date, max_participants, doctor_email, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["trial_id"].strip(),
                payload["title"].strip(),
                payload["disease"].strip(),
                payload["phase"].strip(),
                payload.get("min_age"),
                payload.get("max_age"),
                payload.get("stage"),
                payload.get("biomarker"),
                payload.get("exclusion_conditions"),
                payload.get("criteria_text"),
                payload.get("city"),
                payload.get("hospital"),
                payload.get("country"),
                payload.get("start_date"),
                payload.get("end_date"),
                payload.get("max_participants"),
                payload.get("doctor_email"),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM clinical_trials WHERE trial_id = ?", (payload["trial_id"].strip(),)).fetchone()
    return row


def list_clinical_trials(doctor_email: Optional[str] = None) -> List[sqlite3.Row]:
    with get_connection() as conn:
        if doctor_email:
            rows = conn.execute(
                "SELECT * FROM clinical_trials WHERE doctor_email = ? ORDER BY created_at DESC",
                (doctor_email.lower().strip(),),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM clinical_trials ORDER BY created_at DESC").fetchall()
    return rows
