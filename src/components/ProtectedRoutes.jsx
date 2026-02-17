// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // If token is invalid, treat as expired
  }
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("acces_token");

  // No token → redirect
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Expired token → remove and redirect
  if (isTokenExpired(token)) {
    localStorage.removeItem("access_token");
    return null;
  }

  return children;
};

export default ProtectedRoute;