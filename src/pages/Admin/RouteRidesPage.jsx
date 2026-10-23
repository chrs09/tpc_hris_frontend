import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";
import { getAssignableUsers } from "../../api/users";
import { getRateProfiles } from "../../api/adminTripManagement/tripMaintenance";
import {
  addManualRouteRide,
  editRouteRide,
  getRouteRides,
  removeRouteRide,
} from "../../api/adminTripManagement/routeRides";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const todayPH = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const firstOfMonth = () => `${todayPH().slice(0, 8)}01`;

const shortDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "--";

const EMPTY = { rider: null, ride_date: todayPH(), quantity: "1", category: null, amount: "", notes: "" };

// Route Rides: every route ride (assigned in Trip Assignment, and manual
// ones), and "Add Manual Route Ride" for rides done before route rides
// existed -- e.g. a driver with 3 route rides and 17 trips on the phone.
// Each is paid like a driver trip of that category (Driver 1st / Next with
// their other trips that day), or the typed amount.
export default function RouteRidesPage() {
  const canEditPage = usePageCanEdit();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(todayPH());
  const [search, setSearch] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null); // open = object
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      getRouteRides({ start: start || undefined, end: end || undefined })
        .then(setRides)
        .catch((error) => toast.error(error.response?.data?.detail || "Failed to load route rides."))
        .finally(() => setLoading(false)),
    [start, end],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAssignableUsers()
      .then((list) => setDrivers((list || []).filter((u) => u.role === "driver" && u.is_active)))
      .catch(() => setDrivers([]));
    getRateProfiles()
      .then((list) => setCategories((list || []).filter((c) => c.is_active)))
      .catch(() => setCategories([]));
  }, []);

  const filtered = useMemo(
    () =>
      rides.filter((r) =>
        matchesSearch(
          search,
          r.rider_name,
          r.trip_category,
          r.notes,
          r.trip?.driver_name,
          r.trip?.trip_code,
          ...(r.trip?.shipment_numbers || []),
        ),
      ),
    [rides, search],
  );
  const total = filtered.reduce((sum, r) => sum + (r.total || 0), 0);
  const count = filtered.reduce((sum, r) => sum + (r.quantity || 1), 0);

  const driverLabel = (u) => (u ? u.employee_name || u.username : "");

  // Edit: manual rides -- everything; assigned -- fixed amount + notes.
  const openEdit = (ride) =>
    setForm({
      id: ride.id,
      source: ride.source,
      ride,
      rider:
        drivers.find((d) => d.id === ride.rider_user_id) || {
          id: ride.rider_user_id,
          username: ride.rider_name,
          employee_name: ride.rider_name,
        },
      ride_date: ride.ride_date || todayPH(),
      quantity: String(ride.quantity || 1),
      category: categories.find((c) => c.id === ride.trip_rate_profile_id) || null,
      amount: ride.amount != null ? String(ride.amount) : "",
      notes: ride.notes || "",
    });

  const saveEdit = async () => {
    const assigned = form.source !== "manual";
    const quantity = Number(form.quantity);
    if (!assigned) {
      if (!form.rider) return toast.error("Select the driver.");
      if (!form.ride_date) return toast.error("Pick the date.");
      if (!Number.isInteger(quantity) || quantity < 1) return toast.error("Enter how many route rides.");
      if (!form.category && form.amount === "") return toast.error("Pick the trip category or type the amount.");
    }
    try {
      setSaving(true);
      await editRouteRide(form.id, {
        ...(assigned
          ? {}
          : {
              rider_user_id: form.rider.id,
              ride_date: form.ride_date,
              quantity,
              trip_rate_profile_id: form.category?.id || null,
            }),
        amount: form.amount === "" ? null : Number(form.amount),
        notes: form.notes.trim() || null,
      });
      toast.success("Route ride updated.");
      setForm(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (form.id) return saveEdit();
    const quantity = Number(form.quantity);
    if (!form.rider) return toast.error("Select the driver.");
    if (!form.ride_date) return toast.error("Pick the date.");
    if (!Number.isInteger(quantity) || quantity < 1) return toast.error("Enter how many route rides.");
    if (!form.category && form.amount === "") return toast.error("Pick the trip category or type the amount.");
    try {
      setSaving(true);
      await addManualRouteRide({
        rider_user_id: form.rider.id,
        ride_date: form.ride_date,
        quantity,
        trip_rate_profile_id: form.category?.id || null,
        amount: form.amount === "" ? null : Number(form.amount),
        notes: form.notes.trim() || null,
      });
      toast.success(`Added ${quantity} route ride${quantity > 1 ? "s" : ""} for ${driverLabel(form.rider)}.`);
      setForm(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ride) => {
    if (
      !(await confirmDialog(
        `Remove ${ride.rider_name}'s route ride on ${shortDate(ride.ride_date)}? It won't be paid.`,
      ))
    )
      return;
    try {
      await removeRouteRide(ride.id);
      toast.success("Route ride removed.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove.");
    }
  };

  const input =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Route Rides</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Drivers riding along on another driver&apos;s trip. Assigned ones come from Trip
            Assignment; add past ones here with <strong>Add Manual Route Ride</strong>. Each is
            paid like a driver trip of that category -- Driver 1st if it&apos;s their first trip
            that day, else Driver Next.
          </p>
        </div>
        {canEditPage && (
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY })}
            className="flex h-10 w-fit shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Plus size={16} /> Add Manual Route Ride
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-fg-muted">
          From
          <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className={`${input} mt-1 w-40`} />
        </label>
        <label className="text-xs text-fg-muted">
          To
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={`${input} mt-1 w-40`} />
        </label>
        <SearchInput value={search} onChange={setSearch} placeholder="Search driver, trip, shipment..." />
        <p className="ml-auto text-sm text-fg-muted">
          {count} route ride{count !== 1 ? "s" : ""} · about{" "}
          <span className="font-semibold text-fg">{peso(total)}</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface-hover text-left text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Route Rider</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Rode with / Trip</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Pay</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              {canEditPage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-fg-subtle">Loading...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-fg-subtle">No route rides in this period.</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3">{shortDate(r.ride_date)}</td>
                  <td className="px-4 py-3 font-medium text-fg">{r.rider_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.source === "manual"
                          ? "bg-warning/15 text-warning"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {r.source === "manual" ? "Manual" : "Assigned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {r.trip ? (
                      <>
                        <p className="text-fg">
                          {r.trip.driver_name} · {r.trip.trip_code}
                        </p>
                        <p className="text-xs">
                          {(r.trip.shipment_numbers || []).join(", ") || "--"} → {r.trip.stores.join(", ") || "--"}
                        </p>
                      </>
                    ) : (
                      "--"
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{r.trip_category || "--"}</td>
                  <td className="px-4 py-3 text-right">{r.quantity}</td>
                  <td className="px-4 py-3 text-right font-semibold text-fg">
                    {r.amount != null ? (
                      <>
                        {peso(r.total)}
                        <span className="block text-[11px] font-normal text-fg-subtle">
                          {peso(r.amount)} each
                        </span>
                      </>
                    ) : (
                      <>
                        {peso(r.rate_first)}
                        <span className="block text-[11px] font-normal text-fg-subtle">
                          1st · {peso(r.rate_next)} next
                        </span>
                      </>
                    )}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-xs text-fg-muted">{r.notes || ""}</td>
                  {canEditPage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r)}
                          className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
                          aria-label="Remove"
                          title="Remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 p-4" onClick={() => setForm(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-fg">
                {form.id ? "Edit Route Ride" : "Add Manual Route Ride"}
              </h3>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              {form.id && form.source !== "manual" ? (
                <div className="rounded-lg bg-surface-hover px-3 py-2 text-xs text-fg-muted">
                  <p className="font-semibold text-fg">
                    {form.ride.rider_name} · rode with {form.ride.trip?.driver_name} ·{" "}
                    {form.ride.trip?.trip_code}
                  </p>
                  <p className="mt-0.5">
                    Assigned in Trip Assignment -- the driver, date and trip come from that trip
                    (remove and assign again to change them). You can set a fixed amount or notes.
                  </p>
                </div>
              ) : (
              <p className="rounded-lg bg-surface-hover px-3 py-2 text-xs text-fg-muted">
                For route rides done before route rides were in the system. They&apos;re added to
                payroll on that date (the driver needs attendance that day).
              </p>
              )}
              {!(form.id && form.source !== "manual") && (
              <>
              <label className="block text-xs font-medium text-fg-muted">
                Driver (route rider) *
                <div className="mt-1">
                  <SearchSelect
                    value={form.rider}
                    options={drivers}
                    onChange={(u) => setForm({ ...form, rider: u || null })}
                    getOptionLabel={driverLabel}
                    getOptionValue={(u) => u?.id}
                    placeholder="Select driver"
                  />
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-fg-muted">
                  Date *
                  <input type="date" max={todayPH()} value={form.ride_date} onChange={(e) => setForm({ ...form, ride_date: e.target.value })} className={`${input} mt-1`} />
                </label>
                <label className="block text-xs font-medium text-fg-muted">
                  How many *
                  <input type="number" min="1" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/\D/g, "") })} className={`${input} mt-1`} />
                </label>
              </div>
              <label className="block text-xs font-medium text-fg-muted">
                Trip category (paid like its Driver 1st / Next)
                <div className="mt-1">
                  <SearchSelect
                    value={form.category}
                    options={categories}
                    onChange={(c) => setForm({ ...form, category: c || null })}
                    getOptionLabel={(c) =>
                      c
                        ? `${c.profile_name} -- 1st ${peso((c.current_rates || c).driver_first_trip_rate)} · next ${peso(
                            (c.current_rates || c).driver_next_trip_rate,
                          )}`
                        : ""
                    }
                    getOptionValue={(c) => c?.id}
                    placeholder="Select category"
                  />
                </div>
              </label>
              </>
              )}
              <label className="block text-xs font-medium text-fg-muted">
                {form.id && form.source !== "manual"
                  ? "Fixed amount for this ride (₱)"
                  : "Or a fixed amount per route ride (₱)"}
                <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Leave blank to use the category rate" className={`${input} mt-1`} />
              </label>
              <label className="block text-xs font-medium text-fg-muted">
                Notes
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Rode with Juan, Cebu Plant → Bacolod" className={`${input} mt-1 resize-none`} />
              </label>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button type="button" onClick={() => setForm(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-fg hover:bg-surface-hover">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={save} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                {saving ? "Saving..." : form.id ? "Save Changes" : "Add Route Ride"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
