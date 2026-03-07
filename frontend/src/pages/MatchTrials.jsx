import { useMemo, useState } from "react";
import { getParsedCriteria, matchTrials } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import PatientForm from "../components/PatientForm";
import TrialCard from "../components/TrialCard";

const initialFormData = {
  age: "",
  disease: "",
  stage: "",
  biomarker: "",
  location: "",
  clinical_notes: "",
  preferred_locations: "",
  geographic_filter_mode: "prefer",
};

const getPrefilledForm = () => {
  try {
    const raw = localStorage.getItem("curenovaSelectedPatientRecord");
    if (!raw) return initialFormData;
    const parsed = JSON.parse(raw);
    return {
      ...initialFormData,
      age: parsed.age ? String(parsed.age) : "",
      disease: parsed.disease || "",
      stage: parsed.stage || "",
      biomarker: parsed.biomarker || "",
      location: parsed.location || "",
    };
  } catch (error) {
    return initialFormData;
  }
};

const MatchTrials = () => {
  const [formData, setFormData] = useState(getPrefilledForm);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [safeguards, setSafeguards] = useState([]);
  const [parsedCriteria, setParsedCriteria] = useState([]);

  const topResults = useMemo(() => results.slice(0, 8), [results]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setResults([]);
    setError("");
    setHasSearched(false);
    setSafeguards([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const payload = {
        age: Number(formData.age),
        disease: formData.disease,
        stage: formData.stage.trim() || null,
        biomarker: formData.biomarker.trim() || null,
        location: formData.location.trim() || null,
        clinical_notes: formData.clinical_notes.trim() || null,
        preferred_locations: formData.preferred_locations
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        geographic_filter_mode: formData.geographic_filter_mode,
        top_k: 8,
      };

      const [matchData, criteriaData] = await Promise.all([matchTrials(payload), getParsedCriteria()]);
      setResults(matchData.recommended_trials || []);
      setSafeguards(matchData.safeguards || []);
      setParsedCriteria((criteriaData.parsed_trials || []).slice(0, 5));
    } catch (requestError) {
      setError("Unable to fetch trial recommendations. Please ensure backend server is running.");
      setResults([]);
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">🧠 Clinical Trial Eligibility & Matching Engine</h1>
        <p className="mt-2 text-sm text-slate-600">
          Rule-based + ML matching for anonymized patient profiles, with explainability, confidence scores, and geographic filters.
        </p>
      </header>

      <PatientForm
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        isLoading={isLoading}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">⚙️ Advanced Inputs</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Clinical Notes (semi-structured)</span>
            <textarea
              className="input-base min-h-24 resize-y"
              name="clinical_notes"
              value={formData.clinical_notes}
              onChange={handleChange}
              placeholder="Example: diagnosed 2022, prior platinum chemo, no autoimmune disease"
            />
          </label>

          <div className="space-y-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Preferred Cities (comma separated)</span>
              <input
                className="input-base"
                name="preferred_locations"
                value={formData.preferred_locations}
                onChange={handleChange}
                placeholder="Mumbai, Pune"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Geographic Filter Mode</span>
              <select className="input-base" name="geographic_filter_mode" value={formData.geographic_filter_mode} onChange={handleChange}>
                <option value="prefer">Prefer (boost preferred cities)</option>
                <option value="strict">Strict (only preferred cities)</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {isLoading && <LoadingSpinner />}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {safeguards.length > 0 && (
        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm text-cyan-800">
          <h3 className="font-semibold">Anonymization & Ethical Safeguards</h3>
          <ul className="mt-2 space-y-1">
            {safeguards.map((item, index) => (
              <li key={`safeguard-${index}`}>- {item}</li>
            ))}
          </ul>
        </section>
      )}

      {!hasSearched && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Results will appear here after you run trial matching.
        </div>
      )}

      {hasSearched && !isLoading && !error && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">🎯 Recommended Trials</h2>
          {topResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No matching trials found for the submitted profile.
            </div>
          ) : (
            topResults.map((trial) => <TrialCard key={trial.trial_id} trial={trial} />)
          )}
        </section>
      )}

      {parsedCriteria.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">🧩 Criteria Parsing Preview</h3>
          <p className="mt-1 text-sm text-slate-600">Showing how semi-structured criteria text is converted into structured logic.</p>
          <div className="mt-4 grid gap-3">
            {parsedCriteria.map((item) => (
              <article key={item.trial_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{item.trial_id} - {item.title}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {Object.entries(item.structured_logic).map(([key, value]) => (
                    <li key={`${item.trial_id}-${key}`}>
                      - <span className="font-medium">{key.replaceAll("_", " ")}:</span> {value}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MatchTrials;
