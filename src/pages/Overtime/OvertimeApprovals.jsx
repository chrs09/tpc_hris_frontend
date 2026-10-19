import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveOvertimeRequest,
  getOvertimeRequestsForMyApproval,
  rejectOvertimeRequest,
} from "../../api/overtimeRequests";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import OvertimeApprovalHistory from "../../components/overtime/OvertimeApprovalHistory";
import ViewToggle from "../../components/ui/viewToggle/ViewToggle";
import useViewType from "../../hooks/useViewType";

// created_at comes back as UTC without a zone marker.
const filedOn = (value) =>
  value
    ? new Date(/Z|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`).toLocaleDateString(
        "en-PH",
        { month: "short", day: "numeric", year: "numeric" },
      )
    : "";

export default function OvertimeApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [editedHours, setEditedHours] = useState({});
  const [previewPhoto, setPreviewPhoto] = useState(null);
  // Cards or a compact list (remembered per browser).
  const [viewType, setViewType] = useViewType("overtime_approvals_view");
  // Waiting for me / what I already approved or rejected.
  const [tab, setTab] = useState("pending");
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    requests,
    10,
  );

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getOvertimeRequestsForMyApproval();
      setRequests(data);
      setEditedHours((prev) => {
        const next = { ...prev };
        data.forEach((r) => {
          // An earlier head in the Org Chart chain may have set hours.
          if (next[r.id] === undefined) {
            next[r.id] = r.approved_hours ?? r.computed_hours;
          }
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
      const result = await approveOvertimeRequest(request.id, {
        approvedHours: Number(editedHours[request.id] ?? request.computed_hours),
      });
      const next = result?.approval_steps?.find((s) => s.state === "current");
      toast.success(
        result?.status === "pending" && next
          ? `Approved -- passed to ${next.name} for the next approval.`
          : "Overtime request approved.",
      );
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (request) => {
    const remarks = await promptDialog("Reason for rejecting this overtime request (optional):");
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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-fg">Overtime Approvals</h2>
            <p className="mt-1 text-sm text-fg-subtle">
              Overtime requests where you're the designated approver or the
              employee's immediate head.
            </p>
          </div>
          {tab === "pending" && <ViewToggle viewType={viewType} onChange={setViewType} />}
        </div>

        <div className="flex gap-1 border-b border-border">
          {[
            ["pending", `Waiting for you${requests.length ? ` (${requests.length})` : ""}`],
            ["history", "History"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                tab === key
                  ? "border-primary text-fg"
                  : "border-transparent text-fg-subtle hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "history" ? (
          <OvertimeApprovalHistory />
        ) : loading ? (
          <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
            Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
            No pending overtime requests for you to review.
          </div>
        ) : viewType === "list" ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Overtime</th>
                    <th className="px-4 py-3 text-left font-medium">Approved hours</th>
                    <th className="px-4 py-3 text-left font-medium">Notes</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((req) => {
                    const flags = [
                      req.after_attendance_time_out &&
                        (req.filed_in_advance ? "Left before planned end" : "Call-back"),
                      req.filed_in_advance && !req.after_attendance_time_out && "Filed in advance",
                      req.filed_late && "Filed late",
                      !req.filed_late && req.manual_time_out && "Typed time out",
                      !req.can_approve && "Not clocked out",
                    ].filter(Boolean);
                    const current = req.approval_steps?.find((st) => st.state === "current");
                    return (
                      <tr key={req.id} className="border-t border-border align-top hover:bg-surface-hover">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-fg">{req.employee_name}</p>
                          <p className="line-clamp-2 max-w-[220px] text-xs text-fg-subtle" title={req.reason}>
                            {req.reason}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          <p className="whitespace-nowrap">{req.ot_date}</p>
                          <p className="whitespace-nowrap text-xs">
                            {req.time_in}
                            {req.time_out ? ` – ${req.time_out} (${req.computed_hours}h)` : " – not finished"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            aria-label={`Approved hours for ${req.employee_name}`}
                            disabled={!req.can_approve}
                            value={editedHours[req.id] ?? req.computed_hours ?? ""}
                            onChange={(e) =>
                              setEditedHours((prev) => ({ ...prev, [req.id]: e.target.value }))
                            }
                            className="w-20 rounded-lg border border-border bg-background p-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {flags.map((flag) => (
                              <span
                                key={flag}
                                className="whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning"
                              >
                                {flag}
                              </span>
                            ))}
                            {req.selfie_photo_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto(req.selfie_photo_url)}
                                className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-primary"
                              >
                                Photo
                              </button>
                            )}
                          </div>
                          {current?.name && (
                            <p className="mt-1 text-[11px] text-fg-subtle">
                              {req.can_act === false ? `Passed to ${current.name}` : `Waiting on ${current.name}`}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={actioningId === req.id || !req.can_approve || req.can_act === false}
                              title={!req.can_approve ? "Employee hasn't clocked out yet" : undefined}
                              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req)}
                              disabled={actioningId === req.id || req.can_act === false}
                              className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedItems.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-fg">{req.employee_name}</p>
                    <p className="text-sm text-fg-subtle">
                      {req.ot_date} · {req.time_in}
                      {req.time_out
                        ? ` – ${req.time_out} (${req.computed_hours}h)`
                        : " – not finished yet"}
                      {req.created_at && ` · Filed ${filedOn(req.created_at)}`}
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

                {req.after_attendance_time_out && (
                  <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                    {req.filed_in_advance
                      ? `Left at ${req.attendance_time_out}, before the planned end -- adjust the approved hours if needed.`
                      : `After attendance time out (${req.attendance_time_out}) -- call-back. Confirm they came back before approving.`}
                  </p>
                )}

                {req.filed_in_advance && !req.after_attendance_time_out && (
                  <p className="mt-2 text-xs font-semibold text-primary">
                    Filed in advance
                    {req.attendance_time_out
                      ? ` · attendance time out ${req.attendance_time_out}`
                      : " · no attendance time out yet -- check again later"}
                  </p>
                )}

                {(req.filed_late || req.manual_time_out) && (
                  <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
                    <p className="font-semibold text-warning">
                      {req.filed_late
                        ? "Filed the next day"
                        : "Time out typed in -- forgot to clock out"}
                    </p>
                    {req.late_note && !req.filed_late && (
                      <p className="text-fg-muted">“{req.late_note}”</p>
                    )}
                    <p className="text-fg-muted">
                      Attendance time out that day:{" "}
                      {req.attendance_time_out || "none recorded"}
                    </p>
                  </div>
                )}

                <ApprovalProgress steps={req.approval_steps} className="mt-2" />
                {req.can_act === false && (
                  <p className="mt-2 rounded-lg bg-surface-hover px-3 py-2 text-xs text-fg-muted">
                    You&apos;re marked {req.viewer_away || "away"} today, so this was
                    passed to{" "}
                    {req.approval_steps?.find((s) => s.state === "current")?.name ||
                      "the next approver"}
                    . You can&apos;t approve or reject it today.
                  </p>
                )}
                <ApprovedBy log={req.approval_log} className="mt-2" />

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
                    disabled={actioningId === req.id || !req.can_approve || req.can_act === false}
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
                    disabled={actioningId === req.id || req.can_act === false}
                    className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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
