import api from "../services/api";

// Route rides: a driver riding along on another driver's trip (Trip
// Assignment -> Is Route Ride), plus Route Ride Manual for rides done
// before this existed. See app/api/admin/route_rides.py.

// Trips in progress -- "Select driver you will ride".
export const getRouteRideHosts = async () =>
  (await api.get("/admin/route-rides/hosts")).data;

export const assignRouteRide = async ({ riderUserId, tripId, notes }) =>
  (
    await api.post("/admin/route-rides", {
      rider_user_id: riderUserId,
      trip_id: tripId,
      notes: notes || null,
    })
  ).data;

// Past rides: date, how many, and the category (or a typed amount).
export const addManualRouteRide = async (payload) =>
  (await api.post("/admin/route-rides/manual", payload)).data;

export const getRouteRides = async (params = {}) =>
  (await api.get("/admin/route-rides", { params })).data;

export const removeRouteRide = async (id) =>
  (await api.delete(`/admin/route-rides/${id}`)).data;

// Edit: manual -> driver / date / how many / category / amount / notes;
// assigned -> amount / notes only.
export const editRouteRide = async (id, payload) =>
  (await api.patch(`/admin/route-rides/${id}`, payload)).data;
