import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createClinicalTrial,
  createPatientCondition,
  getDoctorMatchedPatients,
  getDoctorClinicalTrials,
  getPatientConditions,
  matchTrialsByPatientId,
} from "../api";

const StatusBadge = ({ status }) => {
  const styles =
    status === "Strong Match"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Moderate Match"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
};

const Landing = () => {
  const navigate = useNavigate();

  const patientSession = useMemo(() => {
    try {
      const stored = localStorage.getItem("curenovaPatientSession");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const doctorSession = useMemo(() => {
    try {
      const stored = localStorage.getItem("curenovaDoctorSession");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [activeRole, setActiveRole] = useState("");

  const [patientRecords, setPatientRecords] = useState([]);
  const [showPatientForm, setShowPatientForm] = useState(true);
  const [patientMessage, setPatientMessage] = useState("");
  const [patientError, setPatientError] = useState("");
  const [matchingPatientId, setMatchingPatientId] = useState("");

  const [recommendedTrials, setRecommendedTrials] = useState([]);
  const [expandedTrialId, setExpandedTrialId] = useState("");
  const [appliedTrials, setAppliedTrials] = useState({});

  const [trialFilters, setTrialFilters] = useState({
    city: "",
    disease: "",
    trial_phase: "",
    minimum_score: 0,
  });

  const [patientFormData, setPatientFormData] = useState({
    age: "",
    gender: "",
    disease: "",
    disease_stage: "",
    biomarker: "",
    city: "",
    diabetes: false,
    hypertension: false,
    heart_disease: false,
    kidney_disease: false,
    current_medications: "",
    smoking_status: "",
    pregnancy_status: "",
    lab_results: "",
  });

  const [doctorTrials, setDoctorTrials] = useState([]);
  const [doctorMatchedPatients, setDoctorMatchedPatients] = useState([]);
  const [doctorMessage, setDoctorMessage] = useState("");
  const [doctorError, setDoctorError] = useState("");

  const [trialFormData, setTrialFormData] = useState({
    trial_id: "",
    title: "",
    disease: "",
    phase: "",
    description: "",
    min_age: "",
    max_age: "",
    disease_required: "",
    disease_stage: "",
    biomarker_required: "",
    exclusion_diabetes: false,
    exclusion_heart_disease: false,
    exclusion_pregnancy: false,
    hospital: "",
    city: "",
    country: "India",
    start_date: "",
    end_date: "",
    max_participants: "",
    criteria_text: "",
  });

  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isMatchingTrials, setIsMatchingTrials] = useState(false);
  const [isSavingTrial, setIsSavingTrial] = useState(false);
  const [isLoadingDoctorMatches, setIsLoadingDoctorMatches] = useState(false);

  const loadPatientRecords = async () => {
    if (!patientSession?.email) return;
    setIsLoadingRecords(true);
    setPatientError("");
    try {
      const data = await getPatientConditions(patientSession.email);
      setPatientRecords(data || []);
      setShowPatientForm((data || []).length === 0);
    } catch (error) {
      setPatientError("Unable to load patient records.");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const loadDoctorTrials = async () => {
    if (!doctorSession?.email) return;
    setDoctorError("");
    try {
      const data = await getDoctorClinicalTrials(doctorSession.email);
      setDoctorTrials(data || []);
    } catch (error) {
      setDoctorError("Unable to load clinical trials.");
    }
  };

  const loadDoctorMatchedPatients = async () => {
    if (!doctorSession?.email) return;
    setIsLoadingDoctorMatches(true);
    try {
      const data = await getDoctorMatchedPatients(doctorSession.email, 50);
      setDoctorMatchedPatients(data.matches || []);
    } catch (error) {
      setDoctorError("Unable to load matched patients.");
      setDoctorMatchedPatients([]);
    } finally {
      setIsLoadingDoctorMatches(false);
    }
  };

  useEffect(() => {
    if (patientSession?.email) {
      loadPatientRecords();
    }
  }, [patientSession?.email]);

  useEffect(() => {
    if (doctorSession?.email) {
      loadDoctorTrials();
      loadDoctorMatchedPatients();
    }
  }, [doctorSession?.email]);

  const handlePatientChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPatientFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTrialFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTrialFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submitPatientForm = async (event) => {
    event.preventDefault();
    if (!patientSession?.email) return;

    setPatientError("");
    setPatientMessage("");

    try {
      await createPatientCondition({
        patient_email: patientSession.email,
        age: Number(patientFormData.age),
        gender: patientFormData.gender,
        disease: patientFormData.disease,
        disease_stage: patientFormData.disease_stage || null,
        biomarker: patientFormData.biomarker || null,
        city: patientFormData.city || null,
        diabetes: patientFormData.diabetes,
        hypertension: patientFormData.hypertension,
        heart_disease: patientFormData.heart_disease,
        kidney_disease: patientFormData.kidney_disease,
        current_medications: patientFormData.current_medications || null,
        smoking_status: patientFormData.smoking_status || null,
        pregnancy_status: patientFormData.pregnancy_status || null,
        lab_results: patientFormData.lab_results || null,
      });

      setPatientMessage("Patient medical record saved successfully.");
      setShowPatientForm(false);
      setPatientFormData({
        age: "",
        gender: "",
        disease: "",
        disease_stage: "",
        biomarker: "",
        city: "",
        diabetes: false,
        hypertension: false,
        heart_disease: false,
        kidney_disease: false,
        current_medications: "",
        smoking_status: "",
        pregnancy_status: "",
        lab_results: "",
      });
      await loadPatientRecords();
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to save patient record.");
    }
  };

  const submitTrialForm = async (event) => {
    event.preventDefault();
    if (!doctorSession?.email) return;

    setDoctorError("");
    setDoctorMessage("");
    setIsSavingTrial(true);

    try {
      const exclusionConditions = [
        trialFormData.exclusion_diabetes ? "diabetes" : "",
        trialFormData.exclusion_heart_disease ? "heart_disease" : "",
        trialFormData.exclusion_pregnancy ? "pregnancy" : "",
      ]
        .filter(Boolean)
        .join(",");

      await createClinicalTrial({
        doctor_email: doctorSession.email,
        trial_id: trialFormData.trial_id,
        title: trialFormData.trial_title || trialFormData.title,
        disease: trialFormData.disease_required || trialFormData.disease,
        phase: trialFormData.trial_phase || trialFormData.phase,
        min_age: trialFormData.min_age ? Number(trialFormData.min_age) : null,
        max_age: trialFormData.max_age ? Number(trialFormData.max_age) : null,
        stage: trialFormData.disease_stage || null,
        biomarker: trialFormData.biomarker_required || null,
        exclusion_conditions: exclusionConditions || null,
        criteria_text: trialFormData.criteria_text || null,
        city: trialFormData.city || null,
        hospital: trialFormData.hospital || null,
        country: trialFormData.country || null,
        start_date: trialFormData.start_date || null,
        end_date: trialFormData.end_date || null,
        max_participants: trialFormData.max_participants ? Number(trialFormData.max_participants) : null,
      });

      setDoctorMessage("Clinical trial registered successfully.");
      setTrialFormData({
        trial_id: "",
        title: "",
        disease: "",
        phase: "",
        description: "",
        min_age: "",
        max_age: "",
        disease_required: "",
        disease_stage: "",
        biomarker_required: "",
        exclusion_diabetes: false,
        exclusion_heart_disease: false,
        exclusion_pregnancy: false,
        hospital: "",
        city: "",
        country: "India",
        start_date: "",
        end_date: "",
        max_participants: "",
        criteria_text: "",
      });
      await loadDoctorTrials();
      await loadDoctorMatchedPatients();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to register clinical trial.");
    } finally {
      setIsSavingTrial(false);
    }
  };

  const startTrialMatching = async (patientId) => {
    setMatchingPatientId(patientId);
    setIsMatchingTrials(true);
    setPatientError("");

    try {
      const data = await matchTrialsByPatientId({
        patient_id: patientId,
        city: trialFilters.city || null,
        disease: trialFilters.disease || null,
        trial_phase: trialFilters.trial_phase || null,
        minimum_score: Number(trialFilters.minimum_score || 0),
      });
      setRecommendedTrials(data.recommendations || []);
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to match clinical trials.");
      setRecommendedTrials([]);
    } finally {
      setIsMatchingTrials(false);
    }
  };

  const applyForTrial = (trialId) => {
    setAppliedTrials((prev) => ({ ...prev, [trialId]: true }));
  };

  if (patientSession) {
    return (
      <div className="space-y-6 pb-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-teal-500 to-cyan-500 p-7 text-white shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Patient Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, {patientSession.full_name}</h1>
          <p className="mt-2 text-sm text-white/90">Track your anonymized medical records and get matched to clinical trials.</p>
        </section>

        {patientRecords.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Patient Medical Records ({patientRecords.length})</h2>
              <button type="button" className="btn-primary" onClick={() => setShowPatientForm(true)}>
                Fill Form Again
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {patientRecords.map((record) => (
                <article key={record.patient_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{record.patient_id}</p>
                  <p className="mt-1 text-xs text-slate-600">{record.disease} | Stage: {record.disease_stage || "N/A"}</p>
                  <p className="mt-1 text-xs text-slate-600">Age: {record.age} | Gender: {record.gender} | City: {record.city || "N/A"}</p>
                  <button type="button" className="btn-secondary mt-3" onClick={() => startTrialMatching(record.patient_id)}>
                    Start Matching
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {(showPatientForm || patientRecords.length === 0) && (
          <form onSubmit={submitPatientForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Anonymized Patient Condition Form</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Age *</span><input className="input-base" type="number" min="0" max="130" name="age" value={patientFormData.age} onChange={handlePatientChange} required /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Gender *</span><input className="input-base" name="gender" value={patientFormData.gender} onChange={handlePatientChange} required /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Disease *</span><input className="input-base" name="disease" value={patientFormData.disease} onChange={handlePatientChange} required /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Disease Stage</span><input className="input-base" name="disease_stage" value={patientFormData.disease_stage} onChange={handlePatientChange} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Biomarker</span><input className="input-base" name="biomarker" value={patientFormData.biomarker} onChange={handlePatientChange} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">City</span><input className="input-base" name="city" value={patientFormData.city} onChange={handlePatientChange} /></label>

              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="diabetes" checked={patientFormData.diabetes} onChange={handlePatientChange} /><span>Diabetes</span></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="hypertension" checked={patientFormData.hypertension} onChange={handlePatientChange} /><span>Hypertension</span></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="heart_disease" checked={patientFormData.heart_disease} onChange={handlePatientChange} /><span>Heart Disease</span></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="kidney_disease" checked={patientFormData.kidney_disease} onChange={handlePatientChange} /><span>Kidney Disease</span></label>

              <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Current Medications</span><input className="input-base" name="current_medications" value={patientFormData.current_medications} onChange={handlePatientChange} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Smoking Status</span><input className="input-base" name="smoking_status" value={patientFormData.smoking_status} onChange={handlePatientChange} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Pregnancy Status</span><input className="input-base" name="pregnancy_status" value={patientFormData.pregnancy_status} onChange={handlePatientChange} /></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Lab Results</span><textarea className="input-base min-h-24 resize-y" name="lab_results" value={patientFormData.lab_results} onChange={handlePatientChange} /></label>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="submit" className="btn-primary">Save Medical Record</button>
              {patientRecords.length > 0 && <button type="button" className="btn-secondary" onClick={() => setShowPatientForm(false)}>Cancel</button>}
            </div>
          </form>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Recommended Clinical Trials</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input className="input-base" placeholder="Filter by city" value={trialFilters.city} onChange={(e) => setTrialFilters((p) => ({ ...p, city: e.target.value }))} />
            <input className="input-base" placeholder="Filter by disease" value={trialFilters.disease} onChange={(e) => setTrialFilters((p) => ({ ...p, disease: e.target.value }))} />
            <input className="input-base" placeholder="Filter by trial phase" value={trialFilters.trial_phase} onChange={(e) => setTrialFilters((p) => ({ ...p, trial_phase: e.target.value }))} />
            <input className="input-base" type="number" min="0" max="100" placeholder="Min score" value={trialFilters.minimum_score} onChange={(e) => setTrialFilters((p) => ({ ...p, minimum_score: e.target.value }))} />
          </div>

          {isMatchingTrials && <p className="mt-3 text-sm text-slate-600">Matching clinical trials...</p>}
          {patientError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{patientError}</p>}
          {patientMessage && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{patientMessage}</p>}

          {recommendedTrials.length === 0 && !isMatchingTrials ? (
            <p className="mt-3 text-sm text-slate-500">Select a patient record and click Start Matching to view recommendations.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {recommendedTrials.map((trial) => (
                <article key={trial.trial_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{trial.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{trial.hospital || "N/A"} | {trial.city || "N/A"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">{trial.score}</p>
                    <StatusBadge status={trial.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setExpandedTrialId((prev) => (prev === trial.trial_id ? "" : trial.trial_id))}>
                      View Explanation
                    </button>
                    <button type="button" className="btn-primary" onClick={() => applyForTrial(trial.trial_id)}>
                      {appliedTrials[trial.trial_id] ? "Applied" : "Apply for Trial"}
                    </button>
                  </div>
                  {expandedTrialId === trial.trial_id && (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {trial.explanation.map((line, index) => (
                        <li key={`${trial.trial_id}-${index}`}>- {line}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (doctorSession) {
    return (
      <div className="space-y-6 pb-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-7 text-white shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Doctor Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, Dr. {doctorSession.full_name}</h1>
          <p className="mt-2 text-sm text-white/90">Register clinical trials and manage your trial postings.</p>
        </section>

        <form onSubmit={submitTrialForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Clinical Trial Registration</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Trial ID *</span><input className="input-base" name="trial_id" value={trialFormData.trial_id} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Trial Title *</span><input className="input-base" name="trial_title" value={trialFormData.trial_title || trialFormData.title} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Disease *</span><input className="input-base" name="disease_required" value={trialFormData.disease_required} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Trial Phase *</span><input className="input-base" name="trial_phase" value={trialFormData.trial_phase || trialFormData.phase} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Min Age</span><input className="input-base" type="number" name="min_age" value={trialFormData.min_age} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Max Age</span><input className="input-base" type="number" name="max_age" value={trialFormData.max_age} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Disease Stage</span><input className="input-base" name="disease_stage" value={trialFormData.disease_stage} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Biomarker Required</span><input className="input-base" name="biomarker_required" value={trialFormData.biomarker_required} onChange={handleTrialFormChange} /></label>

            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="exclusion_diabetes" checked={trialFormData.exclusion_diabetes} onChange={handleTrialFormChange} /><span>Exclude Diabetes</span></label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="exclusion_heart_disease" checked={trialFormData.exclusion_heart_disease} onChange={handleTrialFormChange} /><span>Exclude Heart Disease</span></label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="exclusion_pregnancy" checked={trialFormData.exclusion_pregnancy} onChange={handleTrialFormChange} /><span>Exclude Pregnancy</span></label>

            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Hospital *</span><input className="input-base" name="hospital" value={trialFormData.hospital} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">City *</span><input className="input-base" name="city" value={trialFormData.city} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Country *</span><input className="input-base" name="country" value={trialFormData.country} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Start Date</span><input className="input-base" type="date" name="start_date" value={trialFormData.start_date} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">End Date</span><input className="input-base" type="date" name="end_date" value={trialFormData.end_date} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Max Participants</span><input className="input-base" type="number" name="max_participants" value={trialFormData.max_participants} onChange={handleTrialFormChange} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Criteria Text (semi-structured)</span><textarea className="input-base min-h-24 resize-y" name="criteria_text" value={trialFormData.criteria_text} onChange={handleTrialFormChange} /></label>
          </div>

          <div className="mt-5">
            <button type="submit" className="btn-primary" disabled={isSavingTrial}>{isSavingTrial ? "Saving..." : "Register Clinical Trial"}</button>
          </div>
          {doctorError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{doctorError}</p>}
          {doctorMessage && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{doctorMessage}</p>}
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Your Registered Clinical Trials</h2>
          {doctorTrials.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No clinical trials registered yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorTrials.map((trial) => (
                <article key={trial.trial_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{trial.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{trial.trial_id} | {trial.phase}</p>
                  <p className="text-sm text-slate-600">{trial.hospital} | {trial.city}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Top Matching Patients</h2>
          {isLoadingDoctorMatches ? (
            <p className="mt-3 text-sm text-slate-600">Loading matched patients...</p>
          ) : doctorMatchedPatients.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No patient matches above threshold yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorMatchedPatients.map((item) => (
                <article key={`${item.patient_id}-${item.trial_id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.patient_id}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Disease: {item.disease} | City: {item.city || "N/A"}</p>
                  <p className="text-sm text-slate-600">Best Trial: {item.trial_title}</p>
                  <p className="mt-2 text-lg font-bold text-primary">{item.score}%</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {item.explanation.slice(0, 3).map((line, index) => (
                      <li key={`${item.patient_id}-${index}`}>- {line}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft sm:p-10">
        <p className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          CureNova Dashboard
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Select User Type</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Login to open your personalized dashboard with patient records and clinical trial workflows.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={activeRole === "patient" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveRole("patient")}>Patient</button>
          <button type="button" className={activeRole === "doctor" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveRole("doctor")}>Doctor</button>
        </div>
      </section>

      {activeRole === "patient" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          New patient? Register first. Returning patient? Login.
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=patient&mode=register")}>Register Patient</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=patient&mode=login")}>Login Patient</button>
          </div>
        </div>
      )}

      {activeRole === "doctor" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          New doctor? Register first. Returning doctor? Login.
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=doctor&mode=register")}>Register Doctor</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=doctor&mode=login")}>Login Doctor</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
