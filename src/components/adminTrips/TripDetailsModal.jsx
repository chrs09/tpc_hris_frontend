import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Pencil } from "lucide-react";
import { editShipmentNumbers, markTripFixed, reviewTrip } from "../../api/adminTripManagement/trips";
import AddDocButton from "./AddDocButton";

// Trip Dashboard -> Trip Approval Status -> View: one trip's details at any
// status, read-only -- helpers, Invoice / LM pages, stops and their photos,
// remarks. Same data the approval screens review.
//
// fixMode (Trip Dashboard -> Trips to fix): a coordinator handed this
// returned trip can add missing pages / photos and mark it fixed. Photos
// already attached can't be replaced or removed here.

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
// Fix mode adds `add` (the "+ Page" / "Upload" button).
const PhotoRow = ({ label, photos, onOpen, add }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
    <span className="text-sm text-fg-muted">{label}</span>
    {photos.length ? (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {photos.map((photo, index) => (
          <PhotoButton
            key={photo.id}
            label={photos.length > 1 ? `Page ${index + 1}` : "View"}
            photo={photo}
            onOpen={(p) => onOpen({ ...p, label: photos.length > 1 ? `${label} - Page ${index + 1}` : label })}
          />
        ))}
        {add}
      </div>
    ) : (
      add || <span className="text-xs text-fg-subtle">No photo</span>
    )}
  </div>
);

const isSuperAdmin = () => {
  try {
    return localStorage.getItem("role") === "superadmin";
  } catch {
    return false;
  }
};

// Superadmin: edit the shipment number(s) in place. Only the numbers
// change -- the trip itself (stops, photos, pay, approval) stays as it is.
function ShipmentEditor({ tripId, numbers, onSaved, onCancel }) {
  const [values, setValues] = useState(numbers);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const changed = values.some((v, i) => v.trim() !== numbers[i]);
  const bad = values.find((v) => !/^\d{8}$/.test(v.trim()));

  const save = async () => {
    if (bad !== undefined) {
      toast.error("Shipment numbers must be exactly 8 digits.");
      return;
    }
    try {
      setSaving(true);
      await editShipmentNumbers(tripId, values.map((v) => v.trim()), reason.trim());
      toast.success("Shipment number updated.");
      await onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Couldn't update the shipment number.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <input
          key={i}
          value={v}
          inputMode="numeric"
          maxLength={8}
          onChange={(e) => setValues((prev) => prev.map((x, j) => (j === i ? e.target.value.replace(/\D/g, "") : x)))}
          aria-label={`Shipment number ${i + 1}`}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      ))}
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={saving || !changed || !reason.trim()}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-fg-muted hover:bg-surface-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Each current shipment number; one a superadmin corrected reads
// "old -> new" (traced back to the number first entered), with who / when
// / why on hover.
function ShipmentNumbers({ ticketNo, edits = [] }) {
  if (!ticketNo) return "-";
  const previous = {};
  const lastEdit = {};
  edits.forEach((e) => {
    previous[e.new] = e.old;
    lastEdit[e.new] = e;
  });
  const original = (n) => {
    let cur = n;
    const seen = new Set();
    while (previous[cur] && !seen.has(cur)) {
      seen.add(cur);
      cur = previous[cur];
    }
    return cur;
  };
  const numbers = ticketNo.split(", ");
  return numbers.map((n, i) => {
    const first = original(n);
    const edit = lastEdit[n];
    return (
      <span key={n} className="whitespace-nowrap">
        {first !== n ? (
          <span
            title={edit ? `Edited by ${edit.by || "superadmin"} · ${edit.at || ""}${edit.reason ? ` · ${edit.reason}` : ""}` : undefined}
          >
            <span className="text-fg-subtle line-through">{first}</span>
            <span className="mx-1 text-fg-subtle">→</span>
            <span className="text-primary">{n}</span>
          </span>
        ) : (
          n
        )}
        {i < numbers.length - 1 ? ", " : ""}
      </span>
    );
  });
}

