import React from "react";

// Read-only list of remarks added to a trip after approval (text and/or
// an image) -- the coordinator adds them in Trip Approvals once the
// trip's photos are locked; Office and Finance see them here.
// onOpenImage(url) opens the image in the screen's own photo viewer.
export default function TripRemarksList({ remarks = [], onOpenImage }) {
  if (!remarks.length) return null;

  return (
    <section className="rounded-xl border border-border p-4">
      <p className="font-semibold text-fg">Remarks Added After Approval</p>
      <p className="mt-1 text-xs text-fg-muted">
        Corrections or extra proof added by the coordinator. The original
        photos above are unchanged.
      </p>

      <ul className="mt-3 space-y-2">
        {remarks.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border bg-surface p-3 text-sm"
          >
            <p className="text-xs text-fg-subtle">
              {item.created_by || "-"}
              {item.created_at ? ` · ${item.created_at}` : ""}
            </p>
            {item.text && (
              <p className="mt-1 whitespace-pre-wrap text-fg">{item.text}</p>
            )}
            {item.image_url && (
              <button
                type="button"
                onClick={() => onOpenImage?.(item.image_url)}
                className="mt-2 block"
              >
                <img
                  src={item.image_url}
                  alt="Remark attachment"
                  className="h-24 w-24 rounded-lg border border-border object-cover"
                />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
