import api from "../services/api";

export const getUnknownStops = () => api.get("/admin/stores/unknown-stops");

export const approveStoreFromStop = (stopId, data) =>
  api.post(`/admin/stores/approve-from-stop/${stopId}`, data);

export const getStores = () => api.get("/admin/stores");

export const createStore = (payload) => api.post("/admin/stores", payload);

export const updateStore = (id, payload) =>
  api.patch(`/admin/stores/${id}`, payload);

export const uploadStorePhoto = (id, file) => {
  const formData = new FormData();
  formData.append("photo", file);
  return api.post(`/admin/stores/${id}/photo`, formData);
};

export const removeStorePhoto = (id) => api.delete(`/admin/stores/${id}/photo`);

export const getTripRateProfilesAdmin = () =>
  api.get("/admin/stores/trip-rate-profiles");
