import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, RefreshCw, X } from "lucide-react";

// Shared image upload tile (Trip Manual Entries, Trip Bypass).
// Photo upload tile: dashed "Add photo" box, or once picked a thumbnail
// with the file name plus Replace / Remove. Controlled by `file`.
export default function PhotoPicker({ file, onChange, compact = false }) {
  const inputRef = useRef(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const pick = () => inputRef.current?.click();

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const chosen = e.target.files?.[0] || null;
        e.target.value = "";
        if (chosen) onChange(chosen);
      }}
    />
  );

  if (!file) {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={pick}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-background text-fg-subtle transition hover:border-primary hover:bg-primary/5 hover:text-primary ${
            compact ? "h-12 flex-row gap-2" : "h-24"
          }`}
        >
          <ImagePlus size={compact ? 16 : 22} />
          <span className="text-xs font-medium">Add photo</span>
        </button>
      </>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-border bg-background p-2 ${
        compact ? "h-12" : "h-24"
      }`}
    >
      {input}
      {preview && (
        <img
          src={preview}
          alt=""
          className={`shrink-0 rounded-lg object-cover ${
            compact ? "h-8 w-8" : "h-20 w-20"
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-fg" title={file.name}>
          {file.name}
        </p>
        {!compact && (
          <p className="text-[11px] text-fg-subtle">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={pick}
        title="Replace photo"
        aria-label="Replace photo"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-primary"
      >
        <RefreshCw size={13} />
      </button>
      <button
        type="button"
        onClick={() => onChange(null)}
        title="Remove photo"
        aria-label="Remove photo"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted hover:border-danger hover:text-danger"
      >
        <X size={13} />
      </button>
    </div>
  );
}
