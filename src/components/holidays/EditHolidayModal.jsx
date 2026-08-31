import { useEffect, useState } from "react";
import { updateHoliday } from "../../api/holidays";

export default function EditHolidayModal({
  holiday,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    holiday_name: "",
    holiday_date: "",
    holiday_type: "special_non_working",
    scope: "national",
    province: "",
    city: "",
    remarks: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!holiday) return;

    setForm({
      holiday_name: holiday.holiday_name || "",
      holiday_date: holiday.holiday_date || "",
      holiday_type: holiday.holiday_type || "special_non_working",
      scope: holiday.scope || "national",
      province: holiday.province || "",
      city: holiday.city || "",
      remarks: holiday.remarks || "",
    });
  }, [holiday]);

  const submit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      await updateHoliday(holiday.id, form);
      onSaved();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update holiday"
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors";

  const labelClass =
    "text-xs font-medium text-slate-500 mb-1 block";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            Edit Holiday
          </h3>

          <p className="text-sm text-slate-400 mt-0.5">
            Update the existing holiday
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Holiday name */}
          <div>
            <label className={labelClass}>
              Holiday name
            </label>

            <input
              required
              value={form.holiday_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  holiday_name: e.target.value,
                })
              }
              className={inputClass}
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>
              Date
            </label>

            <input
              required
              type="date"
              value={form.holiday_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  holiday_date: e.target.value,
                })
              }
              className={inputClass}
            />
          </div>

          {/* Type + Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Type
              </label>

              <select
                value={form.holiday_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    holiday_type: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="regular">
                  Regular Holiday
                </option>

                <option value="special_non_working">
                  Special Non-Working
                </option>

                <option value="special_working">
                  Special Working
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Scope
              </label>

              <select
                value={form.scope}
                onChange={(e) =>
                  setForm({
                    ...form,
                    scope: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="national">
                  National
                </option>

                <option value="local">
                  Local
                </option>
              </select>
            </div>
          </div>

          {/* Local details */}
          {form.scope === "local" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Province
                </label>

                <input
                  placeholder="Cebu"
                  value={form.province}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      province: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  City
                </label>

                <input
                  placeholder="Mandaue"
                  value={form.city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      city: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* API override information */}
          {holiday.source === "api" && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              This holiday came from the API. Saving changes will
              convert it into a manual override so future API syncs
              will not overwrite your changes.
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className={labelClass}>
              Remarks
            </label>

            <textarea
              placeholder="Optional notes"
              rows={2}
              value={form.remarks}
              onChange={(e) =>
                setForm({
                  ...form,
                  remarks: e.target.value,
                })
              }
              className={inputClass}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="text-sm font-medium text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}