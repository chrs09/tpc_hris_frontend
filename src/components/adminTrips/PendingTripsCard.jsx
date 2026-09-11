import React, { useState, useMemo, useCallback } from "react";
import { approveTrip, reviewTrip } from "../../api/adminTripManagement/trips";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  // faLocationDot,
  faStore,
  faClock,
  faRoute,
  faUserClock,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

/* Leaflet icon fix */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Auto map bounds */
const FitBounds = ({ coordinates }) => {
  const map = useMap();

  React.useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return null;
};

// Cleans up a raw photo URL/path the same way for any photo field --
// start photo, delivery proof, stamped invoice, etc. Extracted out of
// the old inline start_photo-only logic so every photo type can reuse it.
const resolvePhotoUrl = (rawUrl) => {
  if (!rawUrl) return "";

  // Example:
  // Local:      http://localhost:8000
  // Production: https://portal.tytanprime.net
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  try {
    const parsedUrl = new URL(rawUrl);

    // If backend returns a localhost/127.0.0.1 URL,
    // rebuild it using the current environment's VITE_API_URL.
    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1"
    ) {
      return `${apiBaseUrl}${parsedUrl.pathname}`;
    }

    // Already a valid production/external URL
    return rawUrl;
  } catch {
    // Backend returned only a relative path
    const cleanPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${apiBaseUrl}${cleanPath}`;
  }
};

const PendingTripsCard = ({ trips = [], refreshTrips, mode = "pending" }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // NEW: replaces the old boolean showPhoto -- now tracks which photo
  // URL + label to display, so the same viewer works for start photo,
  // delivery proof photos, or any future photo type.
  const [activePhoto, setActivePhoto] = useState(null); // { url, label } | null
  const [photoZoom, setPhotoZoom] = useState(1);

  // Opens the shared photo viewer, always starting at 100% zoom so the
  // previous photo's zoom level doesn't carry over to the next one.
  const openPhoto = useCallback((photo) => {
    setPhotoZoom(1);
    setActivePhoto(photo);
  }, []);

  const zoomIn = () => setPhotoZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setPhotoZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setPhotoZoom(1);

  const [page, setPage] = useState(1);
  const perPage = 5;

  // NEW: remarks for finance review, entered at approval time
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paginatedTrips = trips.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(trips.length / perPage);

  const handleReview = async (tripId) => {
    const res = await reviewTrip(tripId);
    console.log("Trip data:", res.data);
    console.log("Start photo:", res.data.start_photo);

    console.log("=== GPS LOG COUNT ===");
    console.log(res.data.gps_logs?.length);

    console.log("=== GPS LOGS ===");
    console.log(res.data.gps_logs);
    setSelectedTrip(res.data);
    setRemarks("");
    setRemarksError("");
    setShowModal(true);
  };

  const handleApprove = async () => {
    if (!remarks.trim()) {
      setRemarksError("Add coordinator remarks before approving the trip.");
      return;
    }

    try {
      setSubmitting(true);
      setRemarksError("");

      // Coordinator approval:
      // PENDING_APPROVAL -> PENDING_OFFICE_REVIEW
      //
      // Backend will also:
      // - save coordinator remarks
      // - save coordinator_settlement_date
      // - create the TripFinanceReview record
      await approveTrip(selectedTrip.trip_id, remarks.trim());

      setShowModal(false);
      setSelectedTrip(null);
      setRemarks("");

      await refreshTrips();
    } catch (error) {
      console.error("Failed to approve trip:", error);

      setRemarksError(
        error.response?.data?.detail ||
          "Failed to approve the trip. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const endIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const mapCoordinates = useMemo(() => {
    if (!selectedTrip) return [];

    const coords = [];

    if (selectedTrip.origin_lat != null && selectedTrip.origin_long != null) {
      coords.push([
        Number(selectedTrip.origin_lat),
        Number(selectedTrip.origin_long),
      ]);
    }

    if (Array.isArray(selectedTrip.gps_logs)) {
      [...selectedTrip.gps_logs]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .forEach((log) => {
          if (log.actual_lat != null && log.actual_long != null) {
            coords.push([Number(log.actual_lat), Number(log.actual_long)]);
          }
        });
    }

    return coords.filter(
      ([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng),
    );
  }, [selectedTrip]);

  const endPoint = mapCoordinates.length
    ? mapCoordinates[mapCoordinates.length - 1]
    : null;

  return (
    <>
      {/* ======================= DESKTOP TABLE ======================= */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm text-fg">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Trip ID</th>
              <th className="px-6 py-3 text-left font-medium">Trip Code</th>
              <th className="px-6 py-3 text-left font-medium">Driver</th>
              <th className="px-6 py-3 text-left font-medium">Ticket</th>
              <th className="px-6 py-3 text-left font-medium">Start</th>
              <th className="px-6 py-3 text-left font-medium">Stops</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.map((trip) => (
              <tr
                key={trip.id}
                className="border-t border-border hover:bg-surface-hover"
              >
                <td className="px-6 py-4">{trip.id}</td>
                <td className="px-6 py-4 uppercase">{trip.trip_code || "-"}</td>
                <td className="px-6 py-4 capitalize">{trip.username}</td>
                <td className="px-6 py-4 uppercase">{trip.ticket_no}</td>
                <td className="px-6 py-4">{trip.start_time}</td>
                <td className="px-6 py-4">{trip.stops_count}</td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleReview(trip.id)}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    {mode === "pending" ? "Review" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================= MOBILE CARDS ======================= */}
      <div className="md:hidden flex flex-col gap-3">
        {paginatedTrips.map((trip) => (
          <div
            key={trip.id}
            className="bg-surface border border-border text-fg p-4 rounded-xl"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-fg-muted">Driver</p>
                <p className="font-semibold capitalize">{trip.username}</p>
              </div>

              <button
                onClick={() => handleReview(trip.id)}
                className="bg-primary text-primary-foreground p-2 rounded-lg"
              >
                <FontAwesomeIcon icon={faEye} />
              </button>
            </div>

            <div className="mt-2 text-sm">
              <p className="text-fg-muted">Trip Code</p>
              {trip.trip_code || "-"}
            </div>

            <div className="mt-2 text-sm">
              <p className="text-fg-muted">Ticket</p>
              {trip.ticket_no}
            </div>

            <div className="flex justify-between mt-2 text-sm">
              <div>
                <p className="text-fg-muted">Start</p>
                {trip.start_time}
              </div>

              <div>
                <p className="text-fg-muted">Stops</p>
                {trip.stops_count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ======================= PAGINATION ======================= */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-surface-active text-fg rounded hover:bg-surface-hover disabled:opacity-40"
          >
            Prev
          </button>

          <span className="text-fg">
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-surface-active text-fg rounded hover:bg-surface-hover disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* ======================= REVIEW MODAL ======================= */}
      {showModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center p-4 z-50">
          <div className="bg-surface border border-border text-fg w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <FontAwesomeIcon icon={faRoute} />
                Trip Review — {selectedTrip.trip_code || selectedTrip.ticket_no}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>

            {/* BODY */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* MAP */}
              <div className="lg:w-3/5 h-80 lg:h-auto">
                <MapContainer
                  center={[10.3157, 123.8854]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="© OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* ORIGIN MARKER */}
                  {selectedTrip.origin_lat && (
                    <Marker
                      position={[
                        selectedTrip.origin_lat,
                        selectedTrip.origin_long,
                      ]}
                    >
                      <Popup>🚛 Origin: {selectedTrip.origin_store}</Popup>
                    </Marker>
                  )}

                  {/* STOP MARKERS */}
                  {selectedTrip.stops?.map((stop, index) =>
                    stop.lat_in ? (
                      <Marker
                        key={index}
                        position={[Number(stop.lat_in), Number(stop.long_in)]}
                      >
                        <Popup>
                          📍 {stop.store_name}
                          <br />
                          Check-In: {stop.check_in_time}
                          <br />
                          Check-Out: {stop.check_out_time}
                        </Popup>
                      </Marker>
                    ) : null,
                  )}

                  {/* END MARKER */}
                  {endPoint && (
                    <Marker position={endPoint} icon={endIcon}>
                      <Popup>🏁 Trip End</Popup>
                    </Marker>
                  )}

                  {/* GPS ROUTE */}
                  {mapCoordinates.length > 1 && (
                    <Polyline
                      positions={mapCoordinates}
                      pathOptions={{
                        color: "blue",
                        weight: 4,
                        dashArray: "6,8",
                      }}
                    />
                  )}

                  <FitBounds coordinates={mapCoordinates} />
                </MapContainer>
              </div>

              {/* DETAILS */}
              <div className="lg:w-2/5 overflow-y-auto p-6">
                {/* DRIVER */}
                <div className="flex items-center gap-3 mb-6 text-lg">
                  <FontAwesomeIcon icon={faUser} />
                  {selectedTrip.driver_first_name}{" "}
                  {selectedTrip.driver_last_name}
                  <span className="text-fg-muted text-sm ml-2">[ Driver ]</span>
                </div>

                {/* HELPERS */}
                {selectedTrip.helpers?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm mb-2">Helpers</p>

                    <div className="flex flex-wrap gap-2">
                      {selectedTrip.helpers.map((helper) => (
                        <span
                          key={helper.id}
                          className="bg-surface-active text-fg px-3 py-1 rounded-full text-sm"
                        >
                          {helper.first_name} {helper.last_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================= TRIP INFO ======================= */}
                <div className="space-y-4 mb-6">
                  {/* ORIGIN */}
                  <div>
                    <p className="text-sm text-fg-muted">Origin</p>
                    <p>{selectedTrip.origin_store}</p>
                  </div>

                  {/* START TIME */}
                  <div>
                    <p className="text-sm text-fg-muted">
                      <FontAwesomeIcon icon={faUserClock} className="mr-2" />
                      Start
                    </p>
                    <p>{selectedTrip.start_time || "-"}</p>
                  </div>

                  {/* END TIME */}
                  <div>
                    <p className="text-sm text-fg-muted">
                      <FontAwesomeIcon icon={faUserClock} className="mr-2" />
                      End
                    </p>
                    <p>{selectedTrip.end_time || "-"}</p>
                  </div>

                  {/* ======================= START PHOTO ======================= */}
                  <div className="flex items-center justify-between gap-4 bg-surface-hover p-3 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-fg">
                        Start Trip Photo
                      </p>

                      <p className="text-xs text-fg-subtle">
                        Photo uploaded when the trip started
                      </p>
                    </div>

                    {selectedTrip.start_photo ? (
                      <button
                        type="button"
                        onClick={() =>
                          openPhoto({
                            url: resolvePhotoUrl(selectedTrip.start_photo),
                            label: "Start Trip Photo",
                          })
                        }
                        title="View start trip photo"
                        className="shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    ) : (
                      <span className="text-xs text-fg-subtle">No Photo</span>
                    )}
                  </div>

                  {/* ======================= END PHOTO ======================= */}
                  <div className="flex items-center justify-between gap-4 bg-surface-hover p-3 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-fg">
                        End Trip Photo
                      </p>

                      <p className="text-xs text-fg-subtle">
                        Stamped invoice uploaded when trip was completed
                      </p>
                    </div>

                    {selectedTrip.stamped_invoice_photo ? (
                      <button
                        type="button"
                        onClick={() =>
                          openPhoto({
                            url: resolvePhotoUrl(
                              selectedTrip.stamped_invoice_photo,
                            ),
                            label: "End Trip - Stamped Invoice",
                          })
                        }
                        title="View end trip photo"
                        className="shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    ) : (
                      <span className="text-xs text-fg-subtle">No Photo</span>
                    )}
                  </div>
                </div>

                <hr className="mb-6 border-border" />

                {/* ======================= VISITED STOPS ======================= */}
                <h3 className="font-semibold text-lg mb-4">Visited Stops</h3>

                <div className="space-y-3">
                  {selectedTrip.stops?.length > 0 ? (
                    selectedTrip.stops.map((stop, index) => (
                      <div
                        key={stop.id || index}
                        className="bg-surface-hover border border-border rounded-xl p-4 text-fg"
                      >
                        {/* STORE HEADER */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="font-semibold">
                              <FontAwesomeIcon
                                icon={faStore}
                                className="mr-2"
                              />

                              {stop.store_name}
                            </p>

                            <p className="text-sm mt-2">
                              <FontAwesomeIcon
                                icon={faClock}
                                className="mr-2"
                              />
                              Check-In: {stop.check_in_time || "-"}
                            </p>

                            <p className="text-sm">
                              <FontAwesomeIcon
                                icon={faClock}
                                className="mr-2"
                              />
                              Check-Out: {stop.check_out_time || "-"}
                            </p>
                          </div>

                          {/* POD VIEW BUTTON */}
                          {stop.delivery_proof_photo ? (
                            <button
                              type="button"
                              onClick={() =>
                                openPhoto({
                                  url: resolvePhotoUrl(
                                    stop.delivery_proof_photo,
                                  ),
                                  label: `${stop.store_name} - Proof of Delivery`,
                                })
                              }
                              title="View Proof of Delivery"
                              className="shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          ) : (
                            <div className="shrink-0 text-right">
                              <span className="text-xs text-fg-subtle">
                                No POD
                              </span>
                            </div>
                          )}
                        </div>

                        {/* POD STATUS */}
                        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                          <span className="text-xs text-fg-subtle">
                            Proof of Delivery
                          </span>

                          {stop.delivery_proof_photo ? (
                            <button
                              type="button"
                              onClick={() =>
                                openPhoto({
                                  url: resolvePhotoUrl(
                                    stop.delivery_proof_photo,
                                  ),
                                  label: `${stop.store_name} - Proof of Delivery`,
                                })
                              }
                              className="text-xs font-semibold underline text-primary"
                            >
                              View Attached Photo
                            </button>
                          ) : (
                            <span className="text-xs text-fg-subtle">
                              Not available
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-surface-hover text-fg-subtle p-4 rounded-xl text-sm">
                      No visited stops found.
                    </div>
                  )}
                </div>

                {/* ===== NEW: REMARKS FOR FINANCE REVIEW ===== */}
                {/* ===== COORDINATOR REMARKS ===== */}
                {mode === "pending" && (
                  <>
                    <hr className="my-6 border-border" />

                    <div>
                      <label className="font-semibold text-lg mb-2 block text-fg">
                        Coordinator Remarks
                      </label>

                      <p className="text-xs text-fg-muted mb-3">
                        Add your remarks after reviewing the trip details,
                        route, stops, invoices, and proof of delivery. Once
                        approved, the trip will be settled and forwarded to
                        Office Personnel for further review.
                      </p>

                      <textarea
                        value={remarks}
                        onChange={(e) => {
                          setRemarks(e.target.value);

                          if (e.target.value.trim()) {
                            setRemarksError("");
                          }
                        }}
                        rows={4}
                        placeholder="e.g. All stops, PODs, and trip details verified. No discrepancies found."
                        className={`w-full rounded-xl p-3 text-sm text-fg bg-background border ${
                          remarksError ? "border-danger" : "border-border"
                        } focus:outline-none focus:ring-2 focus:ring-primary/30`}
                      />

                      {remarksError && (
                        <p className="text-danger text-xs mt-1">
                          {remarksError}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="mt-6 bg-primary text-primary-foreground hover:bg-primary-hover py-3 w-full rounded-xl font-bold disabled:opacity-60"
                    >
                      {submitting
                        ? "Approving..."
                        : "Approve & Send to Office Review"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SHARED PHOTO VIEWER ======================= */}
      {activePhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <p className="text-sm font-semibold text-fg truncate">
                {activePhoto.label}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={photoZoom <= 0.5}
                  title="Zoom out"
                  className="rounded-lg border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover disabled:opacity-40"
                >
                  −
                </button>

                <span className="w-14 text-center text-sm text-fg-muted">
                  {Math.round(photoZoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={photoZoom >= 3}
                  title="Zoom in"
                  className="rounded-lg border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover disabled:opacity-40"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={resetZoom}
                  title="Reset zoom"
                  className="rounded-lg border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <img
                src={activePhoto.url}
                alt={activePhoto.label}
                style={{ width: `${photoZoom * 100}%`, maxWidth: "none" }}
                className="mx-auto h-auto rounded-lg transition-[width]"
                onError={() => {
                  console.log("Image failed to load:", activePhoto.url);
                }}
              />
            </div>

            <div className="border-t border-border p-4">
              <button
                onClick={() => setActivePhoto(null)}
                className="bg-primary text-primary-foreground hover:bg-primary-hover w-full py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingTripsCard;
