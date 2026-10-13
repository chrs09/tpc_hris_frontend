import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Pencil, Plus } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import Pagination from "../../components/ui/pagination/Pagination";
import usePagination from "../../hooks/usePagination";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";
import {
  createAttendanceLocation,
  getAttendanceLocations,
  getAttendanceSettings,
  getEmployeeAttendanceRules,
  saveAttendanceSettings,
  saveEmployeeAttendanceRules,
  updateAttendanceLocation,
} from "../../api/attendanceLocations";

// HRIS -> Attendance Locations: where employees may time in/out (selfie
// or kiosk) and the perimeter around each, which locations each employee
// is assigned to, and the minimum hours of duty. Outside the perimeter is
// accepted but flagged for the attendance approvers; a time out sooner
// than the minimum counts Absent until they approve it.

const errorOf = (error) => error.response?.data?.detail || "Something went wrong.";

const hoursLabel = (minutes) => {
  if (!minutes) return "Off";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h${m ? ` ${m} m` : ""}`;
};

// "10.3157, 123.8854" pasted from Google Maps -> [lat, lng]
const parseCoordinates = (text) => {
  const match = String(text || "").match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const pinUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-surface shadow-xl">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
      </div>
      <div className="space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm text-fg-muted hover:bg-surface-hover"
        >
          Cancel
        </button>
        {footer}
      </div>
    </div>
  </div>
);

// ---------------- minimum hours of duty (company default)
const MinDutyCard = ({ minutes, canEdit, onSaved }) => {
  const [hours, setHours] = useState(String(Math.floor(minutes / 60)));
  const [mins, setMins] = useState(String(minutes % 60));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const total = Number(hours || 0) * 60 + Number(mins || 0);
    if (Number.isNaN(total) || total < 0 || total > 1440) {
      toast.error("Enter 0 to 24 hours.");
      return;
    }
    try {
      setSaving(true);
      await saveAttendanceSettings(total);
      toast.success(total ? `Minimum duty set to ${hoursLabel(total)}.` : "Minimum duty turned off.");
      onSaved(total);
    } catch (error) {
      toast.error(errorOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-semibold text-fg">Minimum hours of duty</h2>
      <p className="mt-1 text-sm text-fg-muted">
        A time out sooner than this after the time in still saves, but the day counts as{" "}
        <strong>Absent</strong> until the attendance approvers approve it (Approvals &rarr;
        Attendance, tagged &ldquo;Short duty&rdquo;). Employees can have their own below. 0 = off.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-fg-muted">
          Hours
          <input
            type="number"
            min="0"
            max="24"
            value={hours}
            disabled={!canEdit}
            onChange={(e) => setHours(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="text-sm text-fg-muted">
          Minutes
          <input
            type="number"
            min="0"
            max="59"
            value={mins}
            disabled={!canEdit}
            onChange={(e) => setMins(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
        <span className="pb-2 text-sm text-fg-subtle">Now: {hoursLabel(minutes)}</span>
      </div>
    </div>
  );
};

// ---------------- add / edit a location
const LocationModal = ({ location, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: location?.name || "",
    latitude: location?.latitude ?? "",
    longitude: location?.longitude ?? "",
    radius_meters: location?.radius_meters ?? 150,
    is_active: location?.is_active ?? true,
  });
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const applyPaste = (text) => {
    setPaste(text);
    const coords = parseCoordinates(text);
    if (coords) setForm((f) => ({ ...f, latitude: coords[0], longitude: coords[1] }));
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters),
      is_active: form.is_active,
    };
    if (!payload.name) return toast.error("Name is required.");
    if (form.latitude === "" || form.longitude === "" || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
      return toast.error("Enter the coordinates.");
    }
    try {
      setSaving(true);
      if (location) await updateAttendanceLocation(location.id, payload);
      else await createAttendanceLocation(payload);
      toast.success(location ? "Location saved." : "Location added.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={location ? `Edit ${location.name}` : "Add attendance location"}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <label className="block text-sm text-fg-muted">
        Name
        <input value={form.name} onChange={set("name")} placeholder="e.g. Cebu Plant" className={inputClass} />
      </label>
      <label className="block text-sm text-fg-muted">
        Paste coordinates from Google Maps
        <input
          value={paste}
          onChange={(e) => applyPaste(e.target.value)}
          placeholder="10.3157, 123.8854"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] text-fg-subtle">
          In Google Maps, right-click the spot and click the numbers at the top to copy them.
        </span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-fg-muted">
          Latitude
          <input type="number" step="any" value={form.latitude} onChange={set("latitude")} className={inputClass} />
        </label>
        <label className="text-sm text-fg-muted">
          Longitude
          <input type="number" step="any" value={form.longitude} onChange={set("longitude")} className={inputClass} />
        </label>
      </div>
      <label className="block text-sm text-fg-muted">
        Perimeter (meters around the point)
        <input
          type="number"
          min="10"
          max="5000"
          value={form.radius_meters}
          onChange={set("radius_meters")}
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] text-fg-subtle">
          Phones are usually accurate to 10-50 m; 100-200 m suits most sites, more for a large plant.
        </span>
      </label>
      {form.latitude !== "" && form.longitude !== "" && (
        <a
          href={pinUrl(form.latitude, form.longitude)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <MapPin size={14} /> Check the pin in Google Maps
        </a>
      )}
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
        />
        Active (employees can time in/out here)
      </label>
    </Modal>
  );
};

// ---------------- one employee's locations + minimum duty
const EmployeeRulesModal = ({ employee, locations, companyMinutes, onClose, onSaved }) => {
  const [locationIds, setLocationIds] = useState(employee.location_ids);
  const [custom, setCustom] = useState(employee.min_duty_minutes !== null);
  const [hours, setHours] = useState(String(Math.floor((employee.min_duty_minutes ?? companyMinutes) / 60)));
  const [mins, setMins] = useState(String((employee.min_duty_minutes ?? companyMinutes) % 60));
  const [saving, setSaving] = useState(false);

  const toggle = (id) =>
    setLocationIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const save = async () => {
    const total = custom ? Number(hours || 0) * 60 + Number(mins || 0) : null;
    if (custom && (Number.isNaN(total) || total < 0 || total > 1440)) {
      return toast.error("Enter 0 to 24 hours.");
    }
    try {
      setSaving(true);
      await saveEmployeeAttendanceRules(employee.id, locationIds, total);
      toast.success(`Saved for ${employee.name}.`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={employee.name}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <div>
        <p className="text-sm font-semibold text-fg">Assigned locations</p>
        <p className="text-xs text-fg-subtle">
          None ticked = any active location. Ticked = only these; anywhere else is flagged
          &ldquo;Outside assigned location&rdquo; for review.
        </p>
        <div className="mt-2 space-y-1.5">
          {locations
            .filter((l) => l.is_active || locationIds.includes(l.id))
            .map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={locationIds.includes(l.id)} onChange={() => toggle(l.id)} />
                {l.name}
                <span className="text-xs text-fg-subtle">({l.radius_meters} m{l.is_active ? "" : ", inactive"})</span>
              </label>
            ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-fg">Minimum hours of duty</p>
        <label className="mt-2 flex items-center gap-2 text-sm text-fg">
          <input type="radio" checked={!custom} onChange={() => setCustom(false)} />
          Company default ({hoursLabel(companyMinutes)})
        </label>
        <label className="mt-1 flex items-center gap-2 text-sm text-fg">
          <input type="radio" checked={custom} onChange={() => setCustom(true)} />
          Their own
        </label>
        {custom && (
          <div className="mt-2 flex gap-3 pl-6">
            <label className="text-sm text-fg-muted">
              Hours
              <input type="number" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} className={`${inputClass} w-24`} />
            </label>
            <label className="text-sm text-fg-muted">
              Minutes
              <input type="number" min="0" max="59" value={mins} onChange={(e) => setMins(e.target.value)} className={`${inputClass} w-24`} />
            </label>
          </div>
        )}
        {custom && (
          <p className="mt-1 pl-6 text-[11px] text-fg-subtle">0 = no minimum for this employee.</p>
        )}
      </div>
    </Modal>
  );
};

export default function AttendanceLocationsPage() {
  const canEdit = usePageCanEdit();
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companyMinutes, setCompanyMinutes] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null); // {} = new
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [onlyCustom, setOnlyCustom] = useState(false);

  const load = () =>
    Promise.all([getAttendanceLocations(), getEmployeeAttendanceRules(), getAttendanceSettings()])
      .then(([locs, emps, settings]) => {
        setLocations(locs);
        setEmployees(emps);
        setCompanyMinutes(settings.min_duty_minutes);
      })
      .catch((error) => toast.error(errorOf(error)));

  useEffect(() => {
    Promise.all([getAttendanceLocations(), getEmployeeAttendanceRules(), getAttendanceSettings()])
      .then(([locs, emps, settings]) => {
        setLocations(locs);
        setEmployees(emps);
        setCompanyMinutes(settings.min_duty_minutes);
      })
      .catch((error) => toast.error(errorOf(error)));
  }, []);

  const locationName = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l.name])),
    [locations],
  );

  const filteredEmployees = employees.filter(
    (e) =>
      (!onlyCustom || e.location_ids.length > 0 || e.min_duty_minutes !== null) &&
      matchesSearch(search, e.name, e.department, e.position, ...e.location_ids.map((id) => locationName[id])),
  );
  const { page, setPage, totalPages, paginatedItems } = usePagination(filteredEmployees, 15);

  return (
    <div className="space-y-6">
      <SectionTabs group="HRIS" />

      <div>
        <h1 className="text-xl font-semibold text-fg">Attendance Locations</h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Where employees may time in and out (phone selfie or kiosk), how far around each
          place counts, who is assigned where, and the minimum hours of duty.
        </p>
      </div>

      {companyMinutes !== null && (
        <MinDutyCard key={companyMinutes} minutes={companyMinutes} canEdit={canEdit} onSaved={setCompanyMinutes} />
      )}

      {/* LOCATIONS */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-fg">Locations &amp; perimeter</h2>
            <p className="text-sm text-fg-muted">
              Outside the perimeter is still accepted, but flagged for the attendance approvers.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditingLocation({})}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              <Plus size={16} /> Add location
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Coordinates</th>
                <th className="px-5 py-3 text-left font-medium">Perimeter</th>
                <th className="px-5 py-3 text-left font-medium">Assigned employees</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                {canEdit && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id} className={`border-t border-border ${l.is_active ? "" : "opacity-60"}`}>
                  <td className="px-5 py-3 font-medium text-fg">{l.name}</td>
                  <td className="px-5 py-3">
                    <a
                      href={pinUrl(l.latitude, l.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin size={13} />
                      {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-fg">{l.radius_meters} m</td>
                  <td className="px-5 py-3 text-fg-muted">{l.assigned_employees || "--"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        l.is_active ? "bg-success/15 text-success" : "bg-surface-active text-fg-muted"
                      }`}
                    >
                      {l.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingLocation(l)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMPLOYEES */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-fg">Employees</h2>
            <p className="text-sm text-fg-muted">
              Assigned locations and minimum hours of duty per employee -- active
              employees only ({employees.length}).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={onlyCustom}
                onChange={(e) => {
                  setOnlyCustom(e.target.checked);
                  setPage(1);
                }}
              />
              Only with their own settings
            </label>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search employee, department, location..."
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Employee</th>
                <th className="px-5 py-3 text-left font-medium">Department</th>
                <th className="px-5 py-3 text-left font-medium">Assigned locations</th>
                <th className="px-5 py-3 text-left font-medium">Minimum duty</th>
                {canEdit && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-fg">
                    {e.name}
                    <div className="text-xs font-normal text-fg-subtle">{e.position}</div>
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{e.department}</td>
                  <td className="px-5 py-3">
                    {e.location_ids.length ? (
                      <div className="flex flex-wrap gap-1">
                        {e.location_ids.map((id) => (
                          <span key={id} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {locationName[id] || `#${id}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-fg-subtle">Any location</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {e.min_duty_minutes === null ? (
                      <span className="text-xs text-fg-subtle">Default ({hoursLabel(companyMinutes || 0)})</span>
                    ) : (
                      <span className="font-medium text-fg">{hoursLabel(e.min_duty_minutes)}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingEmployee(e)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-fg-subtle">
                    No employees match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {editingLocation && (
        <LocationModal
          location={editingLocation.id ? editingLocation : null}
          onClose={() => setEditingLocation(null)}
          onSaved={load}
        />
      )}
      {editingEmployee && (
        <EmployeeRulesModal
          employee={editingEmployee}
          locations={locations}
          companyMinutes={companyMinutes || 0}
          onClose={() => setEditingEmployee(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
