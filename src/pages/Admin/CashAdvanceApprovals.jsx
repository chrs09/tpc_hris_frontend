import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveCashAdvanceRequest,
  createOpeningBalance,
  getAllCashAdvanceRequests,
  getCashAdvanceRequestsForMyApproval,
  getCashAdvanceTransactions,
  getOutstandingBalances,
  recordCashAdvanceDeduction,
  rejectCashAdvanceRequest,
  setCashAdvanceReleaseInfo,
} from "../../api/cashAdvanceRequests";
import { getAssignableUsers } from "../../api/users";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import SearchSelect from "../../components/SearchSelect";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import useModuleAccess from "../../hooks/useModuleAccess";

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
  const { isSuperAdmin } = useModuleAccess();

  const [tab, setTab] = useState("pending");

  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const [allRequests, setAllRequests] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const pendingPagination = usePagination(pending, 10);
  const allPagination = usePagination(allRequests, 15);

  // Superadmin-only: outstanding balances + recording pre-existing
  // ("opening") balances carried over from before this system was
  // used -- moved here from Cash Advance Settings so it lives
  // alongside the rest of the cash advance workflow.
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const [releasingId, setReleasingId] = useState(null);
  const balancesPagination = usePagination(balances, 10);

  const [assignableUsers, setAssignableUsers] = useState([]);
  const [openingBalanceUser, setOpeningBalanceUser] = useState(null);
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState("");
  const [openingBalanceDeduction, setOpeningBalanceDeduction] = useState("");
  const [openingBalanceNote, setOpeningBalanceNote] = useState("");
  const [savingOpeningBalance, setSavingOpeningBalance] = useState(false);

  // Transaction History modal -- shows every deduction recorded against
  // one balance, and lets a new one be added inline. Replaces the old
  // single "Record Deduction" prompt now that deductions are meant to
  // eventually be connected to payroll too, not just manual entries.
  const [historyRequest, setHistoryRequest] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [newDeductionAmount, setNewDeductionAmount] = useState("");
  const [newDeductionNote, setNewDeductionNote] = useState("");

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

  const loadBalances = async () => {
    try {
      setLoadingBalances(true);
      const data = await getOutstandingBalances();
      setBalances(data);
      setBalancesLoaded(true);
    } catch (error) {
      console.error("Failed to load outstanding balances:", error);
      toast.error("Failed to load outstanding balances.");
    } finally {
      setLoadingBalances(false);
    }
  };

  const loadAssignableUsers = async () => {
    try {
      const data = await getAssignableUsers();
      setAssignableUsers(data.filter((u) => u.role !== "superadmin"));
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load employees.");
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

  // Same lazy-load pattern for the superadmin-only Balances tab.
  useEffect(() => {
    if (tab === "balances" && isSuperAdmin) {
      if (!balancesLoaded) loadBalances();
      if (assignableUsers.length === 0) loadAssignableUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isSuperAdmin, balancesLoaded]);

  const handleApprove = async (request) => {
    const input = await promptDialog(
      `Approve how much for ${request.employee_name}? (requested ₱${request.amount.toLocaleString()})`,
      String(request.amount),
    );
    if (input === null) return;

    const approvedAmount = Number(input);
    if (!approvedAmount || approvedAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (approvedAmount > request.amount) {
      toast.error("Approved amount can't exceed the requested amount.");
      return;
    }

    try {
      setActioningId(request.id);
      await approveCashAdvanceRequest(request.id, undefined, approvedAmount);
      toast.success(
        approvedAmount === request.amount
          ? "Cash advance approved."
          : `Cash advance approved for ₱${approvedAmount.toLocaleString()} (of ₱${request.amount.toLocaleString()} requested).`,
      );
      await loadPending();
      if (allLoaded) await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (request) => {
    const remarks = await promptDialog(
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

  const loadTransactions = async (requestId) => {
    try {
      setLoadingTransactions(true);
      const data = await getCashAdvanceTransactions(requestId);
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load transaction history:", error);
      toast.error("Failed to load transaction history.");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleOpenHistory = (request) => {
    setHistoryRequest(request);
    setNewDeductionAmount(String(request.deduction_per_pay_amount));
    setNewDeductionNote("");
    loadTransactions(request.id);
  };

  const handleCloseHistory = () => {
    setHistoryRequest(null);
    setTransactions([]);
  };

  const handleAddDeduction = async () => {
    if (!historyRequest) return;
    const amount = Number(newDeductionAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    try {
      setRecordingId(historyRequest.id);
      const updated = await recordCashAdvanceDeduction(historyRequest.id, {
        amount,
        note: newDeductionNote.trim() || undefined,
      });
      toast.success("Deduction recorded.");
      setHistoryRequest(updated);
      setNewDeductionAmount(String(historyRequest.deduction_per_pay_amount));
      setNewDeductionNote("");
      await loadTransactions(historyRequest.id);
      await loadBalances();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record deduction.");
    } finally {
      setRecordingId(null);
    }
  };

  const handleSetRelease = async (request) => {
    const input = await promptDialog(
      `Payment/release reference for ${request.employee_name} (e.g. GCash ref, check no.):`,
      request.release_reference || "",
    );
    if (input === null) return;
    if (!input.trim()) {
      toast.error("Enter a reference.");
      return;
    }

    try {
      setReleasingId(request.id);
      await setCashAdvanceReleaseInfo(request.id, input.trim());
      toast.success("Release info recorded.");
      await loadBalances();
      if (allLoaded) await loadAll();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to record release info.",
      );
    } finally {
      setReleasingId(null);
    }
  };

  const handleAddOpeningBalance = async () => {
    if (!openingBalanceUser) {
      toast.error("Select an employee.");
      return;
    }
    const amount = Number(openingBalanceAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (openingBalanceDeduction !== "" && Number(openingBalanceDeduction) <= 0) {
      toast.error(
        "Enter a valid deduction per pay period, or leave it blank to use the full amount.",
      );
      return;
    }
    try {
      setSavingOpeningBalance(true);
      await createOpeningBalance({
        user_id: openingBalanceUser.id,
        amount,
        deduction_per_pay_amount:
          openingBalanceDeduction === ""
            ? null
            : Number(openingBalanceDeduction),
        note: openingBalanceNote.trim(),
      });
      toast.success("Opening balance added.");
      setOpeningBalanceUser(null);
      setOpeningBalanceAmount("");
      setOpeningBalanceDeduction("");
      setOpeningBalanceNote("");
      await loadBalances();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to add opening balance.",
      );
    } finally {
      setSavingOpeningBalance(false);
    }
  };

  return (
    <div>
      <div className="space-y-5">
        <SectionTabs group="Finance" />

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
          {isSuperAdmin && (
            <button
              onClick={() => setTab("balances")}
              className={`px-4 py-2 text-sm font-medium ${
                tab === "balances"
                  ? "border-b-2 border-primary text-primary"
                  : "text-fg-subtle hover:text-fg"
              }`}
            >
              Outstanding Balances
            </button>
          )}
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
              {pendingPagination.paginatedItems.map((req) => (
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
              <Pagination
                page={pendingPagination.page}
                totalPages={pendingPagination.totalPages}
                onChange={pendingPagination.setPage}
              />
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
                      <th className="px-6 text-left font-medium">
                        Requested
                      </th>
                      <th className="px-6 text-left font-medium">
                        Approved CA
                      </th>
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
                    {allPagination.paginatedItems.map((req) => (
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
                          {req.approved_amount != null
                            ? `₱${req.approved_amount.toLocaleString()}`
                            : "—"}
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
            <Pagination
              page={allPagination.page}
              totalPages={allPagination.totalPages}
              onChange={allPagination.setPage}
            />
          </div>
        )}

        {tab === "balances" && isSuperAdmin && (
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="text-lg font-bold text-fg">
              Outstanding Cash Advance Balances
            </h3>
            <p className="mt-1 text-sm text-fg-subtle">
              Approved requests that aren't fully paid off yet. Record a
              deduction here each time it's actually taken out of a
              payslip — this isn't automatic yet.
            </p>

            <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-hover p-4">
              <p className="text-sm font-semibold text-fg">
                Add Opening Balance
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                Record a pre-existing balance carried over from before
                this system was used (e.g. a manual/paper ledger). It's
                added as an already-approved request, so it shows up
                below and can have deductions recorded against it like
                any other.
              </p>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-56">
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Employee
                  </label>
                  <SearchSelect
                    value={openingBalanceUser}
                    options={assignableUsers}
                    onChange={setOpeningBalanceUser}
                    placeholder="Select employee"
                    getOptionLabel={(u) =>
                      u?.employee_name || u?.username || ""
                    }
                    getOptionValue={(u) => u?.id}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Amount (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={openingBalanceAmount}
                    onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-32 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Deduction per pay (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={openingBalanceDeduction}
                    onChange={(e) =>
                      setOpeningBalanceDeduction(e.target.value)
                    }
                    placeholder="Full amount"
                    className="w-32 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={openingBalanceNote}
                    onChange={(e) => setOpeningBalanceNote(e.target.value)}
                    placeholder="e.g. Carried over from manual ledger"
                    className="w-56 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={handleAddOpeningBalance}
                  disabled={savingOpeningBalance}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingOpeningBalance ? "Adding..." : "+ Add Balance"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {loadingBalances ? (
                <p className="text-sm text-fg-muted">Loading...</p>
              ) : balances.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  No outstanding cash advance balances.
                </p>
              ) : (
                balancesPagination.paginatedItems.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-border bg-surface-hover px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-fg">
                          {request.employee_name}
                        </span>
                        <span className="ml-2 text-sm text-fg-subtle">
                          ₱{request.remaining_balance.toLocaleString()}{" "}
                          remaining of ₱
                          {(
                            request.approved_amount ?? request.amount
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetRelease(request)}
                          disabled={releasingId === request.id}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                        >
                          {releasingId === request.id
                            ? "Saving..."
                            : request.release_reference
                              ? "Edit Release Info"
                              : "Record Release"}
                        </button>
                        <button
                          onClick={() => handleOpenHistory(request)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                        >
                          Transaction History
                        </button>
                      </div>
                    </div>

                    {request.approved_amount != null &&
                      request.approved_amount !== request.amount && (
                        <p className="mt-1 text-xs font-semibold text-fg">
                          Requested Amount: ₱
                          {request.amount.toLocaleString()} · Approved CA: ₱
                          {request.approved_amount.toLocaleString()}
                        </p>
                      )}

                    <p className="mt-1 text-xs text-fg-subtle">
                      ₱{request.deduction_per_pay_amount.toLocaleString()}{" "}
                      per pay · {request.total_deducted.toLocaleString()}{" "}
                      deducted so far
                    </p>

                    {request.release_reference && (
                      <p className="mt-1 text-xs text-fg-subtle">
                        Released via: {request.release_reference}
                        {request.released_at
                          ? ` (${new Date(request.released_at).toLocaleDateString()})`
                          : ""}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <Pagination
              page={balancesPagination.page}
              totalPages={balancesPagination.totalPages}
              onChange={balancesPagination.setPage}
            />
          </div>
        )}
      </div>

      {historyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-fg">
                  Transaction History
                </h3>
                <p className="mt-1 text-sm text-fg-subtle">
                  {historyRequest.employee_name} · ₱
                  {historyRequest.remaining_balance.toLocaleString()}{" "}
                  remaining of ₱{historyRequest.amount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleCloseHistory}
                className="rounded-lg px-2 py-1 text-sm text-fg-subtle hover:bg-surface-hover"
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {loadingTransactions ? (
                <p className="text-sm text-fg-muted">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  No deductions recorded yet.
                </p>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-xl border border-border bg-surface-hover px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-fg">
                        ₱{tx.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-fg-subtle">
                        {new Date(tx.recorded_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {tx.recorded_by_name
                        ? `Recorded by ${tx.recorded_by_name}`
                        : "Recorded"}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>

            {!historyRequest.is_fully_paid && (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-hover p-3">
                <p className="text-xs font-semibold text-fg">
                  Add Deduction
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-fg-muted">
                      Amount (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newDeductionAmount}
                      onChange={(e) => setNewDeductionAmount(e.target.value)}
                      className="w-28 rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-fg-muted">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={newDeductionNote}
                      onChange={(e) => setNewDeductionNote(e.target.value)}
                      placeholder="e.g. Sept 1-15 cutoff"
                      className="w-40 rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={handleAddDeduction}
                    disabled={recordingId === historyRequest.id}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                  >
                    {recordingId === historyRequest.id
                      ? "Adding..."
                      : "+ Add"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
