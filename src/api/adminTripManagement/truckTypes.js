import api from "../services/api";

// Truck Types (e.g. "6-Wheeler", "10-Wheeler Wingvan") with a
// size/capacity description -- assignable to Vehicle Units under
// Fleet Management. See app/api/admin/truck_types.py.
export const getTruckTypes = () => api.get("/admin/truck-types");

export const createTruckType = (payload) =>
  api.post("/admin/truck-types", payload);

export const updateTruckType = (id, payload) =>
  api.patch(`/admin/truck-types/${id}`, payload);

export const deleteTruckType = (id) =>
  api.delete(`/admin/truck-types/${id}`);
