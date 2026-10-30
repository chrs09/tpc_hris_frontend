import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveCashAdvanceRequest,
  archiveCashAdvanceRequest,
  unarchiveCashAdvanceRequest,
  uploadCashAdvanceReceipt,
  createOpeningBalance,
  getAllCashAdvanceRequests,
  getCashAdvanceRequestsForMyApproval,
  getCashAdvanceTransactions,
  getCashAdvanceDeductionHistory,
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
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";
import useModuleAccess from "../../hooks/useModuleAccess";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import CashAdvanceExceptionModal from "../../components/cashAdvance/CashAdvanceExceptionModal";
import CashAdvanceExceptionSummary from "../../components/cashAdvance/CashAdvanceExceptionSummary";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import ViewToggle from "../../components/ui/viewToggle/ViewToggle";
import ColumnPicker from "../../components/ui/columnPicker/ColumnPicker";
import useColumnPrefs from "../../hooks/useColumnPrefs";
import useViewType from "../../hooks/useViewType";
import CashAdvanceReleaseModal from "../../components/cashAdvance/CashAdvanceReleaseModal";
import ReceiptViewer from "../../components/cashAdvance/ReceiptViewer";
import { matchesSearch } from "../../utils/search";
import DateRangeFilter from "../../components/ui/datePicker/DateRangeFilter";
import { toISODate } from "../../utils/isoDate";
import useApprovalScope from "../../hooks/useApprovalScope";
import ApprovalScopeToggle from "../../components/approvals/ApprovalScopeToggle";

const formatDateNeeded = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

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
// All Requests "Approver" column: who approved (each head in order for
// an Org Chart chain), or whose turn it is while still pending.
const ApproverCell = ({ req }) => {
  const approvedBy = (req.approval_log || [])
    .filter((entry) => entry.action === "approved")
    .map((entry) => entry.name);
  if (req.status === "pending") {
    const current = req.approval_steps?.find((s) => s.state === "current");
    return (
      <div>
        {approvedBy.length > 0 && (
          <p className="text-xs text-success">✓ {approvedBy.join(" → ")}</p>
        )}
        <p className="text-xs">
          Waiting: {current?.name || req.requested_by_name || "—"}
        </p>
      </div>
    );
  }
  if (approvedBy.length > 0 && req.status !== "rejected") {
    return <span>{approvedBy.join(" → ")}</span>;
  }
  return <span>{req.approved_by_name || req.requested_by_name || "—"}</span>;
};

