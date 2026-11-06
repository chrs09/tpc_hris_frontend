import { Receipt, Wallet } from "lucide-react";
import TripExpenseStatus from "./TripExpenseStatus";
import { peso } from "./format";

// One trip budget / expense report in a list; onOpen shows the details.
export default function TripExpenseRow({ expense, onOpen, showName = false }) {
  const Icon = expense.kind === "budget" ? Wallet : Receipt;
  const amount =
    expense.kind === "budget"
      ? expense.released_amount ?? expense.requested_total
      : expense.actual_total;
  return (
    <button
      type="button"
      onClick={() => onOpen(expense)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-hover p-3.5 text-left hover:bg-surface-active"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">
          {showName ? `${expense.employee_name} · ` : ""}
          {expense.kind === "budget" ? "Trip budget" : "Expense report"} · {peso(amount)}
        </p>
        <p className="truncate text-xs text-fg-muted">
          {expense.trip_label || expense.purpose || expense.vehicle_unit_label || `#${expense.id}`}
        </p>
      </div>
      <TripExpenseStatus status={expense.status} />
    </button>
  );
}
