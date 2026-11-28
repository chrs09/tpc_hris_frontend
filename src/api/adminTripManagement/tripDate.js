import api from "../services/api";

// Change a trip's date / start time after the fact (superadmin only).
// Backend: app/api/admin/trip_date.py.

export const canChangeTripDate = async () =>
  (await api.get("/admin/trip-date/can-change")).data?.can_change === true;

export const checkTripDate = async (tripId, date, time) =>
  (await api.get(`/admin/trip-date/trips/${tripId}/check`, { params: { date, time: time || undefined } })).data;

export const changeTripDate = async (tripId, date, time, reason) =>
  (await api.put(`/admin/trip-date/trips/${tripId}`, { date, time: time || null, reason })).data;
