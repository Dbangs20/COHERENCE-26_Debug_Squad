const PatientForm = ({ formData, onChange, onSubmit, onReset, isLoading }) => {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Patient Profile (Anonymized)</h2>
      <p className="mt-1 text-sm text-slate-600">Use anonymized patient details only. Stage and biomarker can be left blank.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Age *</span>
          <input
            type="number"
            name="age"
            className="input-base"
            min="0"
            max="130"
            value={formData.age}
            onChange={onChange}
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Disease *</span>
          <input
            type="text"
            name="disease"
            className="input-base"
            value={formData.disease}
            onChange={onChange}
            placeholder="e.g. lung cancer"
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Stage</span>
          <input
            type="text"
            name="stage"
            className="input-base"
            value={formData.stage}
            onChange={onChange}
            placeholder="e.g. III"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Biomarker</span>
          <input
            type="text"
            name="biomarker"
            className="input-base"
            value={formData.biomarker}
            onChange={onChange}
            placeholder="e.g. EGFR+"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">Location (optional)</span>
          <input
            type="text"
            name="location"
            className="input-base"
            value={formData.location}
            onChange={onChange}
            placeholder="e.g. Mumbai"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? "Matching..." : "Find Trials"}
        </button>
        <button type="button" className="btn-secondary" onClick={onReset}>
          Reset Form
        </button>
      </div>
    </form>
  );
};

export default PatientForm;
