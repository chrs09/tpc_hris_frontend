import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { alertDialog } from "../../components/ui/dialog/dialogService";
import { createPayRun, listPayRuns } from "../../api/payroll/payrollRuns";
import { getPayrollGroups } from "../../api/payroll/payrollGroups";
import { getPayrollCutoffRules } from "../../api/payroll/payrollCutoffs";
import { notSunday, periodsFromRule } from "../../utils/payroll/cutoffRules";
import { payrollStatusLabel } from "../../utils/payroll/payrollStatus";
import { matchesSearch } from "../../utils/search";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

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

// Status -> pill colors (same order as the payroll status bar).
const STATUS_STYLE = {
  DRAFT: "bg-surface-hover text-fg-muted",
  GENERATED: "bg-primary/15 text-primary",
  FOR_REVIEW: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  LOCKED: "bg-success/15 text-success",
  PAID: "bg-success/20 text-success",
};

// "Sat, Nov 29, 2026"
const payDateLabel = (iso) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

// A picked Sunday moves to the Saturday before (paydays are Mon-Sat).
const shiftOffSunday = (iso) =>
  iso ? format(notSunday(new Date(`${iso}T00:00:00`)), "yyyy-MM-dd") : iso;

const STATUS_FILTERS = ["ALL", "DRAFT", "GENERATED", "FOR_REVIEW", "APPROVED", "LOCKED", "PAID"];

const openRunPath = (department, cutoffPeriod) =>
  `/dashboard/payroll?payroll=${encodeURIComponent(department)}&cutoff=${encodeURIComponent(cutoffPeriod)}`;

