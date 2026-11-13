import { useCallback, useEffect, useState } from "react";
import { getTripsToFix } from "../../api/adminTripManagement/trips";
import TripDetailsModal from "./TripDetailsModal";

// Trip Dashboard -> "Trips to fix": returned trips the coordinator admin
// handed to me (Trip Approvals -> Send to coordinator). Open one, replace
// the wrong document photo, and mark it fixed -- it goes back to Trip
// Approvals. Hidden when there's nothing to fix.
export default function TripsToFixCard() {
  const [trips, setTrips] = useState([]);
  const [opened, setOpened] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getTripsToFix();
      setTrips(res.data || []);
    } catch {
      setTrips([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getTripsToFix()
      .then((res) => !cancelled && setTrips(res.data || []))
      .catch(() => !cancelled && setTrips([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!trips.length) return null;

  return (
    <section className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <h2 className="text-base font-semibold text-fg">
        Trips to fix <span className="ml-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">{trips.length}</span>
      </h2>
      <p className="mb-3 text-xs text-fg-muted">
        Returned by Office and handed to you. Upload the corrected document, then mark it fixed.
      </p>
      <ul className="space-y-2">
        {trips.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">
                {t.ticket_no || t.trip_code}
                <span className="ml-2 text-xs font-normal text-fg-subtle">
                  {t.trip_code} · {t.driver_name || "-"}
                </span>
              </p>
              <p className="mt-1 text-sm text-fg">{t.resolver_note}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                From {t.resolver_assigned_by || "coordinator admin"}
                {t.resolver_assigned_at ? ` · ${t.resolver_assigned_at}` : ""} · Office: {t.return_reason}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpened(t)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Open &amp; fix
            </button>
          </li>
        ))}
      </ul>

      {opened && (
        <TripDetailsModal
          trip={{
            id: opened.id,
            trip_code: opened.trip_code,
            driver_name: opened.driver_name,
            status_label: "Returned · to fix",
          }}
          fixMode
          onClose={() => setOpened(null)}
          onFixed={async () => {
            setOpened(null);
            await load();
          }}
        />
      )}
    </section>
  );
}
