import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  clockOutOvertime,
  getOvertimeEligibility,
} from "../../api/overtimeRequests";
import OvertimeRequestModal from "./OvertimeRequestModal";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// Best-effort location for the audit trail -- never required to clock
// out, same as clock-in.
const getCurrentLocationOptional = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });

// Drives the employee-facing "Overtime In" / "Overtime Out" action based
// on the server's eligibility check (assigned schedule + 5-minute grace
// past scheduled time-out, or an already-ongoing clock-in).
export default function OvertimeActionButton({ onChanged }) {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const loadEligibility = async () => {
    try {
      setLoading(true);
      const data = await getOvertimeEligibility();
      setEligibility(data);
    } catch (error) {
      console.error("Failed to load overtime eligibility:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEligibility();
  }, []);

  const handleClockedIn = async () => {
    await loadEligibility();
    onChanged?.();
  };

  const handleClockOut = async () => {
    if (!eligibility?.request?.id) return;
    try {
      setClockingOut(true);
      const location = await getCurrentLocationOptional();
      await clockOutOvertime(eligibility.request.id, {
        lat: location?.lat,
        long: location?.long,
      });
      toast.success("Clocked out of overtime.");
      await loadEligibility();
      onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setClockingOut(false);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className="rounded-lg bg-surface-active px-4 py-2 text-xs font-semibold text-fg-subtle"
      >
        Loading...
      </button>
    );
  }

  if (!eligibility || eligibility.state === "no_schedule") {
    return (
      <span className="text-xs italic text-fg-subtle">
        No schedule assigned today.
      </span>
    );
  }

  if (eligibility.state === "ongoing") {
    return (
      <>
        <button
          onClick={handleClockOut}
          disabled={clockingOut}
          className="rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-danger-foreground hover:bg-danger-hover transition-colors disabled:opacity-50"
        >
          {clockingOut ? "Clocking out..." : "Overtime Out"}
        </button>
        {showClockInModal && (
          <OvertimeRequestModal
            onClose={() => setShowClockInModal(false)}
            onFiled={handleClockedIn}
          />
        )}
      </>
    );
  }

  if (eligibility.state === "eligible") {
    return (
      <>
        <button
          onClick={() => setShowClockInModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          Overtime In
        </button>
        {showClockInModal && (
          <OvertimeRequestModal
            onClose={() => setShowClockInModal(false)}
            onFiled={handleClockedIn}
          />
        )}
      </>
    );
  }

  // state === "not_yet"
  return (
    <div className="text-right">
      <button
        disabled
        className="rounded-lg bg-surface-active px-4 py-2 text-xs font-semibold text-fg-subtle cursor-not-allowed"
      >
        Overtime In
      </button>
      <p className="mt-1 text-[11px] text-fg-subtle">
        Available at {eligibility.eligible_at}
      </p>
    </div>
  );
}
