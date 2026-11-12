import api from "../services/api";

// Fleet operations (tpc_hris_backend/app/services/fleet_status.py).

// Set a unit to available / breakdown / maintenance / hold / retired.
export const setVehicleUnitStatus = async (unitId, { status, reason, until }) =>
  (
    await api.put(`/trip-maintenance/vehicle-units/${unitId}/status`, {
      status,
      reason: reason || null,
      until: until || null,
    })
  ).data;

// Truck availability for Trip Dispatch: counts per group + every unit.
export const getFleetBoard = async () =>
  (await api.get("/trip-maintenance/fleet-board")).data;

// Truck Utilization report, dates "YYYY-MM-DD".
export const getTruckUtilization = async (dateFrom, dateTo) =>
  (
    await api.get("/trip-maintenance/utilization", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
  ).data;
