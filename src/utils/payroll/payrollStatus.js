// Draft -> Generated -> For Review -> Approved -> Locked -> Paid.
export const PAYROLL_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "GENERATED", label: "Generated", stamp: "generated" },
  { key: "FOR_REVIEW", label: "For Review", stamp: "submitted" },
  { key: "APPROVED", label: "Approved", stamp: "approved" },
  { key: "LOCKED", label: "Locked", stamp: "locked" },
  { key: "PAID", label: "Paid", stamp: "paid" },
];

export const payrollStatusLabel = (status) =>
  PAYROLL_STEPS.find((step) => step.key === status)?.label || "Draft";
