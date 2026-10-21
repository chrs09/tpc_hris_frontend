import api from "../services/api";

// Driver fuel requests (coordinator admin side). Driver sends odometer
// photo + plate number + city from the mobile app -> coordinator admin
// issues a fuel code + liters -> driver uploads the receipt ->
// coordinator admin confirms it or sends it back. See
// app/api/fuel_requests.py.

// status: a single status, "open", "needs_action", "awaiting_approval",
// "unused" (expired or cancelled codes), or omitted for all.
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

// codeExpiresAt: "YYYY-MM-DDTHH:MM" (Philippine time). Unused past it, the
// request becomes Expired and the driver can request a new code.
export const issueFuelCode = async (id, fuelCode, liters, codeExpiresAt) => {
  const res = await api.post(`/fuel-requests/${id}/issue`, {
    fuel_code: fuelCode,
    liters,
    code_expires_at: codeExpiresAt || null,
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

// Org Chart heads with "Fuel Request" ticked approve before the fuel code
// (superadmin sees every request still waiting).
export const getFuelForMyApproval = async () => {
  const res = await api.get("/fuel-requests/for-my-approval");
  return res.data;
};

export const approveFuelRequest = async (id, remarks) => {
  const res = await api.post(`/fuel-requests/${id}/approve`, { remarks });
  return res.data;
};

export const rejectFuelRequest = async (id, reason) => {
  const res = await api.post(`/fuel-requests/${id}/reject`, { reason });
  return res.data;
};
