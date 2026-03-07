import api from "../services/api";

export const getUnknownStops = () => api.get("/admin/stores/unknown-stops");

export const approveStoreFromStop = (stopId, data) =>
  api.post(`/admin/stores/approve-from-stop/${stopId}`, data);
