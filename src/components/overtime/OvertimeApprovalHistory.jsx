import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getOvertimeReviewedByMe } from "../../api/overtimeRequests";
import SearchInput from "../ui/searchInput/SearchInput";
import Pagination from "../ui/pagination/Pagination";
import usePagination from "../../hooks/usePagination";
import { matchesSearch } from "../../utils/search";

// Approvals -> Overtime -> History: overtime this person approved or
// rejected (their own step, or the final say), with where each request
// stands now. Backend: GET /overtime-requests/reviewed-by-me.

const isoDaysAgo = (days) => {
  const d = new Date(Date.now() - days * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
};

const NOW_STYLES = {
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  pending: "bg-warning/15 text-warning",
  cancelled: "bg-surface-active text-fg-muted",
};

export default function OvertimeApprovalHistory() {
  const [start, setStart] = useState(() => isoDaysAgo(60));
  const [end, setEnd] = useState(() => isoDaysAgo(0));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    if (!start || !end) return;
    getOvertimeReviewedByMe(start, end)
      .then((data) => setItems(data.items || []))
      .catch(() => toast.error("Couldn't load your overtime history."))
      .finally(() => setLoading(false));
  }, [start, end]);

  const filtered = items.filter(
    (row) =>
      (actionFilter === "all" || row.my_action === actionFilter) &&
      matchesSearch(search, row.employee_name, row.reason, row.ot_date, row.my_remarks),
  );
  const counts = {
    all: items.length,
    approved: items.filter((r) => r.my_action === "approved").length,
    rejected: items.filter((r) => r.my_action === "rejected").length,
  };
  const totalApprovedHours = filtered
    .filter((r) => r.my_action === "approved")
    .reduce((sum, r) => sum + Number(r.my_approved_hours ?? r.approved_hours ?? r.computed_hours ?? 0), 0);
  const { page, setPage, totalPages, paginatedItems } = usePagination(filtered, 15);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-fg-muted">
          OT date from
          <input
            id="ot-history-start"
            type="date"
            value={start}
            max={end}
            onChange={(e) => {
              setLoading(true);
              setStart(e.target.value);
            }}
            className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
          />
        </label>
        <label className="text-xs font-medium text-fg-muted">
          to
          <input
            id="ot-history-end"
            type="date"
            value={end}
            min={start}
            onChange={(e) => {
              setLoading(true);
              setEnd(e.target.value);
            }}
            className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
          />
        </label>
        <div className="flex gap-1 rounded-lg bg-surface-hover p-1">
          {[
            ["all", "All"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActionFilter(key);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                actionFilter === key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              {label} <span className="opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, reason, date..."
          />
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-fg-subtle">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-muted">
          {items.length
            ? "Nothing matches this filter or search."
            : "You haven't approved or rejected any overtime in these dates."}
        </div>
      ) : (
        <>
          <p className="text-xs text-fg-subtle">
            {filtered.length} request{filtered.length === 1 ? "" : "s"}
            {totalApprovedHours > 0 && ` · ${totalApprovedHours.toFixed(2)} h approved by you`}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Overtime</th>
                  <th className="px-4 py-3 text-left font-medium">Your decision</th>
                  <th className="px-4 py-3 text-left font-medium">Now</th>
                  <th className="px-4 py-3 text-left font-medium">Your remarks</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((row) => {
                  const current = row.approval_steps?.find((st) => st.state === "current");
                  const nowLabel =
                    row.status === "pending"
                      ? `Waiting on ${current?.name || "the next approver"}`
                      : row.status === "approved"
                        ? `Approved${row.approved_hours != null ? ` · ${row.approved_hours} h` : ""}`
                        : row.status.charAt(0).toUpperCase() + row.status.slice(1);
                  return (
                    <tr key={row.id} className="border-t border-border align-top hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">{row.employee_name}</p>
                        <p className="line-clamp-2 max-w-[260px] text-xs text-fg-subtle" title={row.reason}>
                          {row.reason}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        <p className="whitespace-nowrap">{row.ot_date}</p>
                        <p className="whitespace-nowrap text-xs">
                          {row.time_in}
                          {row.time_out ? ` – ${row.time_out} (${row.computed_hours}h)` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.my_action === "approved" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                          }`}
                        >
                          {row.my_action === "approved"
                            ? `Approved${row.my_approved_hours != null ? ` ${row.my_approved_hours} h` : ""}`
                            : "Rejected"}
                        </span>
                        {row.my_action_at && (
                          <p className="mt-1 text-[11px] text-fg-subtle">{row.my_action_at}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            NOW_STYLES[row.status] || NOW_STYLES.cancelled
                          }`}
                        >
                          {nowLabel}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-xs text-fg-muted">
                        {row.my_remarks || "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
