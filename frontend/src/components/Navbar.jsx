import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { deleteNotification, deleteReadNotifications, getNotifications, markNotificationRead } from "../api";
import logo from "../assets/curenova-logo.svg";

const Navbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem("curenovaThemeMode") || "light";
    } catch (error) {
      return "light";
    }
  });

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

  const role = patientSession ? "patient" : doctorSession ? "doctor" : null;
  const email = patientSession?.email || doctorSession?.email;

  const loadNotifications = async () => {
    if (!role || !email) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    setIsLoadingNotifications(true);
    try {
      const data = await getNotifications(email, role);
      setUnreadCount(data.unread_count || 0);
      setNotifications(data.notifications || []);
    } catch (error) {
      setUnreadCount(0);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [pathname, patientSession, doctorSession]);

  useEffect(() => {
    if (!role || !email) return;
    const timer = setInterval(() => {
      loadNotifications();
    }, 8000);
    return () => clearInterval(timer);
  }, [role, email]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(themeMode === "dark" ? "theme-dark" : "theme-light");
    try {
      localStorage.setItem("curenovaThemeMode", themeMode);
    } catch (error) {
      // Ignore storage errors.
    }
  }, [themeMode]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/home" className="flex items-center gap-2">
          <img src={logo} alt="CureNova logo" className="h-10 w-10 rounded-full border border-cyan-200 bg-cyan-50 p-1" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">CureNova</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex">
            <button
              type="button"
              onClick={() => setThemeMode("light")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${themeMode === "light" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("dark")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${themeMode === "dark" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Dark
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              pathname === "/home" ? "bg-primary/10 text-primary" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🏠 Home
          </button>
          {(patientSession || doctorSession) && (
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={async () => {
                  const next = !notificationsOpen;
                  setNotificationsOpen(next);
                  if (next) {
                    await loadNotifications();
                  }
                }}
                className="relative rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                title="Notifications"
              >
                🔔 Notifications
                {unreadCount > 0 && <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-red-500 align-middle" />}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Notification Center</p>
                    <div className="flex items-center gap-2">
                      <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={loadNotifications}>
                        Refresh
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-600 hover:underline"
                        onClick={async () => {
                          if (!role || !email) return;
                          await deleteReadNotifications(email, role);
                          await loadNotifications();
                        }}
                      >
                        Delete Read
                      </button>
                    </div>
                  </div>
                  {isLoadingNotifications ? (
                    <p className="text-xs text-slate-600">Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-xs text-slate-500">No notifications yet.</p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {notifications.map((note) => (
                        <article
                          key={note.id}
                          className={`rounded-lg border p-2.5 ${
                            note.is_read ? "border-slate-200 bg-slate-50" : "border-red-200 bg-red-50"
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-900">{note.title}</p>
                          <p className="mt-1 text-xs text-slate-700">{note.message}</p>
                          {!note.is_read && (
                            <button
                              type="button"
                              className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              onClick={async () => {
                                await markNotificationRead(note.id);
                                await loadNotifications();
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                          {note.is_read && (
                            <button
                              type="button"
                              className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              onClick={async () => {
                                if (!role || !email) return;
                                await deleteNotification(note.id, email, role);
                                await loadNotifications();
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
