import { useMemo, useState } from "react";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";
import Pill from "../ui/statusPill/StatusPill";
import { TABLE_HEAD, TABLE_HEAD_STICKY, TABLE_ROW, TABLE_WRAP } from "../ui/table/tableStyles";

// Cash Advances -> Pending Approvals -> "All under my team": every cash
// advance (any status) of the approver's team -- the people under the Org
// Chart units they head, plus anyone whose approval chain includes them
// (GET /cash-advance-requests/my-team). Shows each person's current CA
// balance so the approver can recommend or not. Read-only: approving stays
// on "For me".

// label, pill (soft tint + inset ring), dot color
const STATUS = {
  pending: ["Pending", "bg-warning/10 text-warning ring-warning/30", "bg-warning"],
  awaiting_acceptance: ["Awaiting employee", "bg-warning/10 text-warning ring-warning/30", "bg-warning"],
  approved: ["Approved", "bg-success/10 text-success ring-success/30", "bg-success"],
  released: ["Released", "bg-primary/10 text-primary ring-primary/30", "bg-primary"],
  rejected: ["Rejected", "bg-danger/10 text-danger ring-danger/30", "bg-danger"],
  cancelled: ["Cancelled", "bg-surface-active text-fg-subtle ring-border", "bg-fg-subtle"],
};

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function StatusPill({ status }) {
  const [label, colors] = STATUS[status] || [status, ""];
  return <Pill colors={colors}>{label}</Pill>;
}

// Who approved, or whose turn it is while pending.
const approverText = (req) => {
  const approved = (req.approval_log || [])
    .filter((e) => e.action === "approved")
    .map((e) => e.name);
  if (req.status === "pending") {
    const current = req.approval_steps?.find((s) => s.state === "current");
    return `${approved.length ? `✓ ${approved.join(" → ")} · ` : ""}Waiting: ${
      req.can_act ? "You" : current?.name || "—"
    }`;
  }
  return approved.join(" → ") || req.approved_by_name || "—";
};

const TH = "px-4 py-3";
const TD = "px-4 py-3.5";
const tableWrap = TABLE_WRAP;

const Money = ({ value, owed = false, className = "" }) => (
  <span className={`tabular-nums ${owed && value > 0 ? "font-bold text-warning" : "text-fg"} ${className}`}>
    {peso(value)}
  </span>
);

export default function CashAdvanceTeamView({ requests, loading, search = "" }) {
  const [status, setStatus] = useState("");
  const term = search.trim().toLowerCase();

  const matching = useMemo(
    () =>
      requests.filter(
        (r) =>
          !term ||
          [r.employee_name, r.reason, r.status, String(r.amount)].some((v) =>
            String(v || "").toLowerCase().includes(term),
          ),
      ),
    [requests, term],
  );
  const shown = status ? matching.filter((r) => (r.display_status || r.status) === status) : matching;
  const pagination = usePagination(shown, 15);

  // One line per person: current balance and how many requests.
  const people = useMemo(() => {
    const map = new Map();
    matching.forEach((r) => {
      const p = map.get(r.employee_id) || {
        id: r.employee_id,
        name: r.employee_name,
        outstanding: r.employee_outstanding_balance || 0,
        open: r.employee_open_advances || 0,
        pending: 0,
      };
      if (r.status === "pending") p.pending += 1;
      map.set(r.employee_id, p);
    });
    return [...map.values()].sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));
  }, [matching]);

  const counts = useMemo(() => {
    const c = {};
    matching.forEach((r) => {
      const k = r.display_status || r.status;
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [matching]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
        Loading...
      </div>
    );
  }
  if (!requests.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
        No cash advances from your team yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* CA balance per person */}
      <div className="space-y-2">
        <div>
          <h3 className="text-base font-bold text-fg">CA balance per person</h3>
          <p className="text-xs text-fg-subtle">
            What each person still owes on approved cash advances, to help you recommend a new one.
          </p>
        </div>
        <div className={`${tableWrap} max-h-72`}>
          <table className="w-full min-w-[520px] text-sm">
            <thead className={`sticky top-0 ${TABLE_HEAD_STICKY}`}>
              <tr>
                <th className={`${TH} text-left`}>Employee</th>
                <th className={`${TH} text-right`}>Balance owed</th>
                <th className={`${TH} text-right`}>Open advances</th>
                <th className={`${TH} text-right`}>Pending requests</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className={TABLE_ROW}>
                  <td className={`${TD} text-fg`}>{p.name}</td>
                  <td className={`${TD} text-right`}><Money value={p.outstanding} owed /></td>
                  <td className={`${TD} text-right tabular-nums text-fg`}>{p.open}</td>
                  <td className={`${TD} text-right tabular-nums text-fg`}>{p.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {[["", "All", matching.length], ...Object.entries(STATUS).map(([k, [label]]) => [k, label, counts[k] || 0])]
          .filter(([k, , n]) => !k || n > 0)
          .map(([k, label, n]) => (
            <button
              key={k || "all"}
              type="button"
              onClick={() => setStatus(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                status === k
                  ? "border-success bg-success/10 font-semibold text-success"
                  : "border-border text-fg-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              {label} <span className="tabular-nums">{n}</span>
            </button>
          ))}
      </div>

      {/* Every request */}
      <div className={tableWrap}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className={TABLE_HEAD}>
            <tr>
              <th className={`${TH} text-left`}>Employee</th>
              <th className={`${TH} text-left`}>Amount</th>
              <th className={`${TH} text-left`}>Loan purpose</th>
              <th className={`${TH} text-left`}>Status</th>
              <th className={`${TH} text-left`}>Approver</th>
              <th className={`${TH} text-right`}>Remaining</th>
              <th className={`${TH} text-right`}>Person&apos;s balance</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((r) => (
              <tr key={r.id} className={`align-top ${TABLE_ROW}`}>
                <td className={TD}>
                  <p className="font-bold text-fg">{r.employee_name}</p>
                  <p className="text-xs text-fg-subtle">Filed {new Date(r.created_at).toLocaleDateString()}</p>
                </td>
                <td className={TD}>
                  <Money value={r.approved_amount ?? r.amount} />
                  {r.approved_amount != null && r.approved_amount !== r.amount && (
                    <span className="block text-xs text-fg-subtle">asked {peso(r.amount)}</span>
                  )}
                </td>
                <td className={`${TD} max-w-[220px] text-fg-muted`} title={r.reason}>
                  <span className="line-clamp-2">{r.reason}</span>
                </td>
                <td className={TD}>
                  <StatusPill status={r.display_status || r.status} />
                  {r.can_act && (
                    <span className="mt-1.5 block text-[11px] font-bold text-primary">Your turn: see For me</span>
                  )}
                </td>
                <td className={`${TD} text-fg-muted`}>{approverText(r)}</td>
                <td className={`${TD} text-right`}>
                  {r.status === "approved" ? <Money value={r.remaining_balance} /> : <span className="text-fg-subtle">—</span>}
                </td>
                <td className={`${TD} text-right`}>
                  <Money value={r.employee_outstanding_balance} owed />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={pagination.setPage} />
    </div>
  );
}
