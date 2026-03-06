import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PATIENT_RECORDS_KEY = "curenovaPatientRecords";
const DOCTOR_PROFILES_KEY = "curenovaDoctorProfiles";

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const saveJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalize = (value) => (value || "").toString().trim().toLowerCase();

const computeDoctorPatientScore = (doctor, patientRecord) => {
  let score = 0;
  const reasons = [];

  const disease = normalize(patientRecord.disease);
  const specialization = normalize(doctor.specialization);
  const doctorCity = normalize(doctor.city);
  const patientCity = normalize(patientRecord.location);
  const doctorNotes = normalize(doctor.notes);

  if (specialization.includes(disease) || disease.includes(specialization)) {
    score += 55;
    reasons.push("Specialization aligns with patient disease");
  } else {
    reasons.push("Specialization does not directly align with disease");
  }

  if (doctorCity && patientCity && doctorCity === patientCity) {
    score += 20;
    reasons.push("Doctor and patient are in the same city");
  } else {
    reasons.push("City differs between doctor and patient");
  }

  const experience = Number(doctor.experienceYears || 0);
  if (experience >= 10) {
    score += 20;
    reasons.push("Doctor has 10+ years of experience");
  } else if (experience >= 5) {
    score += 12;
    reasons.push("Doctor has 5+ years of experience");
  } else {
    score += 6;
    reasons.push("Doctor has early-career experience");
  }

  if (patientRecord.biomarker && doctorNotes.includes(normalize(patientRecord.biomarker))) {
    score += 5;
    reasons.push("Doctor notes mention matching biomarker");
  }

  const finalScore = Math.min(score, 100);
  let status = "Low Match";
  if (finalScore >= 70) {
    status = "Strong Match";
  } else if (finalScore >= 45) {
    status = "Moderate Match";
  }

  return {
    score: finalScore,
    status,
    reasons,
  };
};

