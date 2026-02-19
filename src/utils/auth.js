import React from "react";

export const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type"); // if you're storing expiry separately

  window.location.href = "/login"; // force redirect
};
