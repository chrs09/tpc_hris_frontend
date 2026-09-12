import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";
import {
  acknowledgeHubAlert,
  getHubAlerts,
} from "../../api/adminTripManagement/trips";

// Only these roles can start/manage trips manually and are the ones who
// should be watching for a driver starting away from a hub -- matches
// the Trip Management nav group's role list in Sidebar.jsx, and the
// backend's own check on GET /admin/trips/hub-alerts.
const VISIBLE_ROLES = ["superadmin", "coordinator_admin"];

// How often to silently re-check for new alerts. Kept the same across
// tabs -- this is a small, cheap request (a handful of notification
// rows), not worth tuning per-page.
const POLL_INTERVAL_MS = 20000;

/**
 * Notification bell for "trip started outside any hub's GPS range"
 * alerts (see Trip.started_outside_hub_range / the
 * STARTED_OUTSIDE_HUB_RANGE Notification row, created in
 * app/api/driver/trips.py start_trip()). Polls in the background --
 * never shows a loading spinner after the first load, so it doesn't
 * interrupt whatever the admin is doing elsewhere in the app -- and
 * toasts once when a genuinely new alert shows up (not on every poll).
 */
export default function HubAlertsBell() {
  const role = localStorage.getItem("role");
  const visible = VISIBLE_ROLES.includes(role);

  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  // Tracks alert ids already seen so a toast only fires for NEW alerts,
  // not for ones already known from a previous poll.
  const seenIdsRef = useRef(new Set());
  // Prevents a slow request from overlapping with the next poll tick.
  const fetchingRef = useRef(false);

  const loadAlerts = useCallback(async () => {
    if (!visible || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await getHubAlerts();
      const data = res.data || [];

      const isFirstLoad = seenIdsRef.current.size === 0 && initialLoading;
      const newOnes = data.filter((a) => !seenIdsRef.current.has(a.id));
      seenIdsRef.current = new Set(data.map((a) => a.id));

      if (!isFirstLoad && newOnes.length > 0) {
        toast(
          newOnes.length === 1
            ? newOnes[0].message ||
                "A trip was started outside any hub's range."
            : `${newOnes.length} trips were started outside hub range.`,
          { icon: "⚠️" },
        );
      }

      setAlerts(data);
    } catch (err) {
      console.error("Failed to load hub alerts:", err);
    } finally {
      fetchingRef.current = false;
      setInitialLoading(false);
    }
  }, [visible, initialLoading]);

  useEffect(() => {
    if (!visible) return;

    loadAlerts();
    const interval = setInterval(loadAlerts, POLL_INTERVAL_MS);

    // Pause polling while the tab isn't visible, and refresh immediately
    // once it becomes visible again -- no point spending requests on a
    // tab nobody is looking at.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadAlerts();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleAcknowledge = async (id) => {
    try {
      setAcknowledgingId(id);
      await acknowledgeHubAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to acknowledge alert.",
      );
    } finally {
      setAcknowledgingId(null);
    }
  };

  if (!visible) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Hub alerts"
      >
        <Bell size={20} />
        {alerts.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside catcher */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="fixed left-1/2 top-16 z-50 w-[90vw] max-w-80 -translate-x-1/2 rounded-xl border border-border bg-surface shadow-xl md:absolute md:left-0 md:top-full md:mt-2 md:w-80 md:max-w-[90vw] md:translate-x-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-fg">
                Trips Started Outside Hub
              </p>
              <p className="text-xs text-fg-subtle">
                A driver's GPS was outside every hub's radius when they
                started the trip.
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-fg-subtle">
                  No hub alerts right now.
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <p className="text-sm text-fg">{alert.message}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-fg-subtle">
                        {alert.created_at}
                        {alert.ticket_no ? ` · #${alert.ticket_no}` : ""}
                      </span>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledgingId === alert.id}
                        className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                      >
                        {acknowledgingId === alert.id ? "..." : "Acknowledge"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
