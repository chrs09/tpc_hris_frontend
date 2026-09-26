import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Fuel } from "lucide-react";
import toast from "react-hot-toast";
import { getFuelRequestAlerts } from "../../api/fuelRequests";

// Coordinator admins handle fuel requests (superadmin too). See
// app/api/fuel_requests.py (/fuel-requests/alerts).
const VISIBLE_ROLES = ["superadmin", "coordinator_admin"];

const POLL_INTERVAL_MS = 20000;

const PAGE_PATH = "/dashboard/admin/fuel-requests";

// A request can need action twice (new request, then its receipt), so
// "seen" is tracked per request + status.
const keyOf = (item) => `${item.id}:${item.status}`;

/**
 * Bell for driver fuel requests needing the coordinator admin: new
 * requests waiting for a fuel code, and receipts waiting to be checked.
 * Same polling/portal pattern as ManualEntryAlertsBell; an item leaves
 * once it's been acted on. Clicking one opens it on the Fuel Requests page.
 */
export default function FuelRequestAlertsBell() {
  const role = localStorage.getItem("role");
  const visible = VISIBLE_ROLES.includes(role);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenRef = useRef(null);
  const fetchingRef = useRef(false);
  const sessionExpiredRef = useRef(false);

  const loadItems = useCallback(async () => {
    if (!visible || fetchingRef.current || sessionExpiredRef.current) return;
    fetchingRef.current = true;
    try {
      const data = (await getFuelRequestAlerts()) || [];
      const isFirstLoad = seenRef.current === null;
      const seen = seenRef.current || new Set();
      const newOnes = data.filter((item) => !seen.has(keyOf(item)));
      seenRef.current = new Set(data.map(keyOf));

      if (!isFirstLoad && newOnes.length > 0) {
        const first = newOnes[0];
        toast(
          newOnes.length > 1
            ? `${newOnes.length} fuel requests need attention.`
            : first.status === "receipt_submitted"
              ? `${first.driver_name || "A driver"} sent a fuel receipt.`
              : `${first.driver_name || "A driver"} requested fuel (${first.plate_number}).`,
          { icon: "⛽" },
        );
      }
      setItems(data);
    } catch (err) {
      console.error("Failed to load fuel request alerts:", err);
      if (err.response?.status === 401) sessionExpiredRef.current = true;
    } finally {
      fetchingRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    loadItems();
    const interval = setInterval(loadItems, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadItems();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    // The Fuel Requests page announces changes so the count updates
    // right away instead of on the next poll.
    window.addEventListener("fuel-requests-changed", loadItems);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("fuel-requests-changed", loadItems);
    };
  }, [visible, loadItems]);

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

  const openItem = (id) => {
    setOpen(false);
    navigate(id ? `${PAGE_PATH}?view=${id}` : PAGE_PATH);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Fuel requests"
      >
        <Fuel size={20} />
        {items.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
            {items.length > 9 ? "9+" : items.length}
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
                <p className="text-sm font-semibold text-fg">Fuel Requests</p>
                <p className="text-xs text-fg-subtle">
                  New requests and receipts to check.
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-fg-subtle">
                    Nothing waiting right now.
                  </p>
                ) : (
                  items.map((item) => (
                    <button
                      key={keyOf(item)}
                      type="button"
                      onClick={() => openItem(item.id)}
                      className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
                    >
                      <p className="text-sm font-medium text-fg">
                        {item.driver_name || "-"} · {item.plate_number}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {item.status === "receipt_submitted"
                          ? `Receipt to check · sent ${item.receipt_submitted_at}`
                          : `Needs a fuel code · ${item.city}`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        Requested {item.created_at}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => openItem(null)}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
                >
                  Open Fuel Requests
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
