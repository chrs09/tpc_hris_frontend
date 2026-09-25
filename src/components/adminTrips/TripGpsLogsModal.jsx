import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
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
import { FileText, Eye } from "lucide-react";
import { reviewTrip } from "../../api/adminTripManagement/trips";

/* Leaflet icon fix -- same as PendingTripsCard.jsx/FinanceReviewCard.jsx */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Same badge colors as ActiveTripsMonitor.jsx's status column, so the
// "current status" reads consistently wherever it's shown.
const STEP_BADGE_STYLES = {
  ASSIGNED: "bg-surface-active text-fg-muted",
  IN_TRANSIT: "bg-primary/15 text-primary",
  ARRIVED: "bg-warning/15 text-warning",
  UNLOADING: "bg-warning/15 text-warning",
  DELIVERED: "bg-success/15 text-success",
  RETURNING: "bg-primary/15 text-primary",
  CHECKIN: "bg-success/15 text-success",
};

const latestPingIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const FitBounds = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [50, 50] });
    }
  }, [coordinates, map]);

  return null;
};

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// The backend sends GPS log timestamps as a raw UTC isoformat() string with
// no "Z"/offset marker, so the browser's Date parser would otherwise treat
// it as already being local time instead of UTC -- shifting displayed
// times by the local UTC offset (e.g. 8 hours off in PH). Appending "Z"
// (only if the string doesn't already carry a zone marker) fixes that.
const parseUtc = (isoString) => {
  if (!isoString) return null;
  const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(isoString);
  return new Date(hasZone ? isoString : `${isoString}Z`);
};

