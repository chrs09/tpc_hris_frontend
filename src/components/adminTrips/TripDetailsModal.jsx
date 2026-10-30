import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { reviewTrip } from "../../api/adminTripManagement/trips";

// Trip Dashboard -> Trip Approval Status -> View: one trip's details at any
// status, read-only -- helpers, Invoice / LM pages, stops and their photos,
// remarks. Same data the approval screens review.

// Rebuilds a localhost URL with the current API base; a relative path gets
// the base added (same as the approval screens).
const resolvePhotoUrl = (rawUrl) => {
  if (!rawUrl) return "";
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${apiBaseUrl}${parsed.pathname}`;
    }
    return rawUrl;
  } catch {
    return `${apiBaseUrl}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  }
};

const Detail = ({ label, children }) => (
  <div>
    <p className="text-xs text-fg-subtle">{label}</p>
    <div className="text-sm font-medium text-fg">{children || "-"}</div>
  </div>
);

const Section = ({ title, children }) => (
  <section>
    <h3 className="mb-2 text-sm font-semibold text-fg">{title}</h3>
    {children}
  </section>
);

const PhotoButton = ({ label, photo, onOpen }) =>
  photo?.url ? (
    <button
      type="button"
      onClick={() => onOpen({ url: resolvePhotoUrl(photo.url), label })}
      className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
    >
      {label}
    </button>
  ) : null;

// One document's pages: "LM  [Page 1] [Page 2]", or "No photo".
const PhotoRow = ({ label, photos, onOpen }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
    <span className="text-sm text-fg-muted">{label}</span>
    {photos.length ? (
      <div className="flex flex-wrap justify-end gap-1.5">
        {photos.map((photo, index) => (
          <PhotoButton
            key={photo.id}
            label={photos.length > 1 ? `Page ${index + 1}` : "View"}
            photo={photo}
            onOpen={(p) => onOpen({ ...p, label: photos.length > 1 ? `${label} - Page ${index + 1}` : label })}
          />
        ))}
      </div>
    ) : (
      <span className="text-xs text-fg-subtle">No photo</span>
    )}
  </div>
);

