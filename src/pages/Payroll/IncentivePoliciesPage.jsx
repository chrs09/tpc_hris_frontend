import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { matchesSearch } from "../../utils/search";

// Incentive Policies -- SAMPLE UI ONLY (no backend yet). Incentive
// programs for drivers, helpers and admin, each with an effective period
// and its own rule. Everything here lives in page state; amounts and
// rules are placeholders until Jessan / Aiza give the real details.

const inputStyles =
  "mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GROUPS = ["Drivers", "Helpers", "Admin"];

// Each rule type and the settings it needs.
const RULE_TYPES = {
  long_distance: {
    label: "Long Distance",
    hint: "Per trip to a qualifying lane / area.",
    defaults: { areas: "", driver_amount: 0, helper_amount: 0 },
  },
  complete_attendance: {
    label: "Complete Attendance",
    hint: "No absences / lates for the whole period.",
    defaults: { period: "cutoff", amount: 0, no_late: true, leave_breaks: false },
  },
  early_checkout: {
    label: "Early Check-out",
    hint: "Dispatch check-out before a set time.",
    defaults: { before_time: "06:00", amount: 0 },
  },
  nth_load: {
    label: "2nd / 3rd Load",
    hint: "Bonus for the 2nd and 3rd load in a day.",
    defaults: { second_amount: 0, third_amount: 0 },
  },
  trip_tiers: {
    label: "Trip Target (Tiered)",
    hint: "Trips in the period reach a tier.",
    defaults: { period: "cutoff", tiers: [{ min: 0, amount: 0 }] },
  },
  productivity_tiers: {
    label: "Productivity (Tiered)",
    hint: "Productivity score reaches a tier.",
    defaults: { metric: "", period: "month", tiers: [{ min: 0, amount: 0 }] },
  },
};

const PERIODS = { cutoff: "Per payroll cutoff", month: "Per month" };

const SAMPLE_POLICIES = [
  {
    id: 1,
    name: "Long Distance Trips",
    type: "long_distance",
    groups: ["Drivers", "Helpers"],
    effective_from: "2026-10-01",
    effective_to: "",
    owner: "Jessan",
    active: true,
    settings: { areas: "Bohol, Leyte, Bacolod", driver_amount: 300, helper_amount: 150 },
  },
  {
    id: 2,
    name: "Perfect Attendance",
    type: "complete_attendance",
    groups: ["Drivers"],
    effective_from: "2026-10-01",
    effective_to: "",
    owner: "Jessan",
    active: true,
    settings: { period: "cutoff", amount: 500, no_late: true, leave_breaks: false },
  },
  {
    id: 3,
    name: "Early Dispatch",
    type: "early_checkout",
    groups: ["Drivers"],
    effective_from: "2026-10-01",
    effective_to: "",
    owner: "Aiza",
    active: true,
    settings: { before_time: "06:00", amount: 50 },
  },
  {
    id: 4,
    name: "Multiple Loads",
    type: "nth_load",
    groups: ["Drivers"],
    effective_from: "2026-10-01",
    effective_to: "",
    owner: "Aiza",
    active: true,
    settings: { second_amount: 100, third_amount: 200 },
  },
  {
    id: 5,
    name: "Driver Trip Target",
    type: "trip_tiers",
    groups: ["Drivers"],
    effective_from: "2026-10-01",
    effective_to: "",
    owner: "Aiza",
    active: true,
    settings: {
      period: "cutoff",
      tiers: [
        { min: 12, amount: 300 },
        { min: 15, amount: 600 },
        { min: 18, amount: 1000 },
      ],
    },
  },
  {
    id: 6,
    name: "Admin Productivity",
    type: "productivity_tiers",
    groups: ["Admin"],
    effective_from: "2026-11-01",
    effective_to: "",
    owner: "Aiza",
    active: true,
    settings: {
      metric: "Processed documents",
      period: "month",
      tiers: [
        { min: 80, amount: 500 },
        { min: 100, amount: 1000 },
      ],
    },
  },
];

// What a cutoff could look like once computed (sample people).
const SAMPLE_PREVIEW = [
  {
    name: "Nike Desuyo",
    group: "Drivers",
    lines: [
      { policy: "Long Distance Trips", detail: "2 trips to Bohol", amount: 600 },
      { policy: "Perfect Attendance", detail: "No absence / late", amount: 500 },
      { policy: "Multiple Loads", detail: "3× 2nd load, 1× 3rd load", amount: 500 },
      { policy: "Driver Trip Target", detail: "16 trips -- tier 15+", amount: 600 },
    ],
  },
  {
    name: "Giovanni Valiente",
    group: "Drivers",
    lines: [
      { policy: "Early Dispatch", detail: "4 days before 6:00 AM", amount: 200 },
      { policy: "Driver Trip Target", detail: "12 trips -- tier 12+", amount: 300 },
    ],
  },
  {
    name: "Juan Dela Cruz",
    group: "Helpers",
    lines: [{ policy: "Long Distance Trips", detail: "1 trip to Leyte", amount: 150 }],
  },
  {
    name: "Maria Santos",
    group: "Admin",
    lines: [],
  },
];

const today = () => new Date().toISOString().slice(0, 10);

const statusOf = (p) => {
  if (!p.active) return { label: "Inactive", cls: "bg-surface-hover text-fg-subtle" };
  if (p.effective_from > today()) return { label: "Upcoming", cls: "bg-warning/15 text-warning" };
  if (p.effective_to && p.effective_to < today())
    return { label: "Ended", cls: "bg-surface-hover text-fg-subtle" };
  return { label: "Active", cls: "bg-emerald-500/15 text-emerald-500" };
};

const shortDate = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const tierText = (tiers, unit) =>
  [...tiers]
    .sort((a, b) => a.min - b.min)
    .map((t) => `${t.min}+ ${unit} → ${peso(t.amount)}`)
    .join(" · ");

// One line describing the rule, e.g. "₱300 / trip (driver) to Bohol...".
const describe = (p) => {
  const s = p.settings;
  switch (p.type) {
    case "long_distance":
      return `${peso(s.driver_amount)} driver / ${peso(s.helper_amount)} helper per trip to: ${
        s.areas || "(no areas yet)"
      }`;
    case "complete_attendance":
      return `${peso(s.amount)} ${PERIODS[s.period].toLowerCase()} -- no absence${
        s.no_late ? ", no late" : ""
      }${s.leave_breaks ? ", leave counts as absence" : ""}`;
    case "early_checkout":
      return `${peso(s.amount)} per day checked out before ${s.before_time}`;
    case "nth_load":
      return `2nd load ${peso(s.second_amount)} · 3rd load ${peso(s.third_amount)}`;
    case "trip_tiers":
      return `${PERIODS[s.period]}: ${tierText(s.tiers, "trips")}`;
    case "productivity_tiers":
      return `${s.metric || "Metric"} ${PERIODS[s.period].toLowerCase()}: ${tierText(s.tiers, "")}`;
    default:
      return "";
  }
};

