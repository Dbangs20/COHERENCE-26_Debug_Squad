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
    detailed_checks: List[Dict] = []
    rejection_reasons: List[str] = []

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
            detailed_checks.append(
                {
                    "criterion": "Age",
                    "passed": True,
                    "weight": 20,
                    "contribution": 20,
                    "reason": f"Within {trial_min_age}-{trial_max_age}",
                }
            )
        else:
            explanation.append(f"Age outside required range ({trial_min_age}-{trial_max_age})")
            rejection_reasons.append("Age outside allowed range")
            detailed_checks.append(
                {
                    "criterion": "Age",
                    "passed": False,
                    "weight": 20,
                    "contribution": 0,
                    "reason": f"Outside {trial_min_age}-{trial_max_age}",
                }
            )
    else:
        detailed_checks.append(
            {
                "criterion": "Age",
                "passed": True,
                "weight": 20,
                "contribution": 0,
                "reason": "No strict age criteria in trial",
            }
        )

    if _normalize(patient.get("disease")) == _normalize(trial.get("disease")):
        score += 30
        explanation.append("Disease matches trial condition")
        detailed_checks.append(
            {
                "criterion": "Disease",
                "passed": True,
                "weight": 30,
                "contribution": 30,
                "reason": "Disease matches trial condition",
            }
        )
    else:
        explanation.append("Disease does not match trial condition")
        rejection_reasons.append("Disease mismatch")
        detailed_checks.append(
            {
                "criterion": "Disease",
                "passed": False,
                "weight": 30,
                "contribution": 0,
                "reason": "Disease does not match trial condition",
            }
        )

    if trial_stage and _normalize(patient.get("disease_stage")) == _normalize(trial_stage):
        score += 20
        explanation.append("Disease stage matches")
        detailed_checks.append(
            {
                "criterion": "Stage",
                "passed": True,
                "weight": 20,
                "contribution": 20,
                "reason": f"Stage {trial_stage} matches",
            }
        )
    elif trial_stage:
        explanation.append(f"Disease stage mismatch (required {trial_stage})")
        rejection_reasons.append("Stage mismatch")
        detailed_checks.append(
            {
                "criterion": "Stage",
                "passed": False,
                "weight": 20,
                "contribution": 0,
                "reason": f"Required stage {trial_stage}",
            }
        )
    else:
        detailed_checks.append(
            {
                "criterion": "Stage",
                "passed": True,
                "weight": 20,
                "contribution": 0,
                "reason": "No stage restriction in trial",
            }
        )

    trial_biomarker = trial.get("biomarker")
    if trial_biomarker and _normalize(patient.get("biomarker")) == _normalize(trial_biomarker):
        score += 20
        explanation.append(f"Biomarker {trial_biomarker} detected")
        detailed_checks.append(
            {
                "criterion": "Biomarker",
                "passed": True,
                "weight": 20,
                "contribution": 20,
                "reason": f"{trial_biomarker} detected",
            }
        )
    elif trial_biomarker:
        explanation.append(f"Biomarker mismatch (required {trial_biomarker})")
        rejection_reasons.append("Biomarker mismatch")
        detailed_checks.append(
            {
                "criterion": "Biomarker",
                "passed": False,
                "weight": 20,
                "contribution": 0,
                "reason": f"Required biomarker {trial_biomarker}",
            }
        )
    else:
        detailed_checks.append(
            {
                "criterion": "Biomarker",
                "passed": True,
                "weight": 20,
                "contribution": 0,
                "reason": "No biomarker restriction in trial",
            }
        )

    if _normalize(patient.get("city")) and _normalize(patient.get("city")) == _normalize(trial.get("city")):
        score += 10
        explanation.append("Location matches trial city")
        detailed_checks.append(
            {
                "criterion": "Location",
                "passed": True,
                "weight": 10,
                "contribution": 10,
                "reason": "City matches trial city",
            }
        )
    else:
        detailed_checks.append(
            {
                "criterion": "Location",
                "passed": False,
                "weight": 10,
                "contribution": 0,
                "reason": "City mismatch or not provided",
            }
        )

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
        rejection_reasons.append(f"Exclusion: {', '.join(exclusion_hits)}")
        detailed_checks.append(
            {
                "criterion": "Exclusions",
                "passed": False,
                "weight": 0,
                "contribution": -30,
                "reason": f"Exclusion condition present: {', '.join(exclusion_hits)}",
            }
        )
    else:
        explanation.append("No exclusion conditions present")
        detailed_checks.append(
            {
                "criterion": "Exclusions",
                "passed": True,
                "weight": 0,
                "contribution": 0,
                "reason": "No exclusion conditions present",
            }
        )

    status = "Low Match"
    if score >= 80:
        status = "Strong Match"
    elif score >= 50:
        status = "Moderate Match"

    return {
        "trial_id": trial.get("trial_id"),
        "title": trial.get("title"),
        "disease": trial.get("disease"),
        "hospital": trial.get("hospital"),
        "city": trial.get("city"),
        "phase": trial.get("phase"),
        "score": int(score),
        "status": status,
        "explanation": explanation,
        "detailed_checks": detailed_checks,
        "rejection_reasons": rejection_reasons,
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


def rank_trials_with_rejections(patient: Dict, trials: List[Dict], filters: Dict) -> Tuple[List[Dict], List[Dict]]:
    all_results = [evaluate_match(patient, trial) for trial in trials]
    city_filter = _normalize(filters.get("city"))
    phase_filter = _normalize(filters.get("trial_phase"))
    min_score = int(filters.get("minimum_score") or 0)

    filtered = all_results
    if city_filter:
        filtered = [item for item in filtered if _normalize(item.get("city")) == city_filter]
    if phase_filter:
        filtered = [item for item in filtered if _normalize(item.get("phase")) == phase_filter]

    recommendations = [item for item in filtered if int(item.get("score", 0)) >= min_score]
    rejections = [item for item in filtered if int(item.get("score", 0)) < min_score]
    recommendations.sort(key=lambda item: item.get("score", 0), reverse=True)
    rejections.sort(key=lambda item: item.get("score", 0), reverse=True)
    return recommendations, rejections
