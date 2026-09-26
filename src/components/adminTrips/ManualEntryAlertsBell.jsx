import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { getWaitingManualEntries } from "../../api/tripManualEntries";

// Only superadmin approves Trip Manual Entries (require_superadmin on the
// backend's /admin/trip-manual-entries/waiting endpoint).
const VISIBLE_ROLES = ["superadmin"];

const POLL_INTERVAL_MS = 20000;

const PAGE_PATH = "/dashboard/admin/trip-manual-entries";

/**
 * Bell for coordinator_admin Trip Manual Entries waiting for superadmin
 * approval. Same polling/portal pattern as CashAdvanceAlertsBell; no
 * acknowledge step -- an entry leaves the list once it's approved or
 * rejected. Clicking one opens its View window on the Manual Entries page.
 */
export default function ManualEntryAlertsBell() {
  const role = localStorage.getItem("role");
  const visible = VISIBLE_ROLES.includes(role);
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenIdsRef = useRef(null);
  const fetchingRef = useRef(false);
  const sessionExpiredRef = useRef(false);

  const loadEntries = useCallback(async () => {
    if (!visible || fetchingRef.current || sessionExpiredRef.current) return;
    fetchingRef.current = true;
    try {
      const data = (await getWaitingManualEntries()) || [];
      const isFirstLoad = seenIdsRef.current === null;
      const seen = seenIdsRef.current || new Set();
      const newOnes = data.filter((e) => !seen.has(e.trip_id));
      seenIdsRef.current = new Set(data.map((e) => e.trip_id));

      if (!isFirstLoad && newOnes.length > 0) {
        toast(
          newOnes.length === 1
            ? `New manual trip entry from ${newOnes[0].entered_by || "a coordinator"} needs approval.`
            : `${newOnes.length} new manual trip entries need approval.`,
          { icon: "📝" },
        );
      }
      setEntries(data);
    } catch (err) {
      console.error("Failed to load manual entry alerts:", err);
      if (err.response?.status === 401) sessionExpiredRef.current = true;
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
    // The Manual Entries page announces approvals/rejections so the
    // count updates right away instead of on the next poll.
    window.addEventListener("manual-entries-changed", loadEntries);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("manual-entries-changed", loadEntries);
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

  const openEntry = (tripId) => {
    setOpen(false);
    navigate(tripId ? `${PAGE_PATH}?view=${tripId}` : PAGE_PATH);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Manual trip entries waiting for approval"
      >
        <ClipboardList size={20} />
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
                  Manual Entries for Approval
                </p>
                <p className="text-xs text-fg-subtle">
                  Trips entered by coordinator admins.
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
                      key={entry.trip_id}
                      type="button"
                      onClick={() => openEntry(entry.trip_id)}
                      className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
                    >
                      <p className="text-sm font-medium text-fg">
                        {entry.trip_code} · {entry.driver_name || "-"}
                      </p>
                      <p className="text-xs text-fg-muted">
                        Trip on {entry.trip_date} · {entry.ticket_no}
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        Entered by {entry.entered_by || "-"} · {entry.entered_at}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => openEntry(null)}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
                >
                  Open Trip Manual Entries
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
