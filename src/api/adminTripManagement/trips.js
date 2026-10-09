import api from "../services/api";

export const getAdminTripSummary = () => api.get("/admin/trips/summary");

export const getPendingTrips = () => api.get("/admin/trips/pending");

// Live status per trip: current_step/current_step_label reflect
// whatever driver-triggered step the trip is on right now (Checkout,
// Arrived, Unloading, Delivered, Checkin) -- see CURRENT_STEP_LABELS
// in app/api/admin/trips.py.
export const getActiveTrips = () => api.get("/admin/trips/active");

// Dispatched trips the driver hasn't checked out (started) yet.
export const getAssignedTrips = () => api.get("/admin/trips/assigned");

// Undo a dispatch: cancels a trip the driver hasn't started yet and
// releases its vehicle/helpers. A reason is required.
export const cancelAssignedTrip = (tripId, reason) =>
  api.post(`/admin/trips/${tripId}/cancel`, { reason });

// Same endpoint for a trip on the road (Active Trips) -- also notifies the
// superadmins and the canceller's Org Chart head.
export const cancelActiveTrip = cancelAssignedTrip;

// Trip cancellations bell: active trips cancelled, for superadmins and
// the canceller's head.
export const getTripCancelAlerts = async () => (await api.get("/admin/trips/cancel-alerts")).data;

export const acknowledgeTripCancelAlert = async (id) =>
  (await api.post(`/admin/trips/cancel-alerts/${id}/acknowledge`)).data;

// Correct a dispatched trip the driver hasn't started yet (driver, vehicle,
// hub, shipment numbers, destinations in order, helpers).
export const updateAssignedTrip = (tripId, payload) =>
  api.put(`/admin/trips/${tripId}/assignment`, payload);

// CHANGED: now accepts remarks and sends it as the JSON body,
// matching the backend's approve_trip(remarks: str = Body(..., embed=True)).
export const approveTrip = (tripId, remarks) =>
  api.post(`/admin/trips/${tripId}/approve`, { remarks });

export const reviewTrip = (tripId) => api.get(`/admin/trips/${tripId}/review`);

// Remark on an approved trip (its photos are locked): text, an image,
// or both.
export const addTripRemark = (tripId, text, image) => {
  const formData = new FormData();
  if (text) formData.append("text", text);
  if (image) formData.append("image", image);
  return api.post(`/admin/trips/${tripId}/remarks`, formData);
};

// Replaces one uploaded trip document photo in place (same File row,
// new image) -- for when the driver photographed the wrong document or
// the shot is unreadable. Only while the trip awaits coordinator
// approval. See replace_trip_file in app/api/admin/trips.py.
export const replaceTripFile = (fileId, photo) => {
  const formData = new FormData();
  formData.append("photo", photo);
  return api.post(`/admin/trips/files/${fileId}/replace`, formData);
};

export const getCompletedTrips = () => api.get("/admin/trips/completed");

// Soft delete: hides a pending or completed trip from those lists
// without deleting the row or its related stops/GPS logs/files. See
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

// Trip Dashboard: every finished trip and its approval stage
// (coordinator -> office -> finance -> approved). Server-side filter,
// search and paging; also returns per-status counts.
export const getApprovalPipeline = ({ status, search, limit = 20, offset = 0 } = {}) =>
  api.get("/admin/trips/approval-pipeline", {
    params: {
      status: status || undefined,
      search: search?.trim() || undefined,
      limit,
      offset,
    },
  });
