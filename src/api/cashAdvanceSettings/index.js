import api from "../services/api";

// Superadmin management
export const getAllDeductionOptions = async () => {
  const res = await api.get("/cash-advance-settings/deduction-options/all");
  return res.data;
};

export const createDeductionOption = async ({ amount, label, sort_order }) => {
  const res = await api.post("/cash-advance-settings/deduction-options", {
    amount,
    label: label || null,
    sort_order: sort_order ?? 0,
  });
  return res.data;
};

export const updateDeductionOption = async (optionId, payload) => {
  const res = await api.patch(
    `/cash-advance-settings/deduction-options/${optionId}`,
    payload,
  );
  return res.data;
};

export const deleteDeductionOption = async (optionId) => {
  const res = await api.delete(
    `/cash-advance-settings/deduction-options/${optionId}`,
  );
  return res.data;
};

export const getTerms = async () => {
  const res = await api.get("/cash-advance-settings/terms");
  return res.data;
};

export const setTerms = async (content, maxPayPeriods, maxLoanAmount) => {
  const res = await api.put("/cash-advance-settings/terms", {
    content,
    max_pay_periods: maxPayPeriods,
    max_loan_amount:
      maxLoanAmount === "" || maxLoanAmount === null || maxLoanAmount === undefined
        ? null
        : Number(maxLoanAmount),
  });
  return res.data;
};
