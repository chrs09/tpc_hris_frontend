import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getTripCoordinators,
  sendTripToCoordinator,
  takeTripBack,
} from "../../api/adminTripManagement/trips";
import { confirmDialog } from "../ui/dialog/dialogService";

// Trip Approvals -> a trip Office returned: fix it yourself (replace or add
// the documents below, then approve), hand it to a coordinator to fix,
// see who has it, or take it back to fix it yourself. Once a coordinator
// marks it fixed it shows here as Fixed, ready to approve.
export default function SendToCoordinatorPanel({ trip, canEdit, onChanged, onEditInstead }) {
  const [coordinators, setCoordinators] = useState([]);
  const [open, setOpen] = useState(false);
  const [coordinatorId, setCoordinatorId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || coordinators.length) return;
    let cancelled = false;
    getTripCoordinators()
      .then((res) => {
        if (cancelled) return;
        setCoordinators(res.data || []);
        // Default: whoever dispatched the trip, if they're a coordinator.
        const dispatcher = (res.data || []).find((c) => c.id === trip.dispatched_by_user_id);
        setCoordinatorId((current) => current || String(dispatcher?.id || ""));
      })
      .catch(() => !cancelled && toast.error("Couldn't load coordinators."));
    return () => {
      cancelled = true;
    };
  }, [open, coordinators.length, trip.dispatched_by_user_id]);

  const send = async () => {
    if (!coordinatorId || !note.trim()) return;
    try {
      setBusy(true);
      const res = await sendTripToCoordinator(trip.trip_id, Number(coordinatorId), note.trim());
      toast.success(res.data?.message || "Sent.");
      setOpen(false);
      setNote("");
      await onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send.");
    } finally {
      setBusy(false);
    }
  };

  const takeBack = async () => {
    const ok = await confirmDialog(
      `Fix this trip yourself? It leaves ${trip.resolver_name || "the coordinator"}'s To fix list, and you can replace or add the documents below, then approve.`,
      { confirmText: "Fix it myself", danger: false },
    );
    if (!ok) return;
    try {
      setBusy(true);
      await takeTripBack(trip.trip_id);
      toast.success("It's yours. Correct the documents, then approve.");
      await onChanged?.();
      onEditInstead?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to take it back.");
    } finally {
      setBusy(false);
    }
  };

  if (trip.fix_status === "with_coordinator") {
    return (
      <div className="mt-3 space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <p className="font-semibold text-warning">
          With {trip.resolver_name} to fix{trip.resolver_assigned_at ? ` · since ${trip.resolver_assigned_at}` : ""}
        </p>
        {trip.resolver_note && <p className="whitespace-pre-wrap text-fg">{trip.resolver_note}</p>}
        <p className="text-xs text-fg-muted">
          You can approve it once they mark it fixed, or fix it yourself if it&apos;s urgent.
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={takeBack}
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Fix it myself
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {trip.fix_status === "fixed" && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
          <p className="font-semibold text-success">
            Fixed by {trip.resolver_name}
            {trip.resolved_at ? ` · ${trip.resolved_at}` : ""}
          </p>
          {trip.resolved_note && <p className="mt-1 whitespace-pre-wrap text-fg">{trip.resolved_note}</p>}
          <p className="mt-1 text-xs text-fg-muted">Check the documents below, then approve to send it to Office.</p>
        </div>
      )}
      {canEdit &&
        (open ? (
          <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <label htmlFor="fix-coordinator" className="block text-xs font-medium text-fg-muted">
              Coordinator
            </label>
            <select
              id="fix-coordinator"
              value={coordinatorId}
              onChange={(e) => setCoordinatorId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg"
            >
              <option value="">Pick a coordinator</option>
              {coordinators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.role === "coordinator_admin" ? " (coordinator admin)" : ""}
                  {c.id === trip.dispatched_by_user_id ? " · dispatched this trip" : ""}
                </option>
              ))}
            </select>
            <label htmlFor="fix-note" className="block text-xs font-medium text-fg-muted">
              What do they need to fix?
            </label>
            <textarea
              id="fix-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="e.g. Get LM page 2 from the driver and upload it."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-fg"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy || !coordinatorId || !note.trim()}
                className="flex-1 rounded-lg bg-warning py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send to coordinator"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted">How do you want to correct it?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-lg border border-warning/60 bg-surface px-3 py-2 text-left text-xs hover:bg-warning/10"
              >
                <span className="block text-sm font-semibold text-warning">
                  {trip.fix_status === "fixed" ? "Return to coordinator again" : "Return to coordinator"}
                </span>
                <span className="text-fg-muted">They get the corrected document and mark it fixed.</span>
              </button>
              <button
                type="button"
                onClick={() => onEditInstead?.()}
                className="rounded-lg border border-primary/60 bg-surface px-3 py-2 text-left text-xs hover:bg-primary/10"
              >
                <span className="block text-sm font-semibold text-primary">Edit instead</span>
                <span className="text-fg-muted">Correct the documents yourself, then approve. No need to return it.</span>
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
