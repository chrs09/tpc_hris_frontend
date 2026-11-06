import api from "../services/api";

// Driver trip budgets (money first, then liquidate) and expense reports
// (spent first, then reimbursed) -- backend app/api/trip_expenses.py.

export const TRIP_EXPENSE_CATEGORIES = [
  { value: "shipping", label: "Shipping / vessel" },
  { value: "port", label: "Port fees" },
  { value: "toll", label: "Toll" },
  { value: "parking", label: "Parking" },
  { value: "fuel", label: "Fuel" },
  { value: "food", label: "Meals" },
  { value: "lodging", label: "Lodging" },
  { value: "parts", label: "Parts" },
  { value: "repair", label: "Repair / labor" },
  { value: "other", label: "Other" },
];

export const TRIP_EXPENSE_STATUS = {
  pending_approval: { label: "Waiting for approval", tone: "warning" },
  for_release: { label: "For release", tone: "warning" },
  released: { label: "Released -- liquidate", tone: "primary" },
  draft: { label: "Draft -- add receipts", tone: "primary" },
  for_review: { label: "For review", tone: "warning" },
  returned: { label: "Returned -- fix", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

// Recent trips of a driver (own, or employeeId -- Finance) to link to.
export const getExpenseTrips = async (employeeId) =>
  (await api.get("/trip-expenses/trips", { params: employeeId ? { employee_id: employeeId } : {} }))
    .data;

// payload: { kind: "budget" | "report", employee_id?, trip_id, vehicle_unit_id,
// purpose, lines: [{ category, description, amount, expense_date }] }
export const fileTripExpense = async (payload) => (await api.post("/trip-expenses", payload)).data;

export const getMyTripExpenses = async () => (await api.get("/trip-expenses/mine")).data;

export const getTripExpense = async (id) => (await api.get(`/trip-expenses/${id}`)).data;

// The liquidation / report's actual expenses (lines keep their receipt by id).
export const saveActualLines = async (id, lines) =>
  (await api.put(`/trip-expenses/${id}/actual-lines`, { lines })).data;

export const uploadLineReceipt = async (id, lineId, file) => {
  const form = new FormData();
  form.append("receipt", file);
  return (await api.post(`/trip-expenses/${id}/lines/${lineId}/receipt`, form)).data;
};

export const submitTripExpense = async (id) => (await api.post(`/trip-expenses/${id}/submit`)).data;

export const cancelTripExpense = async (id) => (await api.post(`/trip-expenses/${id}/cancel`)).data;

// Org Chart heads.
export const getTripExpensesForMyApproval = async () =>
  (await api.get("/trip-expenses/approvals/for-me")).data;

export const approveTripExpense = async (id, remarks) =>
  (await api.post(`/trip-expenses/${id}/approve`, { remarks: remarks || null })).data;

export const rejectTripExpense = async (id, reason) =>
  (await api.post(`/trip-expenses/${id}/reject`, { reason })).data;

// Finance.
export const getTripExpenses = async (status, kind) =>
  (await api.get("/trip-expenses", { params: { status: status || undefined, kind: kind || undefined } }))
    .data;

export const releaseTripBudget = async (id, { amount, method, reference, photo }) => {
  const form = new FormData();
  form.append("amount", amount);
  form.append("method", method);
  if (reference) form.append("reference", reference);
  if (photo) form.append("photo", photo);
  return (await api.post(`/trip-expenses/${id}/release`, form)).data;
};

export const returnTripExpense = async (id, reason) =>
  (await api.post(`/trip-expenses/${id}/return`, { reason })).data;

// payload: { lines: [{ id, allowed_amount, review_note }], short_settlement,
// deduction_per_pay, payroll_date, note }
export const reviewTripExpense = async (id, payload) =>
  (await api.post(`/trip-expenses/${id}/review`, payload)).data;

// Payroll: { "<employee id>": { total, lines: [{ id, kind, label, amount }] } }.
export const getReimbursementsForPayroll = async (start, end) =>
  (await api.get("/trip-expenses/payroll/reimbursements", { params: { start, end } })).data;
