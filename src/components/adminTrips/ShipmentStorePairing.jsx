// Which destination store each shipment number goes to. Shown only when
// a trip has 2+ stores (with one store every shipment goes there). Sent
// as shipment_stores {"<shipment no>": <store id>}; Trip Review then shows
// each stop's own shipment number(s).

export default function ShipmentStorePairing({ numbers, stores, value, onChange }) {
  if (stores.length < 2 || numbers.length === 0) return null;
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-fg">
        Store for each shipment
      </label>
      <p className="mb-2 text-xs text-fg-subtle">
        Pick which store each shipment number is delivered to. It shows on that
        store in Trip Review.
      </p>
      <div className="space-y-2">
        {numbers.map((number) => (
          <div key={number} className="flex items-center gap-2">
            <span className="w-24 shrink-0 font-mono text-sm text-fg">{number}</span>
            <select
              value={value?.[number] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [number]: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={`min-w-0 flex-1 rounded-lg border bg-surface px-3 py-2 text-sm text-fg ${
                value?.[number] ? "border-border" : "border-warning"
              }`}
            >
              <option value="">Select store...</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// The shipment number(s) for one stop, as a small tag next to the store
// name (Trip Review, Finance, Office, manual entries).
export function StopShipments({ numbers }) {
  if (!numbers?.length) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
      Shipment no. <span className="ml-1 font-mono">{numbers.join(", ")}</span>
    </span>
  );
}
