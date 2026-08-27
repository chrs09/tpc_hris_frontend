import React, { useState, useMemo } from "react";
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
      <div className="hidden md:block bg-[#2b2b2b] rounded-xl overflow-hidden">
        <table className="w-full text-sm text-white">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">Trip ID</th>
              <th className="px-6 py-3 text-left">Driver</th>
              <th className="px-6 py-3 text-left">Ticket</th>
              <th className="px-6 py-3 text-left">Start</th>
              <th className="px-6 py-3 text-left">Stops</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.map((trip) => (
              <tr
                key={trip.id}
                className="hover:bg-[#a09f9f] bg-[#b3b3b3] text-black"
              >
                <td className="px-6 py-4">{trip.id}</td>
                <td className="px-6 py-4 capitalize">{trip.username}</td>
                <td className="px-6 py-4 uppercase">{trip.ticket_no}</td>
                <td className="px-6 py-4">{trip.start_time}</td>
                <td className="px-6 py-4">{trip.stops_count}</td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleReview(trip.id)}
                    className="bg-[#2b2b2b] text-white px-4 py-2 rounded-lg cursor-pointer"
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
          <div key={trip.id} className="bg-[#2b2b2b] text-white p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs opacity-70">Driver</p>
                <p className="font-semibold capitalize">{trip.username}</p>
              </div>

              <button
                onClick={() => handleReview(trip.id)}
                className="bg-yellow-400 text-black p-2 rounded-lg"
              >
                <FontAwesomeIcon icon={faEye} />
              </button>
            </div>

            <div className="mt-2 text-sm">
              <p className="opacity-70">Ticket</p>
              {trip.ticket_no}
            </div>

            <div className="flex justify-between mt-2 text-sm">
              <div>
                <p className="opacity-70">Start</p>
                {trip.start_time}
              </div>

              <div>
                <p className="opacity-70">Stops</p>
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
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Prev
          </button>

          <span>
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Next
          </button>
        </div>
      )}

      {/* ======================= REVIEW MODAL ======================= */}
      {showModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center p-4 z-50 text-white">
          <div className="bg-[#2b2b2b] w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <FontAwesomeIcon icon={faRoute} />
                Trip Review — {selectedTrip.ticket_no}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg"
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
                  <span className="text-gray-300 text-sm ml-2">[ Driver ]</span>
                </div>

                {/* HELPERS */}
                {selectedTrip.helpers?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm mb-2">Helpers</p>

                    <div className="flex flex-wrap gap-2">
                      {selectedTrip.helpers.map((helper) => (
                        <span
                          key={helper.id}
                          className="bg-gray-200 text-black px-3 py-1 rounded-full text-sm"
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
                    <p className="text-sm text-gray-300">Origin</p>
                    <p>{selectedTrip.origin_store}</p>
                  </div>

                  {/* START TIME */}
                  <div>
                    <p className="text-sm text-gray-300">
                      <FontAwesomeIcon icon={faUserClock} className="mr-2" />
                      Start
                    </p>
                    <p>{selectedTrip.start_time || "-"}</p>
                  </div>

                  {/* END TIME */}
                  <div>
                    <p className="text-sm text-gray-300">
                      <FontAwesomeIcon icon={faUserClock} className="mr-2" />
                      End
                    </p>
                    <p>{selectedTrip.end_time || "-"}</p>
                  </div>

                  {/* ======================= START PHOTO ======================= */}
                  <div className="flex items-center justify-between gap-4 bg-[#3a3a3a] p-3 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Start Trip Photo
                      </p>

                      <p className="text-xs text-gray-400">
                        Photo uploaded when the trip started
                      </p>
                    </div>

                    {selectedTrip.start_photo ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhoto({
                            url: resolvePhotoUrl(selectedTrip.start_photo),
                            label: "Start Trip Photo",
                          })
                        }
                        title="View start trip photo"
                        className="shrink-0 w-10 h-10 flex items-center justify-center bg-yellow-400 text-black rounded-lg hover:bg-yellow-300"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No Photo</span>
                    )}
                  </div>

                  {/* ======================= END PHOTO ======================= */}
                  <div className="flex items-center justify-between gap-4 bg-[#3a3a3a] p-3 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        End Trip Photo
                      </p>

                      <p className="text-xs text-gray-400">
                        Stamped invoice uploaded when trip was completed
                      </p>
                    </div>

                    {selectedTrip.stamped_invoice_photo ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhoto({
                            url: resolvePhotoUrl(
                              selectedTrip.stamped_invoice_photo,
                            ),
                            label: "End Trip - Stamped Invoice",
                          })
                        }
                        title="View end trip photo"
                        className="shrink-0 w-10 h-10 flex items-center justify-center bg-yellow-400 text-black rounded-lg hover:bg-yellow-300"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No Photo</span>
                    )}
                  </div>
                </div>

                <hr className="mb-6" />

                {/* ======================= VISITED STOPS ======================= */}
                <h3 className="font-semibold text-lg mb-4">Visited Stops</h3>

                <div className="space-y-3">
                  {selectedTrip.stops?.length > 0 ? (
                    selectedTrip.stops.map((stop, index) => (
                      <div
                        key={stop.id || index}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-black"
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
                                setActivePhoto({
                                  url: resolvePhotoUrl(
                                    stop.delivery_proof_photo,
                                  ),
                                  label: `${stop.store_name} - Proof of Delivery`,
                                })
                              }
                              title="View Proof of Delivery"
                              className="shrink-0 w-10 h-10 flex items-center justify-center bg-yellow-400 text-black rounded-lg hover:bg-yellow-300"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          ) : (
                            <div className="shrink-0 text-right">
                              <span className="text-xs text-gray-400">
                                No POD
                              </span>
                            </div>
                          )}
                        </div>

                        {/* POD STATUS */}
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            Proof of Delivery
                          </span>

                          {stop.delivery_proof_photo ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActivePhoto({
                                  url: resolvePhotoUrl(
                                    stop.delivery_proof_photo,
                                  ),
                                  label: `${stop.store_name} - Proof of Delivery`,
                                })
                              }
                              className="text-xs font-semibold underline"
                            >
                              View Attached Photo
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not available
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 text-gray-500 p-4 rounded-xl text-sm">
                      No visited stops found.
                    </div>
                  )}
                </div>

                {/* ===== NEW: REMARKS FOR FINANCE REVIEW ===== */}
                {/* ===== COORDINATOR REMARKS ===== */}
                {mode === "pending" && (
                  <>
                    <hr className="my-6" />

                    <div>
                      <label className="font-semibold text-lg mb-2 block text-white">
                        Coordinator Remarks
                      </label>

                      <p className="text-xs text-gray-300 mb-3">
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
                        className={`w-full rounded-xl p-3 text-sm text-black bg-gray-50 border ${
                          remarksError ? "border-red-500" : "border-gray-200"
                        } focus:outline-none focus:ring-2 focus:ring-yellow-400`}
                      />

                      {remarksError && (
                        <p className="text-red-400 text-xs mt-1">
                          {remarksError}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="mt-6 bg-yellow-400 text-black py-3 w-full rounded-xl font-bold disabled:opacity-60"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl max-w-lg w-full">
            <p className="text-sm font-semibold text-black mb-2">
              {activePhoto.label}
            </p>

            <img
              src={activePhoto.url}
              alt={activePhoto.label}
              className="w-full rounded-lg"
              onError={() => {
                console.log("Image failed to load:", activePhoto.url);
              }}
            />

            <button
              onClick={() => setActivePhoto(null)}
              className="mt-4 bg-yellow-400 w-full py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingTripsCard;
