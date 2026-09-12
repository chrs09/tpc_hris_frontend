import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  createDeductionOption,
  deleteDeductionOption,
  getAllDeductionOptions,
  getTerms,
  setTerms,
  updateDeductionOption,
} from "../../api/cashAdvanceSettings";
import {
  getOutstandingBalances,
  recordCashAdvanceDeduction,
} from "../../api/cashAdvanceRequests";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";

const CashAdvanceSettingsPage = () => {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const [options, setOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savingOption, setSavingOption] = useState(false);

  const [termsContent, setTermsContent] = useState("");
  const [termsUpdatedAt, setTermsUpdatedAt] = useState(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);

  // Global cap on how many pay periods a cash advance may stretch
  // across, and the largest total amount a single request may ask for.
  // Both saved on the same record as terms & conditions.
  const [maxPayPeriods, setMaxPayPeriods] = useState(6);
  const [maxLoanAmount, setMaxLoanAmount] = useState("");
  const [savingMaxPeriods, setSavingMaxPeriods] = useState(false);

  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    balances,
    10,
  );

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const data = await getAllDeductionOptions();
      setOptions(data);
    } catch (err) {
      console.error("Failed to load deduction options:", err);
      toast.error("Failed to load deduction options.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadTerms = async () => {
    try {
      setLoadingTerms(true);
      const data = await getTerms();
      setTermsContent(data.content || "");
      setTermsUpdatedAt(data.updated_at);
      setMaxPayPeriods(data.max_pay_periods || 6);
      setMaxLoanAmount(
        data.max_loan_amount === null || data.max_loan_amount === undefined
          ? ""
          : String(data.max_loan_amount),
      );
    } catch (err) {
      console.error("Failed to load terms:", err);
      toast.error("Failed to load terms & conditions.");
    } finally {
      setLoadingTerms(false);
    }
  };

  const loadBalances = async () => {
    try {
      setLoadingBalances(true);
      const data = await getOutstandingBalances();
      setBalances(data);
    } catch (err) {
      console.error("Failed to load outstanding balances:", err);
      toast.error("Failed to load outstanding balances.");
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadOptions();
      loadTerms();
      loadBalances();
    }
  }, [isSuperAdmin]);

  const handleAddOption = async () => {
    const amount = Number(newAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    try {
      setSavingOption(true);
      await createDeductionOption({
        amount,
        label: newLabel.trim(),
        sort_order: options.length,
      });
      toast.success("Deduction option added.");
      setNewAmount("");
      setNewLabel("");
      await loadOptions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add option.");
    } finally {
      setSavingOption(false);
    }
  };

  const handleToggleActive = async (option) => {
    try {
      await updateDeductionOption(option.id, { is_active: !option.is_active });
      await loadOptions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update option.");
    }
  };

  const handleDeleteOption = async (option) => {
    if (!(await confirmDialog(`Delete the ₱${option.amount} option?`))) return;
    try {
      await deleteDeductionOption(option.id);
      toast.success("Deduction option deleted.");
      await loadOptions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete option.");
    }
  };

  const handleRecordDeduction = async (request) => {
    const suggested = request.deduction_per_pay_amount;
    const input = await promptDialog(
      `Record a deduction for ${request.employee_name} (remaining ₱${request.remaining_balance.toLocaleString()}):`,
      String(Math.min(suggested, request.remaining_balance)),
    );
    if (input === null) return;

    const amount = Number(input);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    try {
      setRecordingId(request.id);
      await recordCashAdvanceDeduction(request.id, { amount });
      toast.success("Deduction recorded.");
      await loadBalances();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record deduction.");
    } finally {
      setRecordingId(null);
    }
  };

  const handleSaveTerms = async () => {
    try {
      setSavingTerms(true);
      const data = await setTerms(termsContent, maxPayPeriods, maxLoanAmount);
      setTermsUpdatedAt(data.updated_at);
      toast.success("Terms & conditions saved.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save terms.");
    } finally {
      setSavingTerms(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!maxPayPeriods || maxPayPeriods <= 0) {
      toast.error("Enter a valid number of pay periods.");
      return;
    }
    if (maxLoanAmount !== "" && Number(maxLoanAmount) <= 0) {
      toast.error("Enter a valid max loan amount, or leave it blank for no cap.");
      return;
    }
    try {
      setSavingMaxPeriods(true);
      const data = await setTerms(termsContent, maxPayPeriods, maxLoanAmount);
      setTermsUpdatedAt(data.updated_at);
      setMaxPayPeriods(data.max_pay_periods);
      setMaxLoanAmount(
        data.max_loan_amount === null || data.max_loan_amount === undefined
          ? ""
          : String(data.max_loan_amount),
      );
      toast.success("Loan limits saved.");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to save loan limits.",
      );
    } finally {
      setSavingMaxPeriods(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-danger font-semibold">
        Access Denied. Superadmin only.
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        <SectionTabs group="Administrator" />

        <div className="rounded-3xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-fg-subtle">
            Administration
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fg">
            Cash Advance Settings
          </h2>
          <p className="mt-2 text-sm text-fg-subtle">
            Set how much can be deducted per pay period, and the terms &
            conditions drivers must acknowledge before filing. Drivers type
            their own requested total; you only control the per-pay amount.
          </p>
        </div>

        {/* DEDUCTION OPTIONS */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-lg font-bold text-fg">
            Deduction Per Pay Amounts
          </h3>
          <p className="mt-1 text-sm text-fg-subtle">
            These are the amounts a driver can pick as how much to deduct
            each pay period. The driver still types their own total
            requested amount separately. Inactive options stop showing on
            mobile but existing requests keep their original amount.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-border bg-surface-hover p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="500"
                className="w-32 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Label (optional)
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Small"
                className="w-40 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handleAddOption}
              disabled={savingOption}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {savingOption ? "Adding..." : "+ Add Amount"}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {loadingOptions ? (
              <p className="text-sm text-fg-muted">Loading...</p>
            ) : options.length === 0 ? (
              <p className="text-sm text-fg-subtle">
                No deduction amounts set up yet.
              </p>
            ) : (
              options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-hover px-4 py-3"
                >
                  <div>
                    <span className="font-semibold text-fg">
                      ₱{option.amount.toLocaleString()}
                    </span>
                    {option.label && (
                      <span className="ml-2 text-sm text-fg-subtle">
                        {option.label}
                      </span>
                    )}
                    {!option.is_active && (
                      <span className="ml-2 rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-fg-subtle">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(option)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover"
                    >
                      {option.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteOption(option)}
                      className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LOAN LIMITS */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-lg font-bold text-fg">Loan Limits</h3>
          <p className="mt-1 text-sm text-fg-subtle">
            Caps that apply to every cash advance request. Max pay periods
            limits how long a request may stretch — the driver must pick
            a larger deduction amount if their requested total divided by
            the chosen deduction exceeds it, so the deduction charged
            always matches one of the amounts above. Max loan amount caps
            the total a single request may ask for; leave it blank for no
            cap.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Max pay periods
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxPayPeriods}
                onChange={(e) => setMaxPayPeriods(Number(e.target.value))}
                className="w-28 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Max loan amount (₱)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="No cap"
                value={maxLoanAmount}
                onChange={(e) => setMaxLoanAmount(e.target.value)}
                className="w-36 rounded-xl border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handleSaveLimits}
              disabled={savingMaxPeriods}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {savingMaxPeriods ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* OUTSTANDING BALANCES */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-lg font-bold text-fg">
            Outstanding Cash Advance Balances
          </h3>
          <p className="mt-1 text-sm text-fg-subtle">
            Approved requests that aren't fully paid off yet. Record a
            deduction here each time it's actually taken out of a payslip
            — this isn't automatic yet.
          </p>

          <div className="mt-4 space-y-2">
            {loadingBalances ? (
              <p className="text-sm text-fg-muted">Loading...</p>
            ) : balances.length === 0 ? (
              <p className="text-sm text-fg-subtle">
                No outstanding cash advance balances.
              </p>
            ) : (
              paginatedItems.map((request) => (
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
                        remaining of ₱{request.amount.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRecordDeduction(request)}
                      disabled={recordingId === request.id}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                    >
                      {recordingId === request.id
                        ? "Recording..."
                        : "Record Deduction"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-fg-subtle">
                    ₱{request.deduction_per_pay_amount.toLocaleString()} per
                    pay · {request.total_deducted.toLocaleString()} deducted
                    so far
                  </p>
                </div>
              ))
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>

        {/* TERMS & CONDITIONS */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-lg font-bold text-fg">Terms & Conditions</h3>
          <p className="mt-1 text-sm text-fg-subtle">
            Drivers must acknowledge this text before a cash advance
            request can be submitted. Leave blank to skip acknowledgement.
          </p>

          {loadingTerms ? (
            <p className="mt-4 text-sm text-fg-muted">Loading...</p>
          ) : (
            <>
              <textarea
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                rows={8}
                placeholder="e.g. By requesting a cash advance, I authorize Tytan Prime Corporation to deduct the approved amount from my next payout..."
                className="mt-4 w-full rounded-2xl border border-border bg-background p-4 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-fg-subtle">
                  {termsUpdatedAt
                    ? `Last updated ${new Date(termsUpdatedAt).toLocaleString()}`
                    : "Not set yet."}
                </p>
                <button
                  onClick={handleSaveTerms}
                  disabled={savingTerms}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingTerms ? "Saving..." : "Save Terms"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashAdvanceSettingsPage;
