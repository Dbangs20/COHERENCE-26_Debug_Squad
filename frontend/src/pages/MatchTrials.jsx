import { useMemo, useState } from "react";
import { matchTrials } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import PatientForm from "../components/PatientForm";
import TrialCard from "../components/TrialCard";

const initialFormData = {
  age: "",
  disease: "",
  stage: "",
  biomarker: "",
  location: "",
};

const MatchTrials = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

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
      };

      const data = await matchTrials(payload);
      setResults(data.recommended_trials || []);
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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Match Clinical Trials</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter anonymized patient details to rank relevant trial options with explainable eligibility.
        </p>
      </header>

      <PatientForm
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        isLoading={isLoading}
      />

      {isLoading && <LoadingSpinner />}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {!hasSearched && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Results will appear here after you run trial matching.
        </div>
      )}

      {hasSearched && !isLoading && !error && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Recommended Trials</h2>
          {topResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No matching trials found for the submitted profile.
            </div>
          ) : (
            topResults.map((trial) => <TrialCard key={trial.trial_id} trial={trial} />)
          )}
        </section>
      )}
    </div>
  );
};

export default MatchTrials;
