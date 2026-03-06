import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginDoctor, loginPatient, registerDoctor, registerPatient } from "../api";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") === "doctor" ? "doctor" : "patient");
  const [mode, setMode] = useState(searchParams.get("mode") === "register" ? "register" : "login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (mode === "login") {
      setLoginData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  };

  const buttonLabel = useMemo(() => (mode === "login" ? "Login" : "Register"), [mode]);

  const minDelay = () => new Promise((resolve) => setTimeout(resolve, 2500));
  const getApiErrorMessage = (requestError) => {
    const detail = requestError?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : "field";
          return `${field}: ${item?.msg || "Invalid value"}`;
        })
        .join(" | ");
    }
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return "Something went wrong. Please try again.";
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        const loginRequest =
          role === "patient"
            ? loginPatient({
                email: loginData.email.trim(),
                password: loginData.password,
              })
            : loginDoctor({
                email: loginData.email.trim(),
                password: loginData.password,
              });
        const [response] = await Promise.all([loginRequest, minDelay()]);
        if (role === "patient") {
          localStorage.setItem("curenovaPatientSession", JSON.stringify(response));
          localStorage.removeItem("curenovaDoctorSession");
        } else {
          localStorage.setItem("curenovaDoctorSession", JSON.stringify(response));
          localStorage.removeItem("curenovaPatientSession");
        }
        setSuccess("Login successful.");
        navigate("/");
        return;
      }

      const registerPayload = {
        full_name: registerData.fullName.trim(),
        email: registerData.email.trim(),
        password: registerData.password,
        ...(role === "patient" ? { age: Number(registerData.age) } : {}),
      };

      const registerRequest = role === "patient" ? registerPatient(registerPayload) : registerDoctor(registerPayload);
      const [response] = await Promise.all([registerRequest, minDelay()]);
      if (role === "patient") {
        localStorage.setItem("curenovaPatientSession", JSON.stringify(response));
        localStorage.removeItem("curenovaDoctorSession");
      } else {
        localStorage.setItem("curenovaDoctorSession", JSON.stringify(response));
        localStorage.removeItem("curenovaPatientSession");
      }
      setSuccess("Registration successful.");
      navigate("/");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-8">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">CureNova</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{role === "patient" ? "Patient Access" : "Doctor Access"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {role === "patient"
            ? "New patients register once. Returning patients can login."
            : "New doctors register once. Returning doctors can login."}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className={role === "patient" ? "btn-primary" : "btn-secondary"}
            onClick={() => setRole("patient")}
            disabled={isLoading}
          >
            Patient
          </button>
          <button
            type="button"
            className={role === "doctor" ? "btn-primary" : "btn-secondary"}
            onClick={() => setRole("doctor")}
            disabled={isLoading}
          >
            Doctor
          </button>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            className={mode === "login" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("login")}
            disabled={isLoading}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("register")}
            disabled={isLoading}
          >
            Register
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submitAuth}>
          {mode === "register" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Full Name *</span>
                <input type="text" name="fullName" className="input-base" value={registerData.fullName} onChange={handleChange} required />
              </label>
              {role === "patient" && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Age *</span>
                  <input type="number" min="0" max="130" name="age" className="input-base" value={registerData.age} onChange={handleChange} required />
                </label>
              )}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email *</span>
            <input
              type="email"
              name="email"
              className="input-base"
              placeholder="you@example.com"
              value={mode === "login" ? loginData.email : registerData.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Password *</span>
            <input
              type="password"
              name="password"
              className="input-base"
              placeholder="••••••••"
              value={mode === "login" ? loginData.password : registerData.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

          <button type="submit" className="btn-primary w-full disabled:opacity-60" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </span>
            ) : (
              buttonLabel
            )}
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => navigate("/")} disabled={isLoading}>
            Back to Home
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
