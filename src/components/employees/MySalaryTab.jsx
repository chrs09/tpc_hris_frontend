import { useEffect, useState } from "react";
import { getMySalary } from "../../api/employee";

// My Profile -> Salary: your own current pay and how it changed (from
// Work History). Shown only to the person themselves.

const peso = (value) =>
  value === null || value === undefined
    ? "—"
    : `₱${Number(value).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const formatDay = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

// Monthly Basic × 12 ÷ 313 (same as the Employees form).
const dailyEquivalent = (basic) =>
  basic ? Math.round(((Number(basic) * 12) / 313) * 100) / 100 : null;

function PayFigures({ pay }) {
  const monthly = pay.payroll_type === "Monthly";
  const figures = monthly
    ? [
        { label: "Monthly Basic", value: peso(pay.monthly_basic) },
        { label: "Monthly Allowance", value: peso(pay.monthly_allow) },
        { label: "Daily Rate Equivalent", value: peso(dailyEquivalent(pay.monthly_basic)) },
      ]
    : [{ label: "Daily Rate", value: peso(pay.daily_rate) }];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {figures.map((f) => (
        <div key={f.label} className="rounded-xl border border-border bg-surface-hover p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{f.label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-fg">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

const changeText = (row) => {
  const monthly = row.payroll_type === "Monthly";
  const prev = row.previous;
  const parts = [];
  if (monthly) {
    parts.push(
      prev && prev.monthly_basic !== row.monthly_basic
        ? `Basic ${peso(prev.monthly_basic)} → ${peso(row.monthly_basic)}`
        : `Basic ${peso(row.monthly_basic)}`,
    );
    if (row.monthly_allow || (prev && prev.monthly_allow)) {
      parts.push(
        prev && prev.monthly_allow !== row.monthly_allow
          ? `Allowance ${peso(prev.monthly_allow)} → ${peso(row.monthly_allow)}`
          : `Allowance ${peso(row.monthly_allow)}`,
      );
    }
  } else {
    parts.push(
      prev && prev.daily_rate !== row.daily_rate
        ? `Daily ${peso(prev.daily_rate)} → ${peso(row.daily_rate)}`
        : `Daily ${peso(row.daily_rate)}`,
    );
  }
  if (prev && prev.payroll_type !== row.payroll_type) {
    parts.push(`Pay type ${prev.payroll_type || "—"} → ${row.payroll_type || "—"}`);
  }
  return parts.join(" · ");
};

export default function MySalaryTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMySalary()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail || "Couldn't load your salary."));
  }, []);

  if (error) return <p className="p-6 text-sm text-danger">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-fg-subtle">Loading...</p>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-1">
          <h3 className="text-lg font-semibold text-fg">Current Salary</h3>
          <span className="text-xs text-fg-subtle">
            {data.current.payroll_type || "—"} pay · only you can see this here
          </span>
        </div>
        <PayFigures pay={data.current} />
      </section>

      <section className="space-y-3">
        <h3 className="border-b border-border pb-1 text-lg font-semibold text-fg">Salary History</h3>
        {data.history.length === 0 ? (
          <p className="text-sm text-fg-subtle">No salary changes recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {data.history.map((row) => (
              <li
                key={`${row.effective_date}-${row.status}`}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-fg">
                    {row.kind === "HIRED" ? "Starting salary" : "Salary change"} ·{" "}
                    {formatDay(row.effective_date)}
                  </p>
                  {row.status === "SCHEDULED" && (
                    <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                      Takes effect {formatDay(row.effective_date)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm tabular-nums text-fg">{changeText(row)}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {[row.position, row.department].filter(Boolean).join(" · ")}
                  {row.reason ? ` · ${row.reason}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
