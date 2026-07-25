import api from "../services/api";

// =========================================================
// GET TRIPS WAITING FOR OFFICE REVIEW
// =========================================================
export const getPendingOfficeTrips = () =>
  api.get("/office/trips/pending");


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
  api.post(
    `/office/trips/${tripId}/forward-to-finance`,
    {
      remarks,
    },
  );