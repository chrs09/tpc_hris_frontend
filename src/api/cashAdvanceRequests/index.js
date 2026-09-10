import api from "../services/api";

// Pending cash advance requests where the caller is the designated
// approver (Cash Advance Head for the requester's department, or a
// superadmin fallback when unset -- see app/api/cash_advance_request.py
// _can_review). A superadmin sees every pending request regardless of
// department, since _can_review always allows that role.
export const getCashAdvanceRequestsForMyApproval = async () => {
  const res = await api.get("/cash-advance-requests/for-my-approval");
  return res.data;
};

export const approveCashAdvanceRequest = async (requestId, remarks) => {
  const res = await api.post(`/cash-advance-requests/${requestId}/approve`, {
    remarks: remarks || null,
  });
  return res.data;
};

export const rejectCashAdvanceRequest = async (requestId, remarks) => {
  const res = await api.post(`/cash-advance-requests/${requestId}/reject`, {
    remarks: remarks || null,
  });
  return res.data;
};

// Superadmin: every cash advance request regardless of status -- the
// Finance module's full-history list.
export const getAllCashAdvanceRequests = async () => {
  const res = await api.get("/cash-advance-requests/all");
  return res.data;
};

// Superadmin: pending "a new cash advance was requested" notifications --
// powers the notification bell (see CashAdvanceAlertsBell.jsx).
export const getCashAdvanceAlerts = async () => {
  const res = await api.get("/cash-advance-requests/alerts");
  return res.data;
};

export const acknowledgeCashAdvanceAlert = async (notificationId) => {
  const res = await api.post(
    `/cash-advance-requests/alerts/${notificationId}/acknowledge`,
  );
  return res.data;
};

// Superadmin: every approved request with a remaining balance > 0.
export const getOutstandingBalances = async () => {
  const res = await api.get("/cash-advance-requests/balances");
  return res.data;
};

// Superadmin: manually record one deduction event against a request
// (e.g. once per payroll cutoff). Defaults to the request's
// deduction_per_pay_amount when amount is omitted.
export const recordCashAdvanceDeduction = async (
  requestId,
  { amount, note } = {},
) => {
  const res = await api.post(
    `/cash-advance-requests/${requestId}/record-deduction`,
    { amount: amount ?? null, note: note || null },
  );
  return res.data;
};
