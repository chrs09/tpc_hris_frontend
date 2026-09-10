import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveCashAdvanceRequest,
  getAllCashAdvanceRequests,
  getCashAdvanceRequestsForMyApproval,
  rejectCashAdvanceRequest,
} from "../../api/cashAdvanceRequests";

const STATUS_STYLES = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-surface-active text-fg-subtle",
};

// Pending cash advance requests the current user can act on -- for
// superadmin this is effectively every pending request system-wide
// (see _can_review in app/api/cash_advance_request.py, which always
// allows the superadmin role), since a department's Cash Advance Head
// may not be configured yet and falls back to superadmin at filing time.
//
// Also includes an "All Requests" tab (every status, full history) for
// the Finance module, backed by GET /cash-advance-requests/all.
export default function CashAdvanceApprovals() {
  const [tab, setTab] = useState("pending");

  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const [allRequests, setAllRequests] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const loadPending = async () => {
    try {
      setLoadingPending(true);
      const data = await getCashAdvanceRequestsForMyApproval();
      setPending(data);
    } catch (error) {
      console.error("Failed to load cash advance approvals:", error);
      toast.error("Failed to load cash advance requests.");
    } finally {
      setLoadingPending(false);
    }
  };

  const loadAll = async () => {
    try {
      setLoadingAll(true);
      const data = await getAllCashAdvanceRequests();
      setAllRequests(data);
      setAllLoaded(true);
    } catch (error) {
      console.error("Failed to load all cash advance requests:", error);
      toast.error("Failed to load cash advance history.");
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  // Load the "All Requests" list lazily, the first time that tab is
  // opened, instead of always fetching it up front.
  useEffect(() => {
    if (tab === "all" && !allLoaded) loadAll();
  }, [tab, allLoaded]);

  const handleApprove = async (request) => {
    try {
      setActioningId(request.id);
      await approveCashAdvanceRequest(request.id);
      toast.success("Cash advance approved.");
      await loadPending();
      if (allLoaded) await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (request) => {
    const remarks = window.prompt(
      "Reason for rejecting this cash advance request (optional):",
    );
    if (remarks === null) return;
    try {
      setActioningId(request.id);
      await rejectCashAdvanceRequest(request.id, remarks || undefined);
      toast.success("Cash advance rejected.");
      await loadPending();
      if (allLoaded) await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-fg">Cash Advances</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Review pending requests, or browse the full history of every
            cash advance filed.
          </p>
        </div>

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "pending"
                ? "border-b-2 border-primary text-primary"
                : "text-fg-subtle hover:text-fg"
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "all"
                ? "border-b-2 border-primary text-primary"
                : "text-fg-subtle hover:text-fg"
            }`}
          >
            All Requests
          </button>
        </div>

        {tab === "pending" &&
          (loadingPending ? (
            <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
              Loading...
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
              No pending cash advance requests for you to review.
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-fg">
                        {req.employee_name}
                      </p>
                      <p className="text-sm text-fg-subtle">
                        Filed {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                      Pending Approval
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-fg-subtle">
                        Amount Requested
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        ₱{req.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-subtle">
                        Deduction / Pay
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        ₱{req.deduction_per_pay_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-subtle">
                        Est. Pay Periods
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        {req.estimated_pay_periods ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-subtle">
                        Terms Acknowledged
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        {req.terms_accepted ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-fg-muted">
                    <span className="font-medium text-fg-subtle">
                      Reason:{" "}
                    </span>
                    {req.reason}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={actioningId === req.id}
                      className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actioningId === req.id ? "Working..." : "Approve"}
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
          ))}

        {tab === "all" && (
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            {loadingAll ? (
              <div className="p-10 text-center text-sm text-fg-muted">
                Loading...
              </div>
            ) : allRequests.length === 0 ? (
              <div className="p-10 text-center text-sm text-fg-muted">
                No cash advance requests have been filed yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover text-fg-muted">
                    <tr className="text-xs uppercase tracking-wide">
                      <th className="px-6 py-4 text-left font-medium">
                        Employee
                      </th>
                      <th className="px-6 text-left font-medium">Amount</th>
                      <th className="px-6 text-left font-medium">
                        Deduction / Pay
                      </th>
                      <th className="px-6 text-left font-medium">
                        Remaining
                      </th>
                      <th className="px-6 text-left font-medium">Status</th>
                      <th className="px-6 text-left font-medium">
                        Approver
                      </th>
                      <th className="px-6 py-4 text-left font-medium">
                        Filed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="border-t border-border transition hover:bg-surface-hover"
                      >
                        <td className="px-6 py-4 font-medium text-fg">
                          {req.employee_name}
                        </td>
                        <td className="px-6 text-fg-muted">
                          ₱{req.amount.toLocaleString()}
                        </td>
                        <td className="px-6 text-fg-muted">
                          ₱{req.deduction_per_pay_amount.toLocaleString()}
                        </td>
                        <td className="px-6 text-fg-muted">
                          {req.status === "approved"
                            ? `₱${req.remaining_balance.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-6">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              STATUS_STYLES[req.status] ||
                              "bg-surface-active text-fg-subtle"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 text-fg-muted">
                          {req.requested_by_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-fg-muted">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
