import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import {
  getVehicleChecklist,
  saveVehicleChecklist,
} from "../../api/adminTripManagement/tripMaintenance";
import { CHECKLIST_SCHEMA } from "../../constants/vehicleChecklistSchema";

const emptySectionState = (section) => ({
  checked: false,
  items: Object.fromEntries(
    section.items.map((item) => [item.key, section.type === "checklist" ? false : ""]),
  ),
});

const buildEmptyState = () =>
  Object.fromEntries(
    CHECKLIST_SCHEMA.map((section) => [section.key, emptySectionState(section)]),
  );

// A section's children are considered "filled" once every item has a
// truthy value (checked, or a non-empty string).
const sectionIsComplete = (section, sectionState) =>
  section.items.every((item) => {
    const value = sectionState?.items?.[item.key];
    return section.type === "checklist" ? value === true : Boolean(value?.trim?.());
  });

export default function VehicleChecklistModal({ vehicleUnit, onClose }) {
  const [state, setState] = useState(buildEmptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vehicleUnit) return;

    const load = async () => {
      setLoading(true);
      try {
        const saved = await getVehicleChecklist(vehicleUnit.id);
        const merged = buildEmptyState();
        for (const section of CHECKLIST_SCHEMA) {
          const savedSection = saved?.[section.key];
          if (!savedSection) continue;
          merged[section.key] = {
            checked: Boolean(savedSection.checked),
            items: { ...merged[section.key].items, ...(savedSection.items || {}) },
          };
        }
        setState(merged);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load checklist.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vehicleUnit]);

  if (!vehicleUnit) return null;

  const toggleSection = (sectionKey) => {
    setState((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], checked: !prev[sectionKey].checked },
    }));
  };

  const setItemValue = (sectionKey, itemKey, value) => {
    setState((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: { ...prev[sectionKey].items, [itemKey]: value },
      },
    }));
  };

  const handleSave = async () => {
    for (const section of CHECKLIST_SCHEMA) {
      const sectionState = state[section.key];
      if (sectionState.checked && !sectionIsComplete(section, sectionState)) {
        toast.error(
          `"${section.title}" is checked but not all of its items are filled in yet.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      await saveVehicleChecklist(vehicleUnit.id, state);
      toast.success("Checklist saved.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.detail || "Failed to save checklist.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl text-fg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Vehicle Checklist</h2>
            <p className="text-xs text-fg-subtle">
              {vehicleUnit.unit_code || vehicleUnit.plate_number}
            </p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : (
            CHECKLIST_SCHEMA.map((section) => {
              const sectionState = state[section.key];
              return (
                <div
                  key={section.key}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  <label className="flex items-center gap-2 bg-surface-hover px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionState.checked}
                      onChange={() => toggleSection(section.key)}
                      className="h-4 w-4 rounded border-border"
                    />
                    {sectionState.checked ? (
                      <ChevronDown size={16} className="text-fg-muted" />
                    ) : (
                      <ChevronRight size={16} className="text-fg-muted" />
                    )}
                    <span className="text-sm font-bold text-fg">
                      {section.title}
                    </span>
                  </label>

                  {sectionState.checked && (
                    <div className="p-4 space-y-3">
                      {section.type === "checklist"
                        ? section.items.map((item) => (
                            <label
                              key={item.key}
                              className="flex items-center gap-2 text-sm text-fg-muted"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(sectionState.items[item.key])}
                                onChange={(e) =>
                                  setItemValue(
                                    section.key,
                                    item.key,
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 rounded border-border"
                              />
                              {item.label}
                            </label>
                          ))
                        : section.items.map((item) => (
                            <div key={item.key}>
                              <label className="block text-xs font-medium mb-1 text-fg-muted">
                                {item.label}
                              </label>
                              <input
                                type={item.inputType || "text"}
                                value={sectionState.items[item.key] || ""}
                                onChange={(e) =>
                                  setItemValue(
                                    section.key,
                                    item.key,
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg text-sm"
                              />
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-fg hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
