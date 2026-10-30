import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import DateRangeFilter from "../../components/ui/datePicker/DateRangeFilter";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";
import { fromISODate, toISODate } from "../../utils/isoDate";
import {
  copyIncentiveProgram,
  createIncentiveProgram,
  deleteIncentiveProgram,
  getIncentiveHubs,
  getIncentiveProgramResults,
  getIncentivePrograms,
  getIncentiveRuleTypes,
  updateIncentiveProgram,
} from "../../api/payroll/incentivePrograms";

// Incentive Policies: the incentive programs (rules + amounts) for each
// period -- trip tiers, daily cash, long distance, complete attendance.
// Amounts change month to month, so next month is a Copy with new
// numbers. Paying out happens in Payroll -> Incentive Runs, which freezes
// these settings when it generates.

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
const iso = (d) => (d ? String(d).slice(0, 10) : "");
const errorText = (err, fallback) => err.response?.data?.detail || fallback;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // 0 = Monday (backend)
const ordinal = (n) => `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n] || "th"}`;

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";
const smallInput =
  "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";
const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary-hover`;
const btnOutline = `${btn} border border-border text-fg hover:bg-surface-hover`;
const iconBtn = "rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg";

// Long-distance rate sheet (Consolacion base / Cebu Plant): destination
// cities and their level. Filled into the route list on request.
const RATE_SHEET = [
  { hub: "consol", cities: "Sogod", level: 1, direction: "north" },
  { hub: "consol", cities: "Car-Car/Sibonga", level: 2, direction: "north" },
  { hub: "consol", cities: "Dumanjug", level: 2, direction: "south" },
  { hub: "consol", cities: "Daanbantayan", level: 3, direction: "north" },
  { hub: "consol", cities: "San Remigio", level: 2, direction: "north" },
  { hub: "consol", cities: "Medellin", level: 3, direction: "north" },
  { hub: "consol", cities: "Bogo/Tuburan", level: 2, direction: "north" },
  { hub: "consol", cities: "Toledo/Balamban", level: 1, direction: "south" },
  { hub: "consol", cities: "Asturias/Argao/Aloguinsan", level: 2, direction: "south" },
  { hub: "consol", cities: "Dalaguete/Badian/Moalboal", level: 3, direction: "south" },
  { hub: "consol", cities: "Oslob", level: 4, direction: "south" },
  { hub: "plant", cities: "Carcar", level: 1, direction: "south" },
  { hub: "plant", cities: "Samboan", level: 4, direction: "south" },
];

// ---------------------------------------------------------------- small pieces

const Field = ({ label, children, className = "" }) => (
  <label className={`block text-xs font-medium text-fg-muted ${className}`}>
    {label}
    {children}
  </label>
);

const Check = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-sm text-fg">
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-border"
    />
    {children}
  </label>
);

const NumberInput = ({ value, onChange, ...props }) => (
  <input
    type="number"
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    className={smallInput}
    {...props}
  />
);

const Weekdays = ({ value = [], onChange }) => (
  <div className="flex flex-wrap gap-1">
    {WEEKDAYS.map((label, day) => {
      const on = value.includes(day);
      return (
        <button
          key={label}
          type="button"
          onClick={() => onChange(on ? value.filter((d) => d !== day) : [...value, day].sort())}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            on ? "bg-primary text-primary-foreground" : "bg-surface-hover text-fg-muted"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// ---------------------------------------------------------------- settings editors

function TiersEditor({ s, set }) {
  const tiers = s.tiers || [];
  const setTier = (i, key, value) => set({ tiers: tiers.map((t, j) => (j === i ? { ...t, [key]: value } : t)) });
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-subtle">Completed trips in the period. Only the highest tier reached is paid.</p>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_6rem_8rem_2rem] gap-2 text-[11px] text-fg-subtle">
          <span>Tier</span>
          <span>Trips needed</span>
          <span>Amount (₱)</span>
          <span />
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_6rem_8rem_2rem] items-center gap-2">
            <input value={t.name} onChange={(e) => setTier(i, "name", e.target.value)} className={smallInput} />
            <NumberInput value={t.min_trips} onChange={(v) => setTier(i, "min_trips", v)} min={1} />
            <NumberInput value={t.amount} onChange={(v) => setTier(i, "amount", v)} min={0} />
            <button type="button" onClick={() => set({ tiers: tiers.filter((_, j) => j !== i) })} className={iconBtn}>
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set({ tiers: [...tiers, { name: `Tier ${tiers.length + 1}`, min_trips: 1, amount: 0 }] })}
          className="text-xs font-semibold text-primary hover:underline"
        >
          + Add tier
        </button>
      </div>
      <Check checked={s.include_sundays} onChange={(v) => set({ include_sundays: v })}>
        Sunday trips count toward the total
      </Check>
    </div>
  );
}

function DailyCashEditor({ s, set }) {
  const amounts = s.trip_amounts || [];
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-subtle">
        Cash per trip in a day — the Nth trip of the day earns the Nth amount.
      </p>
      <Field label="Applicable days">
        <div className="mt-1">
          <Weekdays value={s.days} onChange={(days) => set({ days })} />
        </div>
      </Field>
      <div>
        <p className="mb-1 text-xs font-medium text-fg-muted">Amount per trip of the day (₱)</p>
        <div className="flex flex-wrap items-end gap-2">
          {amounts.map((a, i) => (
            <div key={i} className="w-24">
              <p className="text-[11px] text-fg-subtle">{ordinal(i + 1)} trip</p>
              <NumberInput
                value={a}
                min={0}
                onChange={(v) => set({ trip_amounts: amounts.map((x, j) => (j === i ? v : x)) })}
              />
            </div>
          ))}
          <button type="button" onClick={() => set({ trip_amounts: [...amounts, 0] })} className={`${btnOutline} py-1.5`}>
            + Trip
          </button>
          {amounts.length > 1 && (
            <button type="button" onClick={() => set({ trip_amounts: amounts.slice(0, -1) })} className={iconBtn} title="Remove last">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <Check checked={s.repeat_last} onChange={(v) => set({ repeat_last: v })}>
        Every trip after these earns the last amount
      </Check>
      <div className="flex flex-wrap items-center gap-3">
        <Check
          checked={Boolean(s.first_trip_before)}
          onChange={(v) => set({ first_trip_before: v ? "06:00" : null })}
        >
          1st trip earns only if it started before
        </Check>
        {s.first_trip_before && (
          <input
            type="time"
            value={s.first_trip_before}
            onChange={(e) => set({ first_trip_before: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-fg"
          />
        )}
      </div>
      <Field label="Trip categories not counted (special trips) — comma separated">
        <input
          value={(s.exclude_categories || []).join(", ")}
          onChange={(e) =>
            set({ exclude_categories: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })
          }
          placeholder="e.g. Special Trip"
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function LongDistanceEditor({ s, set, hubs }) {
  const routes = s.routes || [];
  const setRoute = (i, key, value) => set({ routes: routes.map((r, j) => (j === i ? { ...r, [key]: value } : r)) });
  const levels = Array.from({ length: (Number(s.max_steps) || 4) + 1 }, (_, level) => level);
  const free = Number(s.free_km) || 0;
  const step = Number(s.step_km) || 30;

  const fillFromSheet = async () => {
    if (routes.length && !(await confirmDialog("Replace the route list with the rate sheet (13 rows)?"))) return;
    const find = (key) => hubs.find((h) => h.name.toLowerCase().includes(key));
    const consol = find("consol");
    const plant = find("plant");
    set({
      routes: RATE_SHEET.map((row) => {
        const hub = row.hub === "consol" ? consol : plant;
        return {
          origin_store_id: hub ? hub.id : null,
          origin: hub ? hub.name : row.hub === "consol" ? "Consolacion" : "Cebu Plant",
          cities: row.cities.split("/"),
          level: row.level,
          direction: row.direction,
        };
      }),
    });
    if (!consol || !plant) {
      toast("Couldn't match every hub by name — check the Hub column.", { icon: "⚠️" });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-subtle">
        Each trip is paid by its farthest destination&apos;s level. The level comes from the route list (start hub +
        destination city, found in the store&apos;s address), else from the GPS distance.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="Free km">
          <NumberInput value={s.free_km} onChange={(v) => set({ free_km: v })} min={0} />
        </Field>
        <Field label="Km per level">
          <NumberInput value={s.step_km} onChange={(v) => set({ step_km: v })} min={1} />
        </Field>
        <Field label="Driver ₱ / level">
          <NumberInput value={s.driver_per_step} onChange={(v) => set({ driver_per_step: v })} min={0} />
        </Field>
        <Field label="Helper ₱ / level">
          <NumberInput value={s.helper_per_step} onChange={(v) => set({ helper_per_step: v })} min={0} />
        </Field>
        <Field label="Highest level">
          <NumberInput value={s.max_steps} onChange={(v) => set({ max_steps: v })} min={1} />
        </Field>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-hover text-fg-subtle">
            <tr>
              <th className="px-3 py-1.5 text-left">Level</th>
              <th className="px-3 py-1.5 text-left">Distance (GPS)</th>
              <th className="px-3 py-1.5 text-right">Driver</th>
              <th className="px-3 py-1.5 text-right">Helper</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => {
              const from = level === 0 ? 0 : free + (level - 1) * step + 1;
              const to = level === 0 ? free : free + level * step;
              const last = level === levels.length - 1 && s.max_steps;
              return (
                <tr key={level} className="border-t border-border">
                  <td className="px-3 py-1.5">Level {level}</td>
                  <td className="px-3 py-1.5">{last ? `${from} km+` : `${from}–${to} km`}</td>
                  <td className="px-3 py-1.5 text-right">{peso(level * (Number(s.driver_per_step) || 0))}</td>
                  <td className="px-3 py-1.5 text-right">{peso(level * (Number(s.helper_per_step) || 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-fg-muted">Route list (start hub → destination cities → level)</p>
          <button type="button" onClick={fillFromSheet} className="text-xs font-semibold text-primary hover:underline">
            Fill from rate sheet
          </button>
        </div>
        <div className="space-y-2">
          {routes.length > 0 && (
            <div className="grid grid-cols-[9rem_1fr_4rem_6rem_2rem] gap-2 text-[11px] text-fg-subtle">
              <span>Hub</span>
              <span>Cities (separate with /)</span>
              <span>Level</span>
              <span>Direction</span>
              <span />
            </div>
          )}
          {routes.map((r, i) => (
            <div key={i} className="grid grid-cols-[9rem_1fr_4rem_6rem_2rem] items-center gap-2">
              <select
                value={r.origin_store_id ?? ""}
                onChange={(e) => {
                  const hub = hubs.find((h) => String(h.id) === e.target.value);
                  set({
                    routes: routes.map((x, j) =>
                      j === i ? { ...x, origin_store_id: hub ? hub.id : null, origin: hub ? hub.name : null } : x,
                    ),
                  });
                }}
                className={smallInput}
              >
                <option value="">Any hub</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <input
                value={(r.cities || []).join("/")}
                onChange={(e) => setRoute(i, "cities", e.target.value.split("/").map((c) => c.trimStart()))}
                placeholder="Car-Car/Sibonga"
                className={smallInput}
              />
              <NumberInput value={r.level} onChange={(v) => setRoute(i, "level", v)} min={0} />
              <input value={r.direction || ""} onChange={(e) => setRoute(i, "direction", e.target.value)} className={smallInput} />
              <button type="button" onClick={() => set({ routes: routes.filter((_, j) => j !== i) })} className={iconBtn}>
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set({ routes: [...routes, { origin_store_id: null, origin: null, cities: [], level: 1, direction: "" }] })
            }
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Add route
          </button>
        </div>
      </div>

      <Check checked={s.use_gps_distance} onChange={(v) => set({ use_gps_distance: v })}>
        City not in the list → use the GPS distance from the hub (straight line)
      </Check>
    </div>
  );
}

function AttendanceEditor({ s, set }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-subtle">
        Present every workday in the period earns a % bonus. Holidays never count as absences.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Bonus %">
          <NumberInput value={s.bonus_percent} onChange={(v) => set({ bonus_percent: v })} min={0} />
        </Field>
        <Field label="Percent of">
          <select value={s.base} onChange={(e) => set({ base: e.target.value })} className={smallInput}>
            <option value="daily_rate">Daily rate × days worked</option>
            <option value="monthly_basic">Monthly basic</option>
            <option value="fixed">A fixed amount</option>
          </select>
        </Field>
        {s.base === "fixed" && (
          <Field label="Fixed amount (₱)">
            <NumberInput value={s.base_amount} onChange={(v) => set({ base_amount: v })} min={0} />
          </Field>
        )}
      </div>
      <Field label="Workdays">
        <div className="mt-1">
          <Weekdays value={s.workdays} onChange={(workdays) => set({ workdays })} />
        </div>
      </Field>
      {s.base === "daily_rate" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Weekday holiday worked × ">
            <NumberInput value={s.holiday_multiplier} onChange={(v) => set({ holiday_multiplier: v })} min={1} step="0.1" />
          </Field>
          <Field label="Saturday premium %">
            <NumberInput value={s.saturday_premium_percent} onChange={(v) => set({ saturday_premium_percent: v })} min={0} />
          </Field>
        </div>
      )}
      <Check checked={s.leave_counts_as_present} onChange={(v) => set({ leave_counts_as_present: v })}>
        Approved leave doesn&apos;t break complete attendance
      </Check>
    </div>
  );
}

const EDITORS = {
  trip_tiers: TiersEditor,
  daily_cash: DailyCashEditor,
  long_distance: LongDistanceEditor,
  complete_attendance: AttendanceEditor,
};

// One-line summary of a program's settings for its card.
const settingsSummary = (p) => {
  const s = p.settings || {};
  switch (p.rule_type) {
    case "trip_tiers":
      return (s.tiers || []).map((t) => `${t.min_trips} trips ${peso(t.amount)}`).join(" · ");
    case "daily_cash":
      return `${(s.trip_amounts || []).map((a, i) => `${ordinal(i + 1)} ${peso(a)}`).join(", ")}${
        s.repeat_last ? " (then repeats)" : ""
      }${s.first_trip_before ? ` · 1st before ${s.first_trip_before}` : ""}`;
    case "long_distance":
      return `${peso(s.driver_per_step)} / ${peso(s.helper_per_step)} per level · ${(s.routes || []).length} routes`;
    case "complete_attendance":
      return `${s.bonus_percent}% of ${s.base === "fixed" ? peso(s.base_amount) : s.base.replace("_", " ")}`;
    default:
      return "";
  }
};

// ---------------------------------------------------------------- program form

function ProgramForm({ program, ruleTypes, hubs, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (program) {
      return {
        ...program,
        period_start: iso(program.period_start),
        period_end: iso(program.period_end),
        release_date: iso(program.release_date),
        memo_no: program.memo_no || "",
        notes: program.notes || "",
      };
    }
    const now = new Date();
    const firstType = ruleTypes[0];
    return {
      name: "",
      memo_no: "",
      rule_type: firstType?.value || "trip_tiers",
      applies_to: ["drivers"],
      period_start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
      period_end: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      release_date: "",
      settings: firstType?.defaults || {},
      is_active: true,
      notes: "",
    };
  });
  const [saving, setSaving] = useState(false);
  const Editor = EDITORS[form.rule_type];
  const setSettings = (patch) => setForm((f) => ({ ...f, settings: { ...f.settings, ...patch } }));

  const changeType = (value) => {
    const type = ruleTypes.find((t) => t.value === value);
    setForm((f) => ({ ...f, rule_type: value, settings: type?.defaults || {} }));
  };
  const toggleGroup = (group) =>
    setForm((f) => ({
      ...f,
      applies_to: f.applies_to.includes(group)
        ? f.applies_to.filter((g) => g !== group)
        : ["drivers", "helpers"].filter((g) => g === group || f.applies_to.includes(g)),
    }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        memo_no: form.memo_no || null,
        rule_type: form.rule_type,
        applies_to: form.applies_to,
        period_start: form.period_start,
        period_end: form.period_end,
        release_date: form.release_date || null,
        settings: form.settings,
        is_active: form.is_active,
        notes: form.notes || null,
      };
      if (program) await updateIncentiveProgram(program.id, payload);
      else await createIncentiveProgram(payload);
      toast.success(program ? "Program updated." : "Program added.");
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Failed to save program."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">{program ? "Edit Program" : "New Incentive Program"}</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Driver Incentive Program - Performance Tiers"
                className={inputClass}
              />
            </Field>
            <Field label="Memo no.">
              <input
                value={form.memo_no}
                onChange={(e) => setForm({ ...form, memo_no: e.target.value })}
                placeholder="26-007"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={form.rule_type}
                onChange={(e) => changeType(e.target.value)}
                disabled={Boolean(program)}
                className={inputClass}
              >
                {ruleTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <p className="text-xs font-medium text-fg-muted">For</p>
              <div className="mt-2 flex gap-4">
                <Check checked={form.applies_to.includes("drivers")} onChange={() => toggleGroup("drivers")}>
                  Drivers
                </Check>
                <Check checked={form.applies_to.includes("helpers")} onChange={() => toggleGroup("helpers")}>
                  Helpers
                </Check>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-fg-muted">Program runs</p>
              <DateRangeFilter
                from={form.period_start}
                to={form.period_end}
                onChange={({ from, to }) => setForm({ ...form, period_start: from, period_end: to })}
              />
            </div>
            <Field label="Release date (optional)">
              <input
                type="date"
                value={form.release_date}
                onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-surface-hover/40 p-4">
            <p className="mb-3 text-sm font-semibold text-fg">Rules &amp; amounts</p>
            {Editor ? <Editor s={form.settings} set={setSettings} hubs={hubs} /> : null}
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </Field>
          <Check checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })}>
            Active (can be picked in a new incentive run)
          </Check>
          {program && (
            <p className="text-xs text-fg-subtle">
              Changes don&apos;t affect incentive runs that are already approved or released — those keep the rules
              they were generated with.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- copy

function CopyForm({ program, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const start = fromISODate(iso(program.period_start));
    const nextStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const nextEnd = new Date(start.getFullYear(), start.getMonth() + 2, 0);
    const release = program.release_date ? fromISODate(iso(program.release_date)) : null;
    return {
      period_start: toISODate(nextStart),
      period_end: toISODate(nextEnd),
      release_date: release ? toISODate(new Date(release.getFullYear(), release.getMonth() + 1, release.getDate())) : "",
      memo_no: "",
    };
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const copy = await copyIncentiveProgram(program.id, { ...form, release_date: form.release_date || null, memo_no: form.memo_no || null });
      toast.success("Copied — adjust the amounts if they changed.");
      onSaved(copy);
    } catch (err) {
      toast.error(errorText(err, "Failed to copy program."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">Copy to a new period</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">{program.name}</span> with the same rules and amounts, for:
          </p>
          <DateRangeFilter
            from={form.period_start}
            to={form.period_end}
            onChange={({ from, to }) => setForm({ ...form, period_start: from, period_end: to })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Release date">
              <input
                type="date"
                value={form.release_date}
                onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="New memo no.">
              <input value={form.memo_no} onChange={(e) => setForm({ ...form, memo_no: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Copying..." : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- preview

const resultBasis = (ruleType, r) => {
  switch (ruleType) {
    case "trip_tiers":
      return `${r.trips} trips · ${r.tier || "no tier"}${r.next_tier ? ` · ${r.trips_to_next_tier} to ${r.next_tier}` : ""}`;
    case "daily_cash":
      return `${r.trips} trips over ${(r.days || []).length} day(s)`;
    case "long_distance":
      return `${r.trips} long-distance trip(s)`;
    case "complete_attendance":
      return r.complete
        ? `Complete · ${r.days_present}/${r.workdays} days`
        : `${r.absences.length} absence(s)${r.missing_rate ? " · no rate" : ""}`;
    default:
      return "";
  }
};

function Preview({ program, onClose }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getIncentiveProgramResults(program.id)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && toast.error(errorText(err, "Failed to compute the program.")));
    return () => {
      cancelled = true;
    };
  }, [program.id]);

  const rows = (data?.rows || []).filter((r) => matchesSearch(search, r.name, r.department, r.group));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">Preview: {program.name}</h3>
            <p className="text-xs text-fg-subtle">
              {fmtDate(program.period_start)} – {fmtDate(program.period_end)} · computed now from today&apos;s
              data{data && !data.is_final ? " (period still running)" : ""}. Nothing is saved — pay it out with an
              Incentive Run.
            </p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5">
          {!data ? (
            <p className="text-sm text-fg-subtle">Computing...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-surface-hover p-3">
                  <p className="text-xs text-fg-subtle">Total</p>
                  <p className="text-lg font-bold">{peso(data.total)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-hover p-3">
                  <p className="text-xs text-fg-subtle">Earning</p>
                  <p className="text-lg font-bold">{data.earners}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-hover p-3">
                  <p className="text-xs text-fg-subtle">Counted</p>
                  <p className="text-lg font-bold">{data.rows.length}</p>
                </div>
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder="Search name..." />
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-hover text-xs text-fg-subtle">
                    <tr>
                      <th className="px-4 py-2">Employee</th>
                      <th className="px-4 py-2">Basis</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.employee_id}-${r.group}-${i}`} className="border-t border-border">
                        <td className="px-4 py-2">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs capitalize text-fg-subtle">{[r.department, r.group].filter(Boolean).join(" · ")}</p>
                        </td>
                        <td className="px-4 py-2 text-xs text-fg-muted">{resultBasis(data.rule_type, r)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{peso(r.amount)}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-fg-subtle">
                          Nobody counted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function IncentivePoliciesPage() {
  const canEdit = usePageCanEdit();
  const [programs, setPrograms] = useState([]);
  const [ruleTypes, setRuleTypes] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null); // program, or {} for new
  const [copying, setCopying] = useState(null);
  const [previewing, setPreviewing] = useState(null);

  const load = useCallback(
    () =>
      getIncentivePrograms()
        .then(setPrograms)
        .catch(() => toast.error("Failed to load incentive programs."))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
    getIncentiveRuleTypes().then(setRuleTypes).catch(() => {});
    getIncentiveHubs().then(setHubs).catch(() => setHubs([]));
  }, [load]);

  const shown = useMemo(
    () =>
      programs.filter(
        (p) =>
          (showInactive || p.is_active) &&
          (!typeFilter || p.rule_type === typeFilter) &&
          matchesSearch(search, p.name, p.memo_no, p.rule_label, p.notes),
      ),
    [programs, showInactive, typeFilter, search],
  );

  // Grouped by the month the program starts, newest first.
  const groups = useMemo(() => {
    const map = new Map();
    shown.forEach((p) => {
      const d = fromISODate(iso(p.period_start));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, { key, label: d.toLocaleDateString("en-PH", { month: "long", year: "numeric" }), items: [] });
      }
      map.get(key).items.push(p);
    });
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [shown]);

  const remove = async (program) => {
    if (!(await confirmDialog(`Delete "${program.name}" (${fmtDate(program.period_start)})?`))) return;
    try {
      await deleteIncentiveProgram(program.id);
      toast.success("Program deleted.");
      load();
    } catch (err) {
      toast.error(errorText(err, "Failed to delete program."));
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Incentive Policies</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            The incentive programs and their amounts for each period. Copy last month&apos;s program and change the
            numbers when a new memo comes out. Pay them out in Payroll → Incentive Runs.
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setEditing({})} className={btnPrimary} disabled={!ruleTypes.length}>
            <Plus size={16} /> New Program
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, memo..." />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg"
        >
          <option value="">All types</option>
          {ruleTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Check checked={showInactive} onChange={setShowInactive}>
          Show inactive
        </Check>
      </div>

      {loading ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
          {programs.length ? "No program matches the filters." : "No incentive programs yet — add the first one."}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-fg-muted">{group.label}</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {group.items.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border border-border bg-surface p-4 ${p.is_active ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{p.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {p.rule_label} · {p.applies_to.join(" & ")}
                        {p.memo_no ? ` · Memo ${p.memo_no}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button onClick={() => setPreviewing(p)} className={iconBtn} title="Preview what everyone earns">
                        <Eye size={15} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => setCopying(p)} className={iconBtn} title="Copy to a new period">
                            <Copy size={15} />
                          </button>
                          <button onClick={() => setEditing(p)} className={iconBtn} title="Edit">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => remove(p)} className={`${iconBtn} hover:text-danger`} title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-fg-muted">{settingsSummary(p)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-fg-muted">
                      {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                    </span>
                    {p.release_date && (
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-fg-muted">
                        Release {fmtDate(p.release_date)}
                      </span>
                    )}
                    {!p.is_active && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 font-semibold text-warning">Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {editing && (
        <ProgramForm
          program={editing.id ? editing : null}
          ruleTypes={ruleTypes}
          hubs={hubs}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {copying && (
        <CopyForm
          program={copying}
          onClose={() => setCopying(null)}
          onSaved={(copy) => {
            setCopying(null);
            load().then(() => setEditing(copy));
          }}
        />
      )}
      {previewing && <Preview program={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
