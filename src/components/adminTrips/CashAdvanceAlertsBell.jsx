import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Wallet } from "lucide-react";
import toast from "react-hot-toast";
import {
  acknowledgeCashAdvanceAlert,
  getCashAdvanceAlerts,
} from "../../api/cashAdvanceRequests";

// Only superadmin reviews cash advances today (see the Finance nav
// group's roles list in Sidebar.jsx and require_superadmin on the
// backend's /cash-advance-requests/alerts endpoint).
const VISIBLE_ROLES = ["superadmin"];

// Same cadence as HubAlertsBell -- a small, cheap request, not worth
// tuning per-page.
const POLL_INTERVAL_MS = 20000;

/**
 * Notification bell for newly-filed cash advance requests (the
 * CASH_ADVANCE_REQUESTED Notification row created in
 * file_cash_advance_request(), app/api/cash_advance_request.py).
 * Same polling/toast/acknowledge pattern as HubAlertsBell -- see that
 * component for the fuller explanation of the background-refresh
 * design (never shows a loading spinner after the first load, toasts
 * once per genuinely new alert, pauses while the tab isn't visible).
 */
export default function CashAdvanceAlertsBell() {
  const role = localStorage.getItem("role");
  const visible = VISIBLE_ROLES.includes(role);

  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const fetchingRef = useRef(false);
  // Once the session's token is rejected (401), stop polling entirely
  // instead of silently retrying with the same stale token every 20s
  // forever -- that was the single biggest source of noise in both
  // Slack and the Error Logs table.
  const sessionExpiredRef = useRef(false);

  const loadAlerts = useCallback(async () => {
    if (!visible || fetchingRef.current || sessionExpiredRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await getCashAdvanceAlerts();
      const data = res || [];

      const isFirstLoad = seenIdsRef.current.size === 0 && initialLoading;
      const newOnes = data.filter((a) => !seenIdsRef.current.has(a.id));
      seenIdsRef.current = new Set(data.map((a) => a.id));

      if (!isFirstLoad && newOnes.length > 0) {
        toast(
          newOnes.length === 1
            ? newOnes[0].message || "A new cash advance was requested."
            : `${newOnes.length} new cash advance requests.`,
          { icon: "💵" },
        );
      }

      setAlerts(data);
    } catch (err) {
      console.error("Failed to load cash advance alerts:", err);
      if (err.response?.status === 401) {
        sessionExpiredRef.current = true;
      }
    } finally {
      fetchingRef.current = false;
      setInitialLoading(false);
    }
  }, [visible, initialLoading]);

  useEffect(() => {
    if (!visible) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Positions the dropdown via a fixed-coordinate portal instead of
  // Tailwind's `absolute` -- the bell lives inside the sidebar's own
  // scrollable/overflow-hidden container, which was clipping an
  // `absolute`-positioned dropdown on large screens (it never actually
  // escaped the sidebar's box). Same fix pattern as SearchSelect.jsx.
  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 32);
      const left = Math.min(
        Math.max(rect.left, 16),
        window.innerWidth - width - 16,
      );
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

  const handleAcknowledge = async (id) => {
    try {
      setAcknowledgingId(id);
      await acknowledgeCashAdvanceAlert(id);
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
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Cash advance requests"
      >
        <Wallet size={20} />
        {alerts.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open &&
        dropdownRect &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <div
              style={{
                position: "fixed",
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
              className="z-50 rounded-xl border border-border bg-surface shadow-xl"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-fg">
                  New Cash Advance Requests
                </p>
                <p className="text-xs text-fg-subtle">
                  Review them under Finance → Cash Advance Approvals.
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-fg-subtle">
                    No new requests right now.
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
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgingId === alert.id}
                          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                        >
                          {acknowledgingId === alert.id
                            ? "..."
                            : "Acknowledge"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
