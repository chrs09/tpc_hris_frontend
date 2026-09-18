import api from "../services/api";

// =========================================================
// GET TRIPS WAITING FOR OFFICE REVIEW
// =========================================================
export const getPendingOfficeTrips = () => api.get("/office/trips/pending");

// =========================================================
// GET COMPLETE TRIP DETAILS FOR OFFICE REVIEW
// =========================================================
export const reviewOfficeTrip = (tripId) =>
  api.get(`/office/trips/${tripId}/review`);

// =========================================================
// OFFICE PERSONNEL -> FORWARD TO FINANCE
//
// Backend expects:
// {
//   "remarks": "Office remarks here"
// }
// =========================================================
export const forwardTripToFinance = (tripId, remarks) =>
  api.post(`/office/trips/${tripId}/forward-to-finance`, {
    remarks,
  });

// =========================================================
// ARCHIVE (soft delete) -- removes a trip from the pending office
// review queue without deleting it, for cleaning up test/junk trips.
// =========================================================
export const archiveOfficeTrip = (tripId) =>
  api.post(`/office/trips/${tripId}/archive`);

// =========================================================
// RETURN TO TRIP APPROVAL -- office found a problem and sends the
// trip back to the coordinator's Trip Approval queue with a reason,
// instead of forwarding it to Finance.
// =========================================================
export const returnTripToApproval = (tripId, remarks) =>
  api.post(`/office/trips/${tripId}/return-to-approval`, {
    remarks,
  });
