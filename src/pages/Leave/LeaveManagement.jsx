import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getAllLeaveRequests,
  getLeaveForMyApproval,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../../api/leave";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import useModuleAccess from "../../hooks/useModuleAccess";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-muted",
};

export default function LeaveManagement({ embedded = false }) {
  const canEditPage = usePageCanEdit();
  // Superadmin sees every request; an Org Chart head with Leave ticked
  // sees the ones on their chain.
  const { isSuperAdmin } = useModuleAccess();
  const hasLeaveModule = isSuperAdmin;
  const [leaves, setLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const viewerRole = localStorage.getItem("role");
  const [search, setSearch] = useState("");
  const filteredLeaves = leaves.filter((leave) =>
    matchesSearch(
      search,
      leave.employee_name,
      leave.employee_role,
      leave.leave_type,
      leave.start_date,
      leave.end_date,
      leave.reason,
      leave.status,
    ),
  );
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredLeaves,
    15,
  );

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = hasLeaveModule
        ? await getAllLeaveRequests(statusFilter === "all" ? undefined : statusFilter)
        : await getLeaveForMyApproval();
      setLeaves(data);
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
      toast.error("Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, hasLeaveModule]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleApprove = async (id) => {
    try {
      setActioningId(id);
      const result = await approveLeaveRequest(id);
      const next = result?.approval_steps?.find((s) => s.state === "current");
      toast.success(
        result?.status === "pending" && next
          ? `Approved -- passed to ${next.name} for the next approval.`
          : "Leave request approved.",
      );
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    const remarks = await promptDialog("Reason for rejecting this leave request (optional):");
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
    <div className="space-y-5">
      {!embedded && <SectionTabs group="HRIS" />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">
          Leave Requests
        </h1>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, type, reason..."
        />

        {hasLeaveModule && (
        <div className="w-40">
          <SearchSelect
            value={
              [
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "cancelled", label: "Cancelled" },
                { value: "all", label: "All" },
              ].find((option) => option.value === statusFilter) || null
            }
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "cancelled", label: "Cancelled" },
              { value: "all", label: "All" },
            ]}
            onChange={(option) => setStatusFilter(option?.value ?? "pending")}
            placeholder="Select status"
          />
        </div>
        )}
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
              paginatedItems.map((leave) => (
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
                    <ApprovalProgress steps={leave.approval_steps} className="mt-2" />
                    <ApprovedBy log={leave.approval_log} className="mt-1" />
                    {leave.can_act === false && (
                      <p className="mt-1 text-[11px] text-fg-muted">
                        You&apos;re marked {leave.viewer_away || "away"} today -- you
                        can&apos;t approve or reject it today.
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {leave.status === "pending" ? (
                      !leave.approval_steps?.length &&
                      leave.employee_role === "admin" &&
                      viewerRole !== "superadmin" ? (
                        <span className="text-xs italic text-fg-subtle">
                          Only a superadmin can review this
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          {canEditPage && (
                            <button
                            onClick={() => handleApprove(leave.id)}
                            disabled={actioningId === leave.id || leave.can_act === false}
                            className="rounded-lg bg-success px-3 py-1 text-xs font-semibold text-success-foreground disabled:opacity-50"
                          >
                            Approve
                          </button>
                          )}
                          {canEditPage && (
                            <button
                            onClick={() => handleReject(leave.id)}
                            disabled={actioningId === leave.id || leave.can_act === false}
                            className="rounded-lg bg-danger px-3 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-50"
                          >
                            Reject
                          </button>
                          )}
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

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
