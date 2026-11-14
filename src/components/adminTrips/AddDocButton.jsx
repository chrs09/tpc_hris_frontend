import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { addTripFiles } from "../../api/adminTripManagement/trips";

// Correcting a trip's documents the way the driver uploads them: "+ Page"
// adds Invoice / LM pages (several at once), "Upload" fills in a photo the
// driver never sent (stamped LM, stamped invoice, a stop's unloading / POD).
// See add_trip_files in app/api/admin/trips.py.
export default function AddDocButton({
  tripId,
  documentType,
  stopId = null,
  multiple = false,
  label,
  onDone,
  className = "",
}) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const onPicked = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    try {
      setBusy(true);
      const res = await addTripFiles(tripId, documentType, files, stopId);
      toast.success(res.data?.message || "Uploaded.");
      await onDone?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={onPicked}
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        title={multiple ? "Add pages (you can pick several)" : "Upload the missing photo"}
        className={`rounded-lg border border-dashed border-primary/60 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50 ${className}`}
      >
        {busy ? "Uploading..." : label}
      </button>
    </>
  );
}
