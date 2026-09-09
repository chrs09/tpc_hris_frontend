import React, { useState } from "react";
import toast from "react-hot-toast";
import { clockInOvertime } from "../../api/overtimeRequests";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// Best-effort location for the selfie's geofence watermark -- unlike
// trips, this is never required to clock in. If permission is denied or
// unavailable, clock-in still proceeds with no location.
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

// Clock-in capture: a live selfie (front camera) + reason. No date/time
// fields -- the server stamps the clock-in time itself. Location is only
// captured (best-effort, non-blocking) to label the geofence on the
// selfie's watermark.
export default function OvertimeRequestModal({ onClose, onFiled }) {
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!photo) {
      toast.error("Take a selfie to clock in.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }

    try {
      setSubmitting(true);
      const location = await getCurrentLocationOptional();
      await clockInOvertime({
        photo,
        reason: reason.trim(),
        lat: location?.lat,
        long: location?.long,
      });
      toast.success("Clocked in to overtime.");
      onFiled?.();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">Overtime In</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <p className="mb-4 rounded-xl bg-primary/10 p-3 text-xs text-fg-muted">
          Take a selfie and tell your department head why you're staying for
          overtime. This goes to them automatically.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">
              Selfie
            </label>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              required
              className="w-full rounded-lg border border-border bg-background p-2 text-sm text-fg"
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Selfie preview"
                className="mt-3 h-32 w-32 rounded-xl border border-border object-cover"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why were you called in for overtime?"
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting ? "Clocking in..." : "Clock In"}
        </button>
      </form>
    </div>
  );
}
