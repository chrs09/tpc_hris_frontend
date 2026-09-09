import React, { useState } from "react";
import toast from "react-hot-toast";
import { cancelOvertimeRequest } from "../../api/overtimeRequests";

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

export default function OvertimeHistoryList({ requests, onChanged }) {
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancel = async (id) => {
    try {
      setCancellingId(id);
      await cancelOvertimeRequest(id);
      toast.success("Overtime request cancelled.");
      onChanged?.();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Could not cancel overtime request.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (!requests.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
        No overtime requests filed yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="rounded-2xl border border-border bg-surface-hover p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">
                {formatDate(req.ot_date)}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                Clocked in {req.time_in}
                {req.time_out
                  ? ` – ${req.time_out} (${req.computed_hours}h)`
                  : " – still clocked in"}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-fg-subtle">
                Head: {req.requested_by_name || "—"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                req.status === "pending" && !req.time_out
                  ? "bg-primary/15 text-primary"
                  : STATUS_STYLES[req.status] || "bg-surface-active text-fg-muted"
              }`}
            >
              {req.status === "pending" && !req.time_out
                ? "In Progress"
                : req.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-fg-muted">{req.reason}</p>

          {req.selfie_photo_url && (
            <img
              src={req.selfie_photo_url}
              alt="Clock-in selfie"
              className="mt-2 h-16 w-16 rounded-lg border border-border object-cover"
            />
          )}

          {req.status === "approved" && req.approved_hours != null && (
            <p className="mt-2 text-xs text-success">
              Approved hours: {req.approved_hours}h
            </p>
          )}

          {req.remarks && (
            <p className="mt-2 text-xs text-fg-subtle">
              Remarks: {req.remarks}
            </p>
          )}

          {req.status === "pending" && (
            <button
              onClick={() => handleCancel(req.id)}
              disabled={cancellingId === req.id}
              className="mt-3 text-xs font-semibold text-danger hover:text-danger-hover disabled:opacity-50"
            >
              {cancellingId === req.id ? "Cancelling..." : "Cancel Request"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
