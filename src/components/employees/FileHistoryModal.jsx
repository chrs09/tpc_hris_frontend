import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getEmployeeFileHistory } from "../../api/employee";

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  return filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_API_URL}/${filePath}`;
};

const isImageUrl = (url) => /\.(png|jpe?g|webp)$/i.test(url || "");

// Employment Files: every upload of one document type, newest first.
// Click an entry to preview it full size.
export default function FileHistoryModal({
  employeeId,
  documentType,
  label,
  onClose,
  onPreview,
}) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getEmployeeFileHistory(employeeId, documentType)
      .then((data) => alive && setItems(data?.items || []))
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.detail || "Could not load the history.");
        setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [employeeId, documentType]);

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-fg">{label}</h3>
            <p className="text-xs text-fg-subtle">Upload history</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items === null ? (
            <p className="py-8 text-center text-sm text-fg-subtle">Loading...</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-danger">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-subtle">
              No files uploaded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const url = getFileUrl(item.file_url);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onPreview(url)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border p-2 text-left transition hover:bg-surface-hover"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-hover">
                        {isImageUrl(item.file_url) ? (
                          <img src={url} alt={label} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-danger">
                            {item.file_url?.toLowerCase().endsWith(".pdf") ? "PDF" : "File"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg">
                          {item.uploaded_at
                            ? new Date(item.uploaded_at).toLocaleString()
                            : "Unknown date"}
                        </p>
                        <p className="truncate text-xs text-fg-muted">
                          By {item.uploaded_by || "—"}
                        </p>
                      </div>
                      {item.is_current && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Current
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
