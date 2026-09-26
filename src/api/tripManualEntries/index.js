import api from "../services/api";

// "Trip Manual Entries" (superadmin + coordinator_admin) -- records a
// whole past trip that never went through the driver's phone. A
// coordinator_admin's entry waits for superadmin approval. See
// app/api/admin/trip_manual_entries.py.

// Every driver, vehicle and helper (including ones busy on a trip now).
export const getManualEntryOptions = async () => {
  const res = await api.get("/admin/trip-manual-entries/options");
  return res.data;
};

export const getManualEntries = async () => {
  const res = await api.get("/admin/trip-manual-entries");
  return res.data;
};

// Everything entered for one manual entry (View window).
export const getManualEntry = async (tripId) => {
  const res = await api.get(`/admin/trip-manual-entries/${tripId}`);
  return res.data;
};

// Superadmin only: entries waiting for approval (alert bell).
export const getWaitingManualEntries = async () => {
  const res = await api.get("/admin/trip-manual-entries/waiting");
  return res.data;
};

// Superadmin only.
export const approveManualEntry = async (tripId, remarks) => {
  const res = await api.post(`/admin/trip-manual-entries/${tripId}/approve`, {
    remarks: remarks || null,
  });
  return res.data;
};

export const rejectManualEntry = async (tripId, reason) => {
  const res = await api.post(`/admin/trip-manual-entries/${tripId}/reject`, {
    reason,
  });
  return res.data;
};

export const createManualEntry = async (formData) => {
  const res = await api.post("/admin/trip-manual-entries", formData);
  return res.data;
};