export default function TripDetailsModal({ trip, onClose, fixMode = false, onFixed, onUpdated }) {
  const [details, setDetails] = useState(null);
  const [editingShipment, setEditingShipment] = useState(false);
  const [failed, setFailed] = useState(false);
  // Fix mode: how many documents were added, the note, saving.
  const [replacedCount, setReplacedCount] = useState(0);
  const [fixNote, setFixNote] = useState("");
  const [savingFix, setSavingFix] = useState(false);

  const reload = async () => {
    const res = await reviewTrip(trip.id);
    setDetails(res.data);
  };

  const markFixed = async () => {
    try {
      setSavingFix(true);
      await markTripFixed(trip.id, fixNote.trim());
      toast.success("Marked fixed. It's back in Trip Approvals.");
      await onFixed?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark it fixed.");
    } finally {
      setSavingFix(false);
    }
  };
  const onDocAdded = async () => {
    setReplacedCount((n) => n + 1);
    await reload();
  };
  // "+ Page" / "Upload" buttons, only in fix mode.
  const addBtn = (documentType, label, extra = {}) =>
    fixMode ? (
      <AddDocButton tripId={trip.id} documentType={documentType} label={label} onDone={onDocAdded} {...extra} />
    ) : null;
  const [photo, setPhoto] = useState(null); // { url, label } | null
  const [photoZoom, setPhotoZoom] = useState(1);

  // Always starts at 100%, so one photo's zoom doesn't carry to the next.
  const openPhoto = (next) => {
    setPhotoZoom(1);
    setPhoto(next);
  };

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
              {fixMode && details.resolver_note && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                  <p className="font-semibold text-warning">
                    To fix · from {details.resolver_assigned_by || "coordinator admin"}
                  </p>
                  <p className="whitespace-pre-wrap text-fg">{details.resolver_note}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Add the missing Invoice / LM pages (+ Page) or photos, then mark it fixed.
                    Photos already attached can&apos;t be replaced or removed.
                  </p>
                </div>
              )}
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
                <Detail label="Shipment No.">
                  {editingShipment ? (
                    <ShipmentEditor
                      tripId={trip.id}
                      numbers={(details.ticket_no || "").split(", ")}
                      onCancel={() => setEditingShipment(false)}
                      onSaved={async () => {
                        setEditingShipment(false);
                        await reload();
                        onUpdated?.();
                      }}
                    />
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <ShipmentNumbers ticketNo={details.ticket_no} edits={details.shipment_edits} />
                      {isSuperAdmin() &&
                        details.ticket_no &&
                        !details.ticket_no.includes("(cancelled") &&
                        !(trip.trip_code || details.trip_code || "").startsWith("ST-") && (
                          <button
                            type="button"
                            onClick={() => setEditingShipment(true)}
                            title="Edit shipment number (superadmin)"
                            aria-label="Edit shipment number"
                            className="rounded p-0.5 text-fg-subtle hover:bg-surface-hover hover:text-primary"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                    </span>
                  )}
                </Detail>
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
                  <PhotoRow
                    label="Invoice"
                    photos={details.invoice_photos || []}
                    onOpen={openPhoto}
                    add={addBtn("INVOICE_PHOTO", (details.invoice_photos || []).length ? "+ Page" : "Upload pages", { multiple: true })}
                  />
                  <PhotoRow
                    label="LM"
                    photos={details.lm_photos || []}
                    onOpen={openPhoto}
                    add={addBtn("LM_MANIFEST_PHOTO", (details.lm_photos || []).length ? "+ Page" : "Upload pages", { multiple: true })}
                  />
                  <PhotoRow
                    label="Stamped LM (checkout)"
                    photos={details.lm_checkout_stamped_photo ? [details.lm_checkout_stamped_photo] : []}
                    onOpen={openPhoto}
                    add={details.lm_checkout_stamped_photo ? null : addBtn("LM_CHECKOUT_STAMPED_PHOTO", "Upload")}
                  />
                  <PhotoRow
                    label="Stamped Invoice"
                    photos={details.stamped_invoice_photo ? [details.stamped_invoice_photo] : []}
                    onOpen={openPhoto}
                    add={details.stamped_invoice_photo ? null : addBtn("STAMPED_INVOICE_PHOTO", "Upload")}
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
                        {(stop.unloading_photo || stop.delivery_proof_photo || fixMode) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <PhotoButton
                              label="Unloading"
                              photo={stop.unloading_photo}
                              onOpen={(p) => openPhoto({ ...p, label: `${stop.store_name} - Unloading` })}
                            />
                            {!stop.unloading_photo &&
                              stop.id &&
                              addBtn("UNLOADING_PHOTO", "Upload unloading", { stopId: stop.id })}
                            <PhotoButton
                              label="Proof of Delivery"
                              photo={stop.delivery_proof_photo}
                              onOpen={(p) => openPhoto({ ...p, label: `${stop.store_name} - Proof of Delivery` })}
                            />
                            {!stop.delivery_proof_photo &&
                              stop.id &&
                              addBtn("DELIVERY_PROOF_PHOTO", "Upload POD", { stopId: stop.id })}
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
                            <PhotoButton label="View image" photo={{ url: r.image }} onOpen={openPhoto} />
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

        {fixMode && details && (
          <div className="space-y-2 border-t border-border px-5 py-3">
            <label htmlFor="fix-done-note" className="block text-xs font-medium text-fg-muted">
              What did you fix? (optional)
            </label>
            <textarea
              id="fix-done-note"
              value={fixNote}
              onChange={(e) => setFixNote(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="e.g. Uploaded the complete LM (2 pages)."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-fg"
            />
            {replacedCount === 0 && (
              <p className="text-xs text-fg-subtle">You haven&apos;t added any document yet.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Close
          </button>
          {fixMode && details && (
            <button
              type="button"
              onClick={markFixed}
              disabled={savingFix}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {savingFix ? "Saving..." : "Mark fixed"}
            </button>
          )}
        </div>
      </div>

      {/* Same viewer as the approval screens. */}
      {photo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <p className="truncate text-sm font-semibold text-fg">{photo.label}</p>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  disabled={photoZoom <= 0.5}
                  title="Zoom out"
                  className="rounded-lg border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover disabled:opacity-40"
                >
                  −
                </button>

                <span className="w-14 text-center text-sm text-fg-muted">
                  {Math.round(photoZoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setPhotoZoom((prev) => Math.min(prev + 0.25, 3))}
                  disabled={photoZoom >= 3}
                  title="Zoom in"
                  className="rounded-lg border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover disabled:opacity-40"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => setPhotoZoom(1)}
                  title="Reset zoom"
                  className="rounded-lg border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <img
                src={photo.url}
                alt={photo.label}
                style={{ width: `${photoZoom * 100}%`, maxWidth: "none" }}
                className="mx-auto h-auto rounded-lg transition-[width]"
              />
            </div>

            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="w-full rounded-lg bg-primary py-2 text-primary-foreground hover:bg-primary-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
