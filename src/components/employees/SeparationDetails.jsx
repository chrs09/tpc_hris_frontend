import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Upload, X } from "lucide-react";
import {
  deleteSeparationDocument,
  getSeparationDetails,
  saveClearanceDate,
  uploadSeparationDocument,
} from "../../api/employee";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { confirmDialog } from "../ui/dialog/dialogService";

// 201 -> Inactive Employee Details: date clearance completed and the
// scanned resignation letter, clearance and waiver & quitclaim (images or
// PDF, several pages each). Saved on its own -- no need to Edit the 201.
// Backend: app/api/employees.py (/employees/{id}/separation).

const errorOf = (error) => error.response?.data?.detail || "Something went wrong.";
const isPdf = (url) => /\.pdf($|\?)/i.test(url || "");

export default function SeparationDetails({ employeeId }) {
  const canEdit = usePageCanEdit();
  const [data, setData] = useState(null);
  const [date, setDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const inputs = useRef({});

  const apply = (payload) => {
    setData(payload);
    setDate(payload.clearance_completed_date || "");
  };

  useEffect(() => {
    if (!employeeId) return;
    getSeparationDetails(employeeId)
      .then(apply)
      .catch((error) => setLoadError(errorOf(error)));
  }, [employeeId]);

  // e.g. deactivated before inactive records existed -- nothing to attach to.
  if (loadError) {
    return (
      <p className="text-xs text-fg-subtle md:col-span-2">
        Separation documents: {loadError} Set the employee active and inactive again
        (with the reason and date) to add them.
      </p>
    );
  }
  if (!data) return null;

  const saveDate = async () => {
    try {
      setSavingDate(true);
      apply(await saveClearanceDate(employeeId, date));
      toast.success(date ? "Clearance date saved." : "Clearance date cleared.");
    } catch (error) {
      toast.error(errorOf(error));
    } finally {
      setSavingDate(false);
    }
  };

  const upload = async (type, files) => {
    if (!files?.length) return;
    try {
      setUploadingType(type);
      let latest = null;
      for (const file of files) {
        latest = await uploadSeparationDocument(employeeId, type, file);
      }
      apply(latest);
      toast.success(files.length === 1 ? "Uploaded." : `${files.length} files uploaded.`);
    } catch (error) {
      toast.error(errorOf(error));
    } finally {
      setUploadingType(null);
      if (inputs.current[type]) inputs.current[type].value = "";
    }
  };

  const remove = async (doc, label) => {
    if (!(await confirmDialog(`Remove this ${label.toLowerCase()} file?`))) return;
    try {
      apply(await deleteSeparationDocument(employeeId, doc.id));
      toast.success("Removed.");
    } catch (error) {
      toast.error(errorOf(error));
    }
  };

  const dateChanged = (data.clearance_completed_date || "") !== date;
  const complete =
    !!data.clearance_completed_date &&
    data.document_types.every((t) => data.documents.some((d) => d.document_type === t.key));

  return (
    <div className="space-y-4 md:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-fg">Separation documents</h4>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            complete ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
          }`}
        >
          {complete ? "Complete" : "Incomplete"}
        </span>
      </div>

      {/* Date clearance completed */}
      <div>
        <p className="text-sm font-medium text-fg-muted">Date clearance completed</p>
        {canEdit ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              min={data.inactive_date || undefined}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
            />
            {dateChanged && (
              <button
                type="button"
                onClick={saveDate}
                disabled={savingDate}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {savingDate ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-1 text-fg">{data.clearance_completed_date || "--"}</p>
        )}
      </div>

      {/* Documents */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.document_types.map(({ key, label }) => {
          const docs = data.documents.filter((d) => d.document_type === key);
          return (
            <div key={key} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{label}</p>
                {canEdit && (
                  <>
                    <input
                      ref={(el) => (inputs.current[key] = el)}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => upload(key, Array.from(e.target.files || []))}
                    />
                    <button
                      type="button"
                      disabled={uploadingType === key}
                      onClick={() => inputs.current[key]?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-fg hover:bg-surface-hover disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {uploadingType === key ? "Uploading..." : "Upload"}
                    </button>
                  </>
                )}
              </div>
              {docs.length === 0 ? (
                <p className="mt-3 text-xs text-fg-subtle">Not uploaded yet.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {docs.map((doc, index) => (
                    <div key={doc.id} className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          isPdf(doc.file_url)
                            ? window.open(doc.file_url, "_blank", "noopener")
                            : setViewing({ ...doc, label, page: index + 1 })
                        }
                        title={`${label} ${index + 1}`}
                        className="block h-20 w-20 overflow-hidden rounded-lg border border-border bg-surface-hover hover:opacity-80"
                      >
                        {isPdf(doc.file_url) ? (
                          <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-fg-muted">
                            <FileText size={22} /> PDF
                          </span>
                        ) : (
                          <img src={doc.file_url} alt={label} className="h-full w-full object-cover" />
                        )}
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => remove(doc, label)}
                          aria-label="Remove"
                          className="absolute -right-1.5 -top-1.5 rounded-full bg-fg p-0.5 text-background shadow"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewing(null)}
        >
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewing(null)}
              aria-label="Close"
              className="absolute -right-3 -top-3 rounded-full bg-surface p-1.5 text-fg shadow"
            >
              <X size={16} />
            </button>
            <img src={viewing.file_url} alt={viewing.label} className="max-h-[85vh] rounded-lg" />
            <p className="mt-2 text-center text-sm text-white">
              {viewing.label} -- page {viewing.page}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
