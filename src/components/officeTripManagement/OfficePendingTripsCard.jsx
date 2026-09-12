import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  reviewOfficeTrip,
  forwardTripToFinance,
} from "../../api/officeTripManagement/trip";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";

export default function OfficePendingTripsCard({ trips = [], refreshTrips }) {
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    trips,
    9,
  );
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [officeRemarks, setOfficeRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Image preview modal state
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const handleReview = async (tripId) => {
    try {
      setLoadingReview(true);
      setReviewError("");
      setRemarksError("");
      setOfficeRemarks("");
      setSelectedImageUrl(null);

      const response = await reviewOfficeTrip(tripId);

      setSelectedTrip(response.data);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to load office trip review:", error);

      setReviewError(
        error.response?.data?.detail || "Failed to load trip review.",
      );
    } finally {
      setLoadingReview(false);
    }
  };

  const handleCloseModal = () => {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setSelectedTrip(null);
    setOfficeRemarks("");
    setRemarksError("");
    setReviewError("");
    setSelectedImageUrl(null);
  };

  const handleCloseImageModal = () => {
    setSelectedImageUrl(null);
  };

  const handleForwardToFinance = async () => {
    if (!selectedTrip) {
      return;
    }

    if (!officeRemarks.trim()) {
      setRemarksError(
        "Office remarks are required before forwarding to Finance.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setRemarksError("");

      await forwardTripToFinance(selectedTrip.trip_id, officeRemarks.trim());

      setShowModal(false);
      setSelectedTrip(null);
      setOfficeRemarks("");
      setSelectedImageUrl(null);

      if (refreshTrips) {
        await refreshTrips();
      }
    } catch (error) {
      console.error("Failed to forward trip to Finance:", error);

      const detail = error.response?.data?.detail;

      setRemarksError(
        typeof detail === "string"
          ? detail
          : "Failed to forward trip to Finance. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const routePoints =
    selectedTrip?.gps_logs
      ?.filter(
        (log) =>
          log.actual_lat !== null &&
          log.actual_lat !== undefined &&
          log.actual_long !== null &&
          log.actual_long !== undefined,
      )
      .map((log) => [Number(log.actual_lat), Number(log.actual_long)]) || [];

  const getMapCenter = () => {
    if (routePoints.length > 0) {
      return routePoints[0];
    }

    if (selectedTrip?.origin_lat && selectedTrip?.origin_long) {
      return [
        Number(selectedTrip.origin_lat),
        Number(selectedTrip.origin_long),
      ];
    }

    return [10.3157, 123.8854];
  };

  return (
    <>
      {reviewError && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{reviewError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedItems.map((trip) => (
          <div
            key={trip.trip_id}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Ticket No.
                </p>

                <h3 className="mt-1 text-lg font-bold text-fg">
                  {trip.ticket_no}
                </h3>
              </div>

              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                Office Review
              </span>
            </div>

            <div className="mb-3">
              <p className="text-xs text-fg-subtle">Driver</p>

              <p className="font-medium text-fg-muted">
                {trip.username || "-"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-fg-subtle">Stops</p>

                <p className="font-semibold text-fg-muted">
                  {trip.stops_count ?? 0}
                </p>
              </div>

              <div>
                <p className="text-xs text-fg-subtle">Status</p>

                <p className="text-sm font-medium text-fg-muted">
                  {trip.review_status || "office_review"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-hover p-3">
              <p className="text-xs text-fg-subtle">Coordinator Settlement</p>

              <p className="mt-1 text-sm font-medium text-fg-muted">
                {trip.coordinator_settlement_date || "-"}
              </p>
            </div>

            {trip.coordinator_remarks && (
              <div className="mt-3">
                <p className="text-xs text-fg-subtle">Coordinator Remarks</p>

                <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                  {trip.coordinator_remarks}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleReview(trip.trip_id)}
              disabled={loadingReview}
              className="mt-5 w-full rounded-lg bg-fg px-4 py-2.5 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingReview ? "Loading..." : "Review Trip"}
            </button>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {showModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Office Personnel Review
                </p>

                <h2 className="text-xl font-bold text-fg">
                  {selectedTrip.ticket_no}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                aria-label="Close trip review"
                className="rounded-lg px-3 py-2 text-xl text-fg-subtle hover:bg-surface-hover disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-8 p-6">
              <section>
                <h3 className="mb-4 text-lg font-bold text-fg">
                  Trip Information
                </h3>

                <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface-hover p-5 md:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Ticket No." value={selectedTrip.ticket_no} />

                  <InfoItem
                    label="Driver"
                    value={`${selectedTrip.driver_first_name || ""} ${
                      selectedTrip.driver_last_name || ""
                    }`.trim()}
                  />

                  <InfoItem label="Origin" value={selectedTrip.origin_store} />

                  <InfoItem
                    label="Vehicle Unit"
                    value={
                      selectedTrip.vehicle
                        ? `${selectedTrip.vehicle.unit_code || "-"} ${
                            selectedTrip.vehicle.plate_number
                              ? `(${selectedTrip.vehicle.plate_number})`
                              : ""
                          }`
                        : "-"
                    }
                  />

                  <InfoItem
                    label="Trip Rate Profile"
                    value={selectedTrip.trip_rate_profile?.profile_name || "-"}
                  />

                  <InfoItem label="Trip Status" value={selectedTrip.status} />

                  <InfoItem
                    label="Start Time"
                    value={selectedTrip.start_time}
                  />

                  <InfoItem label="End Time" value={selectedTrip.end_time} />

                  <InfoItem
                    label="Review Status"
                    value={selectedTrip.review_status}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-lg font-bold text-fg">
                  Helpers
                </h3>

                {selectedTrip.helpers?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTrip.helpers.map((helper) => (
                      <span
                        key={helper.id}
                        className="rounded-full bg-surface-active px-4 py-2 text-sm font-medium text-fg-muted"
                      >
                        {helper.first_name} {helper.last_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-fg-subtle">No helpers assigned.</p>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-lg font-bold text-fg">
                  Coordinator Review
                </h3>

                <div className="rounded-xl border border-warning/30 bg-warning/10 p-5">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                      Settlement Date
                    </p>

                    <p className="mt-1 font-medium text-fg-muted">
                      {selectedTrip.coordinator_settlement_date || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                      Coordinator Remarks
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-fg-muted">
                      {selectedTrip.coordinator_remarks ||
                        "No coordinator remarks."}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-lg font-bold text-fg">
                  Trip Photos
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PhotoCard
                    title="Start Trip Photo"
                    src={selectedTrip.start_photo}
                    onPreview={setSelectedImageUrl}
                  />

                  <PhotoCard
                    title="Stamped Invoice"
                    src={selectedTrip.stamped_invoice_photo}
                    onPreview={setSelectedImageUrl}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-lg font-bold text-fg">
                  GPS Route
                </h3>

                <div className="h-100 overflow-hidden rounded-xl border border-border">
                  <MapContainer
                    center={getMapCenter()}
                    zoom={13}
                    scrollWheelZoom
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {selectedTrip.origin_lat && selectedTrip.origin_long && (
                      <Marker
                        position={[
                          Number(selectedTrip.origin_lat),
                          Number(selectedTrip.origin_long),
                        ]}
                      >
                        <Popup>Origin: {selectedTrip.origin_store}</Popup>
                      </Marker>
                    )}

                    {routePoints.length > 1 && (
                      <Polyline positions={routePoints} />
                    )}

                    {selectedTrip.stops?.map((stop) => {
                      const lat = stop.lat_in || stop.store_lat;
                      const lng = stop.long_in || stop.store_long;

                      if (!lat || !lng) {
                        return null;
                      }

                      return (
                        <Marker
                          key={stop.id}
                          position={[Number(lat), Number(lng)]}
                        >
                          <Popup>
                            <strong>{stop.store_name}</strong>
                            <br />
                            Check In: {stop.check_in_time || "-"}
                            <br />
                            Check Out: {stop.check_out_time || "-"}
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>

                <p className="mt-2 text-xs text-fg-subtle">
                  GPS points: {routePoints.length}
                </p>
              </section>

              <section>
                <h3 className="mb-4 text-lg font-bold text-fg">
                  Delivery Stops
                </h3>

                {selectedTrip.stops?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTrip.stops.map((stop, index) => (
                      <div key={stop.id} className="rounded-xl border border-border p-5">
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase text-fg-subtle">
                            Stop {index + 1}
                          </p>

                          <h4 className="mt-1 font-bold text-fg">
                            {stop.store_name}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <InfoItem
                            label="Check In"
                            value={stop.check_in_time}
                          />

                          <InfoItem
                            label="Check Out"
                            value={stop.check_out_time}
                          />
                        </div>

                        <div className="mt-5">
                          <p className="mb-2 text-sm font-semibold text-fg-muted">
                            Proof of Delivery
                          </p>

                          {stop.delivery_proof_photo ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageUrl(stop.delivery_proof_photo)
                              }
                              className="block max-w-full overflow-hidden rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
                              aria-label={`View proof of delivery for ${stop.store_name}`}
                            >
                              <img
                                src={stop.delivery_proof_photo}
                                alt={`POD - ${stop.store_name}`}
                                className="max-h-72 rounded-xl border border-border object-contain transition hover:opacity-90"
                              />
                            </button>
                          ) : (
                            <div className="rounded-lg bg-surface-hover p-4 text-sm text-fg-subtle">
                              No proof of delivery uploaded.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface-hover p-5 text-sm text-fg-subtle">
                    No delivery stops found.
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-lg font-bold text-fg">
                  Office Personnel Review
                </h3>

                <div className="rounded-xl border border-border bg-surface-hover p-5">
                  <label className="mb-2 block text-sm font-semibold text-fg">
                    Office Remarks
                  </label>

                  <p className="mb-3 text-xs text-fg-subtle">
                    Review the trip details, coordinator remarks, route, PODs,
                    and supporting documents before forwarding the trip to
                    Finance.
                  </p>

                  <textarea
                    value={officeRemarks}
                    onChange={(event) => {
                      setOfficeRemarks(event.target.value);

                      if (event.target.value.trim()) {
                        setRemarksError("");
                      }
                    }}
                    rows={5}
                    placeholder="e.g. Documents and PODs verified. Trip is ready for Finance review."
                    className={`w-full rounded-xl border bg-surface p-3 text-sm text-fg outline-none transition focus:ring-2 focus:ring-primary/30 ${
                      remarksError ? "border-danger" : "border-border"
                    }`}
                  />

                  {remarksError && (
                    <p className="mt-2 text-xs text-danger">{remarksError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleForwardToFinance}
                    disabled={submitting}
                    className="mt-5 w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Forwarding..." : "Forward to Finance Review"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={handleCloseImageModal}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div
            className="relative max-h-[92vh] max-w-5xl rounded-2xl bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseImageModal}
              aria-label="Close image preview"
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl text-white transition hover:bg-black"
            >
              ×
            </button>

            <img
              src={selectedImageUrl}
              alt="Trip document preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-fg-muted">{value || "-"}</p>
    </div>
  );
}

function PhotoCard({ title, src, onPreview }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-fg-muted">{title}</p>

      {src ? (
        <button
          type="button"
          onClick={() => onPreview(src)}
          className="block w-full overflow-hidden rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={`View ${title}`}
        >
          <img
            src={src}
            alt={title}
            className="h-72 w-full rounded-xl border border-border bg-surface-hover object-contain transition hover:opacity-90"
          />
        </button>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-surface-hover">
          <p className="text-sm text-fg-subtle">No photo available</p>
        </div>
      )}
    </div>
  );
}
