import api from "./services/api";

// Customers -> Customer Chart (tpc_hris_backend/app/api/admin/customer_chart.py).
export const getCustomerChart = async () =>
  (await api.get("/admin/customer-chart")).data;

export const createCustomer = async (payload) =>
  (await api.post("/admin/customer-chart/customers", payload)).data;

export const updateCustomer = async (id, payload) =>
  (await api.patch(`/admin/customer-chart/customers/${id}`, payload)).data;

export const deleteCustomer = async (id) =>
  (await api.delete(`/admin/customer-chart/customers/${id}`)).data;

export const createTier = async (customerId, payload) =>
  (await api.post(`/admin/customer-chart/customers/${customerId}/tiers`, payload)).data;

export const updateTier = async (id, payload) =>
  (await api.patch(`/admin/customer-chart/tiers/${id}`, payload)).data;

export const deleteTier = async (id) =>
  (await api.delete(`/admin/customer-chart/tiers/${id}`)).data;

export const getTierLocations = async (tierId) =>
  (await api.get(`/admin/customer-chart/tiers/${tierId}/locations`)).data;

export const searchChartLocations = async ({ q = "", unassigned = false } = {}) =>
  (await api.get("/admin/customer-chart/locations", { params: { q, unassigned } })).data;

export const addTierLocations = async (tierId, storeIds) =>
  (await api.post(`/admin/customer-chart/tiers/${tierId}/locations`, { store_ids: storeIds })).data;

export const unassignLocations = async (storeIds) =>
  (await api.post("/admin/customer-chart/locations/unassign", { store_ids: storeIds })).data;

// Trip Dispatch: what the trip would pay, or why it can't go (400 detail).
export const previewTripRate = async (payload) =>
  (await api.post("/admin/customer-chart/rate-preview", payload)).data;