export default function CashAdvanceApprovals({ embedded = false }) {
  const canEditPage = usePageCanEdit();
  const { isSuperAdmin, hasCustomAccess, grantedModules } = useModuleAccess();
  // Full history + balances are Finance's; an Org Chart head only gets
  // the requests waiting on them.
  const hasFinanceAccess =
    isSuperAdmin ||
    (hasCustomAccess && grantedModules.has("finance.cash_advance"));

  // Pending Approvals as cards or a compact list (remembered per browser).
  const [pendingView, setPendingView] = useViewType("cash_advance_pending_view");
  const [tab, setTab] = useState("pending");

  const [allPending, setPending] = useState([]);
  const { scoped: pending, scopeProps } = useApprovalScope(allPending);
  const [loadingPending, setLoadingPending] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const [allRequests, setAllRequests] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  // All Requests: show the archived ones instead.
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  // Approve / Record Release form (amount, receipt photo, reference).
  const [releaseForm, setReleaseForm] = useState(null); // { request, mode }
  const [savingRelease, setSavingRelease] = useState(false);
  // Receipt photo shown in a modal instead of a new tab.
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // One search box, applied to whichever tab is open.
  const [search, setSearch] = useState("");
  const matchesRequest = (r) =>
    matchesSearch(
      search,
      r.employee_name,
      r.reason,
      r.status,
      r.amount,
      r.approved_amount,
      r.requested_by_name,
      r.release_reference,
    );
  const filteredPending = pending.filter(matchesRequest);
  const filteredAll = allRequests.filter(matchesRequest);
  const pendingPagination = usePagination(filteredPending, 10);
  const allPagination = usePagination(filteredAll, 15);

  // Deduction History tab: every deduction across all cash advances.
  // Defaults to the start of last month through today.
  const [deductionRange, setDeductionRange] = useState(() => {
    const now = new Date();
    return {
      from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toISODate(now),
    };
  });
  const [deductionSource, setDeductionSource] = useState("");
  const [deductions, setDeductions] = useState([]);
  const [loadingDeductions, setLoadingDeductions] = useState(false);
  const filteredDeductions = deductions.filter((d) =>
    matchesSearch(
      search,
      d.employee_name,
      d.note,
      d.cutoff_period,
      d.department,
      d.payroll_status,
      d.recorded_by_name,
      d.request_reason,
      d.amount,
    ),
  );
  const deductionsPagination = usePagination(filteredDeductions, 20);
  const deductionsTotal = filteredDeductions.reduce((sum, d) => sum + d.amount, 0);

  // Superadmin-only: outstanding balances + recording pre-existing
  // ("opening") balances carried over from before this system was
  // used -- moved here from Cash Advance Settings so it lives
  // alongside the rest of the cash advance workflow.
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const [releasingId, setReleasingId] = useState(null);
  const balancesPagination = usePagination(
    balances.filter(matchesRequest),
    10,
  );

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

  const loadAll = async (archived = showArchived) => {
    try {
      setLoadingAll(true);
      const data = await getAllCashAdvanceRequests(archived);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, allLoaded]);

  // Deduction History: reload whenever its tab is open and a filter changes.
  useEffect(() => {
    if (tab !== "deductions" || !hasFinanceAccess) return;
    let cancelled = false;
    setLoadingDeductions(true);
    getCashAdvanceDeductionHistory({
      dateFrom: deductionRange.from,
      dateTo: deductionRange.to,
      source: deductionSource,
    })
      .then((data) => !cancelled && setDeductions(data))
      .catch(() => !cancelled && toast.error("Failed to load deduction history."))
      .finally(() => !cancelled && setLoadingDeductions(false));
    return () => {
      cancelled = true;
    };
  }, [tab, hasFinanceAccess, deductionRange, deductionSource]);

  // Same lazy-load pattern for the superadmin-only Balances tab.
  useEffect(() => {
    if (tab === "balances" && isSuperAdmin) {
      if (!balancesLoaded) loadBalances();
      if (assignableUsers.length === 0) loadAssignableUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isSuperAdmin, balancesLoaded]);

  // The final approval is when the money goes out -- that's where the
  // receipt photo is asked for. A head who passes it up only sets the amount.
  const nextApproverOf = (request) => {
    const steps = request.approval_steps || [];
    const index = steps.findIndex((st) => st.state === "current");
    return index >= 0 && index < steps.length - 1 ? steps[index + 1].name : null;
  };

  // Last approver -> "Request Exception" (above the policy limit).
  const [exceptionFor, setExceptionFor] = useState(null);

  const approveException = async (request) => {
    const ok = await confirmDialog(
      `Allow this exception? ${request.employee_name} gets ₱${Number(
        request.exception_amount,
      ).toLocaleString()} repaid over ${request.exception_pay_periods} pays (₱${Number(
        request.exception_deduction_per_pay,
      ).toLocaleString()} each).`,
    );
    if (!ok) return;
    try {
      setActioningId(request.id);
      await approveCashAdvanceRequest(request.id);
      toast.success("Exception approved -- the cash advance is approved.");
      await loadPending();
      if (allLoaded) await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleApprove = (request) =>
    request.awaiting_exception
      ? approveException(request)
      : setReleaseForm({ request, mode: "approve" });

  const saveRelease = (requestId, receipt, reference) =>
    receipt
      ? uploadCashAdvanceReceipt(requestId, receipt, reference)
      : setCashAdvanceReleaseInfo(requestId, reference);

  const submitReleaseForm = async ({ approvedAmount, reference, receipt }) => {
    const { request, mode } = releaseForm;
    if (mode === "approve") {
      if (!approvedAmount || approvedAmount <= 0) {
        toast.error("Enter a valid amount.");
        return;
      }
      if (approvedAmount > request.amount) {
        toast.error("Approved amount can't exceed the requested amount.");
        return;
      }
    }
    try {
      setSavingRelease(true);
      if (mode === "approve") {
        setActioningId(request.id);
        const result = await approveCashAdvanceRequest(request.id, undefined, approvedAmount);
        const next = result?.approval_steps?.find((st) => st.state === "current");
        let receiptSaved = false;
        if (result?.status === "approved" && (receipt || reference)) {
          try {
            await saveRelease(request.id, receipt, reference);
            receiptSaved = true;
          } catch (error) {
            toast.error(
              `Approved, but the receipt wasn't saved (${
                error.response?.data?.detail || "error"
              }). Add it with Record Release.`,
            );
          }
        }
        toast.success(
          result?.status === "pending" && next
            ? `Approved -- passed to ${next.name} for the next approval.`
            : receiptSaved
              ? "Cash advance approved and marked as sent."
              : approvedAmount === request.amount
                ? "Cash advance approved."
                : `Cash advance approved for ₱${approvedAmount.toLocaleString()} (of ₱${request.amount.toLocaleString()} requested).`,
        );
        await loadPending();
      } else {
        setReleasingId(request.id);
        await saveRelease(request.id, receipt, reference);
        toast.success("Release recorded.");
        if (balancesLoaded) await loadBalances();
      }
      setReleaseForm(null);
      if (allLoaded) await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save.");
    } finally {
      setSavingRelease(false);
      setActioningId(null);
      setReleasingId(null);
    }
  };

  const toggleArchive = async (request) => {
    try {
      setArchivingId(request.id);
      if (request.is_archived) {
        await unarchiveCashAdvanceRequest(request.id);
        toast.success("Moved back to All Requests.");
      } else {
        await archiveCashAdvanceRequest(request.id);
        toast.success("Archived.");
      }
      setAllRequests((list) => list.filter((r) => r.id !== request.id));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update.");
    } finally {
      setArchivingId(null);
    }
  };

  const handleReject = async (request) => {
    const exception = request.awaiting_exception;
    const remarks = await promptDialog(
      exception
        ? `Reason for not allowing this exception (optional). It goes back to ${
            request.exception_requested_by_name || "the last approver"
          }, who can still approve within the policy:`
        : "Reason for rejecting this cash advance request (optional):",
    );
    if (remarks === null) return;
    try {
      setActioningId(request.id);
      await rejectCashAdvanceRequest(request.id, remarks || undefined);
      toast.success(
        exception ? "Exception not allowed -- sent back to the last approver." : "Cash advance rejected.",
      );
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

  const handleSetRelease = (request) => setReleaseForm({ request, mode: "release" });

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

  // All Requests columns -- the Columns button picks which show
  // (remembered per browser). default: false = hidden until ticked.
  const shortDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");
  const ALL_COLUMNS = [
    { key: "employee", label: "Employee", locked: true, tdClass: "py-4 font-medium text-fg", render: (req) => req.employee_name },
    { key: "requested", label: "Requested", render: (req) => `₱${req.amount.toLocaleString()}` },
    {
      key: "approved_ca",
      label: "Approved CA",
      render: (req) => (req.approved_amount != null ? `₱${req.approved_amount.toLocaleString()}` : "—"),
    },
    {
      key: "loan_purpose",
      label: "Loan Purpose",
      tdClass: "max-w-[220px]",
      render: (req) => (
        <span className="line-clamp-2" title={req.reason || ""}>
          {req.reason || "—"}
        </span>
      ),
    },
    { key: "date_needed", label: "Date Needed", tdClass: "whitespace-nowrap", render: (req) => formatDateNeeded(req.date_needed) || "—" },
    { key: "deduction", label: "Deduction / Pay", render: (req) => `₱${req.deduction_per_pay_amount.toLocaleString()}` },
    {
      key: "pay_periods",
      label: "Est. Pay Periods",
      default: false,
      render: (req) => req.estimated_pay_periods ?? "—",
    },
    {
      key: "remaining",
      label: "Remaining",
      render: (req) => (req.status === "approved" ? `₱${req.remaining_balance.toLocaleString()}` : "—"),
    },
    {
      key: "status",
      label: "Status",
      render: (req) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
            STATUS_STYLES[req.status] || "bg-surface-active text-fg-subtle"
          }`}
        >
          {req.status}
        </span>
      ),
    },
    { key: "approver", label: "Approver", render: (req) => <ApproverCell req={req} /> },
    { key: "filed", label: "Filed", tdClass: "py-4", render: (req) => shortDate(req.created_at) },
    {
      key: "date_approved",
      label: "Date Approved",
      default: false,
      tdClass: "whitespace-nowrap",
      render: (req) => (req.status === "approved" ? shortDate(req.approved_at) : "—"),
    },
    {
      key: "date_rejected",
      label: "Date Rejected",
      default: false,
      tdClass: "whitespace-nowrap",
      render: (req) => (req.status === "rejected" ? shortDate(req.approved_at) : "—"),
    },
    {
      key: "decided_by",
      label: "Approved / Rejected By",
      default: false,
      render: (req) => (["approved", "rejected"].includes(req.status) ? req.approved_by_name || "—" : "—"),
    },
    {
      key: "remarks",
      label: "Remarks",
      default: false,
      tdClass: "max-w-[220px]",
      render: (req) => <span className="line-clamp-2">{req.remarks || "—"}</span>,
    },
    {
      key: "released",
      label: "Date Released",
      default: false,
      tdClass: "whitespace-nowrap",
      render: (req) => shortDate(req.released_at),
    },
    {
      key: "terms",
      label: "Terms Accepted",
      default: false,
      render: (req) => (req.terms_accepted ? "Yes" : "No"),
    },
    {
      key: "receipt",
      label: "Receipt",
      render: (req) =>
        req.release_receipt_url ? (
          <button
            type="button"
            onClick={() => setViewingReceipt(req)}
            title="View receipt"
            className="block rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <img
              src={req.release_receipt_url}
              alt="Receipt"
              className="h-10 w-10 rounded-lg border border-border object-cover"
            />
          </button>
        ) : req.release_reference ? (
          <span className="text-xs">{req.release_reference}</span>
        ) : req.status === "approved" && canEditPage ? (
          <button
            type="button"
            onClick={() => handleSetRelease(req)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Add receipt
          </button>
        ) : (
          "—"
        ),
    },
  ];
  const allColumnPrefs = useColumnPrefs("cash_advance_all_columns", ALL_COLUMNS);
  const shownColumns = ALL_COLUMNS.filter((c) => allColumnPrefs.visible.has(c.key));

  return (
    <div>
      <div className="space-y-5">
        {!embedded && <SectionTabs group="Finance" />}

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
          {hasFinanceAccess && (
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
          )}
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
          {hasFinanceAccess && (
            <button
              onClick={() => setTab("deductions")}
              className={`px-4 py-2 text-sm font-medium ${
                tab === "deductions"
                  ? "border-b-2 border-primary text-primary"
                  : "text-fg-subtle hover:text-fg"
              }`}
            >
              Deduction History
            </button>
          )}
        </div>

        {tab === "pending" && <ApprovalScopeToggle {...scopeProps} />}

        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, reason, status, amount..."
          />
          {tab === "pending" && (
            <ViewToggle viewType={pendingView} onChange={setPendingView} className="ml-auto" />
          )}
        </div>

        {tab === "pending" &&
          (loadingPending ? (
            <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
              Loading...
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
              {pending.length
                ? "No pending requests match your search."
                : "No pending cash advance requests for you to review."}
            </div>
          ) : pendingView === "list" ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Employee</th>
                      <th className="px-4 py-3 text-left font-medium">Requested</th>
                      <th className="px-4 py-3 text-left font-medium">Per pay</th>
                      <th className="px-4 py-3 text-left font-medium">Loan Purpose</th>
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date Needed</th>
                      <th className="px-4 py-3 text-left font-medium">Waiting on</th>
                      {canEditPage && <th className="px-4 py-3 text-right font-medium">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPagination.paginatedItems.map((req) => {
                      const current = (req.approval_steps || []).find((st) => st.state === "current");
                      return (
                        <tr key={req.id} className="border-t border-border hover:bg-surface-hover">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-fg">{req.employee_name}</p>
                            <p className="text-xs text-fg-subtle">
                              Filed {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-fg">
                            ₱{req.amount.toLocaleString()}
                            {req.awaiting_exception && (
                              <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                                Exception ₱{Number(req.exception_amount).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-fg-muted">
                            ₱{req.deduction_per_pay_amount.toLocaleString()}
                            {req.estimated_pay_periods ? (
                              <span className="block text-xs text-fg-subtle">
                                ~{req.estimated_pay_periods} pays
                              </span>
                            ) : null}
                          </td>
                          <td className="max-w-[220px] px-4 py-3 text-fg-muted" title={req.reason}>
                            <span className="line-clamp-2">{req.reason}</span>
                            <CashAdvanceExceptionSummary request={req} compact />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-fg-muted">
                            {formatDateNeeded(req.date_needed) || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-fg-muted">
                            {req.can_act === false
                              ? `Passed to ${current?.name || "the next approver"}`
                              : current?.name || "You"}
                          </td>
                          {canEditPage && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleApprove(req)}
                                  disabled={actioningId === req.id || req.can_act === false}
                                  className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actioningId === req.id
                                    ? "Working..."
                                    : req.awaiting_exception
                                      ? "Allow Exception"
                                      : "Approve"}
                                </button>
                                {req.can_request_exception && (
                                  <button
                                    onClick={() => setExceptionFor(req)}
                                    disabled={actioningId === req.id || req.can_act === false}
                                    className="rounded-lg border border-warning/50 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Exception
                                  </button>
                                )}
                                <button
                                  onClick={() => handleReject(req)}
                                  disabled={actioningId === req.id || req.can_act === false}
                                  className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pendingPagination.page}
                totalPages={pendingPagination.totalPages}
                onChange={pendingPagination.setPage}
              />
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
                      {req.awaiting_exception ? "Exception -- Your Approval" : "Pending Approval"}
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
                      Loan Purpose:{" "}
                    </span>
                    {req.reason}
                  </p>
                  {req.date_needed && (
                    <p className="mt-1 text-sm text-fg-muted">
                      <span className="font-medium text-fg-subtle">Date Needed: </span>
                      <span className="font-semibold text-fg">{formatDateNeeded(req.date_needed)}</span>
                    </p>
                  )}

                  <CashAdvanceExceptionSummary request={req} />
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
                  <ApprovedBy log={req.approval_log} money className="mt-2" />

                  <div className="mt-4 flex flex-wrap gap-3">
                    {canEditPage && (
                      <button
                      onClick={() => handleApprove(req)}
                      disabled={actioningId === req.id || req.can_act === false}
                      className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actioningId === req.id
                        ? "Working..."
                        : req.awaiting_exception
                          ? "Allow Exception"
                          : "Approve"}
                    </button>
                    )}
                    {canEditPage && req.can_request_exception && (
                      <button
                        onClick={() => setExceptionFor(req)}
                        disabled={actioningId === req.id || req.can_act === false}
                        className="rounded-xl border border-warning/50 px-4 py-2 text-sm font-semibold text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Request Exception
                      </button>
                    )}
                    {canEditPage && (
                      <button
                      onClick={() => handleReject(req)}
                      disabled={actioningId === req.id || req.can_act === false}
                      className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>
                    )}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                loadAll(e.target.checked);
              }}
              className="h-4 w-4 accent-primary"
            />
            Show archived
          </label>
          <ColumnPicker
            columns={ALL_COLUMNS}
            visible={allColumnPrefs.visible}
            onToggle={allColumnPrefs.toggle}
            onReset={allColumnPrefs.reset}
          />
          </div>
        )}

        {tab === "all" && (
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            {loadingAll ? (
              <div className="p-10 text-center text-sm text-fg-muted">
                Loading...
              </div>
            ) : allRequests.length === 0 ? (
              <div className="p-10 text-center text-sm text-fg-muted">
                {showArchived
                  ? "Nothing archived."
                  : "No cash advance requests have been filed yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover text-fg-muted">
                    <tr className="text-xs uppercase tracking-wide">
                      {shownColumns.map((col) => (
                        <th key={col.key} className="px-6 py-4 text-left font-medium">
                          {col.label}
                        </th>
                      ))}
                      {canEditPage && (
                        <th className="px-6 text-right font-medium">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {allPagination.paginatedItems.map((req) => (
                      <tr
                        key={req.id}
                        className="border-t border-border transition hover:bg-surface-hover"
                      >
                        {shownColumns.map((col) => (
                          <td key={col.key} className={`px-6 text-fg-muted ${col.tdClass || ""}`}>
                            {col.render(req)}
                          </td>
                        ))}
                        {canEditPage && (
                          <td className="px-6 text-right">
                            {req.status !== "pending" && (
                              <button
                                type="button"
                                onClick={() => toggleArchive(req)}
                                disabled={archivingId === req.id}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                              >
                                {archivingId === req.id
                                  ? "..."
                                  : req.is_archived
                                    ? "Unarchive"
                                    : "Archive"}
                              </button>
                            )}
                          </td>
                        )}
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

        {tab === "deductions" && hasFinanceAccess && (
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-fg">Deduction History</h3>
                <p className="mt-1 text-sm text-fg-subtle">
                  Every cash advance deduction — from payroll (with its cutoff
                  and that payroll&apos;s status) or recorded by hand — and the
                  balance left after it.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DateRangeFilter
                  from={deductionRange.from}
                  to={deductionRange.to}
                  onChange={setDeductionRange}
                />
                <select
                  value={deductionSource}
                  onChange={(e) => setDeductionSource(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">All sources</option>
                  <option value="payroll">Payroll</option>
                  <option value="manual">Recorded by hand</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-2xl border border-border bg-surface-hover p-3">
                <p className="text-xs text-fg-subtle">Deductions</p>
                <p className="text-lg font-bold text-fg">{filteredDeductions.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-hover p-3">
                <p className="text-xs text-fg-subtle">Total deducted</p>
                <p className="text-lg font-bold text-fg">
                  ₱{deductionsTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {loadingDeductions ? (
              <p className="mt-4 text-sm text-fg-subtle">Loading...</p>
            ) : filteredDeductions.length === 0 ? (
              <p className="mt-4 text-sm text-fg-subtle">No deductions in this range.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-hover text-xs text-fg-subtle">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Balance After</th>
                        <th className="px-4 py-3">Cash Advance</th>
                        <th className="px-4 py-3">Recorded By</th>
                        <th className="px-4 py-3">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deductionsPagination.paginatedItems.map((d) => (
                        <tr key={d.id} className="border-t border-border">
                          <td className="whitespace-nowrap px-4 py-3">
                            {d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-fg">{d.employee_name || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-fg">
                            ₱{d.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            {d.source === "payroll" ? (
                              <div>
                                <span className="font-medium text-fg">Payroll</span>
                                <p className="text-xs text-fg-subtle">
                                  {d.cutoff_period?.replace("_", " to ")}
                                  {d.department ? ` · ${d.department}` : ""}
                                </p>
                                {d.payroll_status && (
                                  <span
                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      ["LOCKED", "PAID"].includes(d.payroll_status)
                                        ? "bg-primary/15 text-primary"
                                        : "bg-warning/15 text-warning"
                                    }`}
                                  >
                                    {d.payroll_status.replace("_", " ")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-fg-muted">Recorded by hand</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {d.balance_after > 0
                              ? `₱${d.balance_after.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                              : <span className="font-semibold text-primary">Fully paid</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-fg-subtle">
                            ₱{d.request_amount.toLocaleString()}
                            {d.request_reason ? ` · ${d.request_reason}` : ""}
                          </td>
                          <td className="px-4 py-3 text-xs">{d.recorded_by_name || "—"}</td>
                          <td className="px-4 py-3 text-xs text-fg-subtle">{d.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={deductionsPagination.page}
                  totalPages={deductionsPagination.totalPages}
                  onChange={deductionsPagination.setPage}
                />
              </>
            )}
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
                {canEditPage && (
                  <button
                  onClick={handleAddOpeningBalance}
                  disabled={savingOpeningBalance}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingOpeningBalance ? "Adding..." : "+ Add Balance"}
                </button>
                )}
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
                        {canEditPage && (
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
                        )}
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

                    {request.reason && (
                      <p className="mt-1 text-xs text-fg-muted">
                        <span className="font-semibold text-fg">Loan Purpose:</span>{" "}
                        {request.reason}
                      </p>
                    )}
                    {request.date_needed && (
                      <p className="mt-1 text-xs text-fg-muted">
                        <span className="font-semibold text-fg">Date Needed:</span>{" "}
                        {formatDateNeeded(request.date_needed)}
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
                        {request.release_receipt_url && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(request)}
                              className="font-semibold text-primary hover:underline"
                            >
                              View receipt
                            </button>
                          </>
                        )}
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
                  {canEditPage && (
                    <button
                    onClick={handleAddDeduction}
                    disabled={recordingId === historyRequest.id}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                  >
                    {recordingId === historyRequest.id
                      ? "Adding..."
                      : "+ Add"}
                  </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ReceiptViewer request={viewingReceipt} onClose={() => setViewingReceipt(null)} />
      {exceptionFor && (
        <CashAdvanceExceptionModal
          request={exceptionFor}
          onClose={() => setExceptionFor(null)}
          onDone={async () => {
            setExceptionFor(null);
            await loadPending();
            if (allLoaded) await loadAll();
          }}
        />
      )}

      {releaseForm && (
        <CashAdvanceReleaseModal
          key={`${releaseForm.mode}-${releaseForm.request.id}`}
          request={releaseForm.request}
          mode={releaseForm.mode}
          isFinal={!nextApproverOf(releaseForm.request)}
          nextApprover={nextApproverOf(releaseForm.request)}
          busy={savingRelease}
          onClose={() => setReleaseForm(null)}
          onSubmit={submitReleaseForm}
        />
      )}
    </div>
  );
}