export default function IncentivePoliciesPage() {
  const [tab, setTab] = useState("policies");
  const [policies, setPolicies] = useState(SAMPLE_POLICIES);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [editing, setEditing] = useState(null); // policy or {} for new

  const rows = useMemo(
    () =>
      policies.filter(
        (p) =>
          (groupFilter === "All" || p.groups.includes(groupFilter)) &&
          matchesSearch(search, [p.name, RULE_TYPES[p.type].label, p.owner]),
      ),
    [policies, search, groupFilter],
  );

  const save = (policy) => {
    setPolicies((prev) =>
      policy.id
        ? prev.map((p) => (p.id === policy.id ? policy : p))
        : [...prev, { ...policy, id: Math.max(0, ...prev.map((p) => p.id)) + 1 }],
    );
    toast.success("Saved (sample only -- not stored yet).");
    setEditing(null);
  };

  const remove = async (policy) => {
    if (!(await confirmDialog(`Delete "${policy.name}"?`))) return;
    setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
  };

  const toggle = (policy) =>
    setPolicies((prev) =>
      prev.map((p) => (p.id === policy.id ? { ...p, active: !p.active } : p)),
    );

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Incentive Policies</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Incentive programs for drivers, helpers and admin, each with its own rule and
            effective period. Approved incentives are added to the payroll cutoff.
          </p>
        </div>
        {tab === "policies" && (
          <button
            type="button"
            onClick={() => setEditing({})}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            + New Policy
          </button>
        )}
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
        Sample template -- the policies and amounts below are placeholders and nothing is saved
        yet. Details to follow from Jessan / Aiza.
      </div>

      <div className="flex gap-4 border-b border-border text-sm">
        {[
          ["policies", "Policies"],
          ["preview", "Cutoff Preview"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-2 font-medium ${
              tab === key ? "border-primary text-fg" : "border-transparent text-fg-subtle hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "policies" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search policy..." />
            {["All", ...GROUPS].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupFilter(g)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  groupFilter === g
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-fg-muted hover:bg-surface-hover"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((p) => {
              const status = statusOf(p);
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{p.name}</p>
                      <p className="text-xs text-fg-subtle">{RULE_TYPES[p.type].label}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.groups.map((g) => (
                      <span key={g} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {g}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3 rounded-xl bg-surface-hover px-3 py-2 text-sm text-fg">{describe(p)}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
                    <span>
                      {shortDate(p.effective_from)} → {p.effective_to ? shortDate(p.effective_to) : "No end date"}
                      {p.owner ? ` · Details: ${p.owner}` : ""}
                    </span>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => toggle(p)} className="font-medium hover:text-fg">
                        {p.active ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" onClick={() => setEditing(p)} className="font-medium text-primary hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => remove(p)} className="font-medium text-danger hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="py-10 text-center text-sm text-fg-subtle lg:col-span-2">No policies match.</p>
            )}
          </div>
        </>
      ) : (
        <CutoffPreview />
      )}

      {editing && <PolicyModal initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

// Sample of the per-cutoff review: who qualified for what, before payroll.
function CutoffPreview() {
  const total = SAMPLE_PREVIEW.reduce(
    (sum, r) => sum + r.lines.reduce((s, l) => s + l.amount, 0),
    0,
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-fg-muted">
          Cutoff: <strong className="text-fg">Oct 16 – Oct 31, 2026</strong> (sample)
        </span>
        <span className="text-fg-muted">
          Total incentives: <strong className="text-emerald-500">{peso(total)}</strong>
        </span>
      </div>
      {SAMPLE_PREVIEW.map((r) => {
        const sum = r.lines.reduce((s, l) => s + l.amount, 0);
        return (
          <div key={r.name} className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="font-semibold text-fg">{r.name}</p>
                <p className="text-xs text-fg-subtle">{r.group}</p>
              </div>
              <span className="font-semibold text-fg">{peso(sum)}</span>
            </div>
            {r.lines.length ? (
              <ul className="divide-y divide-border text-sm">
                {r.lines.map((l) => (
                  <li key={l.policy} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="min-w-0">
                      <span className="text-fg">{l.policy}</span>
                      <span className="block text-xs text-fg-subtle">{l.detail}</span>
                    </span>
                    <span className="shrink-0 text-fg-muted">{peso(l.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-fg-subtle">No incentive this cutoff.</p>
            )}
          </div>
        );
      })}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => toast("Sample only -- approval comes with the backend.")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Approve for Payroll
        </button>
      </div>
    </div>
  );
}

function PolicyModal({ initial, onClose, onSave }) {
  const [policy, setPolicy] = useState(() =>
    initial.id
      ? structuredClone(initial)
      : {
          name: "",
          type: "long_distance",
          groups: ["Drivers"],
          effective_from: today(),
          effective_to: "",
          owner: "",
          active: true,
          settings: structuredClone(RULE_TYPES.long_distance.defaults),
        },
  );
  const s = policy.settings;
  const set = (patch) => setPolicy((p) => ({ ...p, ...patch }));
  const setS = (patch) => setPolicy((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  const changeType = (type) =>
    set({ type, settings: structuredClone(RULE_TYPES[type].defaults) });

  const toggleGroup = (g) =>
    set({
      groups: policy.groups.includes(g)
        ? policy.groups.filter((x) => x !== g)
        : [...policy.groups, g],
    });

  const submit = (e) => {
    e.preventDefault();
    if (!policy.name.trim()) return toast.error("Name is required.");
    if (!policy.groups.length) return toast.error("Pick who it applies to.");
    if (!policy.effective_from) return toast.error("Effective from is required.");
    if (policy.effective_to && policy.effective_to < policy.effective_from)
      return toast.error("The end date is before the start date.");
    onSave({ ...policy, name: policy.name.trim() });
  };

  const num = (value) => (value === "" ? "" : Number(value));

  const tiersEditor = (unit) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg-muted">Tiers</p>
      {s.tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={t.min}
            onChange={(e) =>
              setS({ tiers: s.tiers.map((x, j) => (j === i ? { ...x, min: num(e.target.value) } : x)) })
            }
            className={`${inputStyles} mt-0`}
          />
          <span className="shrink-0 text-xs text-fg-subtle">{unit}+ →</span>
          <input
            type="number"
            min="0"
            value={t.amount}
            onChange={(e) =>
              setS({ tiers: s.tiers.map((x, j) => (j === i ? { ...x, amount: num(e.target.value) } : x)) })
            }
            className={`${inputStyles} mt-0`}
          />
          <button
            type="button"
            onClick={() => setS({ tiers: s.tiers.filter((_, j) => j !== i) })}
            disabled={s.tiers.length === 1}
            className="shrink-0 text-xs text-danger disabled:opacity-30"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setS({ tiers: [...s.tiers, { min: 0, amount: 0 }] })}
        className="text-xs font-semibold text-primary hover:underline"
      >
        + Add tier
      </button>
    </div>
  );

  const periodSelect = (
    <label className="block text-sm font-medium text-fg-muted">
      Period
      <select value={s.period} onChange={(e) => setS({ period: e.target.value })} className={inputStyles}>
        {Object.entries(PERIODS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );

  const amount = (label, key) => (
    <label className="block text-sm font-medium text-fg-muted">
      {label}
      <input
        type="number"
        min="0"
        value={s[key]}
        onChange={(e) => setS({ [key]: num(e.target.value) })}
        className={inputStyles}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">{initial.id ? "Edit Policy" : "New Policy"}</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-fg-subtle hover:text-fg">
            &times;
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-fg-muted">
            Name
            <input
              value={policy.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Long Distance Trips"
              className={inputStyles}
            />
          </label>

          <label className="block text-sm font-medium text-fg-muted">
            Incentive type
            <select value={policy.type} onChange={(e) => changeType(e.target.value)} className={inputStyles}>
              {Object.entries(RULE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-fg-subtle">{RULE_TYPES[policy.type].hint}</span>
          </label>

          <div>
            <p className="text-sm font-medium text-fg-muted">Applies to</p>
            <div className="mt-1 flex gap-2">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    policy.groups.includes(g)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-fg-muted"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-fg-muted">
              Effective from
              <input
                type="date"
                value={policy.effective_from}
                onChange={(e) => set({ effective_from: e.target.value })}
                className={inputStyles}
              />
            </label>
            <label className="text-sm font-medium text-fg-muted">
              Until (optional)
              <input
                type="date"
                value={policy.effective_to}
                onChange={(e) => set({ effective_to: e.target.value })}
                className={inputStyles}
              />
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Rule</p>

            {policy.type === "long_distance" && (
              <>
                <label className="block text-sm font-medium text-fg-muted">
                  Qualifying areas / lanes
                  <input
                    value={s.areas}
                    onChange={(e) => setS({ areas: e.target.value })}
                    placeholder="e.g. Bohol, Leyte, Bacolod"
                    className={inputStyles}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {amount("Driver ₱ / trip", "driver_amount")}
                  {amount("Helper ₱ / trip", "helper_amount")}
                </div>
              </>
            )}

            {policy.type === "complete_attendance" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {periodSelect}
                  {amount("Amount ₱", "amount")}
                </div>
                <label className="flex items-center gap-2 text-sm text-fg">
                  <input type="checkbox" checked={s.no_late} onChange={(e) => setS({ no_late: e.target.checked })} />
                  A late also disqualifies
                </label>
                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={s.leave_breaks}
                    onChange={(e) => setS({ leave_breaks: e.target.checked })}
                  />
                  Approved leave counts as an absence
                </label>
              </>
            )}

            {policy.type === "early_checkout" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-fg-muted">
                  Check out before
                  <input
                    type="time"
                    value={s.before_time}
                    onChange={(e) => setS({ before_time: e.target.value })}
                    className={inputStyles}
                  />
                </label>
                {amount("₱ per day", "amount")}
              </div>
            )}

            {policy.type === "nth_load" && (
              <div className="grid grid-cols-2 gap-3">
                {amount("2nd load ₱", "second_amount")}
                {amount("3rd load ₱", "third_amount")}
              </div>
            )}

            {policy.type === "trip_tiers" && (
              <>
                {periodSelect}
                {tiersEditor("trips")}
              </>
            )}

            {policy.type === "productivity_tiers" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-fg-muted">
                    Measured by
                    <input
                      value={s.metric}
                      onChange={(e) => setS({ metric: e.target.value })}
                      placeholder="e.g. Processed documents"
                      className={inputStyles}
                    />
                  </label>
                  {periodSelect}
                </div>
                {tiersEditor("pts")}
              </>
            )}
          </div>

          <label className="block text-sm font-medium text-fg-muted">
            Details from (optional)
            <input
              value={policy.owner}
              onChange={(e) => set({ owner: e.target.value })}
              placeholder="e.g. Jessan"
              className={inputStyles}
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Save Policy
        </button>
      </form>
    </div>
  );
}
