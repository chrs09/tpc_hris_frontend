import { useState } from "react";
import ImageViewer from "../ui/ImageViewer";

// The time in / time out proof photos of a time correction (if any), as
// small thumbnails that open in a zoomable viewer.
export default function CorrectionPhotos({ item, className = "" }) {
  const [open, setOpen] = useState(null);
  const photos = [
    ["Time in", item.time_in_photo_url],
    ["Time out", item.time_out_photo_url],
  ].filter(([, url]) => url);
  if (!photos.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {photos.map(([label, url]) => (
        <button
          key={label}
          type="button"
          onClick={() => setOpen({ label, url })}
          className="text-center"
          aria-label={`View ${label.toLowerCase()} proof`}
        >
          <img
            src={url}
            alt={`${label} proof`}
            className="h-16 w-16 rounded-lg border border-border object-cover hover:opacity-80"
          />
          <span className="mt-0.5 block text-[10px] text-fg-subtle">{label}</span>
        </button>
      ))}
      {open && (
        <ImageViewer
          src={open.url}
          alt={`${open.label} proof`}
          title={`${item.employee_name ? `${item.employee_name} · ` : ""}${open.label} proof${
            item.date_label ? ` · ${item.date_label}` : ""
          }`}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
