import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { acknowledgeLeaveAlert, getLeaveAlerts } from "../../api/leave";
import { getNavGroups } from "../../constants/navGroups";
import useModuleAccess from "../../hooks/useModuleAccess";

// Same cadence as the other header bells.
const POLL_INTERVAL_MS = 20000;

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};

/**
 * Leave bell for HR: every leave filed (LEAVE_REQUESTED notices, created
 * in file_leave_request()), with the requested date, until someone
 * acknowledges it. Shown to a superadmin or anyone the Org Chart gives
 * HRIS access (Employees / Attendance) -- the same people the HRIS menu
 * shows for. Approving stays with the Org Chart leave approvers.
 */
export default function LeaveAlertsBell() {
  const { role, isVisible } = useModuleAccess();
  const hrisItems =
    getNavGroups(role).find((group) => group.label === "HRIS")?.children || [];
  const visible = hrisItems.some(
    (item) => item.label === "Employees" || item.label === "Attendance" ? isVisible(item) : false,
  );

  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenIdsRef = useRef(null);
  const fetchingRef = useRef(false);
  const sessionExpiredRef = useRef(false);

  const loadAlerts = useCallback(async () => {
    if (!visible || fetchingRef.current || sessionExpiredRef.current) return;
    fetchingRef.current = true;
    try {
      const data = (await getLeaveAlerts()) || [];
      const first = seenIdsRef.current === null;
      const seen = seenIdsRef.current || new Set();
      const newOnes = data.filter((a) => !seen.has(a.id));
      seenIdsRef.current = new Set(data.map((a) => a.id));
      if (!first && newOnes.length > 0) {
        toast(
          newOnes.length === 1
            ? newOnes[0].message || "A new leave was filed."
            : `${newOnes.length} new leave requests.`,
          { icon: "📅" },
        );
      }
      setAlerts(data);
    } catch (err) {
      if (err.response?.status === 401) sessionExpiredRef.current = true;
      // 403: not HR after all (access changed) -- just stay empty.
    } finally {
      fetchingRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
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
  }, [visible, loadAlerts]);

  // Fixed-position portal so the sidebar's overflow doesn't clip it (same
  // as the other bells).
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
      await acknowledgeLeaveAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to acknowledge.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const acknowledgeAll = async () => {
    for (const alert of alerts) {
      await acknowledge(alert.id);
    }
  };

  if (!visible) return null;

  const count = alerts.length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Leave requests"
      >
        <CalendarDays size={20} />
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
              <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-fg">New Leave Requests</p>
                  <p className="text-xs text-fg-subtle">
                    Filed leave, for HR. Approval is with each person&apos;s Org Chart head.
                  </p>
                </div>
                {count > 1 && (
                  <button
                    type="button"
                    onClick={acknowledgeAll}
                    className="shrink-0 text-xs font-semibold text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {count === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-fg-subtle">
                  No new leave requests.
                </p>
              ) : (
                alerts.map((alert) => {
                  const leave = alert.leave;
                  return (
                    <div key={alert.id} className="border-b border-border px-4 py-3 last:border-b-0">
                      {leave ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-fg">
                              {leave.employee_name}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                STATUS_STYLES[leave.status] || STATUS_STYLES.cancelled
                              }`}
                            >
                              {leave.status}
                            </span>
                          </div>
                          <p className="text-xs text-fg-muted">
                            {[leave.position, alert.department].filter(Boolean).join(" · ")}
                          </p>
                          <p className="mt-1 text-xs text-fg">
                            <span className="capitalize">{leave.leave_type}</span> ·{" "}
                            {leave.start_date}
                            {leave.start_date !== leave.end_date && ` – ${leave.end_date}`}
                          </p>
                          {leave.reason && (
                            <p className="line-clamp-2 text-xs text-fg-muted">{leave.reason}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-fg">{alert.message}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-fg-subtle">
                          Requested {leave?.requested_at || "—"}
                        </span>
                        <button
                          onClick={() => acknowledge(alert.id)}
                          disabled={acknowledgingId === alert.id}
                          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                        >
                          {acknowledgingId === alert.id ? "..." : "Acknowledge"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
