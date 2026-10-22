const peso = (n) =>
  `₱${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// What an exception asks for (pending), or how it ended (rejected) --
// shown on the cash advance approval card / row.
export default function CashAdvanceExceptionSummary({ request, compact = false }) {
  if (!request.exception_status) return null;

  if (request.exception_status === "rejected") {
    return (
      <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-fg">
        <span className="font-semibold">Exception not allowed</span>
        {request.exception_approver_name ? ` by ${request.exception_approver_name}` : ""}
        {request.exception_remarks ? `: ${request.exception_remarks}` : "."} You can still
        approve within the policy or reject.
      </p>
    );
  }

  const pending = request.exception_status === "pending";
  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
        pending ? "border-warning/40 bg-warning/10" : "border-border bg-surface-hover"
      }`}
    >
      <p className="font-semibold text-fg">
        {pending ? "Exception requested" : "Approved as an exception"}:{" "}
        {peso(request.exception_amount)} · {request.exception_pay_periods} pays ×{" "}
        {peso(request.exception_deduction_per_pay)}
      </p>
      {!compact && (
        <>
          <p className="mt-0.5 text-fg-muted">
            <span className="font-medium">Reason:</span> {request.exception_reason}
          </p>
          <p className="mt-0.5 text-fg-subtle">
            Asked by {request.exception_requested_by_name || "the last approver"}
            {pending && request.exception_approver_name
              ? ` · waiting on ${request.exception_approver_name}`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}
