import api from "../services/api";

// =====================================================
// Create Dispatch
// =====================================================

export const createDispatch = async (dispatchData) => {
  const res = await api.post("/admin/dispatch", dispatchData);
  return res.data;
};

// =====================================================
// Get All Dispatches
// =====================================================

export const getDispatches = async (planDate = null) => {
  let url = "/admin/dispatch";

  if (planDate) {
    url += `?plan_date=${planDate}`;
  }

  const res = await api.get(url);
  return res.data;
};

// =====================================================
// Get Dispatch Details
// =====================================================

export const getDispatchDetails = async (dispatchId) => {
  const res = await api.get(`/admin/dispatch/${dispatchId}`);
  return res.data;
};

// =====================================================
// Update Dispatch
// =====================================================

export const updateDispatch = async (dispatchId, dispatchData) => {
  const res = await api.put(`/admin/dispatch/${dispatchId}`, dispatchData);

  return res.data;
};

// =====================================================
// Delete Dispatch
// =====================================================

export const deleteDispatch = async (dispatchId) => {
  const res = await api.delete(`/admin/dispatch/${dispatchId}`);

  return res.data;
};
