import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { requestCashAdvanceException } from "../../api/cashAdvanceRequests";
import { getExceptionApprover, getTerms } from "../../api/cashAdvanceSettings";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// Last approver: ask the exception approver (Cash Advance Settings) to
// allow more than the policy -- amount above the limit and/or a longer
// repayment -- for this one request. Amount, repayment term and reason
// are required.
export default function CashAdvanceExceptionModal({ request, onClose, onDone }) {
  const [amount, setAmount] = useState(String(request.amount));
  const [payPeriods, setPayPeriods] = useState(
    String(request.estimated_pay_periods || ""),
  );
  const [reason, setReason] = useState("");
  const [limits, setLimits] = useState(null);
  const [approver, setApprover] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTerms()
      .then(setLimits)
      .catch(() => setLimits(null));
    getExceptionApprover()
      .then(setApprover)
      .catch(() => setApprover(null));
  }, []);

  const value = Number(amount);
  const periods = Number(payPeriods);
  const perPay =
    value > 0 && periods > 0 ? Math.ceil((value * 100) / periods) / 100 : null;
  const overLimit =
    limits?.max_loan_amount != null && value > Number(limits.max_loan_amount);
  const overTerm = limits?.max_pay_periods != null && periods > limits.max_pay_periods;
  const valid =
    value > 0 && Number.isInteger(periods) && periods > 0 && reason.trim().length > 0;

  const submit = async () => {
    if (!valid) {
      toast.error("Enter the amount, repayment term and reason.");
      return;
    }
    try {
      setSaving(true);
      const result = await requestCashAdvanceException(request.id, {
        amount: value,
        payPeriods: periods,
        reason: reason.trim(),
      });
      toast.success(
        result?.status === "approved"
          ? `Approved with the exception: ${peso(value)}.`
          : `Exception sent to ${result?.exception_approver_name || "the exception approver"} for approval.`,
      );
      onDone?.(result);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send the exception.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background p-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-fg">Request Exception</h3>
            <p className="text-xs text-fg-subtle">
              {request.employee_name} · requested {peso(request.amount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="rounded-xl bg-surface-hover px-3 py-2 text-xs text-fg-muted">
            Allows more than the company policy for this request only
            {limits?.max_loan_amount != null && (
              <>
                {" "}(limit <strong>{peso(limits.max_loan_amount)}</strong>, up to{" "}
                <strong>{limits.max_pay_periods}</strong> pay periods)
              </>
            )}
            . It goes to{" "}
            <strong>{approver?.name || "a superadmin"}</strong> for approval.
          </p>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-fg-muted">
              Amount (₱) *
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
            {overLimit && (
              <span className="mt-1 block text-xs font-medium text-warning">
                {peso(value - Number(limits.max_loan_amount))} above the policy limit.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-fg-muted">
              Repayment term (pay periods) *
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={payPeriods}
              onChange={(e) => setPayPeriods(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-fg-subtle">
              {perPay
                ? `${peso(perPay)} deducted per pay for ${periods} pay${periods !== 1 ? "s" : ""}.`
                : "Deduction per pay is worked out from the amount and term."}
              {overTerm && (
                <span className="font-medium text-warning"> Longer than the policy.</span>
              )}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-fg-muted">
              Reason for exception *
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hospitalization of a family member -- approved by management"
              className={`${inputClass} resize-none`}
            />
          </label>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-fg hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !valid}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Sending..." : "Send for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
