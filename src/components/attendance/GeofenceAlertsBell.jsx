import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import toast from "react-hot-toast";
import { getGeofenceAlerts } from "../../api/attendance";
import useModuleAccess from "../../hooks/useModuleAccess";

const POLL_INTERVAL_MS = 30000;

const gridPath = (date) =>
  `/dashboard/attendance?view=grid${date ? `&date=${date}` : ""}`;

const APPROVALS_PATH = "/dashboard/approvals?tab=attendance";

/**
 * Bell for time in/out done outside the allowed attendance area and
 * still waiting for review (last 7 days). Shown to whoever can approve
 * them: superadmin, or the Attendance grid view granted with "Can edit:
 * Yes". Same polling/portal pattern as ManualEntryAlertsBell; an alert
 * leaves the list once that side is approved or rejected on the grid.
 */
export default function GeofenceAlertsBell() {
  const { canEditModule, approverOf } = useModuleAccess();
  const seesAll = canEditModule("hris.attendance_grid_view");
  // Org Chart heads with Attendance ticked see the ones waiting on them
  // (the backend filters) and review them on Attendance Approvals.
  const visible = seesAll || Boolean(approverOf.attendance);
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenKeysRef = useRef(null);
  const fetchingRef = useRef(false);
  const stoppedRef = useRef(false);

  const loadEntries = useCallback(async () => {
    if (!visible || fetchingRef.current || stoppedRef.current) return;
    fetchingRef.current = true;
    try {
      const data = (await getGeofenceAlerts()) || [];
      const isFirstLoad = seenKeysRef.current === null;
      const seen = seenKeysRef.current || new Set();
      const newOnes = data.filter((e) => !seen.has(e.key));
      seenKeysRef.current = new Set(data.map((e) => e.key));

      if (!isFirstLoad && newOnes.length > 0) {
        toast(
          newOnes.length === 1
            ? `${newOnes[0].employee_name}: ${newOnes[0].side_label} outside the allowed area -- needs review.`
            : `${newOnes.length} new attendance entries outside the allowed area need review.`,
          { icon: "📍" },
        );
      }
      setEntries(data);
    } catch (err) {
      console.error("Failed to load geofence alerts:", err);
      // 401: logged out; 403: no edit access after all -- stop polling.
      if ([401, 403].includes(err.response?.status)) {
        stoppedRef.current = true;
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    loadEntries();
    const interval = setInterval(loadEntries, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadEntries();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [visible, loadEntries]);

  useEffect(() => {
    if (!open) return undefined;
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

  if (!visible) return null;

  const openGrid = (date) => {
    setOpen(false);
    navigate(seesAll ? gridPath(date) : APPROVALS_PATH);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Attendance outside the allowed area -- needs review"
      >
        <MapPinOff size={20} />
        {entries.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
            {entries.length > 9 ? "9+" : entries.length}
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
              className="z-50 rounded-xl border border-border bg-surface shadow-xl"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-fg">
                  Outside Geofence Attendance
                </p>
                <p className="text-xs text-fg-subtle">
                  Time in/out outside the allowed area, last 7 days.
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {entries.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-fg-subtle">
                    Nothing waiting right now.
                  </p>
                ) : (
                  entries.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => openGrid(entry.attendance_date)}
                      className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
                    >
                      <p className="text-sm font-medium text-fg">
                        {entry.employee_name}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {entry.side_label} · {entry.attendance_date}
                        {entry.time ? ` ${entry.time}` : ""}
                      </p>
                      {entry.note && (
                        <p className="mt-0.5 text-[11px] text-danger">
                          {entry.note}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => openGrid(null)}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
                >
                  Open Attendance Review
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
