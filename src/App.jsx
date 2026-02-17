import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import { Route, Routes, Navigate } from "react-router-dom";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("access_token");
    return !!token;
  });




  return (
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
          isAuthenticated ? (
            <Dashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default App;