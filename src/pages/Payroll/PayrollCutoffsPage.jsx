import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  deletePayrollCutoffRule,
  getPayrollCutoffRules,
  savePayrollCutoffRule,
} from "../../api/payroll/payrollCutoffs";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { WEEKDAYS, describeRule, periodsFromRule } from "../../utils/payroll/cutoffRules";
import { matchesSearch } from "../../utils/search";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const TYPES = [
  { key: "semi_monthly", label: "Semi-Monthly", hint: "Two cutoffs a month" },
  { key: "weekly", label: "Weekly", hint: "Every 7 days" },
  { key: "monthly", label: "Monthly", hint: "Once a month" },
];

const DEFAULT_RULE = {
  schedule_type: "semi_monthly",
  first_start_day: 1,
  second_start_day: 16,
  first_payout_day: 0,
  second_payout_day: 15,
  week_start_day: 4,
  payout_offset_days: 3,
};

// Payroll Cutoffs -- how each department (employee group) is paid. The
// Payroll page builds its cutoff periods from these; a new group only
// needs a row here, no code change.
export default function PayrollCutoffsPage() {
  const canEditPage = usePageCanEdit();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // { department, rule }

  const load = async () => {
    try {
      setData(await getPayrollCutoffRules());
    } catch (error) {
      toast.error(getErrorMessage(error));
      setData({ rules: [], departments: [] });
    }
  };

  useEffect(() => {
    getPayrollCutoffRules()
      .then(setData)
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setData({ rules: [], departments: [] });
      });
  }, []);

  // Every department employees are in, plus any rule for one that's
  // currently empty.
  const rows = useMemo(() => {
    if (!data) return [];
    const byDept = Object.fromEntries(data.rules.map((r) => [r.department, r]));
    const names = [...new Set([...data.departments, ...Object.keys(byDept)])].sort();
    return names
      .map((department) => ({ department, rule: byDept[department] || null }))
      .filter((row) => matchesSearch(search, row.department, describeRule(row.rule)));
  }, [data, search]);

  const missing = rows.filter((row) => !row.rule).length;

  const handleRemove = async (department) => {
    if (
      !(await confirmDialog(
        `Remove the cutoff for ${department}? The Payroll page will show no cutoffs for it until one is set again.`,
      ))
    ) {
      return;
    }
    try {
      await deletePayrollCutoffRule(department);
      toast.success("Cutoff removed.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Payroll Cutoffs</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            How each department is paid. The Payroll page builds its cutoff
            periods from these.
          </p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search department..." />
      </div>

      {missing > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {missing} department{missing === 1 ? " has" : "s have"} no cutoff yet --
          they show no cutoff periods on the Payroll page until one is set.
        </div>
      )}

      {!data ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm text-fg">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-left font-medium">Schedule</th>
                <th className="px-4 py-3 text-left font-medium">Current cutoff</th>
                <th className="px-4 py-3 text-left font-medium">Payout</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ department, rule }) => {
                const current = periodsFromRule(rule, 1)[0];
                return (
                  <tr key={department} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{department}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {rule ? (
                        describeRule(rule)
                      ) : (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{current?.label || "-"}</td>
                    <td className="px-4 py-3 text-fg-muted">{current?.payoutDate || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canEditPage && (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({ department, rule: rule || DEFAULT_RULE })
                            }
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                          >
                            {rule ? "Edit" : "Set cutoff"}
                          </button>
                          {rule && (
                            <button
                              type="button"
                              onClick={() => handleRemove(department)}
                              className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-fg-subtle">
                    No departments match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CutoffRuleModal
          department={editing.department}
          initial={editing.rule}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function CutoffRuleModal({ department, initial, onClose, onSaved }) {
  const [rule, setRule] = useState({ ...DEFAULT_RULE, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (field, value) => setRule((prev) => ({ ...prev, [field]: value }));
  const num = (value) => (value === "" ? "" : Number(value));

  const valid =
    rule.schedule_type === "weekly"
      ? rule.week_start_day !== "" && rule.payout_offset_days !== ""
      : rule.schedule_type === "monthly"
        ? rule.first_payout_day !== ""
        : rule.first_start_day >= 1 &&
          rule.second_start_day > rule.first_start_day &&
          rule.second_start_day <= 28 &&
          rule.first_payout_day !== "" &&
          rule.second_payout_day !== "";

  const preview = valid ? periodsFromRule(rule, 3) : [];

  const save = async () => {
    try {
      setSaving(true);
      await savePayrollCutoffRule(department, rule);
      toast.success(`Cutoff saved for ${department}.`);
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">Cutoff -- {department}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                onClick={() => set("schedule_type", type.key)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  rule.schedule_type === type.key
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-semibold">{type.label}</p>
                <p className="text-[11px] text-fg-subtle">{type.hint}</p>
              </button>
            ))}
          </div>

          {rule.schedule_type === "semi_monthly" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-fg-muted">
                  1st cutoff starts on day
                  <input
                    type="number"
                    min={1}
                    max={27}
                    value={rule.first_start_day}
                    onChange={(e) => set("first_start_day", num(e.target.value))}
                    className={inputStyles}
                  />
                </label>
                <label className="text-sm font-medium text-fg-muted">
                  2nd cutoff starts on day
                  <input
                    type="number"
                    min={2}
                    max={28}
                    value={rule.second_start_day}
                    onChange={(e) => set("second_start_day", num(e.target.value))}
                    className={inputStyles}
                  />
                </label>
                <label className="text-sm font-medium text-fg-muted">
                  1st cutoff paid on day
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={rule.first_payout_day}
                    onChange={(e) => set("first_payout_day", num(e.target.value))}
                    className={inputStyles}
                  />
                </label>
                <label className="text-sm font-medium text-fg-muted">
                  2nd cutoff paid on day (next month)
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={rule.second_payout_day}
                    onChange={(e) => set("second_payout_day", num(e.target.value))}
                    className={inputStyles}
                  />
                </label>
              </div>
              <p className="text-[11px] text-fg-subtle">
                Examples: 1 and 16 = 1-15 and 16-end of month; 11 and 26 = 11-25 and
                26-10. Payout day 0 = last day of the month.
              </p>
            </>
          )}

          {rule.schedule_type === "weekly" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-fg-muted">
                Week starts on
                <select
                  value={rule.week_start_day}
                  onChange={(e) => set("week_start_day", Number(e.target.value))}
                  className={inputStyles}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-fg-muted">
                Paid how many days after
                <input
                  type="number"
                  min={0}
                  max={14}
                  value={rule.payout_offset_days}
                  onChange={(e) => set("payout_offset_days", num(e.target.value))}
                  className={inputStyles}
                />
              </label>
            </div>
          )}

          {rule.schedule_type === "monthly" && (
            <label className="block text-sm font-medium text-fg-muted">
              Paid on day (0 = last day of the month)
              <input
                type="number"
                min={0}
                max={31}
                value={rule.first_payout_day}
                onChange={(e) => set("first_payout_day", num(e.target.value))}
                className={inputStyles}
              />
            </label>
          )}

          <div className="rounded-xl border border-border bg-surface-hover p-3">
            <p className="text-xs font-semibold text-fg-muted">Preview</p>
            {preview.length ? (
              <ul className="mt-1 space-y-0.5 text-xs text-fg">
                {preview.map((p) => (
                  <li key={p.cutoffStart}>
                    {p.label} <span className="text-fg-subtle">· paid {p.payoutDate}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-danger">Check the numbers above.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !valid}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
