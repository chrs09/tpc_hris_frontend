import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban } from "lucide-react";
import toast from "react-hot-toast";
import {
  acknowledgeTripCancelAlert,
  getTripCancelAlerts,
} from "../../api/adminTripManagement/trips";

const POLL_INTERVAL_MS = 20000;

/**
 * Trip cancellations: an active trip cancelled from the Trip Dashboard
 * (with its reason). Superadmins get every one; an Org Chart head gets
 * the ones their people cancelled. Hidden for everyone else until one
 * arrives for them (superadmins always see the bell).
 */
export default function TripCancelAlertsBell() {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";
  const polls = role && role !== "driver";

  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenIdsRef = useRef(null);
  const fetchingRef = useRef(false);
  const sessionExpiredRef = useRef(false);

  const loadAlerts = useCallback(async () => {
    if (!polls || fetchingRef.current || sessionExpiredRef.current) return;
    fetchingRef.current = true;
    try {
      const data = (await getTripCancelAlerts()) || [];
      const first = seenIdsRef.current === null;
      const seen = seenIdsRef.current || new Set();
      const newOnes = data.filter((a) => !seen.has(a.id));
      seenIdsRef.current = new Set(data.map((a) => a.id));
      if (!first && newOnes.length > 0) {
        toast(
          newOnes.length === 1 ? newOnes[0].message : `${newOnes.length} trips were cancelled.`,
          { icon: "🚫" },
        );
      }
      setAlerts(data);
    } catch (err) {
      if (err.response?.status === 401) sessionExpiredRef.current = true;
    } finally {
      fetchingRef.current = false;
    }
  }, [polls]);

  useEffect(() => {
    if (!polls) return undefined;
    loadAlerts();
    const interval = setInterval(loadAlerts, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadAlerts();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [polls, loadAlerts]);

  useEffect(() => {
    if (!open) return undefined;
    const updateRect = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 32);
      const left = Math.min(Math.max(rect.left, 16), window.innerWidth - width - 16);
      setDropdownRect({ top: rect.bottom + 8, left, width });
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const acknowledge = async (id) => {
    try {
      setAcknowledgingId(id);
      await acknowledgeTripCancelAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to acknowledge.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  if (!polls || (!isSuperAdmin && alerts.length === 0)) return null;

  const count = alerts.length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Cancelled trips"
      >
        <Ban size={20} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open &&
        dropdownRect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              style={{
                position: "fixed",
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
              className="z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-fg">Cancelled Trips</p>
                <p className="text-xs text-fg-subtle">
                  Active trips cancelled from the Trip Dashboard, with the reason.
                </p>
              </div>
              {count === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-fg-subtle">
                  No cancelled trips.
                </p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="border-b border-border px-4 py-3 last:border-b-0">
                    <p className="text-sm text-fg">{alert.message}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-fg-subtle">{alert.created_at}</span>
                      <button
                        onClick={() => acknowledge(alert.id)}
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
          </>,
          document.body,
        )}
    </div>
  );
}
