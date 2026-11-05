import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getPayrollCutoffRules, savePayrollCutoffRule } from "../../api/payroll/payrollCutoffs";
import {
  createPayrollGroup,
  deletePayrollGroup,
  getPayrollGroups,
  updatePayrollGroup,
} from "../../api/payroll/payrollGroups";
import { PAY_BASES } from "../../utils/payroll/payrollGroups";
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

// Payroll Groups -- departments paid by the same rule and cutoff, run as
// one payroll (e.g. "Driver - per trip - weekly" = Dumptruck +
// WingvanDriver). Each group has its pay basis, departments (and payroll
// type, to split Admin monthly / daily) and its cutoff schedule; the
// Payroll page builds its cutoff periods from that schedule.
export default function PayrollCutoffsPage() {
  const canEditPage = usePageCanEdit();
  const [data, setData] = useState(null); // { groups, departments, unassigned }
  const [rules, setRules] = useState([]);
  const [search, setSearch] = useState("");
  const [editingCutoff, setEditingCutoff] = useState(null); // { department, rule }
  const [editingGroup, setEditingGroup] = useState(null); // group or {}

  const load = async () => {
    try {
      const [groupData, cutoffData] = await Promise.all([
        getPayrollGroups(),
        getPayrollCutoffRules(),
      ]);
      setData(groupData);
      setRules(cutoffData.rules || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setData({ groups: [], departments: [], unassigned: [] });
    }
  };

  useEffect(() => {
    Promise.all([getPayrollGroups(), getPayrollCutoffRules()])
      .then(([groupData, cutoffData]) => {
        setData(groupData);
        setRules(cutoffData.rules || []);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setData({ groups: [], departments: [], unassigned: [] });
      });
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const byName = Object.fromEntries(rules.map((r) => [r.department, r]));
    return data.groups
      .map((group) => ({ group, rule: byName[group.name] || null }))
      .filter((row) =>
        matchesSearch(
          search,
          row.group.name,
          row.group.departments,
          PAY_BASES[row.group.pay_basis],
          describeRule(row.rule),
        ),
      );
  }, [data, rules, search]);

  const missing = rows.filter((row) => !row.rule).length;

  const handleDelete = async (group) => {
    if (
      !(await confirmDialog(
        `Delete the payroll group "${group.name}"? Its departments won't be in any payroll group until you add them to another one.`,
      ))
    ) {
      return;
    }
    try {
      await deletePayrollGroup(group.id);
      toast.success("Payroll group deleted.");
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
          <h1 className="text-xl font-semibold text-fg">Payroll Groups</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Departments paid by the same rule and cutoff, run as one payroll. The
            Payroll page builds each group&apos;s cutoff periods from its schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search group..." />
          {canEditPage && (
            <button
              type="button"
              onClick={() => setEditingGroup({})}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              + New Group
            </button>
          )}
        </div>
      </div>

      {data?.unassigned?.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Not in any payroll group (they won&apos;t show on the Payroll page):{" "}
          {data.unassigned
            .map((u) => `${u.department} (${u.payroll_type}) -- ${u.employees}`)
            .join(" · ")}
        </div>
      )}
      {missing > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {missing} group{missing === 1 ? " has" : "s have"} no cutoff yet -- they show no
          cutoff periods on the Payroll page until one is set.
        </div>
      )}

      {!data ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm text-fg">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Payroll group</th>
                <th className="px-4 py-3 text-left font-medium">Pay basis</th>
                <th className="px-4 py-3 text-left font-medium">Departments</th>
                <th className="px-4 py-3 text-left font-medium">Schedule</th>
                <th className="px-4 py-3 text-left font-medium">Current cutoff</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ group, rule }) => {
                const current = periodsFromRule(rule, 1)[0];
                return (
                  <tr key={group.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {group.employee_count} employee{group.employee_count === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{PAY_BASES[group.pay_basis]}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {group.departments.join(", ")}
                      {group.payroll_type && (
                        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {group.payroll_type} only
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {rule ? (
                        describeRule(rule)
                      ) : (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                          Not set
                        </span>
                      )}
                      {current?.payoutDate && (
                        <p className="text-xs text-fg-subtle">Payout {current.payoutDate}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{current?.label || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canEditPage && (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCutoff({ department: group.name, rule: rule || DEFAULT_RULE })
                            }
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                          >
                            {rule ? "Cutoff" : "Set cutoff"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGroup(group)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(group)}
                            className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle">
                    No payroll groups match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingCutoff && (
        <CutoffRuleModal
          department={editingCutoff.department}
          initial={editingCutoff.rule}
          onClose={() => setEditingCutoff(null)}
          onSaved={load}
        />
      )}
      {editingGroup && (
        <GroupModal
          group={editingGroup}
          departments={data?.departments || []}
          onClose={() => setEditingGroup(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// Add / edit a payroll group: name, pay basis, departments, and an
// optional payroll type (Monthly / Daily) to take only part of them.
function GroupModal({ group, departments, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: group.name || "",
    pay_basis: group.pay_basis || "fixed_daily",
    departments: group.departments || [],
    payroll_type: group.payroll_type || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const allDepartments = [...new Set([...departments, ...form.departments])].sort();

  const toggleDept = (dept) =>
    set(
      "departments",
      form.departments.includes(dept)
        ? form.departments.filter((d) => d !== dept)
        : [...form.departments, dept],
    );

  const save = async () => {
    const payload = { ...form, name: form.name.trim(), payroll_type: form.payroll_type || null };
    if (!payload.name) return toast.error("Give the group a name.");
    if (!payload.departments.length) return toast.error("Pick at least one department.");
    try {
      setSaving(true);
      if (group.id) await updatePayrollGroup(group.id, payload);
      else await createPayrollGroup(payload);
      toast.success("Payroll group saved.");
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
          <h2 className="text-lg font-bold">{group.id ? "Edit Payroll Group" : "New Payroll Group"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-sm font-medium text-fg-muted">
            Group name
            <input
              value={form.name}
              maxLength={50}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Driver - per trip - weekly"
              className={inputStyles}
            />
          </label>

          <div>
            <p className="text-sm font-medium text-fg-muted">Pay basis</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {Object.entries(PAY_BASES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("pay_basis", key)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    form.pay_basis === key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-fg-muted">Departments</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {allDepartments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDept(dept)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.departments.includes(dept)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-fg-muted hover:bg-surface-hover"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium text-fg-muted">
            Payroll type
            <select
              value={form.payroll_type}
              onChange={(e) => set("payroll_type", e.target.value)}
              className={inputStyles}
            >
              <option value="">Everyone in these departments</option>
              <option value="Monthly">Monthly-paid employees only</option>
              <option value="Daily">Daily-paid employees only</option>
            </select>
            <span className="mt-1 block text-[11px] text-fg-subtle">
              Use this to split a department, e.g. Admin monthly and Admin daily in two groups.
            </span>
          </label>

          {group.id && form.name.trim() !== group.name && (
            <p className="rounded-xl bg-surface-hover px-3 py-2 text-xs text-fg-muted">
              Renaming keeps this group&apos;s cutoff and payrolls -- they move to the new name.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Group"}
          </button>
        </div>
      </div>
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
