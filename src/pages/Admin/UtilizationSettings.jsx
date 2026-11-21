import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { getUtilizationSettings, saveUtilizationSettings } from "../../api/adminTripManagement/fleet";

// Fleet Management -> Utilization Settings: the base days a truck should
// work in a month -- Truck Utilization divides days used by this
// (backend: app/services/fleet_status.py).

const MODES = [
  {
    key: "full",
    label: "Full base days",
    hint: "Any part of a month counts the whole base. Nov 1–21 is measured against 26.",
  },
  {
    key: "prorate",
    label: "Share of the month",
    hint: "A part of a month counts its share. Nov 1–21 is measured against 26 × 21 ÷ 30 = 18.2.",
  },
];

const inputCls =
  "w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function UtilizationSettings() {
  const canEdit = usePageCanEdit();
  const [saved, setSaved] = useState(null);
  const [baseDays, setBaseDays] = useState("");
  const [mode, setMode] = useState("full");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUtilizationSettings()
      .then((s) => {
        setSaved(s);
        setBaseDays(String(s.base_days));
        setMode(s.partial_month);
      })
      .catch((err) => toast.error(err?.response?.data?.detail || "Couldn't load the settings."));
  }, []);

  const base = Number(baseDays);
  const valid = base > 0 && base <= 31;
  const dirty = saved && (base !== saved.base_days || mode !== saved.partial_month);

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return toast.error("Base days must be between 1 and 31.");
    setSaving(true);
    try {
      setSaved(await saveUtilizationSettings({ base_days: base, partial_month: mode }));
      toast.success("Saved. Truck Utilization uses it right away.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Couldn't save the settings.");
    } finally {
      setSaving(false);
    }
  };

  // Example: a truck out on 20 days in a full month.
  const example = valid ? ((20 / base) * 100).toFixed(1) : null;

  return (
    <div className="space-y-5">
      <SectionTabs group="Fleet Management" />

      <div>
        <h1 className="text-xl font-semibold text-fg">Utilization Settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-subtle">
          How many days a truck is expected to work in a month. Truck Utilization measures each truck
          against this: utilization = days the truck went out on a trip ÷ base days.
        </p>
      </div>

      {!saved ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-subtle">Loading...</p>
      ) : (
        <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-border bg-surface p-5">
          <div>
            <label htmlFor="util-base-days" className="block text-sm font-semibold text-fg">
              Base days per month
            </label>
            <p className="mb-2 text-xs text-fg-subtle">For example 26 = Monday to Saturday.</p>
            <div className="flex items-center gap-2">
              <input
                id="util-base-days"
                type="number"
                min="1"
                max="31"
                step="0.5"
                required
                disabled={!canEdit}
                value={baseDays}
                onChange={(e) => setBaseDays(e.target.value)}
                className={inputCls}
              />
              <span className="text-sm text-fg-muted">days</span>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-fg">When the report covers part of a month</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {MODES.map((m) => (
                <label
                  key={m.key}
                  htmlFor={`util-mode-${m.key}`}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                    mode === m.key ? "border-primary bg-primary/10" : "border-border hover:bg-surface-hover"
                  } ${!canEdit ? "cursor-default opacity-80" : ""}`}
                >
                  <input
                    id={`util-mode-${m.key}`}
                    type="radio"
                    name="util-mode"
                    value={m.key}
                    disabled={!canEdit}
                    checked={mode === m.key}
                    onChange={() => setMode(m.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className={`block text-sm font-semibold ${mode === m.key ? "text-primary" : "text-fg"}`}>
                      {m.label}
                    </span>
                    <span className="block text-xs text-fg-subtle">{m.hint.replaceAll("26", baseDays || "26")}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {example && (
            <p className="rounded-lg border border-border bg-surface-hover/60 px-3 py-2 text-xs text-fg-muted">
              Example: a truck out on 20 days in a full month is <strong className="text-fg">{example}%</strong>{" "}
              utilized (20 ÷ {base}). Days lost to breakdown, maintenance or hold still show in the report as
              downtime. Days a truck is retired don&apos;t count.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/dashboard/admin/trip-maintenance?tab=utilization"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open Truck Utilization &rarr;
            </Link>
            {canEdit && (
              <button
                type="submit"
                disabled={saving || !dirty}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