const MatchBadge = ({ status }) => {
  const classes =
    status === "Strong Match"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Moderate Match"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
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

  const [allPatientRecords, setAllPatientRecords] = useState(() => loadJson(PATIENT_RECORDS_KEY, {}));
  const [allDoctorProfiles, setAllDoctorProfiles] = useState(() => loadJson(DOCTOR_PROFILES_KEY, {}));

  const [patientRecords, setPatientRecords] = useState(() => {
    if (!patientSession?.email) return [];
    return allPatientRecords[patientSession.email] || [];
  });

  const [doctorProfile, setDoctorProfile] = useState(() => {
    if (!doctorSession?.email) return null;
    return allDoctorProfiles[doctorSession.email] || null;
  });

  const [showPatientForm, setShowPatientForm] = useState(() => {
    if (!patientSession?.email) return false;
    return (allPatientRecords[patientSession.email] || []).length === 0;
  });

  const [showDoctorForm, setShowDoctorForm] = useState(() => {
    if (!doctorSession?.email) return false;
    return !allDoctorProfiles[doctorSession.email];
  });

  const [patientFormData, setPatientFormData] = useState({
    age: "",
    disease: "",
    stage: "",
    biomarker: "",
    location: "",
  });

  const [doctorFormData, setDoctorFormData] = useState(() => ({
    phone: doctorProfile?.phone || "",
    hospital: doctorProfile?.hospital || "",
    specialization: doctorProfile?.specialization || "",
    experienceYears: doctorProfile?.experienceYears || "",
    licenseId: doctorProfile?.licenseId || "",
    city: doctorProfile?.city || "",
    consultationCharge: doctorProfile?.consultationCharge || "",
    notes: doctorProfile?.notes || "",
  }));

  const [patientSavedMessage, setPatientSavedMessage] = useState("");
  const [doctorSavedMessage, setDoctorSavedMessage] = useState("");

  const [patientMatchResult, setPatientMatchResult] = useState(null);
  const [doctorMatchResult, setDoctorMatchResult] = useState(null);

  const allAvailablePatientRecords = useMemo(() => {
    const rows = [];
    Object.entries(allPatientRecords).forEach(([email, records]) => {
      (records || []).forEach((record) => {
        rows.push({
          email,
          ...record,
        });
      });
    });
    return rows;
  }, [allPatientRecords]);

  const handlePatientChange = (event) => {
    const { name, value } = event.target;
    setPatientFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDoctorChange = (event) => {
    const { name, value } = event.target;
    setDoctorFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitPatientForm = (event) => {
    event.preventDefault();
    if (!patientSession?.email) return;

    const newRecord = {
      id: `PR-${Date.now()}`,
      fullName: patientSession.full_name,
      age: Number(patientFormData.age),
      disease: patientFormData.disease.trim(),
      stage: patientFormData.stage.trim(),
      biomarker: patientFormData.biomarker.trim(),
      location: patientFormData.location.trim(),
      createdAt: new Date().toISOString(),
    };

    const store = loadJson(PATIENT_RECORDS_KEY, {});
    const updatedForUser = [...(store[patientSession.email] || []), newRecord];
    store[patientSession.email] = updatedForUser;
    saveJson(PATIENT_RECORDS_KEY, store);
    setAllPatientRecords(store);

    setPatientRecords(updatedForUser);
    setPatientSavedMessage("Patient condition saved on dashboard.");
    setShowPatientForm(false);
    setPatientFormData({ age: "", disease: "", stage: "", biomarker: "", location: "" });
  };

  const submitDoctorForm = (event) => {
    event.preventDefault();
    if (!doctorSession?.email) return;

    const profile = {
      full_name: doctorSession.full_name,
      email: doctorSession.email,
      phone: doctorFormData.phone.trim(),
      hospital: doctorFormData.hospital.trim(),
      specialization: doctorFormData.specialization.trim(),
      experienceYears: Number(doctorFormData.experienceYears),
      licenseId: doctorFormData.licenseId.trim(),
      city: doctorFormData.city.trim(),
      consultationCharge: Number(doctorFormData.consultationCharge),
      notes: doctorFormData.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    const store = loadJson(DOCTOR_PROFILES_KEY, {});
    store[doctorSession.email] = profile;
    saveJson(DOCTOR_PROFILES_KEY, store);
    setAllDoctorProfiles(store);

    setDoctorProfile(profile);
    setDoctorSavedMessage("Doctor profile saved on dashboard.");
    setShowDoctorForm(false);
  };

  const startPatientMatching = (record) => {
    const latestDoctorProfiles = loadJson(DOCTOR_PROFILES_KEY, {});
    setAllDoctorProfiles(latestDoctorProfiles);
    const latestDoctorList = Object.values(latestDoctorProfiles);

    const ranked = latestDoctorList
      .map((doctor) => {
        const result = computeDoctorPatientScore(doctor, record);
        return {
          doctor,
          ...result,
        };
      })
      .sort((a, b) => b.score - a.score);

    setPatientMatchResult({
      record,
      ranked,
    });
  };

  const startDoctorMatching = (record) => {
    const latestDoctorProfiles = loadJson(DOCTOR_PROFILES_KEY, {});
    setAllDoctorProfiles(latestDoctorProfiles);
    const currentDoctorProfile = latestDoctorProfiles[doctorSession?.email] || doctorProfile;
    if (!currentDoctorProfile) return;

    const result = computeDoctorPatientScore(currentDoctorProfile, record);
    setDoctorMatchResult({
      record,
      ...result,
    });
  };

  if (patientSession) {
    return (
      <div className="space-y-6 pb-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-teal-500 to-cyan-500 p-7 text-white shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Patient Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, {patientSession.full_name}</h1>
          <p className="mt-2 text-sm text-white/90">Manage your saved conditions and match with available doctors.</p>
        </section>

        {patientRecords.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Saved Conditions ({patientRecords.length})</h2>
              <button type="button" className="btn-primary" onClick={() => setShowPatientForm(true)}>
                Fill Form Again (New Disease)
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {patientRecords
                .slice()
                .reverse()
                .map((record) => (
                  <article key={record.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{record.disease}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Age {record.age} | Stage {record.stage || "N/A"} | Biomarker {record.biomarker || "N/A"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Location: {record.location || "N/A"}</p>
                    <button type="button" className="btn-secondary mt-3" onClick={() => startPatientMatching(record)}>
                      Start Matching
                    </button>
                  </article>
                ))}
            </div>
          </section>
        )}

        {(showPatientForm || patientRecords.length === 0) && (
          <form onSubmit={submitPatientForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Patient Condition Form</h2>
            <p className="mt-1 text-sm text-slate-600">Fill this only for first-time condition or a new disease case.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Age *</span>
                <input className="input-base" type="number" min="0" max="130" name="age" value={patientFormData.age} onChange={handlePatientChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Disease *</span>
                <input className="input-base" name="disease" value={patientFormData.disease} onChange={handlePatientChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Stage</span>
                <input className="input-base" name="stage" value={patientFormData.stage} onChange={handlePatientChange} placeholder="e.g. III" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Biomarker</span>
                <input className="input-base" name="biomarker" value={patientFormData.biomarker} onChange={handlePatientChange} placeholder="e.g. EGFR+" />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Location</span>
                <input className="input-base" name="location" value={patientFormData.location} onChange={handlePatientChange} placeholder="e.g. Mumbai" />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" className="btn-primary">
                Save Condition
              </button>
              {patientRecords.length > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setShowPatientForm(false)}>
                  Cancel
                </button>
              )}
            </div>
            {patientSavedMessage && <p className="mt-3 text-sm text-emerald-700">{patientSavedMessage}</p>}
          </form>
        )}

        {patientMatchResult && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Matching Results for {patientMatchResult.record.disease}</h2>
            {patientMatchResult.ranked.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No doctor profiles available yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {patientMatchResult.ranked.map((item) => (
                  <article key={item.doctor.email} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">Dr. {item.doctor.full_name}</p>
                        <p className="text-sm text-slate-600">{item.doctor.specialization} | {item.doctor.city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{item.score}</p>
                        <MatchBadge status={item.status} />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Consultation Charge: INR {item.doctor.consultationCharge}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {item.reasons.map((reason, index) => (
                        <li key={`${item.doctor.email}-${index}`}>- {reason}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  if (doctorSession) {
    return (
      <div className="space-y-6 pb-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-7 text-white shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Doctor Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, Dr. {doctorSession.full_name}</h1>
          <p className="mt-2 text-sm text-white/90">Manage your profile and match with available patient cases.</p>
        </section>

        {doctorProfile && !showDoctorForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Your Profile</h2>
              <button type="button" className="btn-secondary" onClick={() => setShowDoctorForm(true)}>
                Update Profile
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-slate-700"><span className="font-semibold">Specialization:</span> {doctorProfile.specialization}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">Experience:</span> {doctorProfile.experienceYears} years</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">Hospital:</span> {doctorProfile.hospital}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">City:</span> {doctorProfile.city}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">Consultation Charge:</span> INR {doctorProfile.consultationCharge}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">License:</span> {doctorProfile.licenseId}</p>
            </div>
          </section>
        )}

        {showDoctorForm && (
          <form onSubmit={submitDoctorForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Doctor Details Form</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Full Name</span>
                <input className="input-base bg-slate-50 text-slate-600" value={doctorSession.full_name} readOnly />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Phone *</span>
                <input className="input-base" name="phone" value={doctorFormData.phone} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Hospital/Clinic *</span>
                <input className="input-base" name="hospital" value={doctorFormData.hospital} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Specialization *</span>
                <input className="input-base" name="specialization" value={doctorFormData.specialization} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Experience (Years) *</span>
                <input className="input-base" type="number" min="0" name="experienceYears" value={doctorFormData.experienceYears} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Medical License ID *</span>
                <input className="input-base" name="licenseId" value={doctorFormData.licenseId} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">City *</span>
                <input className="input-base" name="city" value={doctorFormData.city} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Consultation Charge (per visit) *</span>
                <input className="input-base" type="number" min="0" name="consultationCharge" value={doctorFormData.consultationCharge} onChange={handleDoctorChange} required />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Additional Notes</span>
                <textarea className="input-base min-h-24 resize-y" name="notes" value={doctorFormData.notes} onChange={handleDoctorChange} />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" className="btn-primary">
                Save Profile
              </button>
              {doctorProfile && (
                <button type="button" className="btn-secondary" onClick={() => setShowDoctorForm(false)}>
                  Cancel
                </button>
              )}
            </div>
            {doctorSavedMessage && <p className="mt-3 text-sm text-emerald-700">{doctorSavedMessage}</p>}
          </form>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Available Patient Cases</h2>
          {allAvailablePatientRecords.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No patient records available yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {allAvailablePatientRecords
                .slice()
                .reverse()
                .map((record) => (
                  <article key={record.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{record.fullName}</p>
                    <p className="mt-1 text-sm text-slate-600">{record.disease} | Stage {record.stage || "N/A"}</p>
                    <p className="text-sm text-slate-600">City: {record.location || "N/A"}</p>
                    <button type="button" className="btn-secondary mt-3" onClick={() => startDoctorMatching(record)} disabled={!doctorProfile}>
                      Start Matching
                    </button>
                  </article>
                ))}
            </div>
          )}
        </section>

        {doctorMatchResult && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Latest Match Result</h2>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">Patient: {doctorMatchResult.record.fullName}</p>
                  <p className="text-sm text-slate-600">Disease: {doctorMatchResult.record.disease}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{doctorMatchResult.score}</p>
                  <MatchBadge status={doctorMatchResult.status} />
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {doctorMatchResult.reasons.map((reason, index) => (
                  <li key={`doctor-match-${index}`}>- {reason}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
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
          Login to open your personalized dashboard with saved data and matching tools.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={activeRole === "patient" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveRole("patient")}>
            Patient
          </button>
          <button type="button" className={activeRole === "doctor" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveRole("doctor")}>
            Doctor
          </button>
        </div>
      </section>

      {activeRole === "patient" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          New patient? Register first. Returning patient? Login.
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=patient&mode=register")}>
              Register Patient
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=patient&mode=login")}>
              Login Patient
            </button>
          </div>
        </div>
      )}

      {activeRole === "doctor" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          New doctor? Register first. Returning doctor? Login.
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=doctor&mode=register")}>
              Register Doctor
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=doctor&mode=login")}>
              Login Doctor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
