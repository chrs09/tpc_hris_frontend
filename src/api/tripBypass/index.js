import api from "../services/api";

// "Trip Bypass" -- superadmin (or a specifically granted employee, see
// Module Assignment's trip_management.trip_bypass_actions) acting as a
// driver to perform whatever step a stuck trip is missing. Distinct from
// Trip Assignment (dispatch, src/api/tripManagement) -- this operates on
// a trip already in progress.

export const getBypassableTrips = async () => {
  const res = await api.get("/admin/trips/bypass/drivers");
  return res.data;
};

export const getBypassTripDetail = async (tripId) => {
  const res = await api.get(`/admin/trips/bypass/${tripId}`);
  return res.data;
};

export const bypassCheckout = async (tripId, formData) => {
  const res = await api.post(`/admin/trips/bypass/${tripId}/checkout`, formData);
  return res.data;
};

export const bypassCheckIn = async (tripId, formData) => {
  const res = await api.post(`/admin/trips/bypass/${tripId}/check-in`, formData);
  return res.data;
};

export const bypassStartUnloading = async (tripId, stopId, formData) => {
  const res = await api.post(
    `/admin/trips/bypass/${tripId}/stops/${stopId}/start-unloading`,
    formData,
  );
  return res.data;
};

export const bypassCheckOut = async (tripId, stopId, formData) => {
  const res = await api.post(
    `/admin/trips/bypass/${tripId}/stops/${stopId}/check-out`,
    formData,
  );
  return res.data;
};

export const bypassCheckin = async (tripId, formData) => {
  const res = await api.post(`/admin/trips/bypass/${tripId}/checkin`, formData);
  return res.data;
};
