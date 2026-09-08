import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fileOvertimeRequest,
  getOvertimeApprovers,
} from "../../api/overtimeRequests";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const computePreviewHours = (otDate, timeIn, timeOut) => {
  if (!otDate || !timeIn || !timeOut) return null;
  const start = new Date(`${otDate}T${timeIn}:00`);
  let end = new Date(`${otDate}T${timeOut}:00`);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
};

export default function OvertimeRequestModal({ onClose, onFiled }) {
  const [approvers, setApprovers] = useState([]);
  const [loadingApprovers, setLoadingApprovers] = useState(true);
  const [requestedBy, setRequestedBy] = useState("");
  const [otDate, setOtDate] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getOvertimeApprovers()
      .then(setApprovers)
      .catch(() => toast.error("Failed to load approver list."))
      .finally(() => setLoadingApprovers(false));
  }, []);

  const previewHours = computePreviewHours(otDate, timeIn, timeOut);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!requestedBy || !otDate || !timeIn || !timeOut || !reason.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      setSubmitting(true);
      await fileOvertimeRequest({
        requested_by_user_id: Number(requestedBy),
        ot_date: otDate,
        time_in: timeIn,
        time_out: timeOut,
        reason: reason.trim(),
      });
      toast.success("Overtime request submitted.");
      onFiled?.();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">File Overtime Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">
              Requested By (Approver)
            </label>
            <select
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            >
              <option value="" disabled>
                {loadingApprovers ? "Loading..." : "Select who requested this OT"}
              </option>
              {approvers.map((a) => (
                <option key={a.id} value={a.user_id}>
                  {a.username}
                </option>
              ))}
            </select>
            {!loadingApprovers && approvers.length === 0 && (
              <p className="mt-1 text-xs text-danger">
                No overtime approvers have been set up yet. Contact your admin.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">
              Date
            </label>
            <input
              type="date"
              value={otDate}
              onChange={(e) => setOtDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">
                Time In
              </label>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">
                Time Out
              </label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          </div>

          {previewHours !== null && (
            <p className="text-xs text-fg-subtle">
              Computed hours: <span className="font-semibold text-fg">{previewHours}</span>
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why were you called in for overtime?"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || (!loadingApprovers && approvers.length === 0)}
          className="mt-6 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Overtime Request"}
        </button>
      </form>
    </div>
  );
}