// Pay Runs: one per payroll group + cutoff. New Pay Run picks the period
// and the group, then the run opens -- pre-check, generate (snapshot),
// review and approval happen there.
export default function PayRunsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [groups, setGroups] = useState([]);
  const [rules, setRules] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ group: "", cutoff: "", payDate: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    listPayRuns()
      .then(setRuns)
      .catch((error) => {
        toast.error(error.response?.data?.detail || "Could not load pay runs.");
        setRuns([]);
      });

  useEffect(() => {
    load();
    getPayrollGroups()
      .then((data) => setGroups(data.groups || []))
      .catch(() => setGroups([]));
    getPayrollCutoffRules()
      .then((data) => setRules(data.rules || []))
      .catch(() => setRules([]));
  }, []);

  const existing = useMemo(
    () => new Set((runs || []).map((r) => `${r.department}|${r.cutoff_period}`)),
    [runs],
  );

  // Cutoffs of the picked group (current one first, then earlier ones).
  const periods = useMemo(() => {
    const rule = rules.find((r) => r.department === form.group);
    return periodsFromRule(rule, 12).map((p) => ({
      ...p,
      key: `${p.cutoffStart}_${p.cutoffEnd}`,
    }));
  }, [rules, form.group]);

  // Older runs have no pay date saved: show the rule's payday for that cutoff.
  const payDateOf = (run) => {
    if (run.pay_date) return run.pay_date;
    const rule = rules.find((r) => r.department === run.department);
    const p = rule ? periodsFromRule(rule, 1, new Date(`${run.period_start}T00:00:00`))[0] : null;
    return p && p.cutoffStart === run.period_start ? p.payoutDate : null;
  };

  const payoutOf = (key) => periods.find((p) => p.key === key)?.payoutDate || "";

  const rows = useMemo(
    () =>
      (runs || []).filter(
        (run) =>
          (status === "ALL" || run.status === status) &&
          matchesSearch(search, run.department, run.period_start, run.period_end, run.status),
      ),
    [runs, search, status],
  );

  const startNew = () => {
    const group = groups[0]?.name || "";
    setForm({ group, cutoff: "", payDate: "" });
    setCreating(true);
  };

  useEffect(() => {
    if (!creating) return;
    // Default to the first period without a run yet.
    const free = periods.find((p) => !existing.has(`${form.group}|${p.key}`));
    const cutoff = free?.key || periods[0]?.key || "";
    setForm((prev) => ({
      ...prev,
      cutoff,
      payDate: periods.find((p) => p.key === cutoff)?.payoutDate || "",
    }));
  }, [creating, periods, existing, form.group]);

  const picked = periods.find((p) => p.key === form.cutoff);
  const duplicate = form.group && form.cutoff && existing.has(`${form.group}|${form.cutoff}`);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.group || !form.cutoff) return;
    if (duplicate) {
      await alertDialog(
        `A pay run for ${form.group} · ${picked?.label || form.cutoff} is already created. Pick another cutoff, or find it in the list below.`,
        { title: "Pay run already created" },
      );
      return;
    }
    try {
      setSaving(true);
      await createPayRun(form.group, form.cutoff, form.payDate);
      toast.success("Pay run created.");
      navigate(openRunPath(form.group, form.cutoff));
    } catch (error) {
      if (error.response?.status === 409) {
        await alertDialog(error.response.data.detail, { title: "Pay run already created" });
        load();
        return;
      }
      toast.error(error.response?.data?.detail || "Could not create the pay run.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Pay Runs</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            One pay run per payroll group and cutoff. Create it, run the pre-check, then
            generate -- the figures are saved as a snapshot and don&apos;t move after that.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          + New Pay Run
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-semibold text-fg">New pay run</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_12rem_auto] lg:items-end">
            <label className="block text-xs font-medium text-fg-subtle" htmlFor="payrun-group">
              Payroll group
              <select
                id="payrun-group"
                value={form.group}
                onChange={(e) => setForm({ group: e.target.value, cutoff: "", payDate: "" })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg"
              >
                {groups.length === 0 && <option value="">No payroll groups yet</option>}
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-fg-subtle" htmlFor="payrun-period">
              Payroll period
              <select
                id="payrun-period"
                value={form.cutoff}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cutoff: e.target.value,
                    payDate: payoutOf(e.target.value),
                  }))
                }
                disabled={!periods.length}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg disabled:opacity-60"
              >
                {!periods.length && <option value="">No cutoff set for this group</option>}
                {periods.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                    {existing.has(`${form.group}|${p.key}`) ? " · already created" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-fg-subtle" htmlFor="payrun-paydate">
              Pay date
              <input
                id="payrun-paydate"
                type="date"
                value={form.payDate}
                onChange={(e) => {
                  const value = shiftOffSunday(e.target.value);
                  if (value !== e.target.value) toast("Sunday moved to the Saturday before.");
                  setForm((prev) => ({ ...prev, payDate: value }));
                }}
                disabled={!form.cutoff}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg disabled:opacity-60"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-fg-muted hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.group || !form.cutoff}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-fg-subtle">
            {duplicate
              ? "This group already has a pay run for this cutoff -- pick another one."
              : picked
                ? `${form.group} · ${picked.label} · Pay date ${payDateLabel(form.payDate)}. The pay date is prefilled from the group's cutoff (Monday to Saturday -- a Sunday moves to the Saturday before); change it if needed. Starts as a draft; nothing is calculated until you generate.`
                : "Set the group's cutoff on Payroll Groups first."}
          </p>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap rounded-lg border border-border p-0.5 text-sm">
          {STATUS_FILTERS.map((value) => (
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

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cutoff</th>
              <th className="px-4 py-3 text-left font-medium">Pay date</th>
              <th className="px-4 py-3 text-left font-medium">Payroll group</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Employees</th>
              <th className="px-4 py-3 text-right font-medium">Gross</th>
              <th className="px-4 py-3 text-right font-medium">Net</th>
              <th className="px-4 py-3 text-left font-medium">Generated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {runs === null ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-fg-subtle">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-fg-subtle">
                  {runs.length
                    ? "No pay runs match."
                    : "No pay runs yet. Click + New Pay Run to start one."}
                </td>
              </tr>
            ) : (
              rows.map((run) => (
                <tr
                  key={`${run.department}-${run.cutoff_period}`}
                  className="border-t border-border hover:bg-surface-hover"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-fg">
                    {shortDate(run.period_start)} – {shortDate(run.period_end)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                    {payDateLabel(payDateOf(run))}
                  </td>
                  <td className="px-4 py-3 text-fg">{run.department}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLE[run.status] || STATUS_STYLE.DRAFT
                      }`}
                    >
                      {payrollStatusLabel(run.status)}
                    </span>
                    {run.status !== "DRAFT" && !run.has_snapshot && (
                      <span
                        className="ml-1.5 text-[10px] text-fg-subtle"
                        title="Generated before snapshots were kept -- figures are live"
                      >
                        no snapshot
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                    {run.status === "DRAFT" ? "—" : run.employee_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                    {run.status === "DRAFT" ? "—" : peso(run.total_gross)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-fg">
                    {run.status === "DRAFT" ? "—" : peso(run.total_net)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-fg-muted">
                    {run.generated_at
                      ? `${new Date(run.generated_at).toLocaleDateString()}${run.generated_by ? ` · ${run.generated_by}` : ""}`
                      : "Not yet"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(openRunPath(run.department, run.cutoff_period))}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface-active"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
