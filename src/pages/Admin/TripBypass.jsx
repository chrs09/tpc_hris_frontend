import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { getStores } from "../../api/adminTripManagement/stores";
import { cancelAssignedTrip } from "../../api/adminTripManagement/trips";
import {
  getBypassableTrips,
  getBypassTripDetail,
  bypassCheckout,
  bypassCheckIn,
  bypassStartUnloading,
  bypassCheckOut,
  bypassCheckin,
  bypassAssignStopStore,
} from "../../api/tripBypass";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Which action is next for a trip, based on its status/current_step --
// mirrors the driver flow (Checkout, Arrived, Start Unloading,
// Delivered, Checkin -- no more separate Start Trip or Back to Source
// step; Checkout itself starts the trip). A trip can cover multiple
// planned stores (see tripDetail.planned_stores); once DELIVERED,
// there's either another store left to arrive at, or none left and the
// trip is ready to Checkin.
const getNextAction = (trip) => {
  if (!trip) return null;
  if (trip.status === "ASSIGNED" && trip.current_step === "ASSIGNED") {
    return "checkout";
  }
  if (trip.status === "ACTIVE") {
    const openStop = [...trip.stops]
      .reverse()
      .find((s) => s.status !== "DELIVERED");

    if (trip.current_step === "IN_TRANSIT") return "check-in";
    if (trip.current_step === "ARRIVED" && openStop) {
      return { type: "start-unloading", stop: openStop };
    }
    if (trip.current_step === "UNLOADING" && openStop) {
      return { type: "check-out", stop: openStop };
    }
    if (trip.current_step === "DELIVERED") {
      const hasRemainingStores = (trip.planned_stores || []).some(
        (s) => !s.delivered,
      );
      return hasRemainingStores ? "check-in" : "checkin";
    }
    // Legacy trips already in RETURNING from before Back to Source was
    // removed -- let them proceed straight to Checkin.
    if (trip.current_step === "RETURNING") return "checkin";
  }
  return null;
};

