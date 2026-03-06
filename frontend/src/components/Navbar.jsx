import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const patientSession = useMemo(() => {
    try {
      const stored = localStorage.getItem("curenovaPatientSession");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, [pathname]);
  const doctorSession = useMemo(() => {
    try {
      const stored = localStorage.getItem("curenovaDoctorSession");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("curenovaPatientSession");
    localStorage.removeItem("curenovaDoctorSession");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="rounded-lg bg-primary px-2.5 py-1 text-sm font-bold text-white">CN</span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">CureNova</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              pathname === "/" ? "bg-primary/10 text-primary" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Home
          </button>
          {(patientSession || doctorSession) && (
            <button type="button" onClick={handleLogout} className="btn-secondary px-3 py-1.5">
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
