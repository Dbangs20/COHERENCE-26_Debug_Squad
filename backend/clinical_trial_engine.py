from __future__ import annotations

import re
from typing import Dict, List, Tuple


def _normalize(value: str | None) -> str:
    return str(value or "").strip().lower()


def _parse_age_range(criteria_text: str) -> Tuple[int | None, int | None]:
    text = _normalize(criteria_text)
    match = re.search(r"(\d{1,3})\s*[-to]{1,3}\s*(\d{1,3})", text)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _extract_stage(criteria_text: str) -> str | None:
    text = _normalize(criteria_text)
    match = re.search(r"stage\s*(i{1,3}|iv|v|\d+)", text)
    if not match:
        return None
    return match.group(1).upper()


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip() in {"1", "true", "True", "yes", "YES"}


def evaluate_match(patient: Dict, trial: Dict) -> Dict:
    score = 0
    explanation: List[str] = []

    trial_min_age = trial.get("min_age")
    trial_max_age = trial.get("max_age")
    trial_stage = trial.get("stage")

    parsed_min_age, parsed_max_age = _parse_age_range(trial.get("criteria_text") or "")
    if trial_min_age in (None, "") and parsed_min_age is not None:
        trial_min_age = parsed_min_age
    if trial_max_age in (None, "") and parsed_max_age is not None:
        trial_max_age = parsed_max_age

    if not trial_stage:
        trial_stage = _extract_stage(trial.get("criteria_text") or "")

    age = int(patient.get("age") or 0)
    if trial_min_age not in (None, "") and trial_max_age not in (None, ""):
        if int(trial_min_age) <= age <= int(trial_max_age):
            score += 20
            explanation.append("Age within required range")
        else:
            explanation.append(f"Age outside required range ({trial_min_age}-{trial_max_age})")

    if _normalize(patient.get("disease")) == _normalize(trial.get("disease")):
        score += 30
        explanation.append("Disease matches trial condition")
    else:
        explanation.append("Disease does not match trial condition")

    if trial_stage and _normalize(patient.get("disease_stage")) == _normalize(trial_stage):
        score += 20
        explanation.append("Disease stage matches")
    elif trial_stage:
        explanation.append(f"Disease stage mismatch (required {trial_stage})")

    trial_biomarker = trial.get("biomarker")
    if trial_biomarker and _normalize(patient.get("biomarker")) == _normalize(trial_biomarker):
        score += 20
        explanation.append(f"Biomarker {trial_biomarker} detected")
    elif trial_biomarker:
        explanation.append(f"Biomarker mismatch (required {trial_biomarker})")

    if _normalize(patient.get("city")) and _normalize(patient.get("city")) == _normalize(trial.get("city")):
        score += 10
        explanation.append("Location matches trial city")

    exclusions = [_normalize(item) for item in str(trial.get("exclusion_conditions") or "").split(",") if item.strip()]
    exclusion_hits: List[str] = []
    if "diabetes" in exclusions and _to_bool(patient.get("diabetes")):
        exclusion_hits.append("diabetes")
    if "heart_disease" in exclusions and _to_bool(patient.get("heart_disease")):
        exclusion_hits.append("heart_disease")
    if "pregnancy" in exclusions and _normalize(patient.get("pregnancy_status")) in {"pregnant", "yes"}:
        exclusion_hits.append("pregnancy")

    if exclusion_hits:
        score = max(score - 30, 0)
        explanation.append(f"Exclusion condition present: {', '.join(exclusion_hits)}")
    else:
        explanation.append("No exclusion conditions present")

    status = "Low Match"
    if score >= 80:
        status = "Strong Match"
    elif score >= 50:
        status = "Moderate Match"

    return {
        "trial_id": trial.get("trial_id"),
        "title": trial.get("title"),
        "hospital": trial.get("hospital"),
        "city": trial.get("city"),
        "phase": trial.get("phase"),
        "score": int(score),
        "status": status,
        "explanation": explanation,
    }


def rank_trials(patient: Dict, trials: List[Dict], filters: Dict) -> List[Dict]:
    results = [evaluate_match(patient, trial) for trial in trials]

    city_filter = _normalize(filters.get("city"))
    phase_filter = _normalize(filters.get("trial_phase"))
    min_score = int(filters.get("minimum_score") or 0)

    if city_filter:
        results = [item for item in results if _normalize(item.get("city")) == city_filter]
    if phase_filter:
        results = [item for item in results if _normalize(item.get("phase")) == phase_filter]

    results = [item for item in results if int(item.get("score", 0)) >= min_score]
    results.sort(key=lambda item: item.get("score", 0), reverse=True)
    return results
