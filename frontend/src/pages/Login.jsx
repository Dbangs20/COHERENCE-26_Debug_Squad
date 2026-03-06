import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const continueToApp = (event) => {
    event.preventDefault();
    navigate("/");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">CureNova</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Clinical Trial Matching</h1>
        <p className="mt-2 text-sm text-slate-600">Demo login for hackathon evaluation.</p>

        <form className="mt-6 space-y-4" onSubmit={continueToApp}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              className="input-base"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Password</span>
            <input
              type="password"
              name="password"
              className="input-base"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" className="btn-primary w-full">
            Login
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => navigate("/")}>
            Continue as Demo
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
