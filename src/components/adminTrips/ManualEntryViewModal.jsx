import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { getManualEntry } from "../../api/tripManualEntries";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// Read-only view of one Trip Manual Entry: trip details, stores with
// times and delivery photos, trip photos, reason and approval history.
// A superadmin sees Approve / Reject while the entry is still waiting
// (onApprove / onReject come from the page, which owns those actions).
export default function ManualEntryViewModal({
  tripId,
  canDecide,
  deciding,
  onApprove,
  onReject,
  onClose,
  refreshKey,
}) {
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState(null);
  const [zoomUrl, setZoomUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getManualEntry(tripId)
      .then((data) => {
        if (!cancelled) setEntry(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
        toast.error(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, refreshKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Trip Manual Entry
            </p>
            <h2 className="text-lg font-bold">
              {entry ? `${entry.trip_code} · ${entry.driver_name || "-"}` : "Loading..."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          {!entry && !error && (
            <p className="py-8 text-center text-sm text-fg-subtle">Loading...</p>
          )}

          {entry && (
            <>
              {entry.awaiting_approval && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-fg">
                  Waiting for superadmin approval -- not yet in Trip
                  Approvals or payroll.
                </div>
              )}
              {entry.decision && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    entry.decision.approved
                      ? "border-success/30 bg-success/10"
                      : "border-danger/30 bg-danger/10"
                  }`}
                >
                  <p className="font-semibold">
                    {entry.decision.approved ? "Approved" : "Rejected"} by{" "}
                    {entry.decision.by || "-"} · {entry.decision.at}
                  </p>
                  {entry.decision.reason && (
                    <p className="mt-1 whitespace-pre-wrap text-fg-muted">
                      {entry.decision.reason}
                    </p>
                  )}
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-surface-hover p-4 text-sm md:grid-cols-3">
                <Info label="Driver" value={entry.driver_name} />
                <Info label="Vehicle" value={entry.vehicle} />
                <Info label="Origin hub" value={entry.origin} />
                <Info label="Checkout" value={entry.start_time} />
                <Info label="Checkin" value={entry.end_time} />
                <Info label="Trip category" value={entry.trip_category} />
                <Info
                  label="Shipment number(s)"
                  value={entry.shipment_numbers?.join(", ")}
                />
                <Info
                  label="Helpers"
                  value={entry.helpers?.length ? entry.helpers.join(", ") : "None"}
                />
                <Info
                  label="Odometer"
                  value={entry.odometer_reading ? entry.odometer_reading : "-"}
                />
              </dl>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Stores</h3>
                <ol className="space-y-2">
                  {entry.stops.map((stop, index) => (
                    <li
                      key={`${stop.store_name}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-active text-xs font-semibold text-fg-muted">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">{stop.store_name}</p>
                        <p className="text-xs text-fg-subtle">
                          Arrived {stop.arrived_at || "-"} · Delivered{" "}
                          {stop.delivered_at || "-"}
                        </p>
                      </div>
                      {stop.pod_url ? (
                        <Thumb
                          url={stop.pod_url}
                          label="Delivery proof"
                          onOpen={setZoomUrl}
                        />
                      ) : (
                        <span className="text-xs text-fg-subtle">No photo</span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Photos</h3>
                {entry.photos.length === 0 ? (
                  <p className="text-xs text-fg-subtle">No photos uploaded.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {entry.photos.map((photo) => (
                      <div key={photo.url} className="w-28">
                        <Thumb
                          url={photo.url}
                          label={photo.label}
                          onOpen={setZoomUrl}
                          large
                        />
                        <p className="mt-1 truncate text-[11px] text-fg-subtle">
                          {photo.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Reason
                </p>
                <p className="mt-1 whitespace-pre-wrap">{entry.reason || "-"}</p>
                <p className="mt-2 text-xs text-fg-subtle">
                  Entered by {entry.entered_by || "-"} · {entry.entered_at}
                </p>
              </section>
            </>
          )}
        </div>

        {entry?.awaiting_approval && canDecide && (
          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              disabled={deciding}
              onClick={() => onReject(entry)}
              className="flex-1 rounded-xl border border-danger/30 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={deciding}
              onClick={() => onApprove(entry)}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        )}
      </div>

      {zoomUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4"
          onMouseDown={() => setZoomUrl(null)}
        >
          <img
            src={zoomUrl}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

const Info = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-fg-subtle">{label}</dt>
    <dd className="mt-0.5 break-words font-medium">{value || "-"}</dd>
  </div>
);

const Thumb = ({ url, label, onOpen, large = false }) => (
  <button
    type="button"
    onClick={() => onOpen(url)}
    title={`View ${label}`}
    className="block shrink-0"
  >
    <img
      src={url}
      alt={label}
      className={`rounded-lg border border-border object-cover hover:opacity-90 ${
        large ? "h-28 w-28" : "h-12 w-12"
      }`}
    />
  </button>
);
