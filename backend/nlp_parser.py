from __future__ import annotations

import re
from typing import Dict, List

try:
    import spacy  # type: ignore
except Exception:  # pragma: no cover - runtime fallback
    spacy = None

if spacy:
    nlp = spacy.blank("en")
    if "sentencizer" not in nlp.pipe_names:
        nlp.add_pipe("sentencizer")
else:
    nlp = None

KNOWN_DISEASES = [
    "lung cancer",
    "breast cancer",
    "ovarian cancer",
    "leukemia",
    "lymphoma",
    "gastric cancer",
    "pancreatic cancer",
    "colorectal cancer",
    "melanoma",
    "head and neck cancer",
    "diabetes",
]

KNOWN_EXCLUSIONS = [
    "heart disease",
    "severe heart disease",
    "diabetes",
    "pregnancy",
    "hypertension",
    "kidney disease",
]

KNOWN_BIOMARKERS = ["egfr", "her2", "pd-l1", "braf", "kras", "brca", "flt3", "cd20"]

EXCLUSION_TRIGGERS = ["excluded", "not eligible", "must not have", "exclude", "exclusion"]


def _normalize(text: str) -> str:
    return (
        text.replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\n", " ")
        .replace("\t", " ")
        .strip()
    )


def parse_eligibility_criteria(criteria_text: str) -> Dict:
    text = _normalize(criteria_text or "")
    lowered = text.lower()
    if nlp:
        doc = nlp(text)
        sentences = [sent.text for sent in doc.sents]
    else:
        sentences = [segment.strip() for segment in re.split(r"[.!?]", text) if segment.strip()]

    result = {
        "min_age": None,
        "max_age": None,
        "disease": None,
        "stage": None,
        "exclude_conditions": [],
        "biomarker": None,
        "status": "complete",
        "message": "Criteria parsed successfully",
    }

    age_match = re.search(r"(\d{1,3})\s*[-to]{1,3}\s*(\d{1,3})", lowered)
    if age_match:
        result["min_age"] = int(age_match.group(1))
        result["max_age"] = int(age_match.group(2))

    stage_match = re.search(r"stage\s*(i{1,3}|iv|v|\d+)", lowered)
    if stage_match:
        result["stage"] = stage_match.group(1).upper()

    for disease in KNOWN_DISEASES:
        if disease in lowered:
            result["disease"] = disease
            break

    for biomarker in KNOWN_BIOMARKERS:
        if biomarker in lowered:
            result["biomarker"] = biomarker.upper()
            break

    found_exclusions: List[str] = []
    for sent_text in sentences:
        sent_text = sent_text.lower()
        if any(trigger in sent_text for trigger in EXCLUSION_TRIGGERS):
            for condition in KNOWN_EXCLUSIONS:
                if condition in sent_text:
                    normalized = condition.replace("severe ", "")
                    if normalized not in found_exclusions:
                        found_exclusions.append(normalized)

    result["exclude_conditions"] = found_exclusions

    missing_core = [
        key for key in ["min_age", "max_age", "disease", "stage"] if result[key] in (None, "")
    ]
    if missing_core:
        result["status"] = "partial"
        result["message"] = "Some criteria could not be extracted automatically"

    return result


def qa_eligibility_criteria(criteria_text: str, parsed: Dict | None = None) -> Dict:
    text = _normalize(criteria_text or "")
    lowered = text.lower()
    parsed_result = parsed or parse_eligibility_criteria(criteria_text)

    warnings: List[str] = []
    suggestions: List[str] = []

    if parsed_result.get("min_age") is None or parsed_result.get("max_age") is None:
        warnings.append("Age range could not be extracted clearly.")
        suggestions.append("Use explicit format like 'aged 40-65'.")

    if not parsed_result.get("disease"):
        warnings.append("Disease keyword is missing or ambiguous.")
        suggestions.append("Mention exact disease, e.g., 'lung cancer'.")

    if not parsed_result.get("stage"):
        warnings.append("Disease stage is not specified.")
        suggestions.append("Add stage explicitly, e.g., 'Stage II'.")

    if not parsed_result.get("biomarker") and ("biomarker" in lowered or "marker" in lowered):
        warnings.append("Biomarker mentioned but not recognized.")
        suggestions.append("Use known marker format, e.g., EGFR+, HER2+, PD-L1+.")

    vague_terms = ["as applicable", "etc", "if needed", "appropriate", "as decided by investigator"]
    matched_vague_terms = [term for term in vague_terms if term in lowered]
    if matched_vague_terms:
        warnings.append("Criteria contains vague terms that reduce matching precision.")
        suggestions.append("Replace vague terms with measurable conditions.")

    if not parsed_result.get("exclude_conditions") and any(
        token in lowered for token in ["excluded", "exclude", "not eligible"]
    ):
        warnings.append("Exclusion rule language found but exclusion condition not extracted.")
        suggestions.append("Write exclusion conditions explicitly, e.g., 'exclude heart disease'.")

    completeness_penalty = min(len(warnings) * 15, 90)
    completeness_score = max(100 - completeness_penalty, 10)

    return {
        "warnings": warnings,
        "suggestions": suggestions,
        "completeness_score": completeness_score,
    }