const TripBypass = () => {
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState(null);

  const [tripDetail, setTripDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [stores, setStores] = useState([]);

  const [reason, setReason] = useState("");
  // Optional: when this step really happened (Philippine time), for
  // recording a trip from an earlier day. Blank = now.
  const [performedAt, setPerformedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step-specific fields
  const [odometerReading, setOdometerReading] = useState("");
  const [checkInStoreId, setCheckInStoreId] = useState("");
  const [overrideStoreId, setOverrideStoreId] = useState("");
  const [podPhoto, setPodPhoto] = useState(null);
  const [invoicePhoto, setInvoicePhoto] = useState(null);
  const [lmPhoto, setLmPhoto] = useState(null);
  const [lmStampedPhoto, setLmStampedPhoto] = useState(null);
  const [forceCheckin, setForceCheckin] = useState(false);
  const [assignStoreId, setAssignStoreId] = useState("");

  const loadTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      const data = await getBypassableTrips();
      setTrips(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
    getStores()
      .then((res) => setStores(res.data || []))
      .catch(() => setStores([]));
  }, [loadTrips]);

  const loadDetail = useCallback(async (tripId) => {
    if (!tripId) return;
    try {
      setLoadingDetail(true);
      const data = await getBypassTripDetail(tripId);
      setTripDetail(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setTripDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadDetail(selectedTripId);
    setReason("");
    setPerformedAt("");
    setOdometerReading("");
    setCheckInStoreId("");
    setOverrideStoreId("");
    setPodPhoto(null);
    setInvoicePhoto(null);
    setLmPhoto(null);
    setLmStampedPhoto(null);
    setForceCheckin(false);
    setAssignStoreId("");
  }, [selectedTripId, loadDetail]);

  const refreshAfterAction = async () => {
    await Promise.all([loadTrips(), loadDetail(selectedTripId)]);
    setReason("");
    setPerformedAt("");
  };

  const runAction = async (label, fn) => {
    if (!reason.trim()) {
      toast.error("A reason is required for every bypass action.");
      return;
    }
    if (
      !(await confirmDialog(
        `${label}? This overrides the driver's own app and is logged for audit.`,
      ))
    ) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fn();
      toast.success(response?.message || "Done.");
      await refreshAfterAction();
    } catch (error) {
      toast.error(getErrorMessage(error));
      // 409 = the trip moved on since this screen loaded (the driver or
      // another coordinator acted) -- reload it so the next step shown
      // is the real one instead of leaving the admin on stale state.
      if (error.response?.status === 409) await refreshAfterAction();
    } finally {
      setSubmitting(false);
    }
  };

  // Every bypass form sends the reason, plus the actual date/time when
  // the admin entered one.
  const buildForm = () => {
    const fd = new FormData();
    fd.append("reason", reason);
    if (performedAt) fd.append("performed_at", performedAt);
    return fd;
  };

  const handleCancelTrip = async () => {
    if (!reason.trim()) {
      toast.error("Enter a reason first -- it is required to cancel a trip.");
      return;
    }
    if (
      !(await confirmDialog(
        "Cancel this trip? The driver never started it, so it is closed out and its vehicle and helpers are released.",
      ))
    ) {
      return;
    }
    try {
      setSubmitting(true);
      await cancelAssignedTrip(tripDetail.trip_id, reason.trim());
      toast.success("Trip cancelled.");
      setSelectedTripId(null);
      setTripDetail(null);
      await loadTrips();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const nextAction = getNextAction(tripDetail);
  const rawNextActionType =
    typeof nextAction === "string" ? nextAction : nextAction?.type;

  // A trip DELIVERED with remaining planned stores normally routes to
  // "check-in" (arrive at the next store). The admin can instead force
  // straight to "checkin" (complete the trip early), same flexibility
  // the driver's own app now offers.
  const hasRemainingStores =
    tripDetail?.current_step === "DELIVERED" &&
    (tripDetail.planned_stores || []).some((s) => !s.delivered);
  const nextActionType =
    hasRemainingStores && forceCheckin ? "checkin" : rawNextActionType;

  // A delivered stop with no store: the driver's app couldn't match
  // their GPS to any remaining store. Its delivery doesn't count toward a
  // planned store, so the trip would keep asking for "Arrived at Next
  // Store" -- it has to be linked to the right store first.
  const unmatchedStop =
    tripDetail?.status === "ACTIVE" &&
    (tripDetail.planned_stores || []).length > 0
      ? (tripDetail.stops || []).find(
          (s) => s.status === "DELIVERED" && !s.store_id,
        )
      : null;

  const renderAssignStore = () => {
    const remaining = (tripDetail.planned_stores || []).filter(
      (s) => !s.delivered,
    );
    const stopNumber =
      (tripDetail.stops || []).findIndex(
        (s) => s.stop_id === unmatchedStop.stop_id,
      ) + 1;
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-fg">
          Which store was stop #{stopNumber}?
        </h3>
        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-fg">
          The driver delivered at stop #{stopNumber}, but their location
          didn't match any of this trip's stores, so it isn't counted as
          delivered yet. Pick the store they were actually at. After that,
          the trip moves on to the next store or to Checkin.
        </p>
        <SearchSelect
          value={remaining.find(
            (s) => String(s.store_id) === String(assignStoreId),
          )}
          options={remaining}
          onChange={(s) => setAssignStoreId(s?.store_id || "")}
          placeholder="Select the store for this stop..."
          getOptionLabel={(s) => s?.store_name || `Store #${s?.store_id}`}
          getOptionValue={(s) => s?.store_id}
        />
        <ReasonField reason={reason} setReason={setReason} />
        <button
          disabled={submitting || !assignStoreId}
          onClick={() =>
            runAction("Link this stop to the selected store", () => {
              const fd = new FormData();
              fd.append("store_id", assignStoreId);
              fd.append("reason", reason);
              return bypassAssignStopStore(
                tripDetail.trip_id,
                unmatchedStop.stop_id,
                fd,
              ).finally(() => setAssignStoreId(""));
            })
          }
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Link Stop to Store
        </button>
      </div>
    );
  };

  const renderForm = () => {
    if (!tripDetail) return null;

    if (unmatchedStop) return renderAssignStore();

    if (!nextActionType) {
      return (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
          This trip has no driver step currently waiting to be bypassed
          (currently:{" "}
          {tripDetail.current_step_label || tripDetail.current_step}).
        </div>
      );
    }

    if (nextActionType === "checkout") {
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-fg">Checkout</h3>
          <p className="text-xs text-fg-subtle">
            Destination store(s) were already set by the coordinator at
            dispatch. This records the odometer reading and photos, and
            immediately starts the trip.
          </p>
          <input
            className={inputStyles}
            type="number"
            placeholder="Odometer reading (optional)"
            value={odometerReading}
            onChange={(e) => setOdometerReading(e.target.value)}
          />
          <PhotoField label="Invoice photo (optional)" onFile={setInvoicePhoto} />
          <PhotoField label="LM photo (optional)" onFile={setLmPhoto} />
          <PhotoField
            label="LM stamped 'checkout' photo (optional)"
            onFile={setLmStampedPhoto}
          />
          <TimeField value={performedAt} onChange={setPerformedAt} />
          <ReasonField reason={reason} setReason={setReason} />
          <button
            disabled={submitting}
            onClick={() =>
              runAction("Complete Checkout for this driver", () => {
                const fd = buildForm();
                fd.append("odometer_reading", odometerReading || 0);
                if (invoicePhoto) fd.append("invoice_photo", invoicePhoto);
                if (lmPhoto) fd.append("lm_photo", lmPhoto);
                if (lmStampedPhoto) {
                  fd.append("lm_checkout_stamped_photo", lmStampedPhoto);
                }
                return bypassCheckout(tripDetail.trip_id, fd);
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Submit Checkout
          </button>
          <div className="border-t border-border pt-3 text-xs text-fg-subtle">
            This trip never actually happened (e.g. dispatched by
            mistake)?{" "}
            <button
              type="button"
              disabled={submitting}
              onClick={handleCancelTrip}
              className="font-semibold text-danger underline disabled:opacity-50"
            >
              Cancel this trip instead
            </button>{" "}
            (uses the reason above).
          </div>
        </div>
      );
    }

    if (nextActionType === "check-in") {
      // Mirror the driver's own app: once a planned store has been
      // delivered, it can't be checked into again (matches the backend
      // guard in bypass_check_in). Legacy trips with no planned stores
      // fall back to the full store list, same as the driver flow does.
      const plannedStores = tripDetail.planned_stores || [];
      const remainingPlannedStores = plannedStores.filter((s) => !s.delivered);
      const checkInOptions =
        plannedStores.length > 0
          ? stores.filter((store) =>
              remainingPlannedStores.some(
                (s) => String(s.store_id) === String(store.id),
              ),
            )
          : stores;

      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-fg">
            {tripDetail.current_step === "DELIVERED"
              ? "Arrived at Next Store"
              : "Arrived at Store"}
          </h3>
          <p className="text-xs text-fg-subtle">
            Same as the driver tapping{" "}
            <span className="font-semibold">
              {tripDetail.current_step === "DELIVERED"
                ? "Arrived at Next Store"
                : "Arrived at Store"}
            </span>{" "}
            on their phone.
          </p>
          {hasRemainingStores && (
            <p className="text-xs text-fg-subtle">
              {remainingPlannedStores.length} store(s) remaining.{" "}
              <button
                type="button"
                onClick={() => setForceCheckin(true)}
                className="font-semibold text-primary underline"
              >
                Skip remaining stores and Checkin instead
              </button>
            </p>
          )}
          <SearchSelect
            value={checkInOptions.find(
              (s) => String(s.id) === String(checkInStoreId),
            )}
            options={checkInOptions}
            onChange={(store) => setCheckInStoreId(store?.id || "")}
            placeholder="Select store the driver arrived at..."
            getOptionLabel={(store) => store?.name || ""}
            getOptionValue={(store) => store?.id}
          />
          <TimeField value={performedAt} onChange={setPerformedAt} />
          <ReasonField reason={reason} setReason={setReason} />
          <button
            disabled={submitting || !checkInStoreId}
            onClick={() =>
              runAction("Mark the driver as arrived at this store", () => {
                const fd = buildForm();
                fd.append("store_id", checkInStoreId);
                fd.append("expected_step", tripDetail.current_step);
                return bypassCheckIn(tripDetail.trip_id, fd);
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Submit Arrived at Store
          </button>
        </div>
      );
    }

    if (nextActionType === "start-unloading") {
      const stop = nextAction.stop;
      return (
        <ActionCard
          title={`Start Unloading (at ${stop.store || "stop"})`}
          description="Marks unloading as started at the driver's current stop. Photo optional."
          reason={reason}
          setReason={setReason}
          submitting={submitting}
          photoLabel="Unloading photo (optional)"
          onSubmit={(photo) =>
            runAction("Mark unloading as started", () => {
              const fd = new FormData();
              fd.append("reason", reason);
              if (photo) fd.append("photo", photo);
              return bypassStartUnloading(tripDetail.trip_id, stop.stop_id, fd);
            })
          }
        />
      );
    }

    if (nextActionType === "check-out") {
      const stop = nextAction.stop;
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-fg">
            Delivered - Upload Proof (at{" "}
            {stop.store || "unmatched location"})
          </h3>
          <p className="text-xs text-fg-subtle">
            Reuses the store location the driver already checked in at as
            the delivery geofence.{" "}
            {stop.requires_review &&
              "This stop wasn't matched to a store at check-in -- pick the correct one below."}
          </p>
          {stop.requires_review && (
            <SearchSelect
              value={stores.find(
                (s) => String(s.id) === String(overrideStoreId),
              )}
              options={stores}
              onChange={(store) => setOverrideStoreId(store?.id || "")}
              placeholder="Select the correct store..."
              getOptionLabel={(store) => store?.name || ""}
              getOptionValue={(store) => store?.id}
            />
          )}
          <PhotoField label="Delivery proof photo (optional)" onFile={setPodPhoto} />
          <TimeField value={performedAt} onChange={setPerformedAt} />
          <ReasonField reason={reason} setReason={setReason} />
          <button
            disabled={submitting}
            onClick={() =>
              runAction("Mark this stop as delivered", () => {
                const fd = buildForm();
                if (podPhoto) fd.append("proof_photo", podPhoto);
                if (overrideStoreId) fd.append("store_id", overrideStoreId);
                return bypassCheckOut(tripDetail.trip_id, stop.stop_id, fd);
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Submit Delivered
          </button>
        </div>
      );
    }


    if (nextActionType === "checkin") {
      return (
        <div className="space-y-3">
          {hasRemainingStores && forceCheckin && (
            <button
              type="button"
              onClick={() => setForceCheckin(false)}
              className="text-xs font-semibold text-primary underline"
            >
              &larr; Back to Arrived at Next Store
            </button>
          )}
          <ActionCard
            title="Checkin (final step, back at the hub)"
            description={
              hasRemainingStores
                ? "Completes the trip early, skipping the remaining planned stores. Sends it for approval, releasing the vehicle and any helpers. Photo optional."
                : "Completes the trip and sends it for approval, releasing the vehicle and any helpers. Photo optional."
            }
            reason={reason}
            setReason={setReason}
            submitting={submitting}
            photoLabel="Stamped invoice photo (optional)"
            extra={<TimeField value={performedAt} onChange={setPerformedAt} />}
            onSubmit={(photo) =>
              runAction("Complete this trip", () => {
                const fd = buildForm();
                if (photo) fd.append("photo", photo);
                return bypassCheckin(tripDetail.trip_id, fd);
              })
            }
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-fg">
          Trip Bypass
        </h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Act as a driver to complete a step they missed on a stuck trip --
          e.g. uploading a forgotten delivery proof photo. Each action has
          the same name as the button on the driver's phone. Every action here is
          logged for audit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-fg">
            In-Progress Trips
          </h3>

          {loadingTrips ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : trips.length === 0 ? (
            <p className="text-sm text-fg-subtle">
              No assigned/active trips right now.
            </p>
          ) : (
            <div className="space-y-2">
              {trips.map((t) => (
                <button
                  key={t.trip_id}
                  onClick={() => setSelectedTripId(t.trip_id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                    selectedTripId === t.trip_id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-surface-hover"
                  }`}
                >
                  <div className="font-semibold text-fg">
                    {t.driver_name || `Driver #${t.driver_id}`}
                  </div>
                  <div className="text-xs text-fg-subtle">
                    {t.current_step_label || t.current_step}
                    {t.ticket_no && ` • ${t.ticket_no}`}
                  </div>
                  {t.destination_store && (
                    <div className="text-xs text-fg-subtle">
                      {t.destination_store}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          {!selectedTripId ? (
            <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
              Select a driver's trip on the left to get started.
            </div>
          ) : loadingDetail ? (
            <p className="text-sm text-fg-subtle">Loading trip...</p>
          ) : !tripDetail ? (
            <p className="text-sm text-fg-subtle">Trip not found.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-fg">
                  {tripDetail.driver_name || `Driver #${tripDetail.driver_id}`}
                </h2>
                <p className="text-xs text-fg-subtle">
                  {tripDetail.current_step_label ||
                    tripDetail.current_step}
                  {tripDetail.ticket_no && ` • ${tripDetail.ticket_no}`}
                </p>
              </div>

              {renderForm()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Optional "when did this really happen" -- for recording a trip from
// an earlier day. Blank means now. Read as Philippine time by the
// backend, which also refuses a future time or one that would put the
// step before the previous one.
const TimeField = ({ value, onChange }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-fg-subtle">
      Actual date &amp; time (optional)
    </label>
    <input
      type="datetime-local"
      className={inputStyles}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <p className="mt-1 text-xs text-fg-subtle">
      Leave blank to record this as happening now. Fill it in when
      the trip really happened earlier, so it lands on the correct
      day and payroll cutoff.
    </p>
  </div>
);

const ReasonField = ({ reason, setReason }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-fg-subtle">
      Reason (required, logged for audit)
    </label>
    <textarea
      className={`${inputStyles} resize-none`}
      rows={2}
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder="e.g. Driver's phone died after delivery, confirmed via call."
    />
  </div>
);

const PhotoField = ({ label, onFile }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-fg-subtle">
      {label}
    </label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => onFile(e.target.files?.[0] || null)}
      className="w-full text-sm text-fg-subtle"
    />
  </div>
);

const ActionCard = ({
  title,
  description,
  reason,
  setReason,
  submitting,
  photoLabel,
  onSubmit,
  extra,
}) => {
  const [photo, setPhoto] = useState(null);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-fg">{title}</h3>
        <p className="text-xs text-fg-subtle">{description}</p>
      </div>
      {photoLabel && <PhotoField label={photoLabel} onFile={setPhoto} />}
      {extra}
      <ReasonField reason={reason} setReason={setReason} />
      <button
        disabled={submitting}
        onClick={() => onSubmit(photo)}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
};

export default TripBypass;
