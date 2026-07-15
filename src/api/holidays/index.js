// src/api/holidays/index.js
import api from "../services/api";

export const getHolidays = async (year, activeOnly = true) => {
  const { data } = await api.get("/holidays", {
    params: { year, active_only: activeOnly },
  });
  return data;
};

export const createHoliday = async (payload) => {
  const { data } = await api.post("/holidays", payload);
  return data;
};

export const updateHoliday = async (id, payload) => {
  const { data } = await api.patch(`/holidays/${id}`, payload);
  return data;
};

export const deleteHoliday = async (id) => {
  await api.delete(`/holidays/${id}`);
};

export const syncHolidays = async (year) => {
  const { data } = await api.post(`/holidays/sync/${year}`);
  return data;
};