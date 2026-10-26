import api from "./services/api";
import { API_URL } from "./config";

// user login
export const userLogin = async (username, password) => {
  const res = await api.post(`${API_URL}/auth/login`, {
    username,
    password,
  });

  return res.data;
};

// user registration
export const userRegister = async (username, email, password, role) => {
  const res = await api.post(`${API_URL}/auth/register`, {
    username,
    email,
    password,
    role,
  });

  return res.data;
};

// Change password
export const changePassword = async (newPassword) => {
  const res = await api.post(`${API_URL}/auth/change-password`, {
    new_password: newPassword,
  });

  return res.data;
};

// Forgot password: username or email -> a reset link is emailed (always the
// same reply, so it doesn't reveal which accounts exist).
export const requestPasswordReset = async (identifier) => {
  const res = await api.post(`${API_URL}/auth/forgot-password`, { identifier });
  return res.data;
};

// Is the emailed reset link still good? -> { valid, username }
export const checkPasswordResetLink = async (token) => {
  const res = await api.get(`${API_URL}/auth/reset-password/check`, {
    params: { token },
  });
  return res.data;
};

export const resetPasswordWithLink = async (token, newPassword) => {
  const res = await api.post(`${API_URL}/auth/reset-password`, {
    token,
    new_password: newPassword,
  });
  return res.data;
};
