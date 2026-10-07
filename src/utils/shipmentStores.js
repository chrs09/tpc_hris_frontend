// Which destination store each shipment number goes to (dispatch forms;
// see components/adminTrips/ShipmentStorePairing.jsx).

// Pairs still valid for the current numbers and stores.
export const cleanShipmentStores = (numbers, storeIds, pairs) => {
  if (storeIds.length === 1) {
    return Object.fromEntries(numbers.map((n) => [n, storeIds[0]]));
  }
  return Object.fromEntries(
    numbers
      .filter((n) => storeIds.includes(Number(pairs?.[n])))
      .map((n) => [n, Number(pairs[n])]),
  );
};

export const shipmentStoresComplete = (numbers, storeIds, pairs) =>
  storeIds.length <= 1 ||
  numbers.every((n) => storeIds.includes(Number(pairs?.[n])));
