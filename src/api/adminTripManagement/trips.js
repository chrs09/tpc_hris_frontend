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

// Drivers with no trip currently in progress -- for the trip manager's
// "Start Trip for Driver" bypass (see POST /driver/trips/start driver_id).
export const getAvailableDrivers = () => api.get("/admin/trips/available-drivers");
