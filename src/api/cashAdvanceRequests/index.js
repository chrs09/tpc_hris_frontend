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

// Superadmin: the full ledger of deductions recorded against one
// request, newest first.
export const getCashAdvanceTransactions = async (requestId) => {
  const res = await api.get(
    `/cash-advance-requests/${requestId}/transactions`,
  );
  return res.data;
};

// Superadmin: records a pre-existing balance (carried over from before
// this system was used) as an already-approved request, so it shows up
// in Outstanding Balances alongside normal requests.
export const createOpeningBalance = async ({
  user_id,
  amount,
  deduction_per_pay_amount,
  note,
}) => {
  const res = await api.post("/cash-advance-requests/opening-balance", {
    user_id,
    amount,
    deduction_per_pay_amount: deduction_per_pay_amount ?? null,
    note: note || null,
  });
  return res.data;
};

// ---------------------------------------
// Requester-facing (any employee filing their own request -- mirrors
// tytan_mobile/src/api/driver/cashAdvance.ts 1:1 against the same
// backend endpoints).
// ---------------------------------------

// File a new cash advance request. The approver is resolved server-side
// from the requester's department head -- there's no approver to pick.
export const fileCashAdvanceRequest = async ({
  amount,
  deduction_option_id,
  reason,
  terms_accepted,
}) => {
  const res = await api.post("/cash-advance-requests/", {
    amount,
    deduction_option_id,
    reason,
    terms_accepted,
  });
  return res.data;
};

// The logged-in user's own cash advance requests.
export const getMyCashAdvanceRequests = async () => {
  const res = await api.get("/cash-advance-requests/mine");
  return res.data;
};

// Total outstanding balance across the user's approved, not-yet-fully-
// paid cash advance requests.
export const getMyCashAdvanceBalance = async () => {
  const res = await api.get("/cash-advance-requests/my-balance");
  return res.data;
};

// Cancel one of your own pending cash advance requests.
export const cancelCashAdvanceRequest = async (requestId) => {
  const res = await api.post(`/cash-advance-requests/${requestId}/cancel`);
  return res.data;
};
