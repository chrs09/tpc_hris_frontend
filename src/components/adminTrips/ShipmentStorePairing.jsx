// Which destination store(s) each shipment number goes to. Shown only when
// a trip has 2+ stores (with one store every shipment goes there). Sent
// as shipment_stores {"<shipment no>": [<store id>, ...]}; Trip Review
// then shows each stop's own shipment number(s). A shipment usually goes
// to one store, but can cover several (ticked on each). A store ticked on
// one shipment is disabled on the others (one shipment per store).

import { pairedStoreIds } from "../../utils/shipmentStores";

export default function ShipmentStorePairing({ numbers, stores, value, onChange }) {
  if (stores.length < 2 || numbers.length === 0) return null;
  const allIds = stores.map((store) => store.id);
  const set = (number, ids) =>
    onChange({ ...value, [number]: allIds.filter((id) => ids.includes(id)) });
  // The other shipment a store is already ticked on (null = free).
  const takenBy = (number, storeId) =>
    numbers.find((n) => n !== number && pairedStoreIds(value?.[n]).includes(storeId)) ?? null;
  // Stores no shipment is ticked for yet.
  const unpaired = stores.filter(
    (store) => !numbers.some((n) => pairedStoreIds(value?.[n]).includes(store.id)),
  );
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-fg">
        Store(s) for each shipment
      </label>
      <p className="mb-2 text-xs text-fg-subtle">
        Tick the store(s) each shipment number is delivered to. It shows on those
        stores in Trip Review.
      </p>
      <div className="space-y-2">
        {numbers.map((number) => {
          const picked = pairedStoreIds(value?.[number]);
          // Stores this shipment can still take (not on another shipment).
          const free = allIds.filter((id) => picked.includes(id) || !takenBy(number, id));
          const all = free.length > 0 && free.every((id) => picked.includes(id));
          return (
            <div
              key={number}
              className={`rounded-lg border p-2 ${picked.length ? "border-border" : "border-warning"}`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-fg">{number}</span>
                <label
                  className={`flex items-center gap-1.5 text-xs ${
                    free.length ? "text-fg-muted" : "text-fg-subtle opacity-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={all}
                    disabled={!free.length}
                    onChange={() => set(number, all ? [] : free)}
                  />
                  {free.length < allIds.length ? "All remaining stores" : "All stores"}
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stores.map((store) => {
                  const on = picked.includes(store.id);
                  const other = on ? null : takenBy(number, store.id);
                  return (
                    <label
                      key={store.id}
                      title={other ? `Already on shipment ${other}` : undefined}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        other
                          ? "cursor-not-allowed border-border text-fg-subtle opacity-50"
                          : on
                            ? "cursor-pointer border-primary bg-primary/10 text-fg"
                            : "cursor-pointer border-border text-fg-muted hover:bg-surface-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!!other}
                        onChange={() =>
                          set(
                            number,
                            on ? picked.filter((id) => id !== store.id) : [...picked, store.id],
                          )
                        }
                      />
                      {store.name}
                      {other && <span className="font-mono text-[10px]">({other})</span>}
                    </label>
                  );
                })}
              </div>
              {!picked.length && (
                <p className="mt-1 text-[11px] text-warning">
                  {free.length
                    ? "Tick at least one store."
                    : "Every store is on another shipment -- untick one there first."}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {unpaired.length > 0 && numbers.some((n) => pairedStoreIds(value?.[n]).length) && (
        <p className="mt-1.5 text-xs text-fg-subtle">
          No shipment ticked yet for: {unpaired.map((store) => store.name).join(", ")}
        </p>
      )}
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
