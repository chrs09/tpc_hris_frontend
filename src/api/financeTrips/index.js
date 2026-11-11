// src/api/financeTripManagement/trips.js
import api from "../services/api";

export const getFinanceTrips = (status = "finance_review") =>
  api.get("/finance/trips", {
    params: { status },
  });

export const getFinanceTripDetail = (tripId) =>
  api.get(`/finance/trips/${tripId}`);

export const approveFinanceTrip = (tripId) =>
  api.post(`/finance/trips/${tripId}/approve`);

// Documents not valid: not paid until unblocked ("Blocked" on Trip Documents).
export const blockFinanceTrip = (tripId, reason) =>
  api.post(`/finance/trips/${tripId}/block`, { reason });

export const unblockFinanceTrip = (tripId) =>
  api.post(`/finance/trips/${tripId}/unblock`);

export const getFinanceTripSummary = () => api.get("/finance/trips/summary");
