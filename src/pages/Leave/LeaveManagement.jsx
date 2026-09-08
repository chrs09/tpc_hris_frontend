import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../../api/leave";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const viewerRole = localStorage.getItem("role");

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllLeaveRequests(
        statusFilter === "all" ? undefined : statusFilter,
      );
      setLeaves(data);
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
      toast.error("Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleApprove = async (id) => {
    try {
      setActioningId(id);
      await approveLeaveRequest(id);
      toast.success("Leave request approved.");
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    const remarks = window.prompt("Reason for rejecting this leave request (optional):");
    if (remarks === null) return;

    try {
      setActioningId(id);
      await rejectLeaveRequest(id, remarks || undefined);
      toast.success("Leave request rejected.");
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">
          Leave Requests
        </h1>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="appearance-none rounded-full border border-border bg-surface-hover px-3 py-1 text-sm font-medium text-fg-muted hover:bg-surface-active"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-fg-muted">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && leaves.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-fg-muted">
                  No leave requests found.
                </td>
              </tr>
            )}

            {!loading &&
              leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">
                    {leave.employee_name || `Employee #${leave.employee_id}`}
                  </td>
                  <td className="px-4 py-3 capitalize text-fg-muted">
                    {leave.employee_role || "—"}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {leave.position || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize text-fg-muted">
                    {leave.leave_type}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {leave.start_date}
                    {leave.start_date !== leave.end_date && ` – ${leave.end_date}`}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-fg-muted" title={leave.reason}>
                    {leave.reason}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[leave.status] || "bg-surface-active text-fg-muted"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {leave.status === "pending" ? (
                      leave.employee_role === "admin" && viewerRole !== "superadmin" ? (
                        <span className="text-xs italic text-fg-subtle">
                          Only a superadmin can review this
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(leave.id)}
                            disabled={actioningId === leave.id}
                            className="rounded-lg bg-success px-3 py-1 text-xs font-semibold text-success-foreground disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(leave.id)}
                            disabled={actioningId === leave.id}
                            className="rounded-lg bg-danger px-3 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-fg-subtle">
                        {leave.review_remarks || "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
