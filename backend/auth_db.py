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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS report_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_email TEXT NOT NULL,
                patient_id TEXT NOT NULL,
                trial_id TEXT NOT NULL,
                message TEXT,
                required_tests TEXT,
                status TEXT NOT NULL DEFAULT 'requested',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS patient_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                patient_email TEXT NOT NULL,
                doctor_email TEXT NOT NULL,
                trial_id TEXT NOT NULL,
                file_name TEXT,
                report_text TEXT,
                is_verified INTEGER NOT NULL DEFAULT 0,
                mismatch_reason TEXT,
                redacted_summary TEXT,
                analysis_status TEXT NOT NULL DEFAULT 'pending',
                selected INTEGER NOT NULL DEFAULT 0,
                analysis_notes TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_email TEXT NOT NULL,
                recipient_role TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                patient_email TEXT NOT NULL,
                doctor_email TEXT NOT NULL,
                trial_id TEXT NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                doctor_advice TEXT,
                status TEXT NOT NULL DEFAULT 'scheduled',
                appointment_completed_at TEXT,
                followup_available_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS followup_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL,
                patient_email TEXT NOT NULL,
                doctor_email TEXT NOT NULL,
                mode TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'requested',
                video_url TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL,
                patient_id TEXT NOT NULL,
                patient_email TEXT NOT NULL,
                doctor_email TEXT NOT NULL,
                sender_role TEXT NOT NULL,
                message_text TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS trial_enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trial_id TEXT NOT NULL,
                patient_id TEXT NOT NULL,
                patient_email TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(trial_id, patient_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS doctor_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_email TEXT NOT NULL,
                slot_date TEXT NOT NULL,
                slot_time TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                UNIQUE(doctor_email, slot_date, slot_time)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS privacy_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_email TEXT,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                original_excerpt TEXT,
                redacted_excerpt TEXT,
                findings TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS research_referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_email TEXT NOT NULL,
                report_id INTEGER NOT NULL UNIQUE,
                trial_id TEXT NOT NULL,
                disease TEXT,
                status_bucket TEXT NOT NULL,
                anonymized_case_id TEXT NOT NULL,
                report_snapshot TEXT,
                recommendation_status TEXT NOT NULL DEFAULT 'pending',
                medicine_plan TEXT,
                researcher_notes TEXT,
                researcher_name TEXT,
                template_applied INTEGER NOT NULL DEFAULT 0,
                shared_to_patient INTEGER NOT NULL DEFAULT 0,
                shared_at TEXT,
                created_at TEXT NOT NULL,
                recommended_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS status_medicine_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                disease TEXT NOT NULL,
                status_bucket TEXT NOT NULL,
                medicine_plan TEXT NOT NULL,
                researcher_notes TEXT,
                last_researcher_name TEXT,
                updated_at TEXT NOT NULL,
                UNIQUE(disease, status_bucket)
            )
            """
        )
        # Lightweight migration support for existing local DBs.
        report_request_columns = [row["name"] for row in conn.execute("PRAGMA table_info(report_requests)").fetchall()]
        if "required_tests" not in report_request_columns:
            conn.execute("ALTER TABLE report_requests ADD COLUMN required_tests TEXT")
        appointment_columns = [row["name"] for row in conn.execute("PRAGMA table_info(appointments)").fetchall()]
        if "appointment_completed_at" not in appointment_columns:
            conn.execute("ALTER TABLE appointments ADD COLUMN appointment_completed_at TEXT")
        if "followup_available_at" not in appointment_columns:
            conn.execute("ALTER TABLE appointments ADD COLUMN followup_available_at TEXT")
        referral_columns = [row["name"] for row in conn.execute("PRAGMA table_info(research_referrals)").fetchall()]
        if "template_applied" not in referral_columns:
            conn.execute("ALTER TABLE research_referrals ADD COLUMN template_applied INTEGER NOT NULL DEFAULT 0")
        if "shared_to_patient" not in referral_columns:
            conn.execute("ALTER TABLE research_referrals ADD COLUMN shared_to_patient INTEGER NOT NULL DEFAULT 0")
        if "shared_at" not in referral_columns:
            conn.execute("ALTER TABLE research_referrals ADD COLUMN shared_at TEXT")
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


def get_trial_by_id(trial_id: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM clinical_trials WHERE trial_id = ?", (trial_id.strip(),)).fetchone()
    return row


def create_report_request(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO report_requests (
                doctor_email, patient_id, trial_id, message, required_tests, status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'requested', ?)
            """,
            (
                payload["doctor_email"].lower().strip(),
                payload["patient_id"].strip(),
                payload["trial_id"].strip(),
                payload.get("message"),
                payload.get("required_tests"),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM report_requests WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def has_active_report_request(patient_id: str, trial_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS count
            FROM report_requests
            WHERE patient_id = ? AND trial_id = ? AND status IN ('requested', 'submitted')
            """,
            (patient_id.strip(), trial_id.strip()),
        ).fetchone()
    return bool(int(row["count"] if row else 0))


def get_report_request(request_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM report_requests WHERE id = ?", (request_id,)).fetchone()
    return row


def update_report_request_status(request_id: int, status: str) -> None:
    with get_connection() as conn:
        conn.execute("UPDATE report_requests SET status = ? WHERE id = ?", (status, request_id))
        conn.commit()


def list_report_requests_for_patient(patient_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT rr.*
            FROM report_requests rr
            JOIN patient_conditions pc ON rr.patient_id = pc.patient_id
            WHERE pc.patient_email = ? AND rr.status = 'requested'
            ORDER BY rr.created_at DESC
            """,
            (patient_email.lower().strip(),),
        ).fetchall()
    return rows


def create_patient_report(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO patient_reports (
                patient_id, patient_email, doctor_email, trial_id, file_name, report_text,
                is_verified, mismatch_reason, redacted_summary, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["patient_id"],
                payload["patient_email"].lower().strip(),
                payload["doctor_email"].lower().strip(),
                payload["trial_id"],
                payload.get("file_name"),
                payload.get("report_text"),
                1 if payload.get("is_verified") else 0,
                payload.get("mismatch_reason"),
                payload.get("redacted_summary"),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM patient_reports WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def list_verified_reports_for_doctor(doctor_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM patient_reports
            WHERE doctor_email = ? AND is_verified = 1
            ORDER BY created_at DESC
            """,
            (doctor_email.lower().strip(),),
        ).fetchall()
    return rows


def get_patient_report(report_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM patient_reports WHERE id = ?", (report_id,)).fetchone()
    return row


def update_patient_report_analysis(report_id: int, selected: bool, notes: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE patient_reports
            SET analysis_status = 'completed', selected = ?, analysis_notes = ?
            WHERE id = ?
            """,
            (1 if selected else 0, notes, report_id),
        )
        conn.commit()


def create_notification(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO notifications (
                recipient_email, recipient_role, title, message, is_read, created_at
            ) VALUES (?, ?, ?, ?, 0, ?)
            """,
            (
                payload["recipient_email"].lower().strip(),
                payload["recipient_role"].strip(),
                payload["title"].strip(),
                payload["message"].strip(),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notifications WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def list_notifications(email: str, role: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM notifications
            WHERE recipient_email = ? AND recipient_role = ?
            ORDER BY created_at DESC
            """,
            (email.lower().strip(), role.strip()),
        ).fetchall()
    return rows


def mark_notification_read(notification_id: int) -> None:
    with get_connection() as conn:
        conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
        conn.commit()


def delete_read_notifications(email: str, role: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            DELETE FROM notifications
            WHERE recipient_email = ? AND recipient_role = ? AND is_read = 1
            """,
            (email.lower().strip(), role.strip()),
        )
        conn.commit()
        return int(cursor.rowcount or 0)


def delete_notification_by_id(notification_id: int, email: str, role: str, read_only: bool = True) -> int:
    with get_connection() as conn:
        if read_only:
            cursor = conn.execute(
                """
                DELETE FROM notifications
                WHERE id = ? AND recipient_email = ? AND recipient_role = ? AND is_read = 1
                """,
                (notification_id, email.lower().strip(), role.strip()),
            )
        else:
            cursor = conn.execute(
                """
                DELETE FROM notifications
                WHERE id = ? AND recipient_email = ? AND recipient_role = ?
                """,
                (notification_id, email.lower().strip(), role.strip()),
            )
        conn.commit()
        return int(cursor.rowcount or 0)


def list_selected_reports_for_patient(patient_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT pr.*, ct.hospital, ct.city
            FROM patient_reports pr
            LEFT JOIN clinical_trials ct ON ct.trial_id = pr.trial_id
            WHERE pr.patient_email = ? AND pr.selected = 1
            ORDER BY pr.created_at DESC
            """,
            (patient_email.lower().strip(),),
        ).fetchall()
    return rows


def create_appointment(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO appointments (
                patient_id, patient_email, doctor_email, trial_id, appointment_date,
                appointment_time, doctor_advice, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
            """,
            (
                payload["patient_id"],
                payload["patient_email"].lower().strip(),
                payload["doctor_email"].lower().strip(),
                payload["trial_id"],
                payload["appointment_date"],
                payload["appointment_time"],
                payload.get("doctor_advice"),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM appointments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def list_appointments_for_patient(patient_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT ap.*, d.full_name AS doctor_name
            FROM appointments ap
            LEFT JOIN doctors d ON d.email = ap.doctor_email
            WHERE ap.patient_email = ?
            ORDER BY ap.created_at DESC
            """,
            (patient_email.lower().strip(),),
        ).fetchall()
    return rows


def list_appointments_for_doctor(doctor_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT ap.*
            FROM appointments ap
            WHERE ap.doctor_email = ?
            ORDER BY ap.created_at DESC
            """,
            (doctor_email.lower().strip(),),
        ).fetchall()
    return rows


def get_appointment(appointment_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    return row


def update_appointment_advice(appointment_id: int, advice: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE appointments SET doctor_advice = ?, status = 'advice_shared' WHERE id = ?",
            (advice, appointment_id),
        )
        conn.commit()


def complete_appointment(appointment_id: int, doctor_email: str, completed_at: str, followup_available_at: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE appointments
            SET status = 'completed',
                appointment_completed_at = ?,
                followup_available_at = ?
            WHERE id = ? AND doctor_email = ?
            """,
            (completed_at, followup_available_at, appointment_id, doctor_email.lower().strip()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    return row


def update_appointment_status(appointment_id: int, status: str) -> None:
    with get_connection() as conn:
        conn.execute("UPDATE appointments SET status = ? WHERE id = ?", (status, appointment_id))
        conn.commit()


def create_followup_request(appointment_id: int, patient_email: str, doctor_email: str, mode: str, video_url: Optional[str] = None) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO followup_requests (
                appointment_id, patient_email, doctor_email, mode, status, video_url, created_at
            ) VALUES (?, ?, ?, ?, 'requested', ?, ?)
            """,
            (appointment_id, patient_email.lower().strip(), doctor_email.lower().strip(), mode, video_url, timestamp),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM followup_requests WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def list_followup_requests_for_doctor(doctor_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT fr.*, ap.patient_id, ap.patient_email, ap.trial_id
            FROM followup_requests fr
            LEFT JOIN appointments ap ON ap.id = fr.appointment_id
            WHERE fr.doctor_email = ?
            ORDER BY fr.created_at DESC
            """,
            (doctor_email.lower().strip(),),
        ).fetchall()
    return rows


def create_message(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO messages (
                appointment_id, patient_id, patient_email, doctor_email, sender_role, message_text, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["appointment_id"],
                payload["patient_id"],
                payload["patient_email"].lower().strip(),
                payload["doctor_email"].lower().strip(),
                payload["sender_role"],
                payload["message_text"].strip(),
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM messages WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def list_messages_for_appointment(appointment_id: int) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE appointment_id = ? ORDER BY timestamp ASC",
            (appointment_id,),
        ).fetchall()
    return rows


def create_trial_enrollment(trial_id: str, patient_id: str, patient_email: str, status: str) -> Optional[sqlite3.Row]:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO trial_enrollments (trial_id, patient_id, patient_email, status, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (trial_id, patient_id, patient_email.lower().strip(), status, timestamp),
            )
            conn.commit()
            return conn.execute("SELECT * FROM trial_enrollments WHERE id = ?", (cursor.lastrowid,)).fetchone()
        except sqlite3.IntegrityError:
            return conn.execute(
                "SELECT * FROM trial_enrollments WHERE trial_id = ? AND patient_id = ?",
                (trial_id, patient_id),
            ).fetchone()


def count_confirmed_enrollments(trial_id: str) -> int:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS count FROM trial_enrollments WHERE trial_id = ? AND status = 'confirmed'",
            (trial_id,),
        ).fetchone()
    return int(row["count"] if row else 0)


def count_waitlisted_enrollments(trial_id: str) -> int:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS count FROM trial_enrollments WHERE trial_id = ? AND status = 'waitlisted'",
            (trial_id,),
        ).fetchone()
    return int(row["count"] if row else 0)


def list_enrollments_for_patient(patient_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM trial_enrollments WHERE patient_email = ? ORDER BY created_at DESC",
            (patient_email.lower().strip(),),
        ).fetchall()
    return rows


def create_doctor_slot(doctor_email: str, slot_date: str, slot_time: str) -> Optional[sqlite3.Row]:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO doctor_slots (doctor_email, slot_date, slot_time, is_active, created_at)
                VALUES (?, ?, ?, 1, ?)
                """,
                (doctor_email.lower().strip(), slot_date, slot_time, timestamp),
            )
            conn.commit()
            return conn.execute("SELECT * FROM doctor_slots WHERE id = ?", (cursor.lastrowid,)).fetchone()
        except sqlite3.IntegrityError:
            return None


def list_doctor_slots(doctor_email: str, active_only: bool = True) -> List[sqlite3.Row]:
    with get_connection() as conn:
        if active_only:
            rows = conn.execute(
                """
                SELECT * FROM doctor_slots
                WHERE doctor_email = ? AND is_active = 1
                ORDER BY slot_date ASC, slot_time ASC
                """,
                (doctor_email.lower().strip(),),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM doctor_slots
                WHERE doctor_email = ?
                ORDER BY slot_date ASC, slot_time ASC
                """,
                (doctor_email.lower().strip(),),
            ).fetchall()
    return rows


def deactivate_doctor_slot(doctor_email: str, slot_date: str, slot_time: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE doctor_slots
            SET is_active = 0
            WHERE doctor_email = ? AND slot_date = ? AND slot_time = ?
            """,
            (doctor_email.lower().strip(), slot_date, slot_time),
        )
        conn.commit()


def slot_has_appointment(doctor_email: str, slot_date: str, slot_time: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS count
            FROM appointments
            WHERE doctor_email = ? AND appointment_date = ? AND appointment_time = ?
            """,
            (doctor_email.lower().strip(), slot_date, slot_time),
        ).fetchone()
    return bool(int(row["count"] if row else 0))


def list_upcoming_available_slots(doctor_email: str, limit: int = 3) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT ds.*
            FROM doctor_slots ds
            LEFT JOIN appointments ap
              ON ap.doctor_email = ds.doctor_email
             AND ap.appointment_date = ds.slot_date
             AND ap.appointment_time = ds.slot_time
            WHERE ds.doctor_email = ? AND ds.is_active = 1 AND ap.id IS NULL
            ORDER BY ds.slot_date ASC, ds.slot_time ASC
            LIMIT ?
            """,
            (doctor_email.lower().strip(), limit),
        ).fetchall()
    return rows


def create_privacy_log(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO privacy_logs (
                actor_email, entity_type, entity_id, original_excerpt, redacted_excerpt, findings, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("actor_email"),
                payload["entity_type"],
                payload.get("entity_id"),
                payload.get("original_excerpt"),
                payload.get("redacted_excerpt"),
                payload.get("findings"),
                timestamp,
            ),
        )
        conn.commit()
        return conn.execute("SELECT * FROM privacy_logs WHERE id = ?", (cursor.lastrowid,)).fetchone()


def list_privacy_logs(limit: int = 20) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM privacy_logs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return rows


def get_status_medicine_template(disease: str, status_bucket: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT * FROM status_medicine_templates
            WHERE lower(disease) = ? AND status_bucket = ?
            """,
            (disease.lower().strip(), status_bucket.strip()),
        ).fetchone()
    return row


def upsert_status_medicine_template(
    disease: str,
    status_bucket: str,
    medicine_plan: str,
    researcher_notes: Optional[str],
    researcher_name: Optional[str],
) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO status_medicine_templates (
                disease, status_bucket, medicine_plan, researcher_notes, last_researcher_name, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(disease, status_bucket)
            DO UPDATE SET
                medicine_plan = excluded.medicine_plan,
                researcher_notes = excluded.researcher_notes,
                last_researcher_name = excluded.last_researcher_name,
                updated_at = excluded.updated_at
            """,
            (
                disease.lower().strip(),
                status_bucket.strip(),
                medicine_plan.strip(),
                (researcher_notes or "").strip() or None,
                (researcher_name or "").strip() or None,
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute(
            """
            SELECT * FROM status_medicine_templates
            WHERE lower(disease) = ? AND status_bucket = ?
            """,
            (disease.lower().strip(), status_bucket.strip()),
        ).fetchone()
    return row


def create_or_get_research_referral(payload: Dict) -> sqlite3.Row:
    timestamp = datetime.utcnow().isoformat()
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM research_referrals WHERE report_id = ?",
            (payload["report_id"],),
        ).fetchone()
        if existing:
            return existing

        cursor = conn.execute(
            """
            INSERT INTO research_referrals (
                doctor_email, report_id, trial_id, disease, status_bucket, anonymized_case_id,
                report_snapshot, recommendation_status, medicine_plan, researcher_notes, researcher_name,
                template_applied, shared_to_patient, shared_at, created_at, recommended_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
            """,
            (
                payload["doctor_email"].lower().strip(),
                payload["report_id"],
                payload["trial_id"],
                payload.get("disease"),
                payload["status_bucket"],
                payload["anonymized_case_id"],
                payload.get("report_snapshot"),
                payload.get("recommendation_status", "pending"),
                payload.get("medicine_plan"),
                payload.get("researcher_notes"),
                payload.get("researcher_name"),
                1 if payload.get("template_applied") else 0,
                timestamp,
                payload.get("recommended_at"),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM research_referrals WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row


def list_research_referrals_for_doctor(doctor_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT rr.*
            FROM research_referrals rr
            WHERE rr.doctor_email = ?
            ORDER BY rr.created_at DESC
            """,
            (doctor_email.lower().strip(),),
        ).fetchall()
    return rows


def get_research_referral(referral_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM research_referrals WHERE id = ?", (referral_id,)).fetchone()
    return row


def update_research_recommendation(
    referral_id: int,
    medicine_plan: str,
    researcher_notes: Optional[str],
    researcher_name: Optional[str],
) -> Optional[sqlite3.Row]:
    recommended_at = datetime.utcnow().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE research_referrals
            SET recommendation_status = 'recommended',
                medicine_plan = ?,
                researcher_notes = ?,
                researcher_name = ?,
                recommended_at = ?
            WHERE id = ?
            """,
            (
                medicine_plan.strip(),
                (researcher_notes or "").strip() or None,
                (researcher_name or "").strip() or None,
                recommended_at,
                referral_id,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM research_referrals WHERE id = ?", (referral_id,)).fetchone()
    return row


def mark_research_referral_shared(referral_id: int) -> Optional[sqlite3.Row]:
    shared_at = datetime.utcnow().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE research_referrals
            SET shared_to_patient = 1, shared_at = ?
            WHERE id = ?
            """,
            (shared_at, referral_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM research_referrals WHERE id = ?", (referral_id,)).fetchone()
    return row


def list_patient_medicine_plans(patient_email: str) -> List[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                rr.id,
                rr.anonymized_case_id,
                rr.trial_id,
                rr.disease,
                rr.status_bucket,
                rr.medicine_plan,
                rr.researcher_notes,
                rr.researcher_name,
                rr.shared_at,
                pr.doctor_email
            FROM research_referrals rr
            JOIN patient_reports pr ON pr.id = rr.report_id
            WHERE pr.patient_email = ? AND rr.shared_to_patient = 1
            ORDER BY rr.shared_at DESC
            """,
            (patient_email.lower().strip(),),
        ).fetchall()
    return rows
