import api from "../services/api";

// Trip Management -> Trip Charges (shortages and accidents) -- see
// app/api/admin/trip_charges.py.

export const getTripCharges = async (params = {}) => {
  const res = await api.get("/admin/trip-charges", { params });
  return res.data;
};

export const lookupTrips = async (q) => {
  const res = await api.get("/admin/trip-charges/trip-lookup", { params: { q } });
  return res.data;
};

export const getChargeEmployees = async () => {
  const res = await api.get("/admin/trip-charges/employees");
  return res.data;
};

export const createTripCharge = async (payload) => {
  const res = await api.post("/admin/trip-charges", payload);
  return res.data;
};

export const updateTripCharge = async (id, payload) => {
  const res = await api.put(`/admin/trip-charges/${id}`, payload);
  return res.data;
};

export const addTripChargeAttachment = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/admin/trip-charges/${id}/attachments`, formData);
  return res.data;
};

export const recordTripChargeNotice = async (id) => {
  const res = await api.post(`/admin/trip-charges/${id}/record-notice`);
  return res.data;
};

export const saveTripChargeExplanation = async (id, allocationId, explanation) => {
  const res = await api.post(
    `/admin/trip-charges/${id}/allocations/${allocationId}/explanation`,
    { explanation },
  );
  return res.data;
};

export const approveTripCharge = async (id) => {
  const res = await api.post(`/admin/trip-charges/${id}/approve`);
  return res.data;
};

export const reviseTripCharge = async (id, payload) => {
  const res = await api.post(`/admin/trip-charges/${id}/revise`, payload);
  return res.data;
};

export const cancelTripCharge = async (id, reason) => {
  const res = await api.post(`/admin/trip-charges/${id}/cancel`, { reason });
  return res.data;
};
