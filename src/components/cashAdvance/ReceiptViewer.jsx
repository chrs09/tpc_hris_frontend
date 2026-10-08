import { useEffect } from "react";
import { X } from "lucide-react";

// A cash advance's release receipt, shown in place (no new tab).
// Closes with ✕, a click outside, or Esc.
export default function ReceiptViewer({ request, onClose }) {
  useEffect(() => {
    if (!request) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, onClose]);

  if (!request?.release_receipt_url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <p className="font-semibold text-fg">Receipt · {request.employee_name}</p>
            <p className="text-xs text-fg-subtle">
              ₱{Number(request.approved_amount ?? request.amount).toLocaleString()}
              {request.release_reference ? ` · Ref: ${request.release_reference}` : ""}
              {request.released_at
                ? ` · Sent ${new Date(request.released_at).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-surface-hover p-4">
          <img
            src={request.release_receipt_url}
            alt={`Receipt for ${request.employee_name}`}
            className="max-h-[75vh] max-w-full rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  );
}
