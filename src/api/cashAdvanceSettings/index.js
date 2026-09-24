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

// Requester-facing: the active deduction-per-pay presets (mirrors
// tytan_mobile/src/api/driver/cashAdvance.ts's getDeductionOptions).
export const getDeductionOptions = async () => {
  const res = await api.get("/cash-advance-settings/deduction-options");
  return res.data;
};

export const getTerms = async () => {
  const res = await api.get("/cash-advance-settings/terms");
  return res.data;
};

const toNullableNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

export const setTerms = async (
  content,
  maxPayPeriods,
  maxLoanAmount,
  maxActiveRequests,
) => {
  const res = await api.put("/cash-advance-settings/terms", {
    content,
    max_pay_periods: maxPayPeriods,
    max_loan_amount: toNullableNumber(maxLoanAmount),
    max_active_requests: toNullableNumber(maxActiveRequests),
  });
  return res.data;
};

// Purpose options (preset reasons a driver picks from)
export const getAllPurposes = async () => {
  const res = await api.get("/cash-advance-settings/purposes/all");
  return res.data;
};

export const createPurpose = async ({ label, sort_order }) => {
  const res = await api.post("/cash-advance-settings/purposes", {
    label,
    sort_order: sort_order ?? 0,
  });
  return res.data;
};

export const updatePurpose = async (purposeId, payload) => {
  const res = await api.patch(
    `/cash-advance-settings/purposes/${purposeId}`,
    payload,
  );
  return res.data;
};

export const deletePurpose = async (purposeId) => {
  const res = await api.delete(
    `/cash-advance-settings/purposes/${purposeId}`,
  );
  return res.data;
};

// Requester-facing: the active purpose presets (mirrors
// tytan_mobile/src/api/driver/cashAdvance.ts's getPurposes).
export const getPurposes = async () => {
  const res = await api.get("/cash-advance-settings/purposes");
  return res.data;
};
