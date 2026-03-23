import api from "./services/api";
import { API_URL } from "./config";

export const applicationSubmit = async (formData) => {
  const res = await api.post(`${API_URL}/public/apply`, formData);
  return res.data;
};
