import React, { useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getFinanceTripDetail,
  approveFinanceTrip,
} from "../../api/financeTrips/index";

import {
  Clock,
  Eye,
  MessageSquareText,
  Package,
  Route,
  Store,
  User,
} from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_STYLES = {
  finance_review: "bg-yellow-400 text-black",
  approved: "bg-green-500 text-white",
};

const STATUS_LABELS = {
  finance_review: "For Finance Review",
  approved: "Approved",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-gray-300 text-black"
      }`}
    >
      {STATUS_LABELS[status] || status || "-"}
    </span>
  );
}

function FitBounds({ coordinates }) {
  const map = useMap();

  React.useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, {
        padding: [50, 50],
      });
    }
  }, [coordinates, map]);

  return null;
}

export default function FinanceReviewCard({
  trips = [],
  refreshTrips,
}) {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [page, setPage] = useState(1);

  const perPage = 5;
  const totalPages = Math.ceil(trips.length / perPage);

  const paginatedTrips = trips.slice(
    (page - 1) * perPage,
    page * perPage,
  );

  const handleCloseModal = () => {
    if (approving) {
      return;
    }

    setShowModal(false);
    setSelectedTrip(null);
    setActivePhoto(null);
  };

  const handleView = async (tripId) => {
    try {
      setDetailLoading(true);
      setSelectedTrip(null);
      setShowModal(true);

      const response = await getFinanceTripDetail(tripId);

      setSelectedTrip(response.data);
    } catch (error) {
      console.error(
        "Failed to load Finance trip detail:",
        error,
      );

      setShowModal(false);
      setSelectedTrip(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTrip) {
      return;
    }

    try {
      setApproving(true);

      await approveFinanceTrip(selectedTrip.trip_id);

      handleCloseModal();

      if (refreshTrips) {
        await refreshTrips();
      }
    } catch (error) {
      console.error(
        "Failed to approve Finance trip:",
        error,
      );
    } finally {
      setApproving(false);
    }
  };

  const mapCoordinates = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    const coordinates = [];

    if (
      selectedTrip.origin_lat != null &&
      selectedTrip.origin_long != null
    ) {
      coordinates.push([
        Number(selectedTrip.origin_lat),
        Number(selectedTrip.origin_long),
      ]);
    }

    if (Array.isArray(selectedTrip.gps_logs)) {
      [...selectedTrip.gps_logs]
        .sort(
          (first, second) =>
            new Date(first.created_at) -
            new Date(second.created_at),
        )
        .forEach((log) => {
          if (
            log.actual_lat != null &&
            log.actual_long != null
          ) {
            coordinates.push([
              Number(log.actual_lat),
              Number(log.actual_long),
            ]);
          }
        });
    }

    return coordinates.filter(
      ([latitude, longitude]) =>
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude),
    );
  }, [selectedTrip]);

  const endPoint =
    mapCoordinates.length > 0
      ? mapCoordinates[mapCoordinates.length - 1]
      : null;

  const endIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl:
          "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    [],
  );

  const resolvePhotoUrl = (rawUrl) => {
    if (!rawUrl) {
      return "";
    }

    const apiBaseUrl = (
      import.meta.env.VITE_API_URL || ""
    ).replace(/\/$/, "");

    try {
      const parsedUrl = new URL(rawUrl);

      if (
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1"
      ) {
        return `${apiBaseUrl}${parsedUrl.pathname}`;
      }

      return rawUrl;
    } catch {
      const cleanPath = rawUrl.startsWith("/")
        ? rawUrl
        : `/${rawUrl}`;

      return `${apiBaseUrl}${cleanPath}`;
    }
  };

  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-xl bg-[#2b2b2b] md:block">
        <table className="w-full text-sm text-white">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">
                Shipment Number
              </th>
              <th className="px-6 py-3 text-left">
                Trip Details
              </th>
              <th className="px-6 py-3 text-left">
                Coordinator Remarks
              </th>

              <th className="px-6 py-3 text-left">
                Office Personnel Remarks
              </th>

              <th className="px-6 py-3 text-left">
                Status
              </th>
              <th />
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="bg-[#3a3a3a] px-6 py-10 text-center text-gray-300"
                >
                  No trips in this list yet.
                </td>
              </tr>
            )}

            {paginatedTrips.map((trip) => (
              <tr
                key={trip.id}
                className="align-top bg-[#b3b3b3] text-black hover:bg-[#a09f9f]"
              >
                <td className="px-6 py-4 font-semibold uppercase">
                  {trip.shipment_number || "-"}
                </td>

                <td className="px-6 py-4">
                  <p className="font-medium capitalize">
                    {trip.driver_first_name || "-"}{" "}
                    {trip.driver_last_name || ""}
                  </p>

                  <p className="mt-1 text-xs text-gray-700">
                    {trip.start_time || "-"} →{" "}
                    {trip.end_time || "-"}
                  </p>

                  <p className="text-xs text-gray-700">
                    {trip.stops_count ?? 0} stops ·{" "}
                    {trip.ticket_no || "-"}
                  </p>
                </td>

                <td className="max-w-xs px-6 py-4">
                  <p className="line-clamp-2 text-sm">
                    {trip.coordinator_remarks ||
                      "No coordinator remarks."}
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    — {trip.coordinator_name || "-"}
                  </p>
                </td>

                <td className="max-w-xs px-6 py-4">
                  <p className="line-clamp-2 text-sm">
                    {trip.office_remarks ||
                      "No Office Personnel remarks."}
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    Reviewed: {trip.office_reviewed_at || "-"}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={trip.status} />
                </td>

                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleView(trip.id)}
                    className="cursor-pointer rounded-lg bg-[#2b2b2b] px-4 py-2 text-white hover:bg-black"
                  >
                    {trip.status === "finance_review"
                      ? "Review"
                      : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="flex flex-col gap-3 md:hidden">
        {paginatedTrips.length === 0 && (
          <div className="rounded-xl bg-[#2b2b2b] p-4 text-center text-sm text-gray-300">
            No trips in this list yet.
          </div>
        )}

        {paginatedTrips.map((trip) => (
          <div
            key={trip.id}
            className="rounded-xl bg-[#2b2b2b] p-4 text-white"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs opacity-70">
                  Shipment Number
                </p>

                <p className="font-semibold uppercase">
                  {trip.shipment_number || "-"}
                </p>
              </div>

              <StatusBadge status={trip.status} />
            </div>

            <div className="mt-3 text-sm">
              <p className="text-xs opacity-70">Driver</p>

              <p className="capitalize">
                {trip.driver_first_name || "-"}{" "}
                {trip.driver_last_name || ""}
              </p>
            </div>

            <div className="mt-2 text-sm">
              <p className="text-xs opacity-70">
                Coordinator Remarks
              </p>

              <p className="line-clamp-2">
                {trip.coordinator_remarks ||
                  "No coordinator remarks."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleView(trip.id)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 py-2 font-medium text-black"
            >
              <Eye size={16} />
              {trip.status === "finance_review"
                ? "Review"
                : "View"}
            </button>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            disabled={page === 1}
            onClick={() =>
              setPage((currentPage) => currentPage - 1)
            }
            className="rounded bg-gray-200 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>

          <span>
            Page {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page === totalPages}
            onClick={() =>
              setPage((currentPage) => currentPage + 1)
            }
            className="rounded bg-gray-200 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* FINANCE REVIEW MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-white">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-[#2b2b2b] shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="flex items-center gap-3 text-xl font-bold">
                <Package size={20} />

                {detailLoading
                  ? "Loading..."
                  : `Trip Review — ${
                      selectedTrip?.shipment_number || "-"
                    }`}

                {!detailLoading && selectedTrip && (
                  <StatusBadge
                    status={selectedTrip.status}
                  />
                )}
              </h2>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={approving}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-black disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {detailLoading || !selectedTrip ? (
              <div className="p-10 text-center text-gray-300">
                Loading trip details...
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* MAP */}
                <div className="h-80 lg:h-auto lg:w-3/5">
                  <MapContainer
                    center={[10.3157, 123.8854]}
                    zoom={13}
                    style={{
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    <TileLayer
                      attribution="© OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {selectedTrip.origin_lat != null &&
                      selectedTrip.origin_long != null && (
                        <Marker
                          position={[
                            Number(selectedTrip.origin_lat),
                            Number(selectedTrip.origin_long),
                          ]}
                        >
                          <Popup>
                            Origin: {selectedTrip.origin_store}
                          </Popup>
                        </Marker>
                      )}

                    {selectedTrip.stops?.map((stop, index) => {
                      if (
                        stop.lat_in == null ||
                        stop.long_in == null
                      ) {
                        return null;
                      }

                      return (
                        <Marker
                          key={stop.id || index}
                          position={[
                            Number(stop.lat_in),
                            Number(stop.long_in),
                          ]}
                        >
                          <Popup>
                            <strong>{stop.store_name}</strong>
                            <br />
                            Check-In:{" "}
                            {stop.check_in_time || "-"}
                            <br />
                            Check-Out:{" "}
                            {stop.check_out_time || "-"}
                          </Popup>
                        </Marker>
                      );
                    })}

                    {endPoint && (
                      <Marker
                        position={endPoint}
                        icon={endIcon}
                      >
                        <Popup>Trip End</Popup>
                      </Marker>
                    )}

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
                <div className="overflow-y-auto p-6 lg:w-2/5">
                  <div className="mb-6 flex items-center gap-3 text-lg">
                    <User size={18} />

                    {selectedTrip.driver_first_name || "-"}{" "}
                    {selectedTrip.driver_last_name || ""}

                    <span className="ml-2 text-sm text-gray-300">
                      [Driver]
                    </span>
                  </div>

                  {selectedTrip.helpers?.length > 0 && (
                    <div className="mb-6">
                      <p className="mb-2 text-sm">Helpers</p>

                      <div className="flex flex-wrap gap-2">
                        {selectedTrip.helpers.map((helper) => (
                          <span
                            key={helper.id}
                            className="rounded-full bg-gray-200 px-3 py-1 text-sm text-black"
                          >
                            {helper.first_name}{" "}
                            {helper.last_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 space-y-4">
                    <div>
                      <p className="text-sm text-gray-300">
                        Origin
                      </p>

                      <p>{selectedTrip.origin_store || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock size={14} />
                          Start
                        </p>

                        <p>{selectedTrip.start_time || "-"}</p>
                      </div>

                      <div>
                        <p className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock size={14} />
                          End
                        </p>

                        <p>{selectedTrip.end_time || "-"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-gray-400">
                        Attachments
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {selectedTrip.start_photo && (
                          <button
                            type="button"
                            onClick={() =>
                              setActivePhoto({
                                url: resolvePhotoUrl(
                                  selectedTrip.start_photo,
                                ),
                                label: "Start Photo",
                              })
                            }
                            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
                          >
                            <Eye size={14} />
                            Start Photo
                          </button>
                        )}

                        {selectedTrip.stamped_invoice_photo && (
                          <button
                            type="button"
                            onClick={() =>
                              setActivePhoto({
                                url: resolvePhotoUrl(
                                  selectedTrip.stamped_invoice_photo,
                                ),
                                label: "Stamped Invoice",
                              })
                            }
                            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
                          >
                            <Eye size={14} />
                            Stamped Invoice
                          </button>
                        )}

                        {!selectedTrip.start_photo &&
                          !selectedTrip.stamped_invoice_photo && (
                            <span className="text-sm text-gray-500">
                              No attachments
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <hr className="mb-6" />

                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Route size={18} />
                    Visited Stops
                  </h3>

                  <div className="space-y-2">
                    {selectedTrip.stops?.length > 0 ? (
                      selectedTrip.stops.map((stop, index) => (
                        <div
                          key={stop.id || index}
                          className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 text-black"
                        >
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <Store size={14} />
                              {stop.store_name}
                            </p>

                            <div className="mt-1 space-y-1 text-xs text-gray-500">
                              <p className="flex items-center gap-2">
                                <Clock size={12} />
                                In: {stop.check_in_time || "-"}
                              </p>

                              <p className="flex items-center gap-2">
                                <Clock size={12} />
                                Out: {stop.check_out_time || "-"}
                              </p>
                            </div>
                          </div>

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
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-yellow-400"
                            >
                              <Eye size={16} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No POD
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">
                        No visited stops.
                      </p>
                    )}
                  </div>

                  <hr className="my-6" />

                  {/* COORDINATOR REVIEW */}
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <MessageSquareText size={18} />
                    Coordinator Remarks
                  </h3>

                  <div className="rounded-xl bg-white/5 p-4 text-sm">
                    <p className="whitespace-pre-wrap">
                      {selectedTrip.coordinator_remarks ||
                        "No coordinator remarks."}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      — {selectedTrip.coordinator_name || "-"},
                      submitted {selectedTrip.submitted_at || "-"}
                    </p>
                  </div>

                  <hr className="my-6" />

                  {/* OFFICE PERSONNEL REVIEW */}
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <MessageSquareText size={18} />
                    Office Personnel Remarks
                  </h3>

                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm">
                    <p className="whitespace-pre-wrap">
                      {selectedTrip.office_remarks ||
                        "No Office Personnel remarks available."}
                    </p>

                    <p className="mt-2 text-xs text-gray-300">
                      Reviewed:{" "}
                      {selectedTrip.office_reviewed_at || "-"}
                    </p>
                  </div>

                  {selectedTrip.status === "approved" && (
                    <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
                      Approved {selectedTrip.approved_at || "-"} —
                      reflected on attendance and payroll.
                    </div>
                  )}

                  {selectedTrip.status === "finance_review" && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving}
                      className="mt-6 w-full rounded-xl bg-yellow-400 py-3 font-bold text-black disabled:opacity-60"
                    >
                      {approving
                        ? "Approving..."
                        : "Approve Trip"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHOTO VIEWER */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-black">
                {activePhoto.label}
              </p>

              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="text-xl text-gray-500 hover:text-black"
                aria-label="Close image"
              >
                ×
              </button>
            </div>

            <img
              src={activePhoto.url}
              alt={activePhoto.label}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />

            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="mt-4 w-full rounded-lg bg-yellow-400 py-2 font-semibold text-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}