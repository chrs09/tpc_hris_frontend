// Which destination store each shipment number goes to (dispatch forms;
// see components/adminTrips/ShipmentStorePairing.jsx).

// A shipment delivered to every store of the trip (rare).
export const ALL_STORES = 0;

const validPair = (storeIds, value) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  (Number(value) === ALL_STORES || storeIds.includes(Number(value)));

// Pairs still valid for the current numbers and stores.
export const cleanShipmentStores = (numbers, storeIds, pairs) => {
  if (storeIds.length === 1) {
    return Object.fromEntries(numbers.map((n) => [n, storeIds[0]]));
  }
  return Object.fromEntries(
    numbers
      .filter((n) => validPair(storeIds, pairs?.[n]))
      .map((n) => [n, Number(pairs[n])]),
  );
};

export const shipmentStoresComplete = (numbers, storeIds, pairs) =>
  storeIds.length <= 1 || numbers.every((n) => validPair(storeIds, pairs?.[n]));
