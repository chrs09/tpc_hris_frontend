import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button/Button";
import SearchSelect from "../../components/SearchSelect";
import {
  cancelCashAdvanceRequest,
  fileCashAdvanceRequest,
  getMyCashAdvanceBalance,
  getMyCashAdvanceRequests,
} from "../../api/cashAdvanceRequests";
import {
  getDeductionOptions,
  getPurposes,
  getTerms,
} from "../../api/cashAdvanceSettings";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-200 text-slate-700",
};

const OTHER_PURPOSE_ID = "__other__";
const OTHER_PURPOSE_OPTION = {
  id: OTHER_PURPOSE_ID,
  label: "Other (please specify)",
};

const todayLong = () =>
  new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// This is the mobile app's Cash Advance filing/management flow, moved
// to the web -- the native mobile screen now just opens this page (via
// src/pages/Public/MobileSessionBridge.jsx) instead of implementing the
// request/cancel flow itself. See the mobile screen's own comment for
// why (Google Play's financial-services policy requires an Organization
// developer account for a native cash-advance flow).
const DriverCashAdvance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [options, setOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  const [purposes, setPurposes] = useState([]);
  const [loadingPurposes, setLoadingPurposes] = useState(true);

  const [termsContent, setTermsContent] = useState("");
  const [maxPayPeriods, setMaxPayPeriods] = useState(6);
  const [maxLoanAmount, setMaxLoanAmount] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [selectedPurposeId, setSelectedPurposeId] = useState(null);
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const employeeName = localStorage.getItem("username") || "";

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyCashAdvanceRequests();
      setRequests(data);
    } catch (error) {
      console.error("Failed to load cash advance requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const data = await getMyCashAdvanceBalance();
      setTotalOutstanding(data.total_outstanding);
    } catch (error) {
      console.error("Failed to load cash advance balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const data = await getDeductionOptions();
      setOptions(data);
    } catch (error) {
      console.error("Failed to load deduction options:", error);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadTerms = useCallback(async () => {
    try {
      const data = await getTerms();
      setTermsContent(data.content || "");
      setMaxPayPeriods(data.max_pay_periods || 6);
      setMaxLoanAmount(data.max_loan_amount ?? null);
    } catch (error) {
      console.error("Failed to load terms:", error);
    }
  }, []);

  const loadPurposes = useCallback(async () => {
    try {
      setLoadingPurposes(true);
      const data = await getPurposes();
      setPurposes(data);
    } catch (error) {
      console.error("Failed to load purposes:", error);
    } finally {
      setLoadingPurposes(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadBalance();
    loadOptions();
    loadTerms();
    loadPurposes();
  }, [loadRequests, loadBalance, loadOptions, loadTerms, loadPurposes]);

  const requiresTermsAcceptance = termsContent.trim().length > 0;
  const numericAmount = Number(amount);
  const selectedOption = options.find((o) => o.id === selectedOptionId);
  const estimatedPayPeriods =
    selectedOption && numericAmount > 0
      ? Math.ceil(numericAmount / selectedOption.amount)
      : null;

  const optionPeriods = (option) =>
    numericAmount > 0 ? Math.ceil(numericAmount / option.amount) : null;
  const isOptionDisabled = (option) => {
    if (numericAmount > 0 && option.amount > numericAmount) return true;
    const periods = optionPeriods(option);
    return periods != null && periods > maxPayPeriods;
  };

  useEffect(() => {
    if (selectedOption && isOptionDisabled(selectedOption)) {
      setSelectedOptionId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const purposesWithOther = useMemo(
    () => [...purposes, OTHER_PURPOSE_OPTION],
    [purposes],
  );
  const isOtherPurposeSelected = selectedPurposeId === OTHER_PURPOSE_ID;

  // Keeps `reason` (what actually gets submitted) in sync with either
  // the picked preset purpose, or the free-typed text once "Other" is
  // selected.
  useEffect(() => {
    if (isOtherPurposeSelected) {
      setReason(otherReason);
      return;
    }
    const picked = purposes.find((p) => p.id === selectedPurposeId);
    setReason(picked?.label || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPurposeId, otherReason, purposes]);

  const exceedsMaxLoanAmount = useMemo(
    () => maxLoanAmount != null && numericAmount > maxLoanAmount,
    [maxLoanAmount, numericAmount],
  );

  const canSubmit =
    !submitting &&
    !!numericAmount &&
    !exceedsMaxLoanAmount &&
    !!selectedOptionId &&
    !!reason.trim() &&
    (!requiresTermsAcceptance || termsAccepted);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (exceedsMaxLoanAmount) {
      toast.error(
        `The maximum loanable amount is ₱${maxLoanAmount.toLocaleString()}.`,
      );
      return;
    }

    if (!selectedOptionId) {
      toast.error("Select a deduction-per-pay amount.");
      return;
    }

    if (selectedOption && isOptionDisabled(selectedOption)) {
      toast.error(
        `At ₱${selectedOption.amount.toLocaleString()} per pay, this would take more than ${maxPayPeriods} pay periods. Choose a higher deduction amount.`,
      );
      return;
    }

    if (!selectedPurposeId) {
      toast.error("Select a purpose.");
      return;
    }

    if (isOtherPurposeSelected && !otherReason.trim()) {
      toast.error("Please specify your reason for Other.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Purpose is required.");
      return;
    }

    if (requiresTermsAcceptance && !termsAccepted) {
      toast.error("You must agree to the terms and condition above.");
      return;
    }

    try {
      setSubmitting(true);
      await fileCashAdvanceRequest({
        amount: numericAmount,
        deduction_option_id: selectedOptionId,
        reason: reason.trim(),
        terms_accepted: termsAccepted,
      });
      setAmount("");
      setSelectedOptionId(null);
      setReason("");
      setSelectedPurposeId(null);
      setOtherReason("");
      setTermsAccepted(false);
      toast.success("Cash advance request submitted to your department head.");
      await loadRequests();
      await loadBalance();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || error.message || "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      setCancellingId(id);
      await cancelCashAdvanceRequest(id);
      await loadRequests();
      await loadBalance();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Could not cancel request.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-fg">Cash Advance</h1>
        <p className="text-sm text-fg-subtle">
          File a request or manage your existing cash advances.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-xs font-semibold text-slate-400">
          Outstanding Balance
        </p>
        {loadingBalance ? (
          <p className="mt-1 text-sm text-slate-400">Loading...</p>
        ) : (
          <p className="mt-1 text-2xl font-extrabold">
            ₱{totalOutstanding.toLocaleString()}
          </p>
        )}
      </div>

      {/* ===== Slip-style filing form ===== */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface p-5"
      >
        <h2 className="text-center text-lg font-bold text-fg">
          Cash Advance Slip
        </h2>
        <div className="mx-auto mt-2 mb-4 h-0.5 w-16 rounded bg-fg" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-semibold text-fg-subtle">Date: </span>
              <span className="text-fg">{todayLong()}</span>
            </p>
            <p>
              <span className="font-semibold text-fg-subtle">Name: </span>
              <span className="text-fg">{employeeName || "-"}</span>
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-semibold text-fg-subtle">Company: </span>
              <span className="text-fg">Tytan Prime Corporation</span>
            </p>
          </div>
        </div>

        <div className="my-4 border-t border-border" />

        <label className="mb-1 block text-sm font-semibold text-fg-subtle">
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm text-fg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            exceedsMaxLoanAmount ? "border-danger" : "border-border"
          }`}
        />
        {maxLoanAmount != null && (
          <p
            className={`mt-1 text-xs ${
              exceedsMaxLoanAmount ? "font-semibold text-danger" : "text-fg-subtle"
            }`}
          >
            {exceedsMaxLoanAmount
              ? `Exceeds the maximum loanable amount of ₱${maxLoanAmount.toLocaleString()}.`
              : `Maximum loanable amount: ₱${maxLoanAmount.toLocaleString()}`}
          </p>
        )}

        <label className="mt-3 mb-1 block text-sm font-semibold text-fg-subtle">
          Purpose
        </label>
        {loadingPurposes ? (
          <p className="text-sm text-fg-subtle">Loading...</p>
        ) : purposes.length === 0 && !isOtherPurposeSelected ? (
          <p className="text-sm text-fg-subtle">
            No purposes have been set up yet. Contact an admin.
          </p>
        ) : (
          <SearchSelect
            value={
              purposesWithOther.find((p) => p.id === selectedPurposeId) ||
              null
            }
            options={purposesWithOther}
            onChange={(option) => setSelectedPurposeId(option?.id ?? null)}
            placeholder="Select a purpose"
            getOptionLabel={(p) => p?.label || ""}
            getOptionValue={(p) => p?.id}
          />
        )}

        {isOtherPurposeSelected && (
          <input
            type="text"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            placeholder="Please specify..."
            className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm text-fg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              otherReason.trim() ? "border-border" : "border-danger"
            }`}
          />
        )}

        <label className="mt-4 mb-1 block text-sm font-semibold text-fg-subtle">
          Deduction per Pay Period
        </label>
        {loadingOptions ? (
          <p className="mt-1 text-sm text-fg-subtle">Loading...</p>
        ) : options.length === 0 ? (
          <p className="mt-1 text-sm text-fg-subtle">
            No deduction-per-pay amounts have been set up yet. Contact an
            admin.
          </p>
        ) : (
          <div className="mt-1 overflow-hidden rounded-xl border border-border">
            {options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const periods = optionPeriods(option);
              const disabled = isOptionDisabled(option);
              return (
                <button
                  type="button"
                  key={option.id}
                  disabled={disabled}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left last:border-b-0 ${
                    isSelected ? "bg-primary/10" : "bg-surface"
                  } ${disabled ? "cursor-not-allowed opacity-45" : "hover:bg-surface-hover"}`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected ? "border-primary" : "border-fg-subtle"
                    }`}
                  >
                    {isSelected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-fg">
                      ₱{option.amount.toLocaleString()} per pay period
                    </span>
                    {option.label && (
                      <span className="block text-xs text-fg-subtle">
                        {option.label}
                      </span>
                    )}
                  </span>
                  {periods != null && (
                    <span className="shrink-0 text-xs text-fg-subtle">
                      {disabled
                        ? `Max ${maxPayPeriods} periods`
                        : `≈${periods} period${periods === 1 ? "" : "s"}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {estimatedPayPeriods != null && (
          <p className="mt-2 text-xs text-fg-subtle">
            ≈ {estimatedPayPeriods} pay period
            {estimatedPayPeriods === 1 ? "" : "s"} to fully deduct.
          </p>
        )}

        {requiresTermsAcceptance && (
          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <p className="mb-1 text-sm font-bold text-fg">
              Terms and Condition
            </p>
            <p className="whitespace-pre-line text-xs leading-5 text-fg-subtle">
              {termsContent}
            </p>
          </div>
        )}

        <div className="mt-5 border-t border-fg-subtle" />
        <label className="mt-3 flex items-start gap-2 text-xs text-fg">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={() => setTermsAccepted((prev) => !prev)}
            className="mt-0.5"
          />
          I agree to the terms and authorize this deduction.
        </label>

        <Button type="submit" disabled={!canSubmit} className="mt-4 w-full">
          {submitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-bold text-fg">My Requests</h2>

        {loading ? (
          <p className="text-sm text-fg-subtle">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            No cash advance requests filed yet.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => {
              const style = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-fg">
                      ₱{item.amount.toLocaleString()}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-fg">{item.reason}</p>

                  <p className="mt-1.5 text-xs text-fg-subtle">
                    ₱{item.deduction_per_pay_amount.toLocaleString()} per pay
                    {item.estimated_pay_periods
                      ? ` · ≈${item.estimated_pay_periods} pay periods`
                      : ""}
                  </p>

                  {item.status === "approved" && (
                    <>
                      {item.approved_amount != null &&
                        item.approved_amount !== item.amount && (
                          <p className="mt-1 text-xs font-semibold text-fg">
                            Requested Amount: ₱{item.amount.toLocaleString()}{" "}
                            · Approved CA: ₱
                            {item.approved_amount.toLocaleString()}
                          </p>
                        )}
                      <p className="mt-1 text-xs text-fg-subtle">
                        {item.is_fully_paid
                          ? "Fully paid"
                          : `₱${item.remaining_balance.toLocaleString()} remaining of ₱${(item.approved_amount ?? item.amount).toLocaleString()}`}
                      </p>
                      {item.release_reference && (
                        <p className="mt-1 text-xs text-fg-subtle">
                          Released via: {item.release_reference}
                          {item.released_at
                            ? ` (${new Date(item.released_at).toLocaleDateString()})`
                            : ""}
                        </p>
                      )}
                    </>
                  )}

                  <p className="mt-1 text-xs text-fg-subtle">
                    Requested to: {item.requested_by_name || "—"}
                  </p>

                  {item.remarks && (
                    <p className="mt-1 text-xs text-fg-subtle">
                      Remarks: {item.remarks}
                    </p>
                  )}

                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(item.id)}
                      disabled={cancellingId === item.id}
                      className="mt-3 text-xs font-bold text-danger hover:underline disabled:opacity-50"
                    >
                      {cancellingId === item.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverCashAdvance;
