import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import ManualEntryViewModal from "../../components/adminTrips/ManualEntryViewModal";
import SearchSelect from "../../components/SearchSelect";
import PhotoPicker from "../../components/ui/photoPicker/PhotoPicker";
import {
  confirmDialog,
  promptDialog,
} from "../../components/ui/dialog/dialogService";
import useModuleAccess from "../../hooks/useModuleAccess";
import { getStores } from "../../api/adminTripManagement/stores";
import {
  approveManualEntry,
  createManualEntry,
  rejectManualEntry,
  getManualEntries,
  getManualEntryOptions,
} from "../../api/tripManualEntries";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Same caps as the backend (MAX_SHIPMENT_NUMBERS / MAX_PLANNED_STOPS).
const MAX_SHIPMENT_NUMBERS = 10;
const MAX_STORES = 20;

const emptyForm = {
  driverId: "",
  vehicleId: "",
  originId: "",
  startTime: "",
  endTime: "",
  odometer: "",
  reason: "",
};

// Superadmin and coordinator_admin: records a whole trip that really
// happened but never went through the driver's phone (e.g. the server
// was down that day). The trip is created already finished -- every
// store delivered, no GPS or geofence checks -- and goes into the normal
// Trip Approvals flow. A coordinator_admin's entry first waits for a
// superadmin to approve or reject it (Recent Manual Entries list).
export default function TripManualEntries() {
  const { isSuperAdmin, role } = useModuleAccess();
  const canEnter = isSuperAdmin || role === "coordinator_admin";
  const [decidingId, setDecidingId] = useState(null);
  // Entry open in the View window. ?view=<trip id> (from the alert bell)
  // opens it straight away.
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewingId, setViewingId] = useState(null);
  const [viewRefreshKey, setViewRefreshKey] = useState(0);

  useEffect(() => {
    const fromLink = Number(searchParams.get("view"));
    if (fromLink) {
      setViewingId(fromLink);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // After an approve/reject: refresh the list, the open View window and
  // the alert bell count.
  const afterDecision = async () => {
    await loadEntries();
    setViewRefreshKey((k) => k + 1);
    window.dispatchEvent(new Event("manual-entries-changed"));
  };

  const [options, setOptions] = useState({
    drivers: [],
    vehicles: [],
    helpers: [],
  });
  const [hubs, setHubs] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [shipmentInput, setShipmentInput] = useState("");
  const [shipments, setShipments] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");
  // [{ storeId, arrivedAt, deliveredAt, pod }] in visiting order
  const [stops, setStops] = useState([]);
  const [helperIds, setHelperIds] = useState([]);
  const [photos, setPhotos] = useState({});

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const loadEntries = useCallback(async () => {
    try {
      setEntries(await getManualEntries());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (!canEnter) return;
    const load = async () => {
      try {
        const [opts, storeRes] = await Promise.all([
          getManualEntryOptions(),
          getStores(),
        ]);
        setOptions(opts);
        const storeList = Array.isArray(storeRes.data)
          ? storeRes.data
          : storeRes.data?.items || [];
        setHubs(storeList.filter((s) => s.is_hub));
        setDestinations(storeList.filter((s) => !s.is_hub));
        await loadEntries();
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canEnter, loadEntries]);

  const storeName = (id) =>
    destinations.find((s) => s.id === id)?.name || `Store #${id}`;

  const filteredStores = useMemo(
    () =>
      destinations.filter((s) =>
        `${s.name} ${s.profile || ""}`
          .toLowerCase()
          .includes(storeSearch.toLowerCase()),
      ),
    [destinations, storeSearch],
  );

  const addShipment = () => {
    const value = shipmentInput.trim();
    if (!value) return;
    if (!/^\d{8}$/.test(value)) {
      toast.error("Shipment number must be exactly 8 digits (numbers only).");
      return;
    }
    if (shipments.includes(value)) {
      toast.error("That shipment number is already added.");
      return;
    }
    if (shipments.length >= MAX_SHIPMENT_NUMBERS) {
      toast.error(`Maximum of ${MAX_SHIPMENT_NUMBERS} shipment numbers.`);
      return;
    }
    setShipments((prev) => [...prev, value]);
    setShipmentInput("");
  };

  const toggleStore = (storeId) =>
    setStops((prev) => {
      if (prev.some((s) => s.storeId === storeId)) {
        return prev.filter((s) => s.storeId !== storeId);
      }
      if (prev.length >= MAX_STORES) return prev;
      return [...prev, { storeId, arrivedAt: "", deliveredAt: "", pod: null }];
    });

  const moveStop = (index, direction) =>
    setStops((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const updateStop = (storeId, field, value) =>
    setStops((prev) =>
      prev.map((s) => (s.storeId === storeId ? { ...s, [field]: value } : s)),
    );

  const toggleHelper = (id) =>
    setHelperIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });

  const canSubmit =
    form.driverId &&
    form.vehicleId &&
    form.originId &&
    form.startTime &&
    form.endTime &&
    form.reason.trim() &&
    shipments.length > 0 &&
    stops.length > 0;

  const resetForm = () => {
    setForm(emptyForm);
    setShipments([]);
    setShipmentInput("");
    setStops([]);
    setHelperIds([]);
    setPhotos({});
  };

  const handleSubmit = async () => {
    const driver = options.drivers.find((d) => d.id === form.driverId);
    if (
      !(await confirmDialog(
        `Enter this trip for ${driver?.label || "the driver"}? It's created as already completed and sent to Trip Approvals. Logged for audit.`,
      ))
    ) {
      return;
    }

    const fd = new FormData();
    fd.append("driver_id", form.driverId);
    fd.append("vehicle_unit_id", form.vehicleId);
    fd.append("origin_store_id", form.originId);
    fd.append("start_time", form.startTime);
    fd.append("end_time", form.endTime);
    fd.append("reason", form.reason.trim());
    if (form.odometer) fd.append("odometer_reading", form.odometer);
    fd.append("shipment_numbers", JSON.stringify(shipments));
    fd.append("helper_ids", JSON.stringify(helperIds));
    fd.append(
      "stops",
      JSON.stringify(
        stops.map((s) => ({
          store_id: s.storeId,
          arrived_at: s.arrivedAt || null,
          delivered_at: s.deliveredAt || null,
        })),
      ),
    );
    Object.entries(photos).forEach(([field, file]) => {
      if (file) fd.append(field, file);
    });
    stops.forEach((s) => {
      if (s.pod) fd.append(`pod_photo_${s.storeId}`, s.pod);
    });

    try {
      setSubmitting(true);
      const res = await createManualEntry(fd);
      toast.success(`${res.trip_code}: ${res.message}`);
      resetForm();
      await loadEntries();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (entry) => {
    const remarks = await promptDialog(
      `Approve ${entry.trip_code} for ${entry.driver_name || "the driver"}? It moves to Trip Approvals. Remarks (optional):`,
    );
    if (remarks === null) return;
    try {
      setDecidingId(entry.trip_id);
      const res = await approveManualEntry(entry.trip_id, remarks.trim());
      toast.success(res.message);
      await afterDecision();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (entry) => {
    const reason = await promptDialog(
      `Reject ${entry.trip_code}? The entry is cancelled and its shipment numbers are freed. Reason (required):`,
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required to reject an entry.");
      return;
    }
    try {
      setDecidingId(entry.trip_id);
      const res = await rejectManualEntry(entry.trip_id, reason.trim());
      toast.success(res.message);
      await afterDecision();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDecidingId(null);
    }
  };

  const waitingCount = entries.filter((e) => e.awaiting_approval).length;

  if (!canEnter) {
    return (
      <div className="space-y-5">
        <SectionTabs group="Trip Management" />
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
          Trip Manual Entries is available to superadmins and coordinator
          admins only.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div>
        <h1 className="text-lg font-semibold text-fg sm:text-xl">
          Trip Manual Entries
        </h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Record a trip that really happened but never went through the
          driver&apos;s phone -- e.g. the server was down that day. It&apos;s
          created as already completed (every store delivered, no location
          checks) and goes to Trip Approvals like any other trip.
          {isSuperAdmin
            ? " Entries from coordinator admins wait for your approval first."
            : " Your entry waits for a superadmin's approval first."}{" "}
          Every entry is logged for audit.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* ================= FORM ================= */}
          <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
            <Section title="Driver & Vehicle">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Driver">
                  <SearchSelect
                    value={options.drivers.find((d) => d.id === form.driverId)}
                    options={options.drivers}
                    onChange={(d) => setField("driverId", d?.id || "")}
                    placeholder="Select driver"
                    getOptionLabel={(d) =>
                      d ? `${d.label}${d.is_active ? "" : " (inactive)"}` : ""
                    }
                    getOptionValue={(d) => d?.id}
                  />
                </Field>
                <Field label="Vehicle unit">
                  <SearchSelect
                    value={options.vehicles.find(
                      (v) => v.id === form.vehicleId,
                    )}
                    options={options.vehicles}
                    onChange={(v) => setField("vehicleId", v?.id || "")}
                    placeholder="Select vehicle"
                    getOptionLabel={(v) => v?.label || ""}
                    getOptionValue={(v) => v?.id}
                  />
                </Field>
                <Field label="Origin hub">
                  <SearchSelect
                    value={hubs.find((h) => h.id === form.originId)}
                    options={hubs}
                    onChange={(h) => setField("originId", h?.id || "")}
                    placeholder="Select origin hub"
                    getOptionLabel={(h) => h?.name || ""}
                    getOptionValue={(h) => h?.id}
                  />
                </Field>
                <Field label="Odometer reading (optional)">
                  <input
                    type="number"
                    min="0"
                    className={inputStyles}
                    value={form.odometer}
                    onChange={(e) => setField("odometer", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="When">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Start -- Checkout (date & time)">
                  <input
                    type="datetime-local"
                    className={inputStyles}
                    value={form.startTime}
                    onChange={(e) => setField("startTime", e.target.value)}
                  />
                </Field>
                <Field label="End -- Checkin back at hub (date & time)">
                  <input
                    type="datetime-local"
                    className={inputStyles}
                    value={form.endTime}
                    onChange={(e) => setField("endTime", e.target.value)}
                  />
                </Field>
              </div>
              <p className="mt-2 text-xs text-fg-subtle">
                Philippine time. The start date decides which payroll cutoff
                the trip is paid in.
              </p>
            </Section>

            <Section
              title={`Shipment Numbers (${shipments.length}/${MAX_SHIPMENT_NUMBERS})`}
            >
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={8}
                  className={inputStyles}
                  value={shipmentInput}
                  onChange={(e) =>
                    setShipmentInput(e.target.value.replace(/\D/g, ""))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addShipment();
                    }
                  }}
                  placeholder="8-digit shipment number"
                />
                <button
                  type="button"
                  onClick={addShipment}
                  className="rounded-xl border border-border px-4 text-sm font-medium text-fg hover:bg-surface-hover"
                >
                  Add
                </button>
              </div>
              {shipments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {shipments.map((n) => (
                    <Chip
                      key={n}
                      label={n}
                      onRemove={() =>
                        setShipments((prev) => prev.filter((x) => x !== n))
                      }
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Destination Stores (${stops.length}/${MAX_STORES})`}>
              <input
                className={`${inputStyles} mb-2`}
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Search stores"
              />
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {filteredStores.map((store) => (
                  <label
                    key={store.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg hover:bg-surface-hover"
                  >
                    <input
                      type="checkbox"
                      checked={stops.some((s) => s.storeId === store.id)}
                      onChange={() => toggleStore(store.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    {store.profile ? `${store.name} (${store.profile})` : store.name}
                  </label>
                ))}
                {filteredStores.length === 0 && (
                  <p className="p-2 text-xs text-fg-subtle">No stores found.</p>
                )}
              </div>

              {stops.length > 0 && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-fg-subtle">
                    In the order visited. The first store sets the trip&apos;s
                    rate. Times are optional -- blank ones are spread evenly
                    between Checkout and Checkin.
                  </p>
                  {stops.map((stop, index) => (
                    <div
                      key={stop.storeId}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-fg-subtle">
                          {index + 1}.
                        </span>
                        <span className="flex-1 text-sm font-semibold text-fg">
                          {storeName(stop.storeId)}
                        </span>
                        <IconButton
                          label="Move up"
                          disabled={index === 0}
                          onClick={() => moveStop(index, -1)}
                        >
                          ↑
                        </IconButton>
                        <IconButton
                          label="Move down"
                          disabled={index === stops.length - 1}
                          onClick={() => moveStop(index, 1)}
                        >
                          ↓
                        </IconButton>
                        <IconButton
                          label="Remove"
                          onClick={() => toggleStore(stop.storeId)}
                        >
                          ✕
                        </IconButton>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                        <Field label="Arrived (optional)" small>
                          <input
                            type="datetime-local"
                            className={inputStyles}
                            value={stop.arrivedAt}
                            onChange={(e) =>
                              updateStop(stop.storeId, "arrivedAt", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Delivered (optional)" small>
                          <input
                            type="datetime-local"
                            className={inputStyles}
                            value={stop.deliveredAt}
                            onChange={(e) =>
                              updateStop(
                                stop.storeId,
                                "deliveredAt",
                                e.target.value,
                              )
                            }
                          />
                        </Field>
                        <Field label="Delivery proof photo (optional)" small>
                          <PhotoPicker
                            file={stop.pod}
                            compact
                            onChange={(file) =>
                              updateStop(stop.storeId, "pod", file)
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Helpers (${helperIds.length}/3, optional)`}>
              <SearchSelect
                value={null}
                options={options.helpers.filter(
                  (h) => !helperIds.includes(h.id),
                )}
                onChange={(h) => h && toggleHelper(h.id)}
                placeholder={
                  helperIds.length >= 3 ? "Maximum of 3 helpers" : "Add helper"
                }
                disabled={helperIds.length >= 3}
                getOptionLabel={(h) => h?.label || ""}
                getOptionValue={(h) => h?.id}
              />
              {helperIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {helperIds.map((id) => (
                    <Chip
                      key={id}
                      label={
                        options.helpers.find((h) => h.id === id)?.label ||
                        `Helper #${id}`
                      }
                      onRemove={() => toggleHelper(id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Photos (optional)">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  ["invoice_photo", "Invoice"],
                  ["lm_photo", "LM"],
                  ["lm_checkout_stamped_photo", "LM (stamped 'checkout')"],
                  ["stamped_invoice_photo", "LM (stamped 'check-in')"],
                ].map(([field, label]) => (
                  <Field key={field} label={label} small>
                    <PhotoPicker
                      file={photos[field] || null}
                      onChange={(file) =>
                        setPhotos((prev) => ({ ...prev, [field]: file }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="Reason">
              <textarea
                rows={2}
                className={`${inputStyles} resize-none`}
                value={form.reason}
                onChange={(e) => setField("reason", e.target.value)}
                placeholder="e.g. Server was down on Sept 20, trip confirmed with the driver and coordinator."
              />
            </Section>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Trip Entry"}
            </button>
          </div>

          {/* ================= RECENT ENTRIES ================= */}
          <div className="h-fit rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-fg">Recent Manual Entries</h3>
              {waitingCount > 0 && (
                <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                  {waitingCount} waiting for approval
                </span>
              )}
            </div>
            {entries.length === 0 ? (
              <p className="mt-3 text-sm text-fg-subtle">
                No manual entries yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {[...entries]
                  .sort((a, b) => b.awaiting_approval - a.awaiting_approval)
                  .map((entry) => (
                  <li
                    key={entry.trip_id}
                    className={`rounded-xl border p-3 text-sm ${
                      entry.awaiting_approval
                        ? "border-warning/40 bg-warning/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-fg">
                          {entry.trip_code} · {entry.driver_name || "-"}
                        </p>
                        <p className="text-xs text-fg-subtle">
                          {entry.ticket_no}
                        </p>
                      </div>
                      <EntryStatus status={entry.status} />
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      {entry.start_time} → {entry.end_time}
                    </p>
                    {entry.stores?.length > 0 && (
                      <p className="mt-1 text-xs text-fg-muted">
                        {entry.stores.join(" → ")}
                      </p>
                    )}
                    {entry.reason && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-fg-subtle">
                        “{entry.reason}”
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-fg-subtle">
                      Entered by {entry.entered_by || "-"} · {entry.entered_at}
                    </p>
                    {entry.decision && (
                      <p
                        className={`mt-1 text-[11px] ${
                          entry.decision.approved ? "text-success" : "text-danger"
                        }`}
                      >
                        {entry.decision.approved ? "Approved" : "Rejected"} by{" "}
                        {entry.decision.by || "-"} · {entry.decision.at}
                        {entry.decision.reason
                          ? ` -- ${entry.decision.reason}`
                          : ""}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingId(entry.trip_id)}
                        className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                      >
                        View
                      </button>
                    {entry.awaiting_approval && isSuperAdmin && (
                      <>
                        <button
                          type="button"
                          disabled={decidingId === entry.trip_id}
                          onClick={() => handleApprove(entry)}
                          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={decidingId === entry.trip_id}
                          onClick={() => handleReject(entry)}
                          className="flex-1 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {viewingId && (
        <ManualEntryViewModal
          tripId={viewingId}
          refreshKey={viewRefreshKey}
          canDecide={isSuperAdmin}
          deciding={decidingId === viewingId}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}

const Section = ({ title, children }) => (
  <section>
    <h3 className="mb-2 text-sm font-semibold text-fg">{title}</h3>
    {children}
  </section>
);

const Field = ({ label, small = false, children }) => (
  <div>
    <label
      className={`mb-1 block font-medium text-fg-subtle ${small ? "text-[11px]" : "text-xs"}`}
    >
      {label}
    </label>
    {children}
  </div>
);

const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-surface-active px-2.5 py-1 text-xs font-medium text-fg">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="text-fg-subtle hover:text-danger"
      aria-label={`Remove ${label}`}
    >
      ✕
    </button>
  </span>
);

const IconButton = ({ label, disabled = false, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-xs text-fg-muted hover:bg-surface-hover disabled:opacity-30"
  >
    {children}
  </button>
);

const STATUS_LABELS = {
  PENDING_MANUAL_APPROVAL: ["Waiting for Superadmin", "bg-warning/15 text-warning"],
  PENDING_APPROVAL: ["In Trip Approvals", "bg-primary/15 text-primary"],
  PENDING_OFFICE_REVIEW: ["Office Review", "bg-surface-active text-fg-muted"],
  PENDING_FINANCE_REVIEW: ["Finance Review", "bg-surface-active text-fg-muted"],
  COMPLETED: ["Approved by Finance", "bg-success/15 text-success"],
  CANCELLED: ["Rejected", "bg-danger/15 text-danger"],
};

const EntryStatus = ({ status }) => {
  const [label, classes] = STATUS_LABELS[status] || [
    status,
    "bg-surface-active text-fg-muted",
  ];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${classes}`}
    >
      {label}
    </span>
  );
};
