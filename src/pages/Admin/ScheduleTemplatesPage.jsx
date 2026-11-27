import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import {
  getScheduleTemplates,
  createScheduleTemplate,
  updateScheduleTemplate,
  deleteScheduleTemplate,
  saveNoScheduleLabel,
} from "../../api/scheduleTemplates";
import useNoScheduleLabel, { setNoScheduleLabel } from "../../hooks/useNoScheduleLabel";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

// Trip-based schedules keep work days as "mon,tue,..." (no clock times).
const DAY_SHORT = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };
const DEFAULT_TRIP_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"];

// "08:00:00" (backend) -> "08:00" (<input type="time"> value).
const toInputTime = (value) => (value ? value.slice(0, 5) : "");

const emptyFormData = () => {
  const data = { name: "", description: "", is_trip_based: false, work_days: DEFAULT_TRIP_DAYS };
  DAYS.forEach((day) => {
    data[`${day.key}_in`] = "";
    data[`${day.key}_out`] = "";
  });
  return data;
};

const templateToFormData = (template) => {
  const data = {
    name: template.name || "",
    description: template.description || "",
    is_trip_based: Boolean(template.is_trip_based),
    work_days: template.work_days ? template.work_days.split(",") : DEFAULT_TRIP_DAYS,
  };
  DAYS.forEach((day) => {
    data[`${day.key}_in`] = toInputTime(template[`${day.key}_in`]);
    data[`${day.key}_out`] = toInputTime(template[`${day.key}_out`]);
  });
  return data;
};

const summarizeDays = (template) => {
  if (template.is_trip_based) {
    const days = (template.work_days || "").split(",");
    const work = DAYS.filter((d) => days.includes(DAY_SHORT[d.key])).map((d) => d.label.slice(0, 3));
    const rest = DAYS.filter((d) => !days.includes(DAY_SHORT[d.key])).map((d) => d.label.slice(0, 3));
    return `Trip-based · Work: ${work.join(", ") || "none"} · Rest day: ${rest.join(", ") || "none"}`;
  }
  const activeDays = DAYS.filter(
    (day) => template[`${day.key}_in`] && template[`${day.key}_out`],
  );
  if (activeDays.length === 0) return "No working days set";
  if (activeDays.length === 7) {
    return `Everyday · ${toInputTime(template.monday_in)}-${toInputTime(template.monday_out)}`;
  }
  return activeDays
    .map(
      (day) =>
        `${day.label.slice(0, 3)} ${toInputTime(template[`${day.key}_in`])}-${toInputTime(template[`${day.key}_out`])}`,
    )
    .join(", ");
};

