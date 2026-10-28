import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FileText, Upload, X } from "lucide-react";
import {
  deleteVehicleChecklistFile,
  getVehicleChecklist,
  uploadVehicleChecklistFile,
} from "../../api/adminTripManagement/tripMaintenance";
import { CHECKLIST_SCHEMA } from "../../constants/vehicleChecklistSchema";
import { confirmDialog } from "../ui/dialog/dialogService";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";

// Edit Vehicle Unit -> one upload per document ticked in the Vehicle
// Checklist (e.g. Deed of Sale under Documentation). Files upload right
// away -- they don't wait for the form's Save. Unticked items aren't
// listed (their file, if any, is kept).
export default function ChecklistDocuments({ vehicleUnitId }) {
  const [checklist, setChecklist] = useState(null);
  const [busy, setBusy] = useState(null); // "section.item" being uploaded / removed

  useEffect(() => {
    if (!vehicleUnitId) return;
    let cancelled = false;
    getVehicleChecklist(vehicleUnitId)
      .then((data) => !cancelled && setChecklist(data || {}))
      .catch(() => !cancelled && setChecklist({}));
    return () => {
      cancelled = true;
    };
  }, [vehicleUnitId]);

  if (!vehicleUnitId) return null;

  const groups = CHECKLIST_SCHEMA.filter((section) => section.type === "checklist")
    .map((section) => {
      const saved = checklist?.[section.key];
      const items = saved?.checked
        ? section.items.filter((item) => saved.items?.[item.key] === true)
        : [];
      return { section, items, files: saved?.files || {} };
    })
    .filter((group) => group.items.length > 0);

  const setFile = (sectionKey, itemKey, entry) =>
    setChecklist((prev) => {
      const sec = prev?.[sectionKey] || { checked: true, items: {} };
      const files = { ...(sec.files || {}) };
      if (entry) files[itemKey] = entry;
      else delete files[itemKey];
      return { ...prev, [sectionKey]: { ...sec, files } };
    });

  const upload = async (sectionKey, itemKey, file) => {
    if (!file) return;
    setBusy(`${sectionKey}.${itemKey}`);
    try {
      const entry = await uploadVehicleChecklistFile(vehicleUnitId, sectionKey, itemKey, file);
      setFile(sectionKey, itemKey, entry);
      toast.success("Document uploaded.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload document.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (sectionKey, item) => {
    if (!(await confirmDialog(`Remove the file for "${item.label}"?`))) return;
    setBusy(`${sectionKey}.${item.key}`);
    try {
      await deleteVehicleChecklistFile(vehicleUnitId, sectionKey, item.key);
      setFile(sectionKey, item.key, null);
      toast.success("Document removed.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove document.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm font-semibold text-fg">Checklist Documents</p>
      <p className="mb-3 text-xs text-fg-subtle">
        A file for each document ticked in the Vehicle Checklist. Uploads save
        right away. PNG, JPEG, WEBP, or PDF.
      </p>

      {checklist === null ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-fg-subtle">
          Nothing ticked yet — tick the documents on hand in the Vehicle
          Checklist first, then upload them here.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(({ section, items, files }) => (
            <div key={section.key}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">
                {section.title}
              </p>
              <div className="space-y-2">
                {items.map((item) => {
                  const file = files[item.key];
                  const isBusy = busy === `${section.key}.${item.key}`;
                  return (
                    <div
                      key={item.key}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-hover px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-fg">{item.label}</p>
                        {file ? (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                            title={file.uploaded_by ? `Uploaded by ${file.uploaded_by}` : undefined}
                          >
                            <FileText size={12} />
                            <span className="truncate">{file.name || "View document"}</span>
                          </a>
                        ) : (
                          <p className="text-xs text-warning">No file yet</p>
                        )}
                      </div>
                      <label
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          file
                            ? "border border-border text-fg hover:bg-surface"
                            : "bg-primary text-primary-foreground hover:bg-primary-hover"
                        } ${isBusy ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <Upload size={12} />
                        {isBusy ? "Saving..." : file ? "Replace" : "Upload"}
                        <input
                          type="file"
                          accept={ACCEPT}
                          className="hidden"
                          disabled={isBusy}
                          onChange={(e) => {
                            upload(section.key, item.key, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {file && (
                        <button
                          type="button"
                          onClick={() => remove(section.key, item)}
                          disabled={isBusy}
                          title="Remove file"
                          className="rounded-lg p-1.5 text-fg-muted hover:bg-surface hover:text-danger disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
