import api from "../services/api";

// Change a trip's category after the fact (Edit Store / trip details /
// Correction page). Superadmin and Finance (finance.finance_trips) only.

export const canChangeTripCategory = async () =>
  (await api.get("/admin/trip-category/can-change")).data?.can_change === true;

export const previewStoreTrips = async (storeId, profileId) =>
  (await api.get(`/admin/trip-category/stores/${storeId}/trips`, { params: { profile_id: profileId } })).data;

export const moveStoreTrips = async (storeId, profileId, tripIds, reason) =>
  (
    await api.post(`/admin/trip-category/stores/${storeId}/trips`, {
      profile_id: profileId,
      trip_ids: tripIds,
      reason: reason || null,
    })
  ).data;

export const checkTripCategory = async (tripId, profileId) =>
  (await api.get(`/admin/trip-category/trips/${tripId}/check`, { params: { profile_id: profileId } })).data;

export const changeTripCategory = async (tripId, profileId, reason) =>
  (await api.put(`/admin/trip-category/trips/${tripId}`, { profile_id: profileId, reason: reason || null })).data;

export const searchTripsForCategory = async (q) =>
  (await api.get("/admin/trip-category/search", { params: { q } })).data;
