import api from "../services/api";

export const getAdminTripSummary = () => api.get("/admin/trips/summary");

export const getPendingTrips = () => api.get("/admin/trips/pending");

export const getActiveTrips = () => api.get("/admin/trips/active");

// CHANGED: now accepts remarks and sends it as the JSON body,
// matching the backend's approve_trip(remarks: str = Body(..., embed=True)).
export const approveTrip = (tripId, remarks) =>
  api.post(`/admin/trips/${tripId}/approve`, { remarks });

export const reviewTrip = (tripId) => api.get(`/admin/trips/${tripId}/review`);

export const getCompletedTrips = () => api.get("/admin/trips/completed");

// Soft delete: hides a completed trip from the list above without
// deleting the row or its related stops/GPS logs/files. See
// app/models/trips.py Trip.is_archived and archive_trip() in
// app/api/admin/trips.py.
export const archiveTrip = (tripId) =>
  api.post(`/admin/trips/${tripId}/archive`);

// Drivers with no trip currently in progress -- for the trip manager's
// "Start Trip for Driver" bypass (see POST /driver/trips/start driver_id).
export const getAvailableDrivers = () => api.get("/admin/trips/available-drivers");

// Pending "trip started outside any hub's GPS range" alerts -- powers
// the notification bell for coordinator_admin/superadmin (see
// HubAlertsBell.jsx) and could also back a page-level warning list.
export const getHubAlerts = () => api.get("/admin/trips/hub-alerts");

export const acknowledgeHubAlert = (notificationId) =>
  api.post(`/admin/trips/hub-alerts/${notificationId}/acknowledge`);
