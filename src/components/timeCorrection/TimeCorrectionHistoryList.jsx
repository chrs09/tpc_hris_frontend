import React, { useState } from "react";
import toast from "react-hot-toast";
import { cancelTimeCorrection } from "../../api/attendance/requests";
import ApprovalProgress from "../approvals/ApprovalProgress";
import ApprovedBy from "../approvals/ApprovedBy";
import CorrectionPhotos from "./CorrectionPhotos";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};

// The employee's own time corrections, newest day first. missedDays:
// days their head confirmed they worked, still without a time in -- each
// with a "File" button (onFile(date)).
export default function TimeCorrectionHistoryList({ requests, missedDays = [], onFile, onChanged }) {
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancel = async (id) => {
    try {
      setCancellingId(id);
      await cancelTimeCorrection(id);
      toast.success("Time correction cancelled.");
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not cancel.");
    } finally {
      setCancellingId(null);
    }
  };

  const toFile = missedDays.filter((day) => !day.filed);

  return (
    <div className="space-y-3">
      {toFile.map((day) => (
        <div
          key={day.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4"
        >
          <p className="text-sm text-fg">
            No time in on <strong>{day.date_label}</strong> -- your head confirmed you worked.
            File your time.
          </p>
          <button
            type="button"
            onClick={() => onFile?.(day.attendance_date)}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            File
          </button>
        </div>
      ))}

      {!requests.length ? (
        <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
          No time corrections filed yet.
        </div>
      ) : (
        requests.map((request) => (
          <div key={request.id} className="rounded-2xl border border-border bg-surface-hover p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-fg">{request.date_label}</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {[
                    request.time_in && `In ${request.time_in}`,
                    request.time_out && `Out ${request.time_out}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  STATUS_STYLES[request.status] || "bg-surface-active text-fg-muted"
                }`}
              >
                {request.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-fg-muted">{request.reason}</p>
            <CorrectionPhotos item={request} className="mt-2" />
            <ApprovalProgress steps={request.approval_steps} className="mt-2" />
            <ApprovedBy log={request.approval_log} className="mt-2" />
            {request.status === "pending" && (
              <button
                type="button"
                onClick={() => handleCancel(request.id)}
                disabled={cancellingId === request.id}
                className="mt-3 w-full rounded-xl border border-danger/30 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                {cancellingId === request.id ? "Cancelling..." : "Cancel Request"}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
