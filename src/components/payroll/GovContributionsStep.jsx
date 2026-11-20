import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SearchInput from "../ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import { savePayRunContributions } from "../../api/payroll/payrollRuns";

// Pay run -> Contributions step (backend: POST /payroll-runs/contributions).
// The person with Payroll -> Government Contributions changes SSS /
// PhilHealth / Pag-IBIG / tax only; everything else on the run stays as
// generated. Net pay moves by the difference. At Head Review it's shown
// read-only so the head sees what was set.

const FIELDS = [
  ["sssDeduction", "SSS"],
  ["philhealthDeduction", "PhilHealth"],
  ["pagibigDeduction", "Pag-IBIG"],
  ["withholdingTax", "Tax"],
];

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const keyOf = (row) => `${row.employee?.id}@${row.employee?._segment?.key || ""}`;

export default function GovContributionsStep({ rows, editable, department, cutoffPeriod, onSaved }) {
  const [edits, setEdits] = useState({}); // key -> { field: string }
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Trip-based (per trip) people have no contributions.
  const list = useMemo(
    () =>
      (rows || [])
        .filter((row) => !row.isTripBasedEmployee)
        .filter((row) =>
          matchesSearch(search, row.employee?.first_name, row.employee?.last_name, row.employee?.position),
        ),
    [rows, search],
  );

  const valueOf = (row, field) => {
    const edited = edits[keyOf(row)]?.[field];
    return edited !== undefined ? edited : Number(row[field] || 0).toFixed(2);
  };

  const netOf = (row) => {
    const delta = FIELDS.reduce(
      (sum, [field]) => sum + (Number(valueOf(row, field)) || 0) - Number(row[field] || 0),
      0,
    );
    return Number(row.netPay || 0) - delta;
  };

  const dirtyKeys = Object.keys(edits).filter((key) =>
    Object.entries(edits[key]).some(([field, value]) => {
      const row = rows.find((r) => keyOf(r) === key);
      return row && Number(value || 0).toFixed(2) !== Number(row[field] || 0).toFixed(2);
    }),
  );

  const save = async () => {
    const lines = dirtyKeys.map((key) => {
      const row = rows.find((r) => keyOf(r) === key);
      const line = { employee_id: row.employee.id, segment: row.employee._segment?.key || "" };
      FIELDS.forEach(([field]) => {
        if (edits[key][field] !== undefined) line[field] = Number(edits[key][field] || 0);
      });
      return line;
    });
    if (lines.some((line) => FIELDS.some(([f]) => line[f] !== undefined && line[f] < 0))) {
      toast.error("Amounts can't be negative.");
      return;
    }
    setSaving(true);
    try {
      const result = await savePayRunContributions(department, cutoffPeriod, lines);
      setEdits({});
      toast.success(`Saved contributions for ${result.changed} employee${result.changed === 1 ? "" : "s"}.`);
      await onSaved(result.run);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save the contributions.");
    } finally {
      setSaving(false);
    }
  };

  const totals = FIELDS.map(([field]) => list.reduce((s, row) => s + (Number(valueOf(row, field)) || 0), 0));

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-fg">Government contributions</p>
          <p className="text-xs text-fg-subtle">
            {editable
              ? "Change SSS, PhilHealth, Pag-IBIG or tax per employee, then Save. Net pay updates by the difference. When done, use Submit to Head above."
              : "Set at the Contributions step. Read only."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employee..." />
          {editable && (
            <>
              {dirtyKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEdits({})}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-hover"
                >
                  Undo changes
                </button>
              )}
              <button
                type="button"
                disabled={saving || dirtyKeys.length === 0}
                onClick={save}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save${dirtyKeys.length ? ` (${dirtyKeys.length})` : ""}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 bg-surface-hover text-xs text-fg-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Employee</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              {FIELDS.map(([field, label]) => (
                <th key={field} className="px-3 py-2 text-right font-medium">
                  {label}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Net pay</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => {
              const key = keyOf(row);
              const changed = dirtyKeys.includes(key);
              const flags = row.employee?.contributions;
              return (
                <tr key={key} className={`border-t border-border ${changed ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-fg">
                      {row.employee?.first_name} {row.employee?.last_name}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {row.employee?.position || "—"}
                      {row.contributionsEdited ? " · edited" : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-fg-muted">{peso(row.grossPay)}</td>
                  {FIELDS.map(([field]) => {
                    const flagKey = { sssDeduction: "sss", philhealthDeduction: "philhealth", pagibigDeduction: "pagibig", withholdingTax: "tax" }[field];
                    const off = flags && !flags[flagKey];
                    return (
                      <td key={field} className="px-3 py-2 text-right">
                        {editable ? (
                          <input
                            id={`contrib-${key}-${field}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueOf(row, field)}
                            title={off ? "Not ticked on HRIS -> Government Contributions" : undefined}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], [field]: e.target.value },
                              }))
                            }
                            className={`w-24 rounded-md border bg-background px-2 py-1 text-right text-sm tabular-nums text-fg ${
                              off ? "border-dashed border-border text-fg-subtle" : "border-border"
                            }`}
                          />
                        ) : (
                          <span className="tabular-nums">{peso(row[field])}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{peso(netOf(row))}</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-fg-subtle">
                  No employees with contributions in this run.
                </td>
              </tr>
            )}
          </tbody>
          {list.length > 0 && (
            <tfoot className="border-t border-border bg-surface-hover text-xs font-semibold">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td />
                {totals.map((total, i) => (
                  <td key={FIELDS[i][0]} className="px-3 py-2 text-right tabular-nums">
                    {peso(total)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">
                  {peso(list.reduce((s, row) => s + netOf(row), 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
