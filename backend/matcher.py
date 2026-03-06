from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import pandas as pd


AGE_WEIGHT = 25
DISEASE_WEIGHT = 30
STAGE_WEIGHT = 20
BIOMARKER_WEIGHT = 25


class TrialMatcher:
    def __init__(self, csv_path: str):
        data_path = Path(csv_path)
        if not data_path.exists():
            raise FileNotFoundError(f"Trial dataset not found at: {csv_path}")
        self.trials_df = pd.read_csv(data_path)

    @staticmethod
    def _normalize(value: str | None) -> str:
        return str(value).strip().lower() if value is not None else ""

    def _get_status(self, score: int, missing_data: List[str]) -> str:
        if missing_data:
            return "Insufficient Data"
        if score >= 75:
            return "Eligible"
        if score >= 50:
            return "Partially Eligible"
        return "Not Eligible"

    def _evaluate_trial(self, patient: Dict, trial: pd.Series) -> Dict:
        score = 0
        reasons: List[str] = []
        missing_data: List[str] = []

        patient_age = patient.get("age")
        patient_disease = self._normalize(patient.get("disease"))
        patient_stage = self._normalize(patient.get("stage"))
        patient_biomarker = self._normalize(patient.get("biomarker"))
        patient_location = self._normalize(patient.get("location"))

        trial_disease = self._normalize(trial["disease"])
        trial_stage = self._normalize(trial["stage"])
        trial_biomarker = self._normalize(trial["biomarker"])
        trial_location = self._normalize(trial["location"])

        if int(trial["min_age"]) <= patient_age <= int(trial["max_age"]):
            score += AGE_WEIGHT
            reasons.append("Age matches allowed trial range")
        else:
            reasons.append(
                f"Age does not match (required {int(trial['min_age'])}-{int(trial['max_age'])})"
            )

        if patient_disease == trial_disease:
            score += DISEASE_WEIGHT
            reasons.append("Disease matches trial condition")
        else:
            reasons.append(f"Disease mismatch (trial expects {trial['disease']})")

        if not patient_stage:
            missing_data.append("stage")
            reasons.append("Stage not provided by patient")
        elif patient_stage == trial_stage:
            score += STAGE_WEIGHT
            reasons.append("Stage matches trial criteria")
        else:
            reasons.append(f"Stage mismatch (trial expects {trial['stage']})")

        if not patient_biomarker:
            missing_data.append("biomarker")
            reasons.append("Biomarker not provided by patient")
        elif patient_biomarker == trial_biomarker:
            score += BIOMARKER_WEIGHT
            reasons.append("Biomarker matches trial criteria")
        else:
            reasons.append(f"Biomarker mismatch (trial expects {trial['biomarker']})")

        if patient_location:
            if patient_location == trial_location:
                reasons.append("Location preference matches")
            else:
                reasons.append(f"Location differs from preference ({trial['location']})")

        status = self._get_status(score, missing_data)
        confidence = score if not missing_data else max(score - 15, 0)

        return {
            "trial_id": str(trial["trial_id"]),
            "title": str(trial["title"]),
            "location": str(trial["location"]),
            "score": int(score),
            "confidence": int(confidence),
            "status": status,
            "reasons": reasons,
            "missing_data": missing_data,
        }

    def match_trials(self, patient: Dict) -> List[Dict]:
        matches = [self._evaluate_trial(patient, row) for _, row in self.trials_df.iterrows()]
        preferred_location = self._normalize(patient.get("location"))

        def sort_key(item: Dict):
            is_location_match = (
                1 if preferred_location and self._normalize(item["location"]) == preferred_location else 0
            )
            return (item["score"], is_location_match, item["confidence"])

        return sorted(matches, key=sort_key, reverse=True)
