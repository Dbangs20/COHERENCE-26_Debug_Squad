import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import MatchTrials from "./pages/MatchTrials";

const App = () => {
  const { pathname } = useLocation();
  const isLoginPage = pathname === "/login";

  return (
    <div className="min-h-screen">
      {!isLoginPage && <Navbar />}
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/match" element={<MatchTrials />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      {!isLoginPage && <Footer />}
    </div>
  );
};

export default App;
