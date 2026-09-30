import { useEffect, useRef, useState } from "react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import {
  SSS_CONTRIBUTION_TABLE,
  formatSSSRange,
  getSSSBracket,
} from "../../utils/payroll/sssContributionTable";

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Contribution Tables -- every SSS pay range with its employee deduction,
// plus the PhilHealth, Pag-IBIG and withholding tax rules the Payroll page
// uses. Read-only reference; the numbers come from the same table the
// payroll computes with (utils/payroll/sssContributionTable.js).
export default function ContributionTablesPage() {
  const [amount, setAmount] = useState("");
  const bracket = getSSSBracket(amount);
  const rowRefs = useRef({});

  // Bring the matching range into view as an amount is typed.
  useEffect(() => {
    if (bracket) {
      rowRefs.current[bracket.min]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [bracket]);

  const basic = Number(amount || 0);

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div>
        <h1 className="text-xl font-semibold text-fg">Contribution Tables</h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Every pay range and the deduction the Payroll page applies for it.
        </p>
      </div>

      {/* Check an amount */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <label className="block text-sm font-medium text-fg-muted">
          Check an amount -- gross pay for the cutoff
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 9115.07"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-72"
          />
        </label>
        {bracket ? (
          <p className="mt-2 text-sm text-fg">
            Falls in <strong>{formatSSSRange(bracket)}</strong> → SSS{" "}
            <strong className="text-danger">{peso(bracket.employeeDeduction)}</strong>
          </p>
        ) : (
          amount !== "" && <p className="mt-2 text-sm text-fg-subtle">No SSS for ₱0.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        {/* SSS */}
        <div className="rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold text-fg">SSS -- Employee share</h2>
            <p className="text-xs text-fg-subtle">
              Looked up from the gross pay for the cutoff (Regular SS + MPF,
              employee total). {SSS_CONTRIBUTION_TABLE.length} ranges.
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm text-fg">
              <thead className="sticky top-0 bg-surface-hover text-fg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Range of pay</th>
                  <th className="px-4 py-2 text-right font-medium">Employee deduction</th>
                </tr>
              </thead>
              <tbody>
                {SSS_CONTRIBUTION_TABLE.map((row, index) => {
                  const on = bracket?.min === row.min;
                  return (
                    <tr
                      key={row.min}
                      ref={(el) => {
                        rowRefs.current[row.min] = el;
                      }}
                      className={`border-t border-border ${
                        on ? "bg-primary/15 font-semibold" : ""
                      }`}
                    >
                      <td className="px-4 py-2 text-fg-subtle">{index + 1}</td>
                      <td className="px-4 py-2">{formatSSSRange(row)}</td>
                      <td className="px-4 py-2 text-right">{peso(row.employeeDeduction)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other deductions */}
        <div className="space-y-4">
          <RuleCard
            title="PhilHealth -- Employee share"
            rule="2.5% of the basic pay for the cutoff (allowance not included)."
            example={
              basic > 0 ? `If ${peso(basic)} is basic pay: ${peso(basic * 0.025)}` : null
            }
          />
          <RuleCard
            title="Pag-IBIG -- Employee share"
            rule="₱200 a month, so ₱100 per semi-monthly cutoff."
          />
          <RuleCard
            title="Withholding Tax"
            rule="15% of the yearly basic pay above ₱250,000, divided by 12."
            example={
              basic > 0
                ? `If ${peso(basic)} is the monthly basic: ${peso(
                    Math.max(basic * 12 - 250000, 0) * 0.15 / 12,
                  )}`
                : null
            }
          />
          <p className="rounded-xl bg-surface-hover p-3 text-xs text-fg-subtle">
            These are filled in automatically for <strong>Monthly</strong>{" "}
            employees; every amount can still be changed per employee on the
            Payroll page. Drivers and helpers are paid per trip and have none
            of these deducted automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

const RuleCard = ({ title, rule, example }) => (
  <div className="rounded-2xl border border-border bg-surface p-4">
    <h2 className="font-semibold text-fg">{title}</h2>
    <p className="mt-1 text-sm text-fg-muted">{rule}</p>
    {example && <p className="mt-2 text-xs text-primary">{example}</p>}
  </div>
);
