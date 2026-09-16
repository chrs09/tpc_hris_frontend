import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { getStores } from "../../api/adminTripManagement/stores";
import {
  getBypassableTrips,
  getBypassTripDetail,
  bypassCheckout,
  bypassCheckIn,
  bypassStartUnloading,
  bypassCheckOut,
  bypassCheckin,
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
    setOdometerReading("");
    setCheckInStoreId("");
    setOverrideStoreId("");
    setPodPhoto(null);
    setInvoicePhoto(null);
    setLmPhoto(null);
    setLmStampedPhoto(null);
    setForceCheckin(false);
  }, [selectedTripId, loadDetail]);

  const refreshAfterAction = async () => {
    await Promise.all([loadTrips(), loadDetail(selectedTripId)]);
    setReason("");
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

  const renderForm = () => {
    if (!tripDetail) return null;

    if (!nextActionType) {
      return (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
          This trip has no driver step currently waiting to be bypassed
          (status: {tripDetail.status}, step: {tripDetail.current_step}).
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
          <ReasonField reason={reason} setReason={setReason} />
          <button
            disabled={submitting}
            onClick={() =>
              runAction("Complete Checkout for this driver", () => {
                const fd = new FormData();
                fd.append("reason", reason);
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
        </div>
      );
    }

    if (nextActionType === "check-in") {
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-fg">Check In at Store</h3>
          {hasRemainingStores && (
            <p className="text-xs text-fg-subtle">
              {(tripDetail.planned_stores || []).filter((s) => !s.delivered)
                .length}{" "}
              store(s) remaining.{" "}
              <button
                type="button"
                onClick={() => setForceCheckin(true)}
                className="font-semibold text-primary underline"
              >
                Skip remaining stores and Checkin instead
              </button>
            </p>
          )}
          <select
            className={inputStyles}
            value={checkInStoreId}
            onChange={(e) => setCheckInStoreId(e.target.value)}
          >
            <option value="">Select store the driver arrived at...</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ReasonField reason={reason} setReason={setReason} />
          <button
            disabled={submitting || !checkInStoreId}
            onClick={() =>
              runAction("Check the driver in at this store", () => {
                const fd = new FormData();
                fd.append("reason", reason);
                fd.append("store_id", checkInStoreId);
                return bypassCheckIn(tripDetail.trip_id, fd);
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Submit Check-In
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
            Delivered / POD (at {stop.store || "unmatched location"})
          </h3>
          <p className="text-xs text-fg-subtle">
            Reuses the store location the driver already checked in at as
            the delivery geofence.{" "}
            {stop.requires_review &&
              "This stop wasn't matched to a store at check-in -- pick the correct one below."}
          </p>
          {stop.requires_review && (
            <select
              className={inputStyles}
              value={overrideStoreId}
              onChange={(e) => setOverrideStoreId(e.target.value)}
            >
              <option value="">Select the correct store...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <PhotoField label="Delivery proof photo (optional)" onFile={setPodPhoto} />
          <ReasonField reason={reason} setReason={setReason} />
          <button
            disabled={submitting}
            onClick={() =>
              runAction("Mark this stop as delivered", () => {
                const fd = new FormData();
                fd.append("reason", reason);
                if (podPhoto) fd.append("proof_photo", podPhoto);
                if (overrideStoreId) fd.append("store_id", overrideStoreId);
                return bypassCheckOut(tripDetail.trip_id, stop.stop_id, fd);
              })
            }
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Submit Delivered / POD
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
              &larr; Back to Check In at Store
            </button>
          )}
          <ActionCard
            title="Checkin (complete trip)"
            description={
              hasRemainingStores
                ? "Completes the trip early, skipping the remaining planned stores. Sends it for approval, releasing the vehicle and any helpers. Photo optional."
                : "Completes the trip and sends it for approval, releasing the vehicle and any helpers. Photo optional."
            }
            reason={reason}
            setReason={setReason}
            submitting={submitting}
            photoLabel="Stamped invoice photo (optional)"
            onSubmit={(photo) =>
              runAction("Complete this trip", () => {
                const fd = new FormData();
                fd.append("reason", reason);
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
          e.g. uploading a forgotten POD photo. Every action here is
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
                    {t.status} / {t.current_step}
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
                  {tripDetail.status} / {tripDetail.current_step}
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
}) => {
  const [photo, setPhoto] = useState(null);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-fg">{title}</h3>
        <p className="text-xs text-fg-subtle">{description}</p>
      </div>
      {photoLabel && <PhotoField label={photoLabel} onFile={setPhoto} />}
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
