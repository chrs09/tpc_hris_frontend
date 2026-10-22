import api from "../services/api";

// Origins (hubs/yards a driver dispatches from) -- still Store rows
// under the hood (Store.is_hub = True), just with their own dedicated
// management page instead of being a buried checkbox on the Customers
// page. See app/api/admin/origins.py.
export const getOrigins = () => api.get("/admin/origins");

export const createOrigin = (payload) => api.post("/admin/origins", payload);

export const updateOrigin = (id, payload) =>
  api.patch(`/admin/origins/${id}`, payload);

// Default hub: Trip Assignment's preselected start point and the
// Customers map's starting view. null when none is set.
export const getDefaultHub = async () => (await api.get("/admin/origins/default")).data;

export const setDefaultHub = (id) => api.put(`/admin/origins/${id}/default`);

export const clearDefaultHub = () => api.delete("/admin/origins/default");
