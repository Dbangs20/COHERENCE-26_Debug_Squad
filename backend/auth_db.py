import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

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
