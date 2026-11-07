import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  cancelScheduleChange,
  getMyScheduleChanges,
  getScheduleChangeEligibility,
} from "../../api/scheduleChanges";
import ApprovalProgress from "../approvals/ApprovalProgress";
import ApprovedBy from "../approvals/ApprovedBy";
import ScheduleChangeModal from "./ScheduleChangeModal";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};

// The logged-in employee's schedule change requests (a different time on
// a day), for the dashboards. Only for people allowed on their 201.
// Returns { canRequest, openForm, button, content, modal }.
export default function useMyScheduleChanges() {
  const [canRequest, setCanRequest] = useState(false);
  const [items, setItems] = useState([]);
  const [filing, setFiling] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    getMyScheduleChanges()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    getScheduleChangeEligibility()
      .then((data) => {
        setCanRequest(Boolean(data?.can_file));
        if (data?.can_file) {
          getMyScheduleChanges()
            .then(setItems)
            .catch(() => setItems([]));
        }
      })
      .catch(() => setCanRequest(false));
  }, []);

  const cancel = async (id) => {
    try {
      setBusyId(id);
      const res = await cancelScheduleChange(id);
      toast.success(res.message || "Cancelled.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not cancel.");
    } finally {
      setBusyId(null);
    }
  };

  const button = (
    <button
      type="button"
      onClick={() => setFiling(true)}
      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
    >
      + Request
    </button>
  );

  const content = !items.length ? (
    <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
      No schedule changes yet. Need a different time on a day? Request it before the day.
    </div>
  ) : (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-surface-hover p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">{item.date_label}</p>
              <p className="mt-1 text-xs text-fg-muted">
                {item.time_in_label} – {item.time_out_label}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                STATUS_STYLES[item.status] || "bg-surface-active text-fg-muted"
              }`}
            >
              {item.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-fg-muted">{item.reason}</p>
          <ApprovalProgress steps={item.approval_steps} className="mt-2" />
          <ApprovedBy log={item.approval_log} className="mt-2" />
          {["pending", "approved"].includes(item.status) && (
            <button
              type="button"
              onClick={() => cancel(item.id)}
              disabled={busyId === item.id}
              className="mt-3 w-full rounded-xl border border-danger/30 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              {busyId === item.id ? "Cancelling..." : "Cancel Request"}
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const modal = filing ? (
    <ScheduleChangeModal onClose={() => setFiling(false)} onFiled={load} />
  ) : null;

  return { canRequest, openForm: () => setFiling(true), button, content, modal };
}
