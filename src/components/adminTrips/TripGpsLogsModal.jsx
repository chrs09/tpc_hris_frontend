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
import { reviewTrip } from "../../api/adminTripManagement/trips";

/* Leaflet icon fix -- same as PendingTripsCard.jsx/FinanceReviewCard.jsx */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
                        </li>
                      );
                    })}
                  </ol>
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
    </div>
  );
}
