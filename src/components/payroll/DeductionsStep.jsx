import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SearchInput from "../ui/searchInput/SearchInput";
import { confirmDialog } from "../ui/dialog/dialogService";
import { matchesSearch } from "../../utils/search";
import { confirmPayRunDeductions, savePayRunDeductions } from "../../api/payroll/payrollRuns";

// Pay run -> Deductions step (at Generated; backend POST
// /payroll-runs/deductions and /deductions/confirm). After Generate, the
// preparer sets cash advance, trip charges, SSS / Pag-IBIG loans (amounts
// come from Finance -> Loan Amortization) and other deductions
// on the snapshot, then confirms. Submit for Review needs them confirmed.
// Government contributions are the later Contributions step.

const FIELDS = [
  { key: "sssLoan", label: "SSS loan", balance: "sssLoanBalanceBefore", once: true },
  { key: "pagibigLoan", label: "Pag-IBIG loan", balance: "pagibigLoanBalanceBefore", once: true },
  { key: "cashAdvance", label: "Cash advance", balance: "cashAdvanceBalanceBefore", once: true },
  { key: "tripCharge", label: "Trip charges", balance: "tripChargeBalanceBefore", once: true },
  { key: "personalDeduction", label: "Other" },
];

const GOV = ["sssDeduction", "philhealthDeduction", "pagibigDeduction", "withholdingTax"];

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const keyOf = (row) => `${row.employee?.id}@${row.employee?._segment?.key || ""}`;

const stampText = (stamp) =>
  stamp
    ? `${new Date(stamp.at).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}${stamp.by ? ` by ${stamp.by}` : ""}`
    : "";

