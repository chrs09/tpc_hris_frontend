import api from "./services/api";

// Trip Management -> Correction Requests / History
// (tpc_hris_backend/app/api/admin/trip_corrections.py).

// view: "requests" (pending) | "history" (approved / rejected / cancelled)
export const getTripCorrections = async ({ view = "requests", q = "" } = {}) =>
  (await api.get("/trip-corrections", { params: { view, q: q || undefined } })).data;

export const searchCorrectableTrips = async (q) =>
  (await api.get("/trip-corrections/trip-search", { params: { q } })).data;

export const getTripForCorrection = async (tripId) =>
  (await api.get(`/trip-corrections/trip/${tripId}`)).data;

export const requestTripCorrection = async ({ tripId, reason, changes }) =>
  (await api.post("/trip-corrections", { trip_id: tripId, reason, changes })).data;

export const approveTripCorrection = async (id, note) =>
  (await api.post(`/trip-corrections/${id}/approve`, { note: note || null })).data;

export const rejectTripCorrection = async (id, note) =>
  (await api.post(`/trip-corrections/${id}/reject`, { note })).data;

export const cancelTripCorrection = async (id) =>
  (await api.post(`/trip-corrections/${id}/cancel`)).data;
