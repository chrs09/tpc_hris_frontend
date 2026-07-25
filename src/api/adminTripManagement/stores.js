import api from "../services/api";

export const getUnknownStops = () => api.get("/admin/stores/unknown-stops");

export const approveStoreFromStop = (stopId, data) =>
  api.post(`/admin/stores/approve-from-stop/${stopId}`, data);

export const getStores = () => api.get("/admin/stores");

export const createStore = (payload) => api.post("/admin/stores", payload);

export const updateStore = (id, payload) => api.patch(`/admin/stores/${id}`, payload);

export const getTripRateProfilesAdmin = () => api.get("/admin/stores/trip-rate-profiles");