export default function TripDetailsModal({ trip, onClose }) {
  const [details, setDetails] = useState(null);
  const [failed, setFailed] = useState(false);
  const [photo, setPhoto] = useState(null); // { url, label } | null

  useEffect(() => {
    let cancelled = false;
    reviewTrip(trip.id)
      .then((res) => !cancelled && setDetails(res.data))
      .catch((err) => {
        if (cancelled) return;
        setFailed(true);
        toast.error(err.response?.data?.detail || "Failed to load trip details.");
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const driverName = details
    ? `${details.driver_first_name} ${details.driver_last_name}`.trim()
    : trip.driver_name;
  const helpers = details?.helpers || [];
  const remarks = [
    ...(details?.bypass_remarks || []).map((r) => ({
      key: `b-${r.id}`,
      title: r.action_label,
      text: r.reason,
      by: r.performed_by,
      at: r.created_at,
    })),
    ...(details?.added_remarks || []).map((r) => ({
      key: `r-${r.id}`,
      title: "Remark",
      text: r.text,
      by: r.created_by,
      at: r.created_at,
      image: r.image_url,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold uppercase">{trip.trip_code || `Trip #${trip.id}`}</h2>
            <p className="text-xs text-fg-subtle">{trip.status_label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-fg-subtle hover:bg-surface-hover hover:text-fg"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {failed ? (
            <p className="text-sm text-fg-subtle">Couldn&apos;t load this trip&apos;s details.</p>
          ) : !details ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : (
            <>
              {details.return_reason && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  Sent back by Office: {details.return_reason}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Detail label="Driver">{driverName}</Detail>
                {trip.route_rider_names?.length > 0 && (
                  <Detail label="Route Rider">{trip.route_rider_names.join(", ")}</Detail>
                )}
                <Detail label="Shipment No.">{details.ticket_no}</Detail>
                <Detail label="Vehicle">
                  {details.vehicle
                    ? [details.vehicle.unit_code, details.vehicle.plate_number].filter(Boolean).join(" · ")
                    : null}
                </Detail>
                <Detail label="Trip Category">{details.trip_rate_profile?.profile_name}</Detail>
                <Detail label="Origin">{details.origin_store}</Detail>
                <Detail label="Started">{details.start_time}</Detail>
                <Detail label="Finished">{details.end_time}</Detail>
              </div>

              <Section title={`Helpers (${helpers.length})`}>
                {helpers.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {helpers.map((helper) => (
                      <span
                        key={helper.id}
                        className="rounded-full bg-surface-active px-2.5 py-0.5 text-xs font-medium"
                      >
                        {helper.first_name} {helper.last_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-fg-subtle">No helpers on this trip.</p>
                )}
              </Section>

              <Section title="Documents">
                <div className="divide-y divide-border rounded-xl border border-border px-3">
                  <PhotoRow label="Invoice" photos={details.invoice_photos || []} onOpen={setPhoto} />
                  <PhotoRow label="LM" photos={details.lm_photos || []} onOpen={setPhoto} />
                  <PhotoRow
                    label="Stamped LM (checkout)"
                    photos={details.lm_checkout_stamped_photo ? [details.lm_checkout_stamped_photo] : []}
                    onOpen={setPhoto}
                  />
                  <PhotoRow
                    label="Stamped Invoice"
                    photos={details.stamped_invoice_photo ? [details.stamped_invoice_photo] : []}
                    onOpen={setPhoto}
                  />
                </div>
              </Section>

              <Section title={`Stops (${(details.stops || []).length})`}>
                {details.stops?.length ? (
                  <div className="space-y-2">
                    {details.stops.map((stop, index) => (
                      <div key={stop.id} className="rounded-xl border border-border p-3">
                        <p className="text-sm font-medium">
                          <span className="text-xs text-fg-subtle">{index + 1}.</span> {stop.store_name}
                        </p>
                        {stop.shipment_numbers?.length > 0 && (
                          <p className="text-xs text-fg-subtle">Shipment: {stop.shipment_numbers.join(", ")}</p>
                        )}
                        <p className="mt-1 text-xs text-fg-muted">
                          In: {stop.check_in_time || "-"} · Out: {stop.check_out_time || "-"}
                        </p>
                        {(stop.unloading_photo || stop.delivery_proof_photo) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <PhotoButton
                              label="Unloading"
                              photo={stop.unloading_photo}
                              onOpen={(p) => setPhoto({ ...p, label: `${stop.store_name} - Unloading` })}
                            />
                            <PhotoButton
                              label="Proof of Delivery"
                              photo={stop.delivery_proof_photo}
                              onOpen={(p) => setPhoto({ ...p, label: `${stop.store_name} - Proof of Delivery` })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-fg-subtle">No stops recorded.</p>
                )}
              </Section>

              {remarks.length > 0 && (
                <Section title="Remarks">
                  <ul className="space-y-2">
                    {remarks.map((r) => (
                      <li key={r.key} className="rounded-xl border border-border p-3 text-sm">
                        <p className="font-medium">{r.title}</p>
                        {r.text && <p className="text-fg-muted">{r.text}</p>}
                        <p className="mt-1 text-xs text-fg-subtle">
                          {[r.by, r.at].filter(Boolean).join(" · ")}
                        </p>
                        {r.image && (
                          <div className="mt-2">
                            <PhotoButton label="View image" photo={{ url: r.image }} onOpen={setPhoto} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Close
          </button>
        </div>
      </div>

      {photo && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/85 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setPhoto(null)}
        >
          <div className="mb-3 flex items-center justify-between gap-3 text-white">
            <p className="truncate text-sm font-semibold">{photo.label}</p>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
              >
                Open full size
              </a>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                aria-label="Close photo"
                className="rounded-lg px-2 py-1 text-xl leading-none hover:bg-white/10"
              >
                &times;
              </button>
            </div>
          </div>
          <div
            className="flex min-h-0 flex-1 items-center justify-center"
            onMouseDown={(e) => e.target === e.currentTarget && setPhoto(null)}
          >
            <img src={photo.url} alt={photo.label} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
