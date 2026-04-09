import { useState, useEffect } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import SessionExpiredModal from "./components/ui/SessionExpiredModal";
import ChangePassword from "./pages/ChangePassword";
import ApplicationForm from "./pages/Public/ApplicationForm";
import OnBoardingForm from "./pages/Public/OnBoardingForm";

const App = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("access_token");
    return !!token;
  });

  const [sessionExpired, setSessionExpired] = useState(false);
  const mustChangePassword =
    localStorage.getItem("must_change_password") === "true";

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
        <Route path="/tytan-application-form" element={<ApplicationForm />} />
        <Route
          path="/tytan-onboarding-form/:token"
          element={<OnBoardingForm />}
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} />
            )
          }
        />

        <Route
          path="/change-password"
          element={
            isAuthenticated ? (
              <ChangePassword />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? (
              mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : (
                <Dashboard />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      <SessionExpiredModal
        isOpen={sessionExpired}
        onConfirm={handleSessionConfirm}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            background: "#111",
            color: "#fff",
            fontSize: "14px",
          },
          success: {
            duration: 2500,
          },
          error: {
            duration: 3500,
          },
        }}
      />
    </>
  );
};

export default App;
