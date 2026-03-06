from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

AGE_WEIGHT = 25
DISEASE_WEIGHT = 30
STAGE_WEIGHT = 20
BIOMARKER_WEIGHT = 25


class TrialMatcher:
    def __init__(self, csv_path: str):
        data_path = Path(csv_path)
        if not data_path.exists():
            raise FileNotFoundError(f"Trial dataset not found at: {csv_path}")

        self.trials_df = pd.read_csv(data_path).fillna("")
        self.trials_df["trial_text"] = self.trials_df.apply(self._build_trial_text, axis=1)
        self.trials_df["criteria_logic"] = self.trials_df.apply(self._parse_criteria_logic, axis=1)

        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        self.trial_matrix = self.vectorizer.fit_transform(self.trials_df["trial_text"].tolist())

    @staticmethod
    def _normalize(value: str | None) -> str:
        return str(value).strip().lower() if value is not None else ""

    @staticmethod
    def _build_trial_text(trial: pd.Series) -> str:
        fields = [
            trial.get("title", ""),
            trial.get("disease", ""),
            trial.get("stage", ""),
            trial.get("biomarker", ""),
            trial.get("inclusion_criteria", ""),
            trial.get("exclusion_criteria", ""),
            trial.get("location", ""),
        ]
        return " ".join(str(item) for item in fields if str(item).strip())

    @staticmethod
    def _pii_patterns() -> List[Tuple[str, re.Pattern]]:
        return [
            ("email", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")),
            ("phone", re.compile(r"\b\d{10}\b")),
            ("aadhaar-like", re.compile(r"\b\d{12}\b")),
        ]

    def _sanitize_notes(self, notes: str | None) -> Tuple[str, List[str]]:
        text = notes or ""
        safeguards: List[str] = []
        for label, pattern in self._pii_patterns():
            if pattern.search(text):
                safeguards.append(f"Potential {label} detected in notes and masked")
                text = pattern.sub("[MASKED]", text)
        return text, safeguards

    def _parse_criteria_logic(self, trial: pd.Series) -> Dict[str, str]:
        inclusion = str(trial.get("inclusion_criteria", ""))
        exclusion = str(trial.get("exclusion_criteria", ""))

        logic = {
            "age_logic": "Unknown",
            "disease_logic": f"Disease should be {trial.get('disease', '')}",
            "stage_logic": f"Stage should be {trial.get('stage', '')}",
            "biomarker_logic": f"Biomarker should include {trial.get('biomarker', '')}",
            "exclusion_logic": exclusion or "No major exclusions listed",
        }

        age_match = re.search(r"(\d+)\s*[-to]{1,3}\s*(\d+)", inclusion.lower())
        if age_match:
            logic["age_logic"] = f"Age between {age_match.group(1)} and {age_match.group(2)}"
        elif trial.get("min_age", "") and trial.get("max_age", ""):
            logic["age_logic"] = f"Age between {trial.get('min_age')} and {trial.get('max_age')}"

        return logic

    def parse_trial_criteria(self) -> List[Dict]:
        items: List[Dict] = []
        for _, row in self.trials_df.iterrows():
            items.append(
                {
                    "trial_id": str(row["trial_id"]),
                    "title": str(row["title"]),
                    "structured_logic": row["criteria_logic"],
                }
            )
        return items

    def _get_status(self, score: int, missing_data: List[str]) -> str:
        if missing_data:
            return "Insufficient Data"
        if score >= 75:
            return "Eligible"
        if score >= 50:
            return "Partially Eligible"
        return "Not Eligible"

    def _rule_score(self, patient: Dict, trial: pd.Series) -> Tuple[int, List[str], List[str]]:
        score = 0
        reasons: List[str] = []
        missing_data: List[str] = []

        patient_age = patient.get("age")
        patient_disease = self._normalize(patient.get("disease"))
        patient_stage = self._normalize(patient.get("stage"))
        patient_biomarker = self._normalize(patient.get("biomarker"))

        trial_disease = self._normalize(trial["disease"])
        trial_stage = self._normalize(trial["stage"])
        trial_biomarker = self._normalize(trial["biomarker"])

        if int(trial["min_age"]) <= patient_age <= int(trial["max_age"]):
            score += AGE_WEIGHT
            reasons.append("Age matches allowed trial range")
        else:
            reasons.append(f"Age mismatch (required {int(trial['min_age'])}-{int(trial['max_age'])})")

        if patient_disease == trial_disease:
            score += DISEASE_WEIGHT
            reasons.append("Disease matches trial condition")
        else:
            reasons.append(f"Disease mismatch (trial expects {trial['disease']})")

        if not patient_stage:
            missing_data.append("stage")
            reasons.append("Stage not provided")
        elif patient_stage == trial_stage:
            score += STAGE_WEIGHT
            reasons.append("Stage matches trial criteria")
        else:
            reasons.append(f"Stage mismatch (trial expects {trial['stage']})")

        if not patient_biomarker:
            missing_data.append("biomarker")
            reasons.append("Biomarker not provided")
        elif patient_biomarker == trial_biomarker:
            score += BIOMARKER_WEIGHT
            reasons.append("Biomarker matches trial criteria")
        else:
            reasons.append(f"Biomarker mismatch (trial expects {trial['biomarker']})")

        return score, reasons, missing_data

    def _ml_score(self, patient: Dict) -> List[int]:
        sanitized_notes, _ = self._sanitize_notes(patient.get("clinical_notes"))
        patient_text = " ".join(
            [
                str(patient.get("disease", "")),
                str(patient.get("stage", "")),
                str(patient.get("biomarker", "")),
                str(patient.get("location", "")),
                sanitized_notes,
            ]
        )
        patient_vector = self.vectorizer.transform([patient_text])
        similarity = cosine_similarity(patient_vector, self.trial_matrix).flatten()
        return [int(round(value * 100)) for value in similarity]

    def match_trials(self, patient: Dict) -> Tuple[List[Dict], List[str]]:
        patient = patient.copy()
        preferred_locations = [self._normalize(city) for city in patient.get("preferred_locations", []) if city]
        geographic_filter_mode = self._normalize(patient.get("geographic_filter_mode") or "prefer")

        sanitized_notes, safeguards = self._sanitize_notes(patient.get("clinical_notes"))
        patient["clinical_notes"] = sanitized_notes
        safeguards.append("Anonymized profile used for matching; avoid direct identifiers")

        ml_scores = self._ml_score(patient)
        matches: List[Dict] = []

        for idx, trial in self.trials_df.iterrows():
            trial_location = self._normalize(trial["location"])
            if preferred_locations and geographic_filter_mode == "strict" and trial_location not in preferred_locations:
                continue

            rule_score, reasons, missing_data = self._rule_score(patient, trial)
            ml_score = ml_scores[idx]
            location_bonus = 0

            if preferred_locations:
                if trial_location in preferred_locations:
                    reasons.append("Location is within preferred geographic filter")
                    if geographic_filter_mode == "prefer":
                        location_bonus = 5
                else:
                    reasons.append("Location is outside preferred geographic filter")

            combined_score = min(int(round(rule_score * 0.7 + ml_score * 0.3 + location_bonus)), 100)
            confidence = max(combined_score - (10 if missing_data else 0), 0)
            status = self._get_status(combined_score, missing_data)

            matches.append(
                {
                    "trial_id": str(trial["trial_id"]),
                    "title": str(trial["title"]),
                    "location": str(trial["location"]),
                    "rule_score": int(rule_score),
                    "ml_score": int(ml_score),
                    "score": int(combined_score),
                    "confidence": int(confidence),
                    "status": status,
                    "reasons": reasons,
                    "missing_data": missing_data,
                    "criteria_logic": trial["criteria_logic"],
                }
            )

        top_k = int(patient.get("top_k") or 8)
        ranked = sorted(matches, key=lambda item: (item["score"], item["confidence"]), reverse=True)
        return ranked[:top_k], safeguards
