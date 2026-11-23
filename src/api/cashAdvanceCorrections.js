import api from "./services/api";

// Finance -> CA Corrections (backend: app/api/cash_advance_corrections.py).
// Adjusting what a cash advance owes, or reversing a deduction, is filed
// here and only changes the balance once approved.

// status: "pending" | "history" | undefined (all).
// -> { can_approve, can_request, items: [...] }
export const getCaCorrections = async (status) =>
  (await api.get("/cash-advance-corrections", { params: { status } })).data;

// Approved cash advances to pick for a new request.
export const searchCaForCorrection = async (q) =>
  (await api.get("/cash-advance-corrections/cash-advances", { params: { q } })).data;

// change: + or - to what's owed (e.g. -300 when only ₱700 of ₱1,000 was released).
export const requestCaAdjustment = async (cashAdvanceId, change, reason) =>
  (
    await api.post("/cash-advance-corrections", {
      cash_advance_request_id: cashAdvanceId,
      kind: "adjustment",
      change,
      reason,
    })
  ).data;

// Add one deduction back (it was never taken from pay).
export const requestCaReversal = async (cashAdvanceId, deductionLogId, reason) =>
  (
    await api.post("/cash-advance-corrections", {
      cash_advance_request_id: cashAdvanceId,
      kind: "reversal",
      deduction_log_id: deductionLogId,
      reason,
    })
  ).data;

export const approveCaCorrection = async (id, note) =>
  (await api.post(`/cash-advance-corrections/${id}/approve`, { note })).data;

export const rejectCaCorrection = async (id, note) =>
  (await api.post(`/cash-advance-corrections/${id}/reject`, { note })).data;

export const cancelCaCorrection = async (id) =>
  (await api.post(`/cash-advance-corrections/${id}/cancel`)).data;
