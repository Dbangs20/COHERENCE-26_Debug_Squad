import { useState } from "react";

const Landing = () => {
  const [activeRole, setActiveRole] = useState("");
  const [patientSaved, setPatientSaved] = useState(false);
  const [doctorSaved, setDoctorSaved] = useState(false);
  const [patientData, setPatientData] = useState({
    fullName: "",
    age: "",
    disease: "",
    stage: "",
    biomarker: "",
    location: "",
  });
  const [doctorData, setDoctorData] = useState({
    fullName: "",
    email: "",
    phone: "",
    hospital: "",
    specialization: "",
    experienceYears: "",
    licenseId: "",
    city: "",
    notes: "",
  });

  const handlePatientChange = (event) => {
    const { name, value } = event.target;
    setPatientData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDoctorChange = (event) => {
    const { name, value } = event.target;
    setDoctorData((prev) => ({ ...prev, [name]: value }));
  };

  const submitPatientForm = (event) => {
    event.preventDefault();
    setPatientSaved(true);
  };

  const submitDoctorForm = (event) => {
    event.preventDefault();
    setDoctorSaved(true);
  };

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft sm:p-10">
        <p className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          CureNova Phase 1
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Select User Type
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Choose patient or doctor to open the relevant intake form.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={activeRole === "patient" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveRole("patient")}
          >
            Patient
          </button>
          <button
            type="button"
            className={activeRole === "doctor" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveRole("doctor")}
          >
            Doctor
          </button>
        </div>
      </section>

      {activeRole === "patient" && (
        <form onSubmit={submitPatientForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Patient Details</h2>
          <p className="mt-1 text-sm text-slate-600">Use anonymized details only.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Patient Name/ID *</span>
              <input className="input-base" name="fullName" value={patientData.fullName} onChange={handlePatientChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Age *</span>
              <input className="input-base" type="number" min="0" max="130" name="age" value={patientData.age} onChange={handlePatientChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Disease *</span>
              <input className="input-base" name="disease" value={patientData.disease} onChange={handlePatientChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Stage</span>
              <input className="input-base" name="stage" value={patientData.stage} onChange={handlePatientChange} placeholder="e.g. III" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Biomarker</span>
              <input className="input-base" name="biomarker" value={patientData.biomarker} onChange={handlePatientChange} placeholder="e.g. EGFR+" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Location</span>
              <input className="input-base" name="location" value={patientData.location} onChange={handlePatientChange} placeholder="e.g. Mumbai" />
            </label>
          </div>

          <div className="mt-5">
            <button type="submit" className="btn-primary">
              Save Patient Details
            </button>
          </div>
          {patientSaved && <p className="mt-3 text-sm text-emerald-700">Patient details saved for this demo phase.</p>}
        </form>
      )}

      {activeRole === "doctor" && (
        <form onSubmit={submitDoctorForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Doctor Details</h2>
          <p className="mt-1 text-sm text-slate-600">Complete profile fields for onboarding.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Full Name *</span>
              <input className="input-base" name="fullName" value={doctorData.fullName} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Email *</span>
              <input className="input-base" type="email" name="email" value={doctorData.email} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Phone *</span>
              <input className="input-base" name="phone" value={doctorData.phone} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Hospital/Clinic *</span>
              <input className="input-base" name="hospital" value={doctorData.hospital} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Specialization *</span>
              <input className="input-base" name="specialization" value={doctorData.specialization} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Experience (Years) *</span>
              <input className="input-base" type="number" min="0" name="experienceYears" value={doctorData.experienceYears} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Medical License ID *</span>
              <input className="input-base" name="licenseId" value={doctorData.licenseId} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">City *</span>
              <input className="input-base" name="city" value={doctorData.city} onChange={handleDoctorChange} required />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Additional Notes</span>
              <textarea
                className="input-base min-h-24 resize-y"
                name="notes"
                value={doctorData.notes}
                onChange={handleDoctorChange}
                placeholder="Optional details about practice and patient focus."
              />
            </label>
          </div>

          <div className="mt-5">
            <button type="submit" className="btn-primary">
              Save Doctor Details
            </button>
          </div>
          {doctorSaved && <p className="mt-3 text-sm text-emerald-700">Doctor details saved for this demo phase.</p>}
        </form>
      )}
    </div>
  );
};

export default Landing;
