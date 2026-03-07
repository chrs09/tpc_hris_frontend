import React from "react";

export const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type"); // if you're storing expiry separately
  localStorage.removeItem("role");
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  localStorage.removeItem("must_change_password");

  window.location.href = "/login"; // force redirect
};
