import React, { useMemo, useState } from "react";
import TripUnitTags from "../adminTrips/TripUnitTags";
import { StopShipments } from "../adminTrips/ShipmentStorePairing";
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

import toast from "react-hot-toast";
import {
  getFinanceTripDetail,
  approveFinanceTrip,
  blockFinanceTrip,
  returnFinanceTrip,
  unblockFinanceTrip,
} from "../../api/financeTrips/index";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";

import {
  Clock,
  Eye,
  MessageSquareText,
  Package,
  Route,
  Store,
  User,
} from "lucide-react";
import TripRemarksList from "../adminTrips/TripRemarksList";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import useApprovalScope from "../../hooks/useApprovalScope";
import ApprovalScopeToggle from "../../components/approvals/ApprovalScopeToggle";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_STYLES = {
  finance_review: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  blocked: "bg-danger/15 text-danger",
};

const STATUS_LABELS = {
  finance_review: "For Finance Review",
  approved: "Approved",
  blocked: "Blocked",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-surface-active text-fg-muted"
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

export default function FinanceReviewCard({ trips: allTrips = [], refreshTrips, onChanged }) {
  const canEditPage = usePageCanEdit();
  const { scoped: trips, scopeProps } = useApprovalScope(allTrips);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  // Block (documents not valid): reason box open + saving.
  const [blocking, setBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  // Return to coordinator (document issue to fix): reason box open + text.
  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const [search, setSearch] = useState("");
  const filteredTrips = trips.filter((trip) =>
    matchesSearch(
      search,
      trip.shipment_number,
      trip.ticket_no,
      trip.driver_first_name,
      trip.driver_last_name,
      `${trip.driver_first_name || ""} ${trip.driver_last_name || ""}`,
      trip.coordinator_name,
      trip.coordinator_remarks,
      trip.office_remarks,
    ),
  );
  const { page, setPage, totalPages, paginatedItems: paginatedTrips } =
    usePagination(filteredTrips, 5);

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
      console.error("Failed to load Finance trip detail:", error);

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
      console.error("Failed to approve Finance trip:", error);
    } finally {
      setApproving(false);
    }
  };

  const handleBlock = async () => {
    if (!selectedTrip || !blockReason.trim()) return;
    try {
      setSavingBlock(true);
      await blockFinanceTrip(selectedTrip.trip_id, blockReason.trim());
      toast.success("Trip blocked. It won't be paid until it's unblocked.");
      setBlocking(false);
      setBlockReason("");
      handleCloseModal();
      if (onChanged) await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to block the trip.");
    } finally {
      setSavingBlock(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedTrip || !returnReason.trim()) return;
    try {
      setSavingBlock(true);
      await returnFinanceTrip(selectedTrip.trip_id, returnReason.trim());
      toast.success("Returned to the coordinator. It comes back here once they re-submit.");
      setReturning(false);
      setReturnReason("");
      handleCloseModal();
      if (onChanged) await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to return the trip.");
    } finally {
      setSavingBlock(false);
    }
  };

  // The "Return to coordinator" button, or its reason box when open.
  const returnControls = () =>
    returning ? (
      <div className="space-y-2 rounded-xl border border-warning/40 p-3">
        <label htmlFor="return-reason" className="block text-sm font-medium text-fg">
          What does the coordinator need to fix or re-upload?
        </label>
        <textarea
          id="return-reason"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          maxLength={1000}
          placeholder="e.g. LM quantity doesn't match the invoice -- upload the corrected LM."
          className="min-h-[72px] w-full rounded-xl border border-border bg-background p-3 text-sm text-fg"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setReturning(false);
              setReturnReason("");
            }}
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReturn}
            disabled={!returnReason.trim() || savingBlock}
            className="flex-1 rounded-xl bg-warning py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingBlock ? "Returning..." : "Return Trip"}
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => {
          setBlocking(false);
          setReturning(true);
        }}
        className="w-full rounded-xl border border-warning/60 py-2.5 text-sm font-semibold text-warning hover:bg-warning/10"
      >
        Return to coordinator (fix / re-upload document)
      </button>
    );

  const handleUnblock = async () => {
    if (!selectedTrip) return;
    try {
      setSavingBlock(true);
      await unblockFinanceTrip(selectedTrip.trip_id);
      toast.success("Trip is back in For Finance Review.");
      handleCloseModal();
      if (onChanged) await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to unblock the trip.");
    } finally {
      setSavingBlock(false);
    }
  };

  const mapCoordinates = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    const coordinates = [];

    if (selectedTrip.origin_lat != null && selectedTrip.origin_long != null) {
      coordinates.push([
        Number(selectedTrip.origin_lat),
        Number(selectedTrip.origin_long),
      ]);
    }

    if (Array.isArray(selectedTrip.gps_logs)) {
      [...selectedTrip.gps_logs]
        .sort(
          (first, second) =>
            new Date(first.created_at) - new Date(second.created_at),
        )
        .forEach((log) => {
          if (log.actual_lat != null && log.actual_long != null) {
            coordinates.push([Number(log.actual_lat), Number(log.actual_long)]);
          }
        });
    }

    return coordinates.filter(
      ([latitude, longitude]) =>
        !Number.isNaN(latitude) && !Number.isNaN(longitude),
    );
  }, [selectedTrip]);

  const endPoint =
    mapCoordinates.length > 0
      ? mapCoordinates[mapCoordinates.length - 1]
      : null;

  const endIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    [],
  );

  const resolvePhotoUrl = (rawUrl) => {
    if (!rawUrl) {
      return "";
    }

    const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

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
      const cleanPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

      return `${apiBaseUrl}${cleanPath}`;
    }
  };

  return (
    <>
      <ApprovalScopeToggle {...scopeProps} className="mb-3" />
      <div className="mb-3 flex justify-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search shipment, driver, coordinator..."
        />
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-xl bg-surface md:block">
        <table className="w-full text-sm text-fg">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">Shipment Number</th>
              <th className="px-6 py-3 text-left">Trip Details</th>
              <th className="px-6 py-3 text-left">Coordinator Remarks</th>

              <th className="px-6 py-3 text-left">Office Personnel Remarks</th>

              <th className="px-6 py-3 text-left">Status</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="bg-surface-hover px-6 py-10 text-center text-fg-muted"
                >
                  No trips in this list yet.
                </td>
              </tr>
            )}

            {paginatedTrips.map((trip) => (
              <tr
                key={trip.id}
                className="align-top border-t border-border hover:bg-surface-hover"
              >
                <td className="px-6 py-4 font-semibold uppercase">
                  {trip.shipment_number || "-"}
                </td>

                <td className="px-6 py-4">
                  <p className="font-medium capitalize">
                    {trip.driver_first_name || "-"}{" "}
                    {trip.driver_last_name || ""}
                  </p>

                  <p className="mt-1 text-xs text-fg-muted">
                    {trip.start_time || "-"} → {trip.end_time || "-"}
                  </p>

                  <p className="text-xs text-fg-muted">
                    {trip.stops_count ?? 0} stops · {trip.ticket_no || "-"}
                  </p>
                </td>

                <td className="max-w-xs px-6 py-4">
                  <p className="line-clamp-2 text-sm">
                    {trip.coordinator_remarks || "No coordinator remarks."}
                  </p>

                  <p className="mt-1 text-xs text-fg-muted">
                    — {trip.coordinator_name || "-"}
                  </p>
                </td>

                <td className="max-w-xs px-6 py-4">
                  <p className="line-clamp-2 text-sm">
                    {trip.office_remarks || "No Office Personnel remarks."}
                  </p>

                  <p className="mt-1 text-xs text-fg-muted">
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
                    className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
                  >
                    {trip.status === "finance_review" ? "Review" : "View"}
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
          <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-fg-muted">
            No trips in this list yet.
          </div>
        )}

        {paginatedTrips.map((trip) => (
          <div key={trip.id} className="rounded-xl border border-border bg-surface p-4 text-fg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs opacity-70">Shipment Number</p>

                <p className="font-semibold uppercase">
                  {trip.shipment_number || "-"}
                </p>
              </div>

              <StatusBadge status={trip.status} />
            </div>

            <div className="mt-3 text-sm">
              <p className="text-xs opacity-70">Driver</p>

              <p className="capitalize">
                {trip.driver_first_name || "-"} {trip.driver_last_name || ""}
              </p>
            </div>

            <div className="mt-2 text-sm">
              <p className="text-xs opacity-70">Coordinator Remarks</p>

              <p className="line-clamp-2">
                {trip.coordinator_remarks || "No coordinator remarks."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleView(trip.id)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Eye size={16} />
              {trip.status === "finance_review" ? "Review" : "View"}
            </button>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* FINANCE REVIEW MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-surface text-fg shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="flex items-center gap-3 text-xl font-bold">
                <Package size={20} />

                {detailLoading
                  ? "Loading..."
                  : `Trip Review — ${selectedTrip?.shipment_number || "-"}`}

                {!detailLoading && selectedTrip && <TripUnitTags trip={selectedTrip} />}
                {!detailLoading && selectedTrip && (
                  <StatusBadge status={selectedTrip.status} />
                )}
              </h2>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={approving}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {detailLoading || !selectedTrip ? (
              <div className="p-10 text-center text-fg-muted">
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
                          <Popup>Origin: {selectedTrip.origin_store}</Popup>
                        </Marker>
                      )}

                    {selectedTrip.stops?.map((stop, index) => {
                      if (stop.lat_in == null || stop.long_in == null) {
                        return null;
                      }

                      return (
                        <Marker
                          key={stop.id || index}
                          position={[Number(stop.lat_in), Number(stop.long_in)]}
                        >
                          <Popup>
                            <strong>{stop.store_name}</strong>
                            <br />
                            Check-In: {stop.check_in_time || "-"}
                            <br />
                            Check-Out: {stop.check_out_time || "-"}
                          </Popup>
                        </Marker>
                      );
                    })}

                    {endPoint && (
                      <Marker position={endPoint} icon={endIcon}>
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
                    <span className="ml-2 text-sm text-fg-muted">[Driver]</span>
                  </div>

                  {selectedTrip.helpers?.length > 0 && (
                    <div className="mb-6">
                      <p className="mb-2 text-sm">Helpers</p>

                      <div className="flex flex-wrap gap-2">
                        {selectedTrip.helpers.map((helper) => (
                          <span
                            key={helper.id}
                            className="rounded-full bg-surface-active px-3 py-1 text-sm text-fg"
                          >
                            {helper.first_name} {helper.last_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 space-y-4">
                    <div>
                      <p className="text-sm text-fg-muted">Origin</p>

                      <p>{selectedTrip.origin_store || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-sm text-fg-muted">
                          <Clock size={14} />
                          Start
                        </p>

                        <p>{selectedTrip.start_time || "-"}</p>
                      </div>

                      <div>
                        <p className="flex items-center gap-2 text-sm text-fg-muted">
                          <Clock size={14} />
                          End
                        </p>

                        <p>{selectedTrip.end_time || "-"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-fg-subtle">Attachments</p>

                      <div className="flex flex-wrap gap-2">
                        {selectedTrip.invoice_photos?.map((url, i) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() =>
                              setActivePhoto({
                                url: resolvePhotoUrl(url),
                                label: `Invoice Page ${i + 1}`,
                              })
                            }
                            className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-sm transition hover:bg-surface-active"
                          >
                            <Eye size={14} />
                            Invoice Page {i + 1}
                          </button>
                        ))}

                        {selectedTrip.lm_photos?.map((url, i) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() =>
                              setActivePhoto({
                                url: resolvePhotoUrl(url),
                                label: `LM Page ${i + 1}`,
                              })
                            }
                            className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-sm transition hover:bg-surface-active"
                          >
                            <Eye size={14} />
                            LM Page {i + 1}
                          </button>
                        ))}

                        {selectedTrip.lm_checkout_stamped_photo && (
                          <button
                            type="button"
                            onClick={() =>
                              setActivePhoto({
                                url: resolvePhotoUrl(
                                  selectedTrip.lm_checkout_stamped_photo,
                                ),
                                label: "LM Stamped Checkout",
                              })
                            }
                            className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-sm transition hover:bg-surface-active"
                          >
                            <Eye size={14} />
                            LM Stamped Checkout
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
                                label: "LM (stamped 'check-in')",
                              })
                            }
                            className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-sm transition hover:bg-surface-active"
                          >
                            <Eye size={14} />
                            LM (stamped 'check-in')
                          </button>
                        )}

                        {!selectedTrip.invoice_photos?.length &&
                          !selectedTrip.lm_photos?.length &&
                          !selectedTrip.lm_checkout_stamped_photo &&
                          !selectedTrip.stamped_invoice_photo && (
                            <span className="text-sm text-fg-subtle">
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
                          className="flex items-center justify-between gap-4 rounded-xl bg-surface-hover px-4 py-3 text-fg"
                        >
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <Store size={14} />
                              {stop.store_name}
                            </p>
                            <StopShipments numbers={stop.shipment_numbers} />

                            <div className="mt-1 space-y-1 text-xs text-fg-subtle">
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

                          <div className="flex shrink-0 items-center gap-2">
                            {stop.unloading_photo ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePhoto({
                                    url: resolvePhotoUrl(stop.unloading_photo),
                                    label: `${stop.store_name} - Unloading Photo`,
                                  })
                                }
                                title="View Unloading Photo"
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-active transition hover:bg-primary"
                              >
                                <Eye size={16} />
                              </button>
                            ) : (
                              <span className="text-xs text-fg-subtle">
                                No Unload
                              </span>
                            )}

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
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-active transition hover:bg-primary"
                              >
                                <Eye size={16} />
                              </button>
                            ) : (
                              <span className="text-xs text-fg-subtle">
                                No POD
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-fg-subtle">No visited stops.</p>
                    )}
                  </div>

                  <hr className="my-6" />

                  {/* COORDINATOR REVIEW */}
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <MessageSquareText size={18} />
                    Coordinator Remarks
                  </h3>

                  <div className="rounded-xl bg-surface-hover p-4 text-sm">
                    <p className="whitespace-pre-wrap">
                      {selectedTrip.coordinator_remarks ||
                        "No coordinator remarks."}
                    </p>

                    <p className="mt-2 text-xs text-fg-subtle">
                      — {selectedTrip.coordinator_name || "-"}, submitted{" "}
                      {selectedTrip.submitted_at || "-"}
                    </p>
                  </div>

                  <hr className="my-6" />

                  {selectedTrip.added_remarks?.length > 0 && (
                    <div className="mb-6">
                      <TripRemarksList
                        remarks={selectedTrip.added_remarks}
                        onOpenImage={(url) =>
                          setActivePhoto({
                            url: resolvePhotoUrl(url),
                            label: "Remark photo",
                          })
                        }
                      />
                    </div>
                  )}

                  {/* OFFICE PERSONNEL REVIEW */}
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <MessageSquareText size={18} />
                    Office Personnel Remarks
                  </h3>

                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                    <p className="whitespace-pre-wrap">
                      {selectedTrip.office_remarks ||
                        "No Office Personnel remarks available."}
                    </p>

                    <p className="mt-2 text-xs text-fg-muted">
                      Reviewed: {selectedTrip.office_reviewed_at || "-"}
                    </p>
                  </div>

                  {selectedTrip.status === "approved" && (
                    <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
                      Approved {selectedTrip.approved_at || "-"} — reflected on
                      attendance and payroll.
                    </div>
                  )}

                  {selectedTrip.status === "blocked" && (
                    <div className="mt-4 space-y-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                      <p>
                        <b>Blocked</b> {selectedTrip.blocked_at || ""} -- not paid until
                        unblocked.
                      </p>
                      {selectedTrip.block_reason && <p>{selectedTrip.block_reason}</p>}
                      {canEditPage && (
                        <button
                          type="button"
                          onClick={handleUnblock}
                          disabled={savingBlock}
                          className="w-full rounded-xl border border-danger/50 bg-surface py-2.5 font-semibold text-fg hover:bg-surface-hover disabled:opacity-60"
                        >
                          {savingBlock ? "Saving..." : "Unblock (back to For Finance Review)"}
                        </button>
                      )}
                      {canEditPage && <div className="text-fg">{returnControls()}</div>}
                    </div>
                  )}

                  {selectedTrip.status === "finance_review" && (
                    (canEditPage ? (
                      <div className="mt-6 space-y-3">
                      <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving || savingBlock}
                      className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                    >
                      {approving ? "Approving..." : "Approve Trip"}
                    </button>
                      {blocking ? (
                        <div className="space-y-2 rounded-xl border border-danger/40 p-3">
                          <label htmlFor="block-reason" className="block text-sm font-medium text-fg">
                            Why aren&apos;t the documents valid?
                          </label>
                          <textarea
                            id="block-reason"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            maxLength={1000}
                            className="min-h-[72px] w-full rounded-xl border border-border bg-background p-3 text-sm text-fg"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBlocking(false);
                                setBlockReason("");
                              }}
                              className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleBlock}
                              disabled={!blockReason.trim() || savingBlock}
                              className="flex-1 rounded-xl bg-danger py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {savingBlock ? "Blocking..." : "Block Trip"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReturning(false);
                            setBlocking(true);
                          }}
                          className="w-full rounded-xl border border-danger/50 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10"
                        >
                          Block (documents not valid)
                        </button>
                      )}
                      {returnControls()}
                      </div>
                    ) : null)
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
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-fg">
                {activePhoto.label}
              </p>

              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="text-xl text-fg-subtle hover:text-fg"
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
              className="mt-4 w-full rounded-lg bg-primary py-2 font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
