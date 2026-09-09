import api from "../services/api";

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
