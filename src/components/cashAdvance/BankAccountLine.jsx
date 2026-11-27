import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";

// The employee's bank account on a cash advance -- the backend sends it
// only to the final approver and higher (superadmin), so the money can be
// sent. `compact` for table rows.
export default function BankAccountLine({ request, compact = false, className = "" }) {
  const [copied, setCopied] = useState(false);
  if (!request?.can_see_account) return null;
  const acct = request.bank_account;

  if (!acct) {
    return (
      <p className={`text-xs text-warning ${className}`}>
        No bank account on file (Employee Details → Bank).
      </p>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(acct.account_number || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
      } ${className}`}
    >
      <Landmark size={compact ? 12 : 15} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-fg">{acct.bank || "Bank"}</span>
        {acct.account_name && <span className="text-fg-muted"> · {acct.account_name}</span>}
        <span className="block font-mono font-semibold tracking-wide text-fg">
          {acct.account_number || "No account number"}
        </span>
      </div>
      {acct.account_number && (
        <button
          type="button"
          onClick={copy}
          title="Copy account number"
          aria-label="Copy account number"
          className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-surface-hover hover:text-primary"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}
