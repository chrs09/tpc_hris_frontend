import React, { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { reviewTrip } from "../../api/adminTripManagement/trips";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

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

  const logs = [...(data?.gps_logs || [])].reverse(); // most recent first
  const latest = logs[0];

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
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
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-subtle">
              No GPS pings recorded for this trip yet.
            </div>
          ) : (
            <div className="space-y-4">
              {/* LATEST PING */}
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Latest Ping
                </p>
                <p className="mt-1 text-sm text-fg">
                  {latest.created_at
                    ? `${formatDistanceToNow(new Date(latest.created_at))} ago`
                    : "Unknown time"}
                  {" · "}
                  {new Date(latest.created_at).toLocaleString()}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-fg-muted sm:grid-cols-4">
                  <div>
                    <span className="block text-xs text-fg-subtle">Lat</span>
                    {latest.actual_lat ?? "—"}
                  </div>
                  <div>
                    <span className="block text-xs text-fg-subtle">Long</span>
                    {latest.actual_long ?? "—"}
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

              {/* HISTORY */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Recent History ({logs.length})
                </p>
                <div className="space-y-2">
                  {logs.slice(0, 100).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm"
                    >
                      <span className="text-fg-muted">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : "—"}
                      </span>
                      <span className="text-fg-subtle">
                        {log.actual_lat}, {log.actual_long}
                      </span>
                    </div>
                  ))}
                  {logs.length > 100 && (
                    <p className="text-center text-xs text-fg-subtle">
                      Showing the latest 100 of {logs.length} pings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