export default function TripGpsLogsModal({ tripId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null); // { url, label } | null
  const [photoZoom, setPhotoZoom] = useState(1);

  // Opens the photo viewer, always starting at 100% zoom so the
  // previous photo's zoom level doesn't carry over to the next one.
  const openPhoto = (photo) => {
    setPhotoZoom(1);
    setActivePhoto(photo);
  };

  const zoomIn = () => setPhotoZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setPhotoZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setPhotoZoom(1);

  const loadLogs = useCallback(
    async (isRefresh = false) => {
      if (!tripId) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const res = await reviewTrip(tripId);
        setData(res.data);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tripId],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const sortedLogs = useMemo(() => {
    return [...(data?.gps_logs || [])]
      .filter((log) => log.actual_lat != null && log.actual_long != null)
      .sort((a, b) => parseUtc(a.created_at) - parseUtc(b.created_at));
  }, [data]);

  const routeCoordinates = useMemo(
    () => sortedLogs.map((log) => [Number(log.actual_lat), Number(log.actual_long)]),
    [sortedLogs],
  );

  const latest = sortedLogs[sortedLogs.length - 1];
  const latestPosition = latest
    ? [Number(latest.actual_lat), Number(latest.actual_long)]
    : null;

  // Correlate the coordinator's full planned route (every store picked
  // at dispatch, delivered or not) with the actual TripStop rows the
  // driver has recorded so far, so each planned stop can show its real
  // status -- like a parcel delivery tracker.
  const stopTimeline = useMemo(() => {
    if (!data?.planned_stores?.length) return [];

    const stopsByStoreId = new Map();
    for (const stop of data.stops || []) {
      if (stop.store_id == null) continue;
      // Keep the latest recorded stop per store (in the rare case a
      // store shows up more than once).
      stopsByStoreId.set(stop.store_id, stop);
    }

    let nextAssigned = false;
    return data.planned_stores.map((planned) => {
      const stop = stopsByStoreId.get(planned.store_id);
      let phase = "upcoming";
      if (planned.delivered) {
        phase = "delivered";
      } else if (stop) {
        phase = "current"; // checked in / unloading, not yet delivered
      } else if (!nextAssigned) {
        phase = "next";
        nextAssigned = true;
      }
      return { ...planned, stop, phase };
    });
  }, [data]);

  // Any TripStop NOT already represented above -- either this trip has
  // no planned_stores at all (dispatched before multi-store support),
  // or this particular stop's GPS never matched a known store
  // (store_id null, "Unknown" location) so it was excluded from the
  // timeline's store-keyed map. Either way its photos would otherwise
  // silently disappear -- show them here instead.
  const unmatchedStops = useMemo(() => {
    const timelineStoreIds = new Set(
      stopTimeline.map((item) => item.store_id),
    );
    return (data?.stops || []).filter(
      (stop) => stop.store_id == null || !timelineStoreIds.has(stop.store_id),
    );
  }, [data, stopTimeline]);

  const stopPhaseMeta = {
    delivered: {
      label: "Delivered",
      dot: "bg-success",
      text: "text-success",
      badge: "bg-success/15 text-success",
    },
    current: {
      label: "In Progress",
      dot: "bg-primary",
      text: "text-primary",
      badge: "bg-primary/15 text-primary",
    },
    next: {
      label: "Next Stop",
      dot: "bg-warning",
      text: "text-warning",
      badge: "bg-warning/15 text-warning",
    },
    upcoming: {
      label: "Upcoming",
      dot: "bg-border",
      text: "text-fg-subtle",
      badge: "bg-surface-hover text-fg-subtle",
    },
  };

  const stopStatusLabel = (status) => {
    if (status === "UNLOADING") return "Unloading";
    if (status === "CHECKED_IN") return "Arrived";
    if (status === "DELIVERED") return "Delivered";
    return status;
  };

  const hasCheckoutPhotos =
    data?.invoice_photos?.length > 0 ||
    data?.lm_photos?.length > 0 ||
    data?.lm_checkout_stamped_photo ||
    data?.stamped_invoice_photo;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">Trip Details</h2>
            {data && (
              <p className="text-sm text-fg-subtle">
                Trip #{data.ticket_no} — {data.driver_first_name}{" "}
                {data.driver_last_name}
                {data.trip_rate_profile?.profile_name &&
                  ` · ${data.trip_rate_profile.profile_name}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadLogs(true)}
              disabled={loading || refreshing}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-fg-muted transition hover:bg-surface-hover disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-subtle">
              Loading trip details...
            </div>
          ) : (
            <div className="space-y-4">
              {/* CURRENT STATUS -- whatever driver-triggered step the
                  trip is on right now (Checkout, Arrived, Unloading,
                  Delivered, Checkin), same labels as the Trip Dashboard's
                  Active Trips list. */}
              {data && (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    Current Status
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STEP_BADGE_STYLES[data.current_step] ||
                        "bg-surface-active text-fg-muted"
                      }`}
                    >
                      {data.current_step_label || data.current_step || "-"}
                    </span>
                    {data.current_stop && (
                      <span className="text-sm text-fg-muted">
                        at {data.current_stop}
                      </span>
                    )}
                    {data.total_stops != null && (
                      <span className="text-xs text-fg-subtle">
                        · {data.completed_stops ?? 0}/{data.total_stops} stops
                        delivered
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* DELIVERY STOPS TIMELINE (parcel-tracker style) */}
              {stopTimeline.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      Delivery Stops
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {data.completed_stops ?? 0}/{data.total_stops ?? 0}{" "}
                      delivered
                    </p>
                  </div>

                  <ol className="mt-3 space-y-0">
                    {stopTimeline.map((item, index) => {
                      const meta = stopPhaseMeta[item.phase];
                      const isLast = index === stopTimeline.length - 1;
                      return (
                        <li key={item.store_id} className="relative pl-6 pb-4">
                          {!isLast && (
                            <span className="absolute left-[7px] top-3 h-full w-px bg-border" />
                          )}
                          <span
                            className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full ${meta.dot}`}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-fg">
                              {item.store_name || `Store #${item.store_id}`}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}
                            >
                              {item.stop && item.phase === "current"
                                ? stopStatusLabel(item.stop.status)
                                : meta.label}
                            </span>
                          </div>
                          {item.stop?.check_in_time && (
                            <p className="mt-0.5 text-xs text-fg-subtle">
                              Arrived: {item.stop.check_in_time}
                              {item.stop.check_out_time &&
                                ` · Delivered: ${item.stop.check_out_time}`}
                            </p>
                          )}
                          {item.stop &&
                            (item.stop.unloading_photo ||
                              item.stop.delivery_proof_photo) && (
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                {item.stop.unloading_photo && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPhoto({
                                        url: item.stop.unloading_photo?.url,
                                        label: `${item.store_name} - Unloading Photo`,
                                      })
                                    }
                                    className="flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-xs text-fg-muted hover:bg-surface-active"
                                  >
                                    <Eye size={12} />
                                    Unloading Photo
                                  </button>
                                )}
                                {item.stop.delivery_proof_photo && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openPhoto({
                                        url: item.stop.delivery_proof_photo?.url,
                                        label: `${item.store_name} - Proof of Delivery`,
                                      })
                                    }
                                    className="flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-xs text-fg-muted hover:bg-surface-active"
                                  >
                                    <Eye size={12} />
                                    Proof of Delivery
                                  </button>
                                )}
                              </div>
                            )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* VISITED STOPS FALLBACK -- covers both legacy trips (no
                  planned_stores at all, so the timeline above renders
                  nothing) and any stop whose GPS never matched a known
                  store (excluded from the timeline's store-keyed map
                  even when other stops ARE shown there). Either way the
                  photos still exist in data.stops -- show them instead
                  of silently dropping them. */}
              {unmatchedStops.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    Visited Stops
                  </p>

                  <div className="space-y-3">
                    {unmatchedStops.map((stop) => (
                      <div
                        key={stop.id}
                        className="rounded-xl bg-surface-hover p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-fg">
                            {stop.store_name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              stopPhaseMeta[
                                stop.status === "DELIVERED"
                                  ? "delivered"
                                  : "current"
                              ].badge
                            }`}
                          >
                            {stopStatusLabel(stop.status)}
                          </span>
                        </div>
                        {stop.check_in_time && (
                          <p className="mt-0.5 text-xs text-fg-subtle">
                            Arrived: {stop.check_in_time}
                            {stop.check_out_time &&
                              ` · Delivered: ${stop.check_out_time}`}
                          </p>
                        )}
                        {(stop.unloading_photo || stop.delivery_proof_photo) && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {stop.unloading_photo && (
                              <button
                                type="button"
                                onClick={() =>
                                  openPhoto({
                                    url: stop.unloading_photo?.url,
                                    label: `${stop.store_name} - Unloading Photo`,
                                  })
                                }
                                className="flex items-center gap-1 rounded-lg bg-surface-active px-2 py-1 text-xs text-fg-muted hover:bg-surface"
                              >
                                <Eye size={12} />
                                Unloading Photo
                              </button>
                            )}
                            {stop.delivery_proof_photo && (
                              <button
                                type="button"
                                onClick={() =>
                                  openPhoto({
                                    url: stop.delivery_proof_photo?.url,
                                    label: `${stop.store_name} - Proof of Delivery`,
                                  })
                                }
                                className="flex items-center gap-1 rounded-lg bg-surface-active px-2 py-1 text-xs text-fg-muted hover:bg-surface"
                              >
                                <Eye size={12} />
                                Proof of Delivery
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHECKOUT PHOTOS (Invoice/LM pages, stamped LM, stamped invoice) */}
              {hasCheckoutPhotos && (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    Uploaded Files
                  </p>

                  <div className="space-y-3">
                    {data.invoice_photos?.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-fg-muted">
                          Invoice ({data.invoice_photos.length} page
                          {data.invoice_photos.length === 1 ? "" : "s"})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {data.invoice_photos.map((photo, i) => (
                            <button
                              key={photo.id ?? photo.url}
                              type="button"
                              onClick={() =>
                                openPhoto({
                                  url: photo.url,
                                  label: `Invoice Page ${i + 1}`,
                                })
                              }
                              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                            >
                              Page {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.lm_photos?.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-fg-muted">
                          LM ({data.lm_photos.length} page
                          {data.lm_photos.length === 1 ? "" : "s"})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {data.lm_photos.map((photo, i) => (
                            <button
                              key={photo.id ?? photo.url}
                              type="button"
                              onClick={() =>
                                openPhoto({
                                  url: photo.url,
                                  label: `LM Page ${i + 1}`,
                                })
                              }
                              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                            >
                              Page {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.lm_checkout_stamped_photo && (
                      <button
                        type="button"
                        onClick={() =>
                          openPhoto({
                            url: data.lm_checkout_stamped_photo?.url,
                            label: "LM Stamped Checkout",
                          })
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-active"
                      >
                        <FileText size={12} />
                        LM Stamped "Checkout"
                      </button>
                    )}

                    {data.stamped_invoice_photo && (
                      <button
                        type="button"
                        onClick={() =>
                          openPhoto({
                            url: data.stamped_invoice_photo?.url,
                            label: "LM (stamped 'check-in')",
                          })
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-2.5 py-1.5 text-xs font-medium text-fg hover:bg-surface-active"
                      >
                        <FileText size={12} />
                        LM (stamped 'check-in')
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!latest && (
                <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-subtle">
                  No GPS pings recorded for this trip yet.
                </div>
              )}

              {latest && (
                <>
              {/* LATEST PING SUMMARY */}
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Latest Ping
                </p>
                <p className="mt-1 text-sm text-fg">
                  {latest.created_at
                    ? `${formatDistanceToNow(parseUtc(latest.created_at))} ago`
                    : "Unknown time"}
                  {" · "}
                  {parseUtc(latest.created_at).toLocaleString()}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-fg-muted sm:grid-cols-4">
                  <div>
                    <span className="block text-xs text-fg-subtle">Lat</span>
                    {latest.actual_lat}
                  </div>
                  <div>
                    <span className="block text-xs text-fg-subtle">Long</span>
                    {latest.actual_long}
                  </div>
                  <div>
                    <span className="block text-xs text-fg-subtle">Speed</span>
                    {latest.speed ?? "—"}
                  </div>
                  <div>
                    <span className="block text-xs text-fg-subtle">
                      Accuracy
                    </span>
                    {latest.accuracy ?? "—"}
                  </div>
                </div>
              </div>

              {/* MAP */}
              <div className="h-96 overflow-hidden rounded-2xl border border-border">
                <MapContainer
                  center={latestPosition}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="© OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {data.origin_lat != null && (
                    <Marker
                      position={[
                        Number(data.origin_lat),
                        Number(data.origin_long),
                      ]}
                    >
                      <Popup>🚛 Origin: {data.origin_store}</Popup>
                    </Marker>
                  )}

                  {routeCoordinates.length > 1 && (
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{ color: "blue", weight: 4, dashArray: "6,8" }}
                    />
                  )}

                  {/* LATEST PING PINPOINT */}
                  {latestPosition && (
                    <Marker position={latestPosition} icon={latestPingIcon}>
                      <Popup>
                        📍 Latest ping
                        <br />
                        {formatDistanceToNow(parseUtc(latest.created_at))} ago
                        <br />
                        {latest.actual_lat}, {latest.actual_long}
                      </Popup>
                    </Marker>
                  )}

                  <FitBounds
                    coordinates={
                      routeCoordinates.length > 0
                        ? routeCoordinates
                        : latestPosition
                          ? [latestPosition]
                          : []
                    }
                  />
                </MapContainer>
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {activePhoto && (
        <div
          // Leaflet's own internal elements (zoom controls, panes) use
          // z-index values up to 1000, which can bleed through a modal
          // at a "normal" stacking level like z-80 -- pushed well above
          // that, matching the same always-on-top pattern SearchSelect's
          // dropdown portal already uses elsewhere in this app.
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActivePhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-surface p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-fg">
                {activePhoto.label}
              </p>

              <div className="flex shrink-0 items-center gap-2">
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

                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="rounded-lg px-2 py-1 text-fg-muted hover:bg-surface-hover"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <img
                src={activePhoto.url}
                alt={activePhoto.label}
                style={{ width: `${photoZoom * 100}%`, maxWidth: "none" }}
                className="mx-auto h-auto rounded-lg transition-[width]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
