import React, { useState } from "react";
import toast from "react-hot-toast";
import { finishOvertime } from "../../api/overtimeRequests";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// Clocked in but forgot to clock out: enter when the overtime really
// ended (pre-filled from the attendance time out) and why it wasn't
// clocked. Approvers see it flagged as a typed-in time out.
export default function FinishOvertimeModal({
  request,
  suggestedTimeOut,
  onClose,
  onDone,
}) {
  const [timeOut, setTimeOut] = useState(suggestedTimeOut || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!timeOut) return toast.error("Enter the time out.");
    if (!note.trim()) return toast.error("Say briefly what happened.");
    try {
      setSubmitting(true);
      await finishOvertime(request.id, { timeOut, note: note.trim() });
      toast.success("Overtime time out saved -- sent for approval.");
      onDone?.();
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
          <h2 className="text-lg font-bold text-fg">Enter Overtime Time Out</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <p className="mb-4 rounded-xl bg-primary/10 p-3 text-xs text-fg-muted">
          You clocked in on {request.ot_date} at {request.time_in} but didn&apos;t
          clock out. Enter when it really ended.
          {suggestedTimeOut && ` Your attendance time out that day was ${suggestedTimeOut}.`}
        </p>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-fg-muted">
            Time out
            <input
              type="time"
              value={timeOut}
              onChange={(e) => setTimeOut(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg"
            />
          </label>
          <label className="block text-sm font-medium text-fg-muted">
            What happened?
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Forgot to tap Overtime Out"
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Time Out"}
        </button>
      </form>
    </div>
  );
}
