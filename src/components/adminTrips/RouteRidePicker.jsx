import SearchSelect from "../SearchSelect";

// Trip Assignment -> Is Route Ride: pick the driver (trip in progress) the
// route rider rides along with. Shipments, stores and truck come from
// that trip -- nothing else to enter.
export default function RouteRidePicker({ hosts, loading, riderId, value, onChange }) {
  // Not the rider's own trip.
  const options = hosts.filter((h) => String(h.driver_id) !== String(riderId));
  const selected = options.find((h) => h.trip_id === value) || null;
  const label = (h) =>
    h
      ? `${h.driver_name || "Driver"} -- ${h.trip_code || `Trip #${h.trip_id}`}${
          h.vehicle_unit ? ` (${h.vehicle_unit})` : ""
        }`
      : "";

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-fg">
          Select driver you will ride
        </label>
        <SearchSelect
          value={selected}
          options={options}
          onChange={(h) => onChange(h?.trip_id || null)}
          placeholder={loading ? "Loading trips..." : "Driver with a trip in progress"}
          getOptionLabel={label}
          getOptionValue={(h) => h?.trip_id}
        />
        {!loading && options.length === 0 && (
          <p className="mt-1 text-xs text-fg-subtle">
            No driver has a trip in progress right now.
          </p>
        )}
      </div>

      {selected && (
        <div className="space-y-2 rounded-xl border border-border bg-surface-hover p-4 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Trip" value={selected.trip_code || `#${selected.trip_id}`} />
            <Info label="Driver" value={selected.driver_name} />
            <Info
              label="Truck"
              value={[selected.vehicle_unit, selected.plate_number].filter(Boolean).join(" · ")}
            />
            <Info label="Category" value={selected.trip_category} />
          </div>
          <div>
            <p className="text-xs font-medium text-fg-subtle">Shipment Number(s)</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {selected.shipment_numbers.length ? (
                selected.shipment_numbers.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {n}
                  </span>
                ))
              ) : (
                <span className="text-xs text-fg-subtle">--</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-fg-subtle">
              Start point → Stores ({selected.stores.length})
            </p>
            <p className="mt-1 text-fg">
              {selected.origin || "--"} → {selected.stores.join(", ") || "--"}
            </p>
          </div>
          <p className="text-xs text-fg-subtle">
            The route rider sees this trip in their app and can do any step with the
            driver. Paid like a driver trip of this category (Driver 1st / Next).
          </p>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-fg-subtle">{label}</p>
      <p className="font-semibold text-fg">{value || "--"}</p>
    </div>
  );
}