export default function DeductionsStep({ rows, run, department, cutoffPeriod, onSaved }) {
  const editable = Boolean(run?.can_edit_deductions);
  const confirmed = Boolean(run?.deductions_confirmed);
  const [edits, setEdits] = useState({}); // key -> { field: string }
  const [search, setSearch] = useState("");
  const [show, setShow] = useState("all"); // all | with
  const [busy, setBusy] = useState(null);

  const valueOf = (row, field) => {
    const edited = edits[keyOf(row)]?.[field];
    return edited !== undefined ? edited : row[field] ? Number(row[field]).toFixed(2) : "";
  };

  const deductionsOf = (row) => FIELDS.reduce((s, f) => s + (Number(valueOf(row, f.key)) || 0), 0);

  const netOf = (row) => {
    const before = FIELDS.reduce((s, f) => s + Number(row[f.key] || 0), 0);
    return Number(row.netPay || 0) - (deductionsOf(row) - before);
  };

  const list = useMemo(
    () =>
      (rows || []).filter(
        (row) =>
          (show === "all" ||
            FIELDS.some((f) => Number(row[f.key] || 0) > 0 || row[f.balance] > 0) ||
            edits[keyOf(row)]) &&
          matchesSearch(search, row.employee?.first_name, row.employee?.last_name, row.employee?.position),
      ),
    [rows, search, show, edits],
  );

  const dirtyKeys = Object.keys(edits).filter((key) => {
    const row = rows.find((r) => keyOf(r) === key);
    return (
      row &&
      Object.entries(edits[key]).some(([field, value]) =>
        field === "personalDeductionNote"
          ? (value || "") !== (row.personalDeductionNote || "")
          : Number(value || 0).toFixed(2) !== Number(row[field] || 0).toFixed(2),
      )
    );
  });

  const setField = (row, field, value) =>
    setEdits((prev) => ({ ...prev, [keyOf(row)]: { ...prev[keyOf(row)], [field]: value } }));

  const save = async () => {
    const lines = dirtyKeys.map((key) => {
      const row = rows.find((r) => keyOf(r) === key);
      const line = { employee_id: row.employee.id, segment: row.employee._segment?.key || "" };
      Object.entries(edits[key]).forEach(([field, value]) => {
        line[field] = field === "personalDeductionNote" ? value : Number(value || 0);
      });
      return line;
    });
    const negative = list.find((row) => dirtyKeys.includes(keyOf(row)) && netOf(row) < 0);
    if (negative) {
      toast.error(`${negative.employee.first_name} ${negative.employee.last_name}: net pay would go below zero.`);
      return;
    }
    setBusy("save");
    try {
      const result = await savePayRunDeductions(department, cutoffPeriod, lines);
      setEdits({});
      toast.success(`Saved deductions for ${result.changed} employee${result.changed === 1 ? "" : "s"}.`);
      await onSaved(result.run, true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save the deductions.");
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    const total = (rows || []).reduce((s, row) => s + FIELDS.reduce((t, f) => t + Number(row[f.key] || 0), 0), 0);
    const ok = await confirmDialog(
      `Confirm the deductions for this pay run (${peso(total)} in all)? Then Submit for Review unlocks. Changing a deduction later asks for confirmation again.`,
    );
    if (!ok) return;
    setBusy("confirm");
    try {
      await onSaved(await confirmPayRunDeductions(department, cutoffPeriod), false);
      toast.success("Deductions confirmed.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not confirm the deductions.");
    } finally {
      setBusy(null);
    }
  };

  const totals = FIELDS.map((f) => list.reduce((s, row) => s + (Number(valueOf(row, f.key)) || 0), 0));

  return (
    <div
      className={`space-y-3 rounded-xl border bg-surface p-4 ${
        confirmed ? "border-success/40" : "border-warning/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">
            Deductions{" "}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                confirmed ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}
            >
              {confirmed ? "Confirmed" : "Not confirmed"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {confirmed
              ? `Confirmed ${stampText(run.deductions_confirmed)}. Submit for Review is open.`
              : "Set cash advance, trip charges, SSS / Pag-IBIG loans and other deductions, Save, then Confirm deductions. Submit for Review opens after that. Loan amounts come from Finance → Loan Amortization."}{" "}
            Government contributions are set at the Contributions step.
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
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
              disabled={Boolean(busy) || dirtyKeys.length === 0}
              onClick={save}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {busy === "save" ? "Saving..." : `Save${dirtyKeys.length ? ` (${dirtyKeys.length})` : ""}`}
            </button>
            {run?.can_confirm_deductions && (
              <button
                type="button"
                disabled={Boolean(busy) || dirtyKeys.length > 0}
                title={dirtyKeys.length ? "Save your changes first" : undefined}
                onClick={confirm}
                className="rounded-lg bg-success px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy === "confirm" ? "Confirming..." : "Confirm deductions"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          {[
            ["all", `Everyone (${(rows || []).length})`],
            ["with", "With deductions or balances"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setShow(key)}
              className={`rounded-md px-2.5 py-1 ${show === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search employee..." />
      </div>

      <div className="max-h-[30rem] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="sticky top-0 z-10 bg-surface-hover text-xs text-fg-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Employee</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              <th className="px-3 py-2 text-right font-medium">Gov&apos;t</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-3 py-2 text-right font-medium">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Net pay</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => {
              const key = keyOf(row);
              const changed = dirtyKeys.includes(key);
              const net = netOf(row);
              const notLast = row.employee?._segment && !row.employee._segment.is_last;
              return (
                <tr key={key} className={`border-t border-border align-top ${changed ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-fg">
                      {row.employee?.first_name} {row.employee?.last_name}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {row.employee?.position || "—"}
                      {row.isTripBasedEmployee ? " · per trip" : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-fg-muted">{peso(row.grossPay)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">
                    {peso(GOV.reduce((s, f) => s + Number(row[f] || 0), 0))}
                  </td>
                  {FIELDS.map((f) => {
                    const locked = notLast && f.once;
                    const owed = f.balance ? row[f.balance] : null;
                    const typed = Number(valueOf(row, f.key)) || 0;
                    return (
                      <td key={f.key} className="px-3 py-2 text-right">
                        {editable && !locked ? (
                          <input
                            id={`ded-${key}-${f.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueOf(row, f.key)}
                            placeholder="0.00"
                            onChange={(e) => setField(row, f.key, e.target.value)}
                            className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums text-fg"
                          />
                        ) : (
                          <span className="tabular-nums">{peso(row[f.key])}</span>
                        )}
                        {owed != null && owed > 0 && (
                          <p
                            className={`mt-0.5 text-[10px] ${typed > owed ? "text-warning" : "text-fg-subtle"}`}
                            title="Owed before this cutoff -> after this deduction"
                          >
                            Bal {peso(owed)} → {peso(Math.max(owed - typed, 0))}
                            {typed > owed ? " (capped)" : ""}
                          </p>
                        )}
                        {f.key === "tripCharge" && typed > Number(row.grossPay || 0) * 0.2 && (
                          <p className="mt-0.5 text-[10px] font-semibold text-warning">Over 20% of pay</p>
                        )}
                        {f.key === "personalDeduction" && editable && typed > 0 && (
                          <input
                            id={`ded-${key}-note`}
                            value={edits[key]?.personalDeductionNote ?? row.personalDeductionNote ?? ""}
                            onChange={(e) => setField(row, "personalDeductionNote", e.target.value)}
                            placeholder="Reason"
                            maxLength={200}
                            className="mt-1 w-24 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-fg"
                          />
                        )}
                        {f.key === "personalDeduction" && !editable && row.personalDeductionNote && (
                          <p className="mt-0.5 text-[10px] text-fg-subtle">{row.personalDeductionNote}</p>
                        )}
                      </td>
                    );
                  })}
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${net < 0 ? "text-danger" : ""}`}>
                    {peso(net)}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm text-fg-subtle">
                  {show === "with" ? "Nobody has deductions or balances." : "No employees match."}
                </td>
              </tr>
            )}
          </tbody>
          {list.length > 0 && (
            <tfoot className="border-t border-border bg-surface-hover text-xs font-semibold">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td />
                <td />
                {totals.map((total, i) => (
                  <td key={FIELDS[i].key} className="px-3 py-2 text-right tabular-nums">
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
