import { useEffect, useMemo, useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import MaintenanceModal from "./MaintenanceModal";
import SearchSelect from "../SearchSelect";
import SearchInput from "../ui/searchInput/SearchInput";
import { confirmDialog } from "../ui/dialog/dialogService";
import {
  createTripRateRule,
  deleteTripRateRule,
  getTripRateRules,
  updateTripRateRule,
} from "../../api/adminTripManagement/tripRateRules";
import { matchesSearch } from "../../utils/search";

// Driver / helper rates that depend on the trip itself: category, truck
// type and lane (origin -> destination area), each from an effective
// date. How a trip picks its rate: tpc_hris_backend/app/services/trip_rates.py.

const RATE_FIELDS = [
  ["driver_first_trip_rate", "Driver 1st"],
  ["driver_next_trip_rate", "Driver next"],
  ["helper_first_trip_rate", "Helper 1st"],
  ["helper_next_trip_rate", "Helper next"],
];

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const EMPTY_FORM = {
  trip_rate_profile_id: null,
  truck_type_id: null,
  origin_store_id: null,
  destination_area: "",
  driver_first_trip_rate: "",
  driver_next_trip_rate: "",
  helper_first_trip_rate: "",
  helper_next_trip_rate: "",
  effective_from: today(),
  notes: "",
};

const ANY = { id: null, name: "Any" };

const peso = (value) =>
  value === null || value === undefined
    ? null
    : new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
      }).format(value);

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function DriverRatesPanel({ canEdit }) {
  const [rules, setRules] = useState([]);
  const [options, setOptions] = useState({ categories: [], truck_types: [], origins: [], areas: [] });
  const [lockedUntil, setLockedUntil] = useState(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await getTripRateRules();
      setRules(data.rules || []);
      setOptions(data.options || {});
      setLockedUntil(data.locked_until);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load driver rates");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isLocked = (rule) => Boolean(lockedUntil && rule.effective_from <= lockedUntil);

  const filtered = useMemo(
    () =>
      rules.filter((rule) =>
        matchesSearch(
          search,
          rule.trip_rate_profile,
          rule.truck_type,
          rule.origin_store,
          rule.destination_area,
          rule.notes,
        ),
      ),
    [rules, search],
  );

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, effective_from: today() });
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      trip_rate_profile_id: rule.trip_rate_profile_id,
      truck_type_id: rule.truck_type_id,
      origin_store_id: rule.origin_store_id,
      destination_area: rule.destination_area || "",
      ...Object.fromEntries(RATE_FIELDS.map(([key]) => [key, rule[key] ?? ""])),
      effective_from: rule.effective_from,
      notes: rule.notes || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      destination_area: form.destination_area.trim() || null,
      notes: form.notes.trim() || null,
      ...Object.fromEntries(
        RATE_FIELDS.map(([key]) => [key, form[key] === "" ? null : Number(form[key])]),
      ),
    };
    if (RATE_FIELDS.every(([key]) => payload[key] === null)) {
      toast.error("Enter at least one rate.");
      return;
    }
    if (!payload.effective_from) {
      toast.error("Pick the date this rate starts.");
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateTripRateRule(editing.id, payload);
      else await createTripRateRule(payload);
      toast.success(editing ? "Rate updated" : "Rate added");
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save rate");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule) => {
    if (!(await confirmDialog("Delete this rate? Trips will use the next matching rate or the category rate."))) {
      return;
    }
    try {
      await deleteTripRateRule(rule.id);
      toast.success("Rate deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete rate");
    }
  };

  const pick = (list, id) => list.find((item) => item.id === id) || ANY;
  const categoryOptions = [ANY, ...(options.categories || [])];
  const truckOptions = [ANY, ...(options.truck_types || [])];
  const originOptions = [
    ANY,
    ...(options.origins || []).map((o) => ({ ...o, name: o.is_hub ? `${o.name} (hub)` : o.name })),
  ];
  const lane = (rule) =>
    rule.origin_store_id || rule.destination_area
      ? `${rule.origin_store || "Any"} → ${rule.destination_area || "Any"}`
      : "Any";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-fg-muted">
        <p className="font-semibold text-fg">How a trip gets its rate</p>
        <p className="mt-1">
          Each trip uses the most specific rate below that matches its category, truck and lane, on
          the trip date. Blank fields mean <em>any</em>. A rate left blank keeps the category&apos;s
          own rate. E.g. <strong>Core no helpers + Wingvan = ₱1,000</strong>, and{" "}
          <strong>Core no helpers from Oct 14 = ₱602</strong> for every other truck. Lanes use the
          store&apos;s <em>Area</em> (set it in Stores).
        </p>
        {lockedUntil && (
          <p className="mt-1 text-xs">
            <Lock size={12} className="mr-1 inline" />
            Payroll is locked up to {formatDate(lockedUntil)} -- rates in effect by then can&apos;t be
            changed. Add a new rate with a later date instead.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search rates..." />
        {canEdit && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
          >
            <Plus size={18} />
            Add Rate
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm text-fg">
          <thead className="bg-surface-hover text-left text-xs text-fg-muted">
            <tr>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Truck</th>
              <th className="px-3 py-2">Lane</th>
              {RATE_FIELDS.map(([key, label]) => (
                <th key={key} className="px-3 py-2 text-right">
                  {label}
                </th>
              ))}
              <th className="px-3 py-2">Effective</th>
              <th className="px-3 py-2">Notes</th>
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 10 : 9} className="px-3 py-8 text-center text-fg-subtle">
                  No driver rates yet -- trips use their category&apos;s rate.
                </td>
              </tr>
            )}
            {filtered.map((rule) => {
              const upcoming = rule.effective_from > today();
              const locked = isLocked(rule);
              return (
                <tr key={rule.id} className="border-t border-border">
                  <td className="px-3 py-2">{rule.trip_rate_profile || "Any"}</td>
                  <td className="px-3 py-2">{rule.truck_type || "Any"}</td>
                  <td className="px-3 py-2">{lane(rule)}</td>
                  {RATE_FIELDS.map(([key]) => (
                    <td key={key} className="px-3 py-2 text-right font-semibold">
                      {peso(rule[key]) ?? <span className="font-normal text-fg-subtle">category</span>}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDate(rule.effective_from)}
                    {upcoming && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Upcoming
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-fg-muted">{rule.notes}</td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      {locked ? (
                        <span title="Used in locked payroll" className="inline-flex text-fg-subtle">
                          <Lock size={16} />
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(rule)}
                            className="rounded-lg p-2 text-primary hover:bg-primary/10"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => remove(rule)}
                            className="rounded-lg p-2 text-danger hover:bg-danger/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MaintenanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Driver Rate" : "Add Driver Rate"}
        onSave={save}
        saveLabel={saving ? "Saving..." : "Save"}
      >
        <div className="space-y-4">
          <p className="text-xs text-fg-subtle">
            Leave a field on <em>Any</em> to match every trip. Pick only what makes this rate
            different.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Trip category</label>
              <SearchSelect
                value={pick(categoryOptions, form.trip_rate_profile_id)}
                options={categoryOptions}
                getOptionValue={(o) => o.id ?? "any"}
                onChange={(o) => setForm({ ...form, trip_rate_profile_id: o.id })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Truck type</label>
              <SearchSelect
                value={pick(truckOptions, form.truck_type_id)}
                options={truckOptions}
                getOptionValue={(o) => o.id ?? "any"}
                onChange={(o) => setForm({ ...form, truck_type_id: o.id })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">From (origin)</label>
              <SearchSelect
                value={pick(originOptions, form.origin_store_id)}
                options={originOptions}
                getOptionValue={(o) => o.id ?? "any"}
                onChange={(o) => setForm({ ...form, origin_store_id: o.id })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">To (destination area)</label>
              <input
                list="rate-areas"
                value={form.destination_area}
                onChange={(e) => setForm({ ...form, destination_area: e.target.value })}
                placeholder="Any (e.g. Bohol)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
              />
              <datalist id="rate-areas">
                {(options.areas || []).map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {RATE_FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label} trip</label>
                <input
                  type="number"
                  min="0"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder="Category rate"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Effective from</label>
              <input
                type="date"
                value={form.effective_from}
                onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Oct 14 wage increase"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg"
              />
            </div>
          </div>
        </div>
      </MaintenanceModal>
    </div>
  );
}
