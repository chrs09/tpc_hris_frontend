import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getLockedPayrolls } from "../../api/payroll/payrollRuns";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { payrollStatusLabel } from "../../utils/payroll/payrollStatus";
import { matchesSearch } from "../../utils/search";

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortDate = (iso) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const stamp = (at, by) =>
  at ? `${new Date(at).toLocaleDateString()}${by ? ` · ${by}` : ""}` : "—";

// Every Locked / Paid payroll (all groups, and departments from before
// groups), newest cutoff first. Open goes to it on the Payroll page,
// where each employee's payslip can be released.
export default function LockedPayrollsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    getLockedPayrolls()
      .then(setRuns)
      .catch((error) => {
        toast.error(error.response?.data?.detail || "Could not load locked payrolls.");
        setRuns([]);
      });
  }, []);

  const rows = useMemo(
    () =>
      (runs || []).filter(
        (run) =>
          (status === "ALL" || run.status === status) &&
          matchesSearch(search, run.department, run.period_start, run.period_end),
      ),
    [runs, search, status],
  );

  const open = (run) =>
    navigate(
      `/dashboard/payroll?payroll=${encodeURIComponent(run.department)}&cutoff=${encodeURIComponent(
        run.cutoff_period,
      )}`,
    );

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Locked Payrolls</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Every payroll that&apos;s locked or paid. Open one to release payslips to its
            employees.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {["ALL", "LOCKED", "PAID"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-md px-3 py-1.5 ${
                  status === value ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"
                }`}
              >
                {value === "ALL" ? "All" : payrollStatusLabel(value)}
              </button>
            ))}
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search payroll group..." />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cutoff</th>
              <th className="px-4 py-3 text-left font-medium">Payroll group</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Employees</th>
              <th className="px-4 py-3 text-right font-medium">Gross</th>
              <th className="px-4 py-3 text-right font-medium">Net</th>
              <th className="px-4 py-3 text-left font-medium">Locked</th>
              <th className="px-4 py-3 text-left font-medium">Paid</th>
              <th className="px-4 py-3 text-left font-medium">Payslips released</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {runs === null ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-fg-subtle">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-fg-subtle">
                  {runs.length ? "No payrolls match." : "No locked payrolls yet."}
                </td>
              </tr>
            ) : (
              rows.map((run) => {
                const allReleased =
                  run.employee_count > 0 && run.released_count >= run.employee_count;
                return (
                  <tr
                    key={`${run.department}-${run.cutoff_period}`}
                    className="border-t border-border hover:bg-surface-hover"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-fg">
                      {shortDate(run.period_start)} – {shortDate(run.period_end)}
                    </td>
                    <td className="px-4 py-3 text-fg">{run.department}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          run.status === "PAID"
                            ? "bg-success/15 text-success"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {payrollStatusLabel(run.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                      {run.employee_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                      {peso(run.total_gross)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-fg">
                      {peso(run.total_net)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-fg-muted">
                      {stamp(run.locked_at, run.locked_by)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-fg-muted">
                      {stamp(run.paid_at, run.paid_by)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={allReleased ? "font-semibold text-success" : "text-fg-muted"}>
                        {run.released_count} of {run.employee_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => open(run)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface-active"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
