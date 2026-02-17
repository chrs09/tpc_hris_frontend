import { useState, useEffect } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import SessionExpiredModal from "./components/ui/SessionExpiredModal";

const App = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("access_token");
    return !!token;
  });

  const [sessionExpired, setSessionExpired] = useState(false);

  // 🔥 Listen for 401 global event
  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("tokenExpiry");

      setIsAuthenticated(false);
      setSessionExpired(true);
    };

    window.addEventListener("session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, []);

  const handleSessionConfirm = () => {
    setSessionExpired(false);
    navigate("/login");
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {/* 🔥 Global Session Expired Modal */}
      <SessionExpiredModal
        isOpen={sessionExpired}
        onConfirm={handleSessionConfirm}
      />
    </>
  );
};

export default App;
