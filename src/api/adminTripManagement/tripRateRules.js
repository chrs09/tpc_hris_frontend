import api from "../services/api";

// Driver / helper rates by trip category, truck type and lane, each with
// an effective date (backend: app/api/tripProfile/trip_rate_rules.py).

export const getTripRateRules = async () => {
  const res = await api.get("/trip-rate-rules");
  return res.data;
};

export const createTripRateRule = async (payload) => {
  const res = await api.post("/trip-rate-rules", payload);
  return res.data;
};

export const updateTripRateRule = async (id, payload) => {
  const res = await api.put(`/trip-rate-rules/${id}`, payload);
  return res.data;
};

export const deleteTripRateRule = async (id) => {
  const res = await api.delete(`/trip-rate-rules/${id}`);
  return res.data;
};
