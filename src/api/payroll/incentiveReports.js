import api from "../services/api";

// Payroll -> Incentive Reports (backend: app/api/payroll/incentive_reports.py).
// Made at 4 AM on a program's release date; rows approved, then the trip
// coordinator confirms, then Finance releases.

export const getIncentiveReports = async () => (await api.get("/incentive-reports")).data;

export const getIncentiveReport = async (id) => (await api.get(`/incentive-reports/${id}`)).data;

// action: approve | reject | edit | undo
export const decideReportLine = async (lineId, action, { amount, reason } = {}) =>
  (await api.put(`/incentive-reports/lines/${lineId}`, { action, amount, reason })).data;

export const approvePendingRows = async (id) =>
  (await api.post(`/incentive-reports/${id}/approve-pending`)).data;

export const confirmIncentiveReport = async (id) =>
  (await api.post(`/incentive-reports/${id}/confirm`)).data;

export const returnIncentiveReport = async (id, note) =>
  (await api.post(`/incentive-reports/${id}/return`, { note })).data;

export const releaseIncentiveReport = async (id, method, reference) =>
  (await api.post(`/incentive-reports/${id}/release`, { method, reference })).data;

export const generateReportNow = async (programId) =>
  (await api.post(`/incentive-reports/programs/${programId}/generate`)).data;

export const regenerateIncentiveReport = async (id) =>
  (await api.post(`/incentive-reports/${id}/regenerate`)).data;