export default function ScheduleTemplatesPage() {
  const canEditPage = usePageCanEdit();
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState(emptyFormData());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const filteredTemplates = templates.filter((template) =>
    matchesSearch(search, template.name, template.description),
  );

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getScheduleTemplates();
      setTemplates(data || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setFormData(emptyFormData());
    setShowModal(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setFormData(templateToFormData(template));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (formData.is_trip_based && formData.work_days.length === 0) {
      toast.error("Pick at least one work day.");
      return;
    }
    const payload = {
      ...formData,
      is_trip_based: formData.is_trip_based ? "true" : "false",
      work_days: formData.is_trip_based ? formData.work_days.join(",") : "",
    };

    try {
      setSaving(true);
      if (editingTemplate) {
        await updateScheduleTemplate(editingTemplate.id, payload);
        toast.success("Schedule updated.");
      } else {
        await createScheduleTemplate(payload);
        toast.success("Schedule created.");
      }
      closeModal();
      loadTemplates();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!(await confirmDialog(`Delete the "${template.name}" schedule?`))) {
      return;
    }

    try {
      setDeletingId(template.id);
      await deleteScheduleTemplate(template.id);
      toast.success("Schedule deleted.");
      loadTemplates();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="HRIS" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Work Schedules</h2>
          <p className="text-sm text-fg-subtle">
            Manage the shift templates employees are assigned to (used for
            attendance, tardiness, and overtime calculations). Drivers and
            helpers use a Trip-based schedule: work days only, and a trip on a
            rest day gets the rest-day premium.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search schedules..."
        />
        {canEditPage && (
          <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          + New Schedule
        </button>
        )}
        </div>
      </div>

      <NoScheduleLabelCard canEdit={canEditPage} />

      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr className="text-xs uppercase tracking-wide">
                <th className="px-6 py-4 text-left font-medium">Name</th>
                <th className="px-4 text-left font-medium">Description</th>
                <th className="px-4 text-left font-medium">Days</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-fg-subtle"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-fg-subtle"
                  >
                    {templates.length ? "No schedules match your search." : "No schedules yet."}
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-t border-border transition hover:bg-surface-hover"
                  >
                    <td className="px-6 py-4 font-medium text-fg">
                      {template.name}
                    </td>
                    <td className="px-4 text-fg-muted">
                      {template.description || "-"}
                    </td>
                    <td className="px-4 text-xs text-fg-muted">
                      {summarizeDays(template)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canEditPage && (
                          <button
                          type="button"
                          onClick={() => openEdit(template)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                        >
                          Edit
                        </button>
                        )}
                        {canEditPage && (
                          <button
                          type="button"
                          onClick={() => handleDelete(template)}
                          disabled={deletingId === template.id}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                        >
                          {deletingId === template.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ScheduleTemplateModal
          isEditing={Boolean(editingTemplate)}
          formData={formData}
          setField={setField}
          saving={saving}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

const ScheduleTemplateModal = ({
  isEditing,
  formData,
  setField,
  saving,
  onClose,
  onSave,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg">
          {isEditing ? "Edit Schedule" : "New Schedule"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-muted hover:text-fg"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Name
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="e.g. Day Shift (8-5)"
              value={formData.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Description (optional)
            </label>
            <input
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              value={formData.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-fg-subtle">Schedule type</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { value: false, title: "Fixed hours", hint: "Office staff: Time In / Time Out per day" },
              { value: true, title: "Trip-based", hint: "Drivers and helpers: work days only, paid per trip" },
            ].map((opt) => (
              <button
                key={opt.title}
                type="button"
                onClick={() => setField("is_trip_based", opt.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  formData.is_trip_based === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-surface-hover"
                }`}
              >
                <span className="block text-sm font-semibold text-fg">{opt.title}</span>
                <span className="block text-xs text-fg-subtle">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {formData.is_trip_based ? (
        <div>
          <p className="mb-2 text-xs font-medium text-fg-subtle">
            Tick the work days. Unticked days are rest days: a trip on a rest day
            is paid its rate plus 30% of the basic (allowance not included).
            Holidays get the holiday premium.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAYS.map((day) => {
              const short = DAY_SHORT[day.key];
              const on = formData.work_days.includes(short);
              return (
                <label
                  key={day.key}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-sm transition ${
                    on ? "border-primary bg-primary/10" : "border-border bg-surface-hover"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-fg">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setField(
                          "work_days",
                          on
                            ? formData.work_days.filter((d) => d !== short)
                            : [...formData.work_days, short],
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {day.label.slice(0, 3)}
                  </span>
                  <span className={`text-[11px] font-semibold ${on ? "text-primary" : "text-warning"}`}>
                    {on ? "Work" : "Rest"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        ) : (
        <div>
          <p className="mb-2 text-xs font-medium text-fg-subtle">
            Time In / Time Out per day -- leave both blank for a day off.
          </p>
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div
                key={day.key}
                className="grid grid-cols-3 items-center gap-2 rounded-xl border border-border bg-surface-hover p-2.5"
              >
                <span className="text-sm font-medium text-fg">
                  {day.label}
                </span>
                <input
                  type="time"
                  value={formData[`${day.key}_in`]}
                  onChange={(e) =>
                    setField(`${day.key}_in`, e.target.value)
                  }
                  className="rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <input
                  type="time"
                  value={formData[`${day.key}_out`]}
                  onChange={(e) =>
                    setField(`${day.key}_out`, e.target.value)
                  }
                  className="rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
);

// The name for employees with no work schedule (blank) -- drivers and
// helpers paid per trip, not on fixed work hours. Blank still works the
// same everywhere; this only names it in the 201, Work History and Payroll.
function NoScheduleLabelCard({ canEdit }) {
  const label = useNoScheduleLabel();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const value = draft ?? label;

  const save = async () => {
    try {
      setSaving(true);
      const res = await saveNoScheduleLabel(value.trim());
      setNoScheduleLabel(res.label);
      setDraft(null);
      toast.success(`Blank schedule is now shown as "${res.label}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">No work schedule</p>
        <p className="text-xs text-fg-subtle">
          Name shown when an employee&apos;s Work Schedule is left blank, e.g.
          drivers and helpers paid per trip and not on fixed work hours.
          Attendance and payroll treat it the same as before.
        </p>
      </div>
      {canEdit ? (
        <div className="flex shrink-0 items-center gap-2">
          <input
            id="no-schedule-label"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={50}
            placeholder="Per Trip"
            className="w-48 rounded-xl border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !value.trim() || value.trim() === label}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      ) : (
        <span className="rounded-full bg-surface-hover px-3 py-1 text-sm font-medium text-fg">
          {label}
        </span>
      )}
    </div>
  );
}
