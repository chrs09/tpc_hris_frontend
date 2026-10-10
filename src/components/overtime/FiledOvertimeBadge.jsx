// "Filed OT" -- overtime the employee filed (approved / pending hours),
// with each request in the tooltip. Shown on the Payroll list and the
// Attendance grid; separate from OT worked out from attendance.

import { summarizeFiledOvertime, filedOvertimeTitle } from "../../utils/filedOvertime";

export default function FiledOvertimeBadge({ requests = [], compact = false }) {
  if (!requests.length) return <span className="text-fg-subtle">--</span>;
  const { approved, pending } = summarizeFiledOvertime(requests);
  return (
    <span
      title={filedOvertimeTitle(requests)}
      className={`inline-flex ${compact ? "flex-row gap-1" : "flex-col gap-0.5"} items-start`}
    >
      {approved > 0 && (
        <span className="whitespace-nowrap rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
          {approved.toFixed(2)} h approved
        </span>
      )}
      {pending > 0 && (
        <span className="whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
          {pending.toFixed(2)} h pending
        </span>
      )}
    </span>
  );
}
