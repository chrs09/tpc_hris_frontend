import api from "../services/api";

// Driver fuel requests (coordinator admin side). Driver sends odometer
// photo + plate number + city from the mobile app -> coordinator admin
// issues a fuel code + liters -> driver uploads the receipt ->
// coordinator admin confirms it or sends it back. See
// app/api/fuel_requests.py.

// status: a single status, "open", "needs_action", or omitted for all.
export const getFuelRequests = async (status) => {
  const res = await api.get("/fuel-requests", {
    params: status ? { status } : {},
  });
  return res.data;
};

// Waiting for a fuel code or a receipt check (alert bell).
export const getFuelRequestAlerts = async () => {
  const res = await api.get("/fuel-requests/alerts");
  return res.data;
};

export const getFuelRequest = async (id) => {
  const res = await api.get(`/fuel-requests/${id}`);
  return res.data;
};

export const issueFuelCode = async (id, fuelCode, liters) => {
  const res = await api.post(`/fuel-requests/${id}/issue`, {
    fuel_code: fuelCode,
    liters,
  });
  return res.data;
};

export const declineFuelRequest = async (id, reason) => {
  const res = await api.post(`/fuel-requests/${id}/decline`, { reason });
  return res.data;
};

export const completeFuelRequest = async (id) => {
  const res = await api.post(`/fuel-requests/${id}/complete`);
  return res.data;
};

export const returnFuelReceipt = async (id, reason) => {
  const res = await api.post(`/fuel-requests/${id}/return`, { reason });
  return res.data;
};
