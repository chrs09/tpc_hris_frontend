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

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">GPS Logs</h2>
            {data && (
              <p className="text-sm text-fg-subtle">
                Trip #{data.ticket_no} — {data.driver_first_name}{" "}
                {data.driver_last_name}
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
              Loading GPS logs...
            </div>
          ) : !latest ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-subtle">
              No GPS pings recorded for this trip yet.
            </div>
          ) : (
            <div className="space-y-4">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
