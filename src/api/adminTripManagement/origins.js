import api from "../services/api";

// Origins (hubs/yards a driver dispatches from) -- still Store rows
// under the hood (Store.is_hub = True), just with their own dedicated
// management page instead of being a buried checkbox on the Customers
// page. See app/api/admin/origins.py.
export const getOrigins = () => api.get("/admin/origins");

export const createOrigin = (payload) => api.post("/admin/origins", payload);

export const updateOrigin = (id, payload) =>
  api.patch(`/admin/origins/${id}`, payload);
