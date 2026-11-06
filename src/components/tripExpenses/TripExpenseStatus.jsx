import { TRIP_EXPENSE_STATUS } from "../../api/tripExpenses";

const TONES = {
  warning: "bg-warning/15 text-warning",
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  muted: "bg-surface-active text-fg-muted",
};

export default function TripExpenseStatus({ status }) {
  const info = TRIP_EXPENSE_STATUS[status] || { label: status, tone: "muted" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONES[info.tone]}`}>
      {info.label}
    </span>
  );
}
