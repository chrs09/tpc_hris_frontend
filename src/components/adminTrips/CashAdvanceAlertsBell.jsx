import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import toast from "react-hot-toast";
import {
  acknowledgeCashAdvanceAlert,
  getCashAdvanceAlerts,
  getCashAdvanceRequestsForMyApproval,
} from "../../api/cashAdvanceRequests";
import useModuleAccess from "../../hooks/useModuleAccess";

// Same cadence as HubAlertsBell -- a small, cheap request, not worth
// tuning per-page.
const POLL_INTERVAL_MS = 20000;

const APPROVALS_PATH = "/dashboard/cash-advance-approvals";

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/**
 * Cash advance bell, two parts:
 *  - "Waiting for your approval": requests whose turn is with me -- an
 *    Org Chart head with Cash Advance ticked (e.g. the Operations
 *    Manager head), and the next head up once the first one approves.
 *    Worked out live from /for-my-approval, so it clears itself once
 *    the request moves on.
 *  - "New requests": the CASH_ADVANCE_REQUESTED notices created in
 *    file_cash_advance_request() -- superadmin only, acknowledged by
 *    hand (unchanged).
 * Same polling/toast pattern as HubAlertsBell.
 */
export default function CashAdvanceAlertsBell() {
  const role = localStorage.getItem("role");
  const myUserId = Number(localStorage.getItem("user_id")) || null;
  const isSuperAdmin = role === "superadmin";
  const { approverOf } = useModuleAccess();
  const visible = isSuperAdmin || Boolean(approverOf.cash_advance);
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [open, setOpen] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const buttonRef = useRef(null);
  const seenAlertIdsRef = useRef(null);
  const seenWaitingIdsRef = useRef(null);
  const fetchingRef = useRef(false);
  // Once the session's token is rejected (401), stop polling entirely
  // instead of silently retrying with the same stale token forever.
  const sessionExpiredRef = useRef(false);

  const loadAlerts = useCallback(async () => {
    if (!visible || fetchingRef.current || sessionExpiredRef.current) return;
    fetchingRef.current = true;
    try {
      // Only the request whose turn is with me (requested_by_user_id is
      // kept on the current approver) -- a superadmin can review every
      // pending one, but only the ones addressed to them go here.
      const pending = (await getCashAdvanceRequestsForMyApproval()) || [];
      const mine = pending.filter(
        (r) => r.status === "pending" && r.requested_by_user_id === myUserId,
      );
      const firstWaiting = seenWaitingIdsRef.current === null;
      const seenWaiting = seenWaitingIdsRef.current || new Set();
      const newWaiting = mine.filter((r) => !seenWaiting.has(r.id));
      seenWaitingIdsRef.current = new Set(mine.map((r) => r.id));
      if (!firstWaiting && newWaiting.length > 0) {
        toast(
          newWaiting.length === 1
            ? `${newWaiting[0].employee_name}'s cash advance (${peso(newWaiting[0].approved_amount ?? newWaiting[0].amount)}) is waiting for your approval.`
            : `${newWaiting.length} cash advances are waiting for your approval.`,
          { icon: "💵" },
        );
      }
      setWaiting(mine);

      if (isSuperAdmin) {
        const data = (await getCashAdvanceAlerts()) || [];
        const firstAlerts = seenAlertIdsRef.current === null;
        const seen = seenAlertIdsRef.current || new Set();
        const newOnes = data.filter((a) => !seen.has(a.id));
        seenAlertIdsRef.current = new Set(data.map((a) => a.id));
        if (!firstAlerts && newOnes.length > 0) {
          toast(
            newOnes.length === 1
              ? newOnes[0].message || "A new cash advance was requested."
              : `${newOnes.length} new cash advance requests.`,
            { icon: "💵" },
          );
        }
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to load cash advance alerts:", err);
      if (err.response?.status === 401) {
        sessionExpiredRef.current = true;
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [visible, isSuperAdmin, myUserId]);

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

  // Positions the dropdown via a fixed-coordinate portal instead of
  // Tailwind's `absolute` -- the bell lives inside the sidebar's own
  // scrollable/overflow-hidden container, which was clipping an
  // `absolute`-positioned dropdown on large screens. Same fix pattern
  // as SearchSelect.jsx.
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

  const count = waiting.length + alerts.length;

  const openApprovals = () => {
    setOpen(false);
    navigate(APPROVALS_PATH);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-fg-muted hover:text-fg"
        title="Cash advance requests"
      >
        <Wallet size={20} />
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
              className="z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-fg">
                  Waiting for Your Approval
                </p>
                <p className="text-xs text-fg-subtle">
                  Cash advances whose turn is with you.
                </p>
              </div>

              {waiting.length === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-fg-subtle">
                  Nothing waiting on you.
                </p>
              ) : (
                waiting.map((req) => {
                  const steps = req.approval_steps || [];
                  const stepIndex = steps.findIndex((s) => s.state === "current");
                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={openApprovals}
                      className="block w-full border-b border-border px-4 py-3 text-left hover:bg-surface-hover"
                    >
                      <p className="text-sm font-medium text-fg">
                        {req.employee_name} · {peso(req.approved_amount ?? req.amount)}
                      </p>
                      <p className="line-clamp-2 text-xs text-fg-muted">
                        {req.reason}
                      </p>
                      {steps.length > 1 && stepIndex >= 0 && (
                        <p className="mt-0.5 text-[11px] text-fg-subtle">
                          Approval {stepIndex + 1} of {steps.length}
                          {stepIndex > 0 && ` · approved by ${steps[stepIndex - 1].name}`}
                        </p>
                      )}
                    </button>
                  );
                })
              )}

              {isSuperAdmin && (
                <>
                  <div className="border-b border-t border-border px-4 py-3">
                    <p className="text-sm font-semibold text-fg">
                      New Cash Advance Requests
                    </p>
                    <p className="text-xs text-fg-subtle">
                      Everything filed. Review under Finance → Cash Advance
                      Approvals.
                    </p>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="px-4 py-4 text-center text-sm text-fg-subtle">
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
                </>
              )}

              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={openApprovals}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
                >
                  Open Cash Advance Approvals
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
