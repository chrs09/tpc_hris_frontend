import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import {
  deleteOlderErrorLogs,
  getErrorLogCleanupInfo,
} from "../../api/errorLogs";

// Error Logs -> "Delete older logs" (superadmin): pick how much to keep,
// see how many logs go, confirm. Logs older than last month are also
// removed automatically once a day (backend app/services/log_cleanup.py).

const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function DeleteOlderLogsModal({ onClose, onDeleted }) {
  const [choices, setChoices] = useState(null);
  const [before, setBefore] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getErrorLogCleanupInfo()
      .then((data) => {
        setChoices(data.choices || []);
        setBefore(data.choices?.[1]?.before || data.choices?.[0]?.before || "");
      })
      .catch(() => {
        toast.error("Couldn't load the log counts.");
        setChoices([]);
      });
  }, []);

  const picked = (choices || []).find((c) => c.before === before);

  const remove = async () => {
    try {
      setDeleting(true);
      const result = await deleteOlderErrorLogs(before);
      toast.success(
        `Deleted ${result.deleted} log${result.deleted === 1 ? "" : "s"} before ${formatDay(before)}.`,
      );
      await onDeleted?.();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Couldn't delete the logs.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !deleting && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface text-fg shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">Delete older logs</h3>
            <p className="text-xs text-fg-subtle">
              Logs older than last month are already removed automatically once a
              day. The same errors stay in Slack.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4">
          {!choices ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : (
            choices.map((choice) => (
              <label
                key={choice.before}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                  before === choice.before
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-surface-hover"
                }`}
              >
                <input
                  id={`delete-before-${choice.before}`}
                  type="radio"
                  name="delete-before"
                  checked={before === choice.before}
                  onChange={() => {
                    setBefore(choice.before);
                    setConfirming(false);
                  }}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="block font-medium">{choice.label}</span>
                  <span className="text-xs text-fg-muted">
                    Deletes {choice.count} log{choice.count === 1 ? "" : "s"} before{" "}
                    {formatDay(choice.before)}
                  </span>
                </span>
              </label>
            ))
          )}

          {confirming && picked && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              Delete {picked.count} log{picked.count === 1 ? "" : "s"} before{" "}
              {formatDay(picked.before)}? This can&apos;t be undone.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={confirming ? () => setConfirming(false) : onClose}
            disabled={deleting}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            {confirming ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={confirming ? remove : () => setConfirming(true)}
            disabled={deleting || !picked || picked.count === 0}
            className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground hover:opacity-90 disabled:opacity-50"
          >
            {deleting
              ? "Deleting..."
              : confirming
                ? "Yes, delete"
                : picked && picked.count === 0
                  ? "Nothing to delete"
                  : `Delete ${picked?.count ?? ""} logs`}
          </button>
        </div>
      </div>
    </div>
  );
}
