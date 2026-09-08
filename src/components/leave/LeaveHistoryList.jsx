import React, { useState } from "react";
import toast from "react-hot-toast";
import { cancelLeaveRequest } from "../../api/leave";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function LeaveHistoryList({ leaves, onChanged }) {
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancel = async (id) => {
    try {
      setCancellingId(id);
      await cancelLeaveRequest(id);
      toast.success("Leave request cancelled.");
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not cancel leave request.");
    } finally {
      setCancellingId(null);
    }
  };

  if (!leaves.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
        No leave requests filed yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaves.map((leave) => (
        <div
          key={leave.id}
          className="rounded-2xl border border-border bg-surface-hover p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">
                {formatDate(leave.start_date)}
                {leave.start_date !== leave.end_date &&
                  ` – ${formatDate(leave.end_date)}`}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-fg-subtle">
                Unpaid Leave
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                STATUS_STYLES[leave.status] || "bg-surface-active text-fg-muted"
              }`}
            >
              {leave.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-fg-muted">{leave.reason}</p>

          {leave.review_remarks && (
            <p className="mt-2 text-xs text-fg-subtle">
              Admin remarks: {leave.review_remarks}
            </p>
          )}

          {leave.status === "pending" && (
            <button
              onClick={() => handleCancel(leave.id)}
              disabled={cancellingId === leave.id}
              className="mt-3 text-xs font-semibold text-danger hover:text-danger-hover disabled:opacity-50"
            >
              {cancellingId === leave.id ? "Cancelling..." : "Cancel Request"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
