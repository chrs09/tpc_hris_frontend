// Which destination store(s) each shipment number goes to (dispatch forms;
// see components/adminTrips/ShipmentStorePairing.jsx). Pairs are
// {"<shipment no>": [<store id>, ...]}; a shipment can cover several stores.

// A shipment's store ids (older trips hold one id, not a list).
export const pairedStoreIds = (value) =>
  (Array.isArray(value) ? value : value === undefined || value === null || value === "" ? [] : [value]).map(
    Number,
  );

// Pairs still valid for the current numbers and stores, ids in the trip's
// store order (as the backend saves them).
export const cleanShipmentStores = (numbers, storeIds, pairs) => {
  if (storeIds.length === 1) {
    return Object.fromEntries(numbers.map((n) => [n, [storeIds[0]]]));
  }
  return Object.fromEntries(
    numbers
      .map((n) => {
        const picked = pairedStoreIds(pairs?.[n]);
        return [n, storeIds.filter((id) => picked.includes(id))];
      })
      .filter(([, ids]) => ids.length > 0),
  );
};

export const shipmentStoresComplete = (numbers, storeIds, pairs) =>
  storeIds.length <= 1 ||
  numbers.every((n) => pairedStoreIds(pairs?.[n]).some((id) => storeIds.includes(id)));
