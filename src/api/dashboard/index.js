import api from "../services/api";
import { getAuthHeader } from "../config";

export const getDashboardSummary = async () => {
  const res = await api.get("/dashboard/summary", {
    headers: getAuthHeader(),
  });

  return res.data;
};
