import api from "../services/api";

// Saves (creates or updates) one payroll deduction record for a single
// employee + cutoff period. Backend upserts on (employee_id, cutoff_period)
// so re-generating a payslip for the same cutoff doesn't create duplicates.
//
// Expected payload shape:
// {
//   cutoff_period, employee_id, department, gross_pay,
//   sss_deduction, philhealth_deduction, pagibig_deduction,
//   tardiness_deduction, undertime_deduction, absent_deduction, net_pay
// }
export const savePayrollDeduction = async (payload) => {
  const res = await api.post("/payroll-deductions/save", payload);

  return res.data;
};

// Optional bulk variant, in case you ever want to save every row for the
// active cutoff in one call (e.g. a "Save All" button) instead of one
// request per Generate Payslip click.
export const savePayrollDeductionsBulk = async (payloadArray) => {
  const res = await api.post("/payroll-deductions/save-bulk", payloadArray);

  return res.data;
};

export const getPayrollDeductions = async ({
  cutoff_period,
  department,
} = {}) => {
  const res = await api.get("/payroll-deductions/list", {
    params: { cutoff_period, department },
  });

  return res.data;
};

export const getEmployeePayrollDeductions = async (employeeId) => {
  const res = await api.get(`/payroll-deductions/employee/${employeeId}`);

  return res.data;
};
