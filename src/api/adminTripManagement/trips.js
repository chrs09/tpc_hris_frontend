import api from "../services/api";

export const getAdminTripSummary = () => api.get("/admin/trips/summary");

export const getPendingTrips = () => api.get("/admin/trips/pending");

export const getActiveTrips = () => api.get("/admin/trips/active");

export const approveTrip = (tripId) =>
  api.post(`/admin/trips/${tripId}/approve`);

export const reviewTrip = (tripId) => api.get(`/admin/trips/${tripId}/review`);
