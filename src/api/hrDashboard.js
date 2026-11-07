import api from "./services/api";

// HRIS -> HR Dashboard: lacking docs, nearing expiry, government ID
// deficiencies (tpc_hris_backend app/api/hr_dashboard.py).
export const getHrDashboard = async ({ department, locationId } = {}) =>
  (
    await api.get("/hr-dashboard", {
      params: {
        department: department || undefined,
        location_id: locationId || undefined,
      },
    })
  ).data;
