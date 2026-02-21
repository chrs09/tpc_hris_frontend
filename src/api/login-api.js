import axios from "axios";
import { API_URL } from "./config";

// user login
export const userLogin = async (username, password) => {
  const res = await axios.post(`${API_URL}/auth/login`, {
    username,
    password,
  });

  return res.data;
};

// user registration
export const userRegister = async (username, email, password, role) => {
  const res = await axios.post(`${API_URL}/auth/register`, {
    username,
    email,
    password,
    role,
  });

  return res.data;
};
