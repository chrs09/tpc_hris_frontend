// AddHolidayModal.jsx
import { useState } from "react";
import { createHoliday } from "../../api/holidays";

export default function AddHolidayModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    holiday_name: "",
    holiday_date: "",
    holiday_type: "special_non_working",
    scope: "national",
    province: "",
    city: "",
    remarks: "",
    // override_api: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createHoliday(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full text-sm text-fg bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors";
  const labelClass = "text-xs font-medium text-fg-subtle mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-surface rounded-2xl shadow-xl w-full max-w-md flex flex-col"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h3 className="text-lg font-semibold text-fg">Add Holiday</h3>
          <p className="text-sm text-fg-subtle mt-0.5">
            Manually add a holiday not covered by the API
          </p>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Holiday name</label>
            <input
              required
              placeholder="e.g. Founding Anniversary"
              value={form.holiday_name}
              onChange={(e) =>
                setForm({ ...form, holiday_name: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Date</label>
            <input
              required
              type="date"
              value={form.holiday_date}
              onChange={(e) =>
                setForm({ ...form, holiday_date: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={form.holiday_type}
                onChange={(e) =>
                  setForm({ ...form, holiday_type: e.target.value })
                }
                className={inputClass}
              >
                <option value="regular">Regular Holiday</option>
                <option value="special_non_working">Special Non-Working</option>
                <option value="special_working">Special Working</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className={inputClass}
              >
                <option value="national">National</option>
                <option value="local">Local</option>
              </select>
            </div>
          </div>

          {form.scope === "local" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Province</label>
                <input
                  placeholder="Cebu"
                  value={form.province}
                  onChange={(e) =>
                    setForm({ ...form, province: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  placeholder="Mandaue"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          )}


          <div>
            <label className={labelClass}>Remarks</label>
            <textarea
              placeholder="Optional notes"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-surface-hover rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-fg-muted px-4 py-2 rounded-lg hover:bg-surface-active transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-sm font-medium text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {saving ? "Saving…" : "Save Holiday"}
          </button>
        </div>
      </form>
    </div>
  );
}
