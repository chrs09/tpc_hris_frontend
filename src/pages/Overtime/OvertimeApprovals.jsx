import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveOvertimeRequest,
  getOvertimeRequestsForMyApproval,
  rejectOvertimeRequest,
} from "../../api/overtimeRequests";

export default function OvertimeApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [editedHours, setEditedHours] = useState({});
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getOvertimeRequestsForMyApproval();
      setRequests(data);
      setEditedHours((prev) => {
        const next = { ...prev };
        data.forEach((r) => {
          if (next[r.id] === undefined) next[r.id] = r.computed_hours;
        });
        return next;
      });
    } catch (error) {
      console.error("Failed to load overtime approvals:", error);
      toast.error("Failed to load overtime requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (request) => {
    try {
      setActioningId(request.id);
      await approveOvertimeRequest(request.id, {
        approvedHours: Number(editedHours[request.id] ?? request.computed_hours),
      });
      toast.success("Overtime request approved.");
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (request) => {
    const remarks = window.prompt("Reason for rejecting this overtime request (optional):");
    if (remarks === null) return;
    try {
      setActioningId(request.id);
      await rejectOvertimeRequest(request.id, remarks || undefined);
      toast.success("Overtime request rejected.");
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-fg">Overtime Approvals</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Overtime requests where you're the designated approver or the
            employee's immediate head.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
            Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
            No pending overtime requests for you to review.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-fg">{req.employee_name}</p>
                    <p className="text-sm text-fg-subtle">
                      {req.ot_date} · Clocked in {req.time_in}
                      {req.time_out
                        ? ` – ${req.time_out} (${req.computed_hours}h)`
                        : " – still clocked in"}
                    </p>
                  </div>
                  {req.can_approve ? (
                    <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                      Pending Approval
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      In Progress
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-fg-muted">{req.reason}</p>

                {req.selfie_photo_url && (
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(req.selfie_photo_url)}
                    className="mt-3 block"
                  >
                    <img
                      src={req.selfie_photo_url}
                      alt="Clock-in selfie"
                      className="h-24 w-24 rounded-xl border border-border object-cover transition hover:opacity-90"
                    />
                  </button>
                )}

                {!req.can_approve && (
                  <p className="mt-3 text-xs italic text-fg-subtle">
                    Waiting for {req.employee_name} to clock out before this
                    can be approved.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-fg-muted">
                      Approved Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      disabled={!req.can_approve}
                      value={editedHours[req.id] ?? req.computed_hours ?? ""}
                      onChange={(e) =>
                        setEditedHours((prev) => ({
                          ...prev,
                          [req.id]: e.target.value,
                        }))
                      }
                      className="w-28 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                    />
                  </div>

                  <button
                    onClick={() => handleApprove(req)}
                    disabled={actioningId === req.id || !req.can_approve}
                    title={
                      !req.can_approve
                        ? "Employee hasn't clocked out yet"
                        : undefined
                    }
                    className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={actioningId === req.id}
                    className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 text-2xl leading-none text-white hover:text-white/70"
            >
              ✕
            </button>
            <img
              src={previewPhoto}
              alt="Clock-in selfie"
              className="max-h-[90vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
