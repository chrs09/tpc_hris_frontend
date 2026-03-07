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
