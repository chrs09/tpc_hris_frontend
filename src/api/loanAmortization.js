import api from "./services/api";

// Finance -> Loan Amortization (backend: app/api/loan_amortization.py):
// SSS and Pag-IBIG loans that payroll pays down every cutoff.

export const getLoans = async () => (await api.get("/loan-amortization")).data;

// Active employees for the Add loan picker: [{ id, name, department }].
export const getLoanEmployees = async () => (await api.get("/loan-amortization/employees")).data;

// { employee_id, loan_type: SSS | PAGIBIG, reference_no, loan_amount,
//   monthly_amortization, terms_months, start_date (YYYY-MM-01),
//   deduct_schedule: SPLIT | FIRST | SECOND, opening_paid, notes }
export const createLoan = async (payload) => (await api.post("/loan-amortization", payload)).data;

export const updateLoan = async (id, payload) => (await api.put(`/loan-amortization/${id}`, payload)).data;

// ACTIVE | CANCELLED
export const setLoanStatus = async (id, status) =>
  (await api.post(`/loan-amortization/${id}/status`, { status })).data;

export const deleteLoan = async (id) => (await api.delete(`/loan-amortization/${id}`)).data;

// { loan, payments: [{ amount, cutoff_period, note, recorded_by, created_at }] }
export const getLoanPayments = async (id) => (await api.get(`/loan-amortization/${id}/payments`)).data;

// A payment made outside payroll.
export const addLoanPayment = async (id, amount, note) =>
  (await api.post(`/loan-amortization/${id}/payments`, { amount, note })).data;
