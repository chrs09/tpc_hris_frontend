// Draft -> Generated -> For Review -> Contributions -> Head Review ->
// Approved -> Locked -> Paid. Contributions: Payroll -> Government
// Contributions edits SSS / PhilHealth / Pag-IBIG / tax only, then sends
// it to the head (Approve & Return), who approves.
export const PAYROLL_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "GENERATED", label: "Generated", stamp: "generated" },
  { key: "FOR_REVIEW", label: "For Review", stamp: "submitted" },
  { key: "CONTRIBUTIONS", label: "Contributions", stamp: "reviewed" },
  { key: "HEAD_REVIEW", label: "Head Review", stamp: "contributions" },
  { key: "APPROVED", label: "Approved", stamp: "approved" },
  { key: "LOCKED", label: "Locked", stamp: "locked" },
  { key: "PAID", label: "Paid", stamp: "paid" },
];

export const payrollStatusLabel = (status) =>
  PAYROLL_STEPS.find((step) => step.key === status)?.label || "Draft";
