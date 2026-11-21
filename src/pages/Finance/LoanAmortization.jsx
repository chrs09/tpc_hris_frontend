import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import SearchSelect from "../../components/SearchSelect";
import StatusPill from "../../components/ui/statusPill/StatusPill";
import { TABLE_HEAD, TABLE_ROW, TABLE_WRAP } from "../../components/ui/table/tableStyles";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";
import {
  addLoanPayment,
  createLoan,
  deleteLoan,
  getLoanEmployees,
  getLoanPayments,
  getLoans,
  setLoanStatus,
  updateLoan,
} from "../../api/loanAmortization";

// Finance -> Loan Amortization: SSS and Pag-IBIG loans payroll pays down.
// Enter the amount borrowed, the monthly amortization and the terms; each
// pay run's Deductions step takes the amortization (split across the two
// cutoffs, or on the 15th / month end) until amortization x terms is paid.

const TYPES = { SSS: "SSS", PAGIBIG: "Pag-IBIG" };
const SCHEDULES = [
  { key: "SPLIT", label: "Split", hint: "Half on each cutoff" },
  { key: "FIRST", label: "15th", hint: "All on the cutoff with the 15th" },
  { key: "SECOND", label: "Month end", hint: "All on the cutoff with the last day" },
];
const STATUS_TONE = { ACTIVE: "primary", PAID: "success", CANCELLED: "neutral" };
const STATUS_LABEL = { ACTIVE: "Active", PAID: "Paid", CANCELLED: "Cancelled" };

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabel = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : "—";
const cutoffLabel = (c) => (c ? c.replace("_", " to ") : "Outside payroll");
const errorText = (err, fallback) => err?.response?.data?.detail || fallback;

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const thisMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = () => ({
  employee_id: "",
  loan_type: "SSS",
  reference_no: "",
  loan_amount: "",
  monthly_amortization: "",
  terms_months: "24",
  start_month: thisMonth(),
  deduct_schedule: "SPLIT",
  opening_paid: "",
  notes: "",
});

export default function LoanAmortization() {
  const canEdit = usePageCanEdit();
  const [loans, setLoans] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // { id?, ...fields } | null
  const [saving, setSaving] = useState(false);
  const [paymentsFor, setPaymentsFor] = useState(null); // loan row

  const load = () =>
    getLoans()
      .then(setLoans)
      .catch((err) => {
        toast.error(errorText(err, "Couldn't load loans."));
        setLoans([]);
      });

  useEffect(() => {
    load();
    getLoanEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const shown = useMemo(
    () =>
      (loans || []).filter(
        (l) =>
          (type === "ALL" || l.loan_type === type) &&
          (status === "ALL" || l.status === status) &&
          matchesSearch(search, l.employee_name, l.department, l.reference_no),
      ),
    [loans, type, status, search],
  );

  const active = (loans || []).filter((l) => l.status === "ACTIVE" && (type === "ALL" || l.loan_type === type));
  const summary = [
    ["Active loans", String(active.length)],
    ["Monthly amortization", peso(active.reduce((s, l) => s + l.monthly_amortization, 0))],
    ["Balance left", peso(active.reduce((s, l) => s + l.balance, 0))],
  ];

  const replace = (row) => setLoans((prev) => prev.map((l) => (l.id === row.id ? row : l)));

  const openEdit = (loan) =>
    setForm({
      id: loan.id,
      has_payments: loan.payments > 0,
      employee_id: loan.employee_id,
      loan_type: loan.loan_type,
      reference_no: loan.reference_no || "",
      loan_amount: String(loan.loan_amount),
      monthly_amortization: String(loan.monthly_amortization),
      terms_months: String(loan.terms_months),
      start_month: (loan.start_date || "").slice(0, 7),
      deduct_schedule: loan.deduct_schedule,
      opening_paid: loan.opening_paid ? String(loan.opening_paid) : "",
      notes: loan.notes || "",
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) return toast.error("Pick the employee.");
    const payload = {
      employee_id: Number(form.employee_id),
      loan_type: form.loan_type,
      reference_no: form.reference_no,
      loan_amount: Number(form.loan_amount),
      monthly_amortization: Number(form.monthly_amortization),
      terms_months: Number(form.terms_months),
      start_date: `${form.start_month}-01`,
      deduct_schedule: form.deduct_schedule,
      opening_paid: Number(form.opening_paid || 0),
      notes: form.notes,
    };
    setSaving(true);
    try {
      if (form.id) {
        replace(await updateLoan(form.id, payload));
        toast.success("Loan updated.");
      } else {
        const row = await createLoan(payload);
        setLoans((prev) => [row, ...prev]);
        toast.success("Loan added. Payroll starts deducting it from the start month.");
      }
      setForm(null);
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the loan."));
    } finally {
      setSaving(false);
    }
  };

  const toggleCancel = async (loan) => {
    const cancelling = loan.status !== "CANCELLED";
    const ok = await confirmDialog(
      cancelling
        ? `Stop deducting ${loan.employee_name}'s ${TYPES[loan.loan_type]} loan? Payments so far stay on record.`
        : `Reopen ${loan.employee_name}'s ${TYPES[loan.loan_type]} loan? Payroll deducts it again.`,
      { confirmText: cancelling ? "Cancel loan" : "Reopen" },
    );
    if (!ok) return;
    try {
      replace(await setLoanStatus(loan.id, cancelling ? "CANCELLED" : "ACTIVE"));
    } catch (err) {
      toast.error(errorText(err, "Couldn't update the loan."));
    }
  };

  const remove = async (loan) => {
    const ok = await confirmDialog(`Delete ${loan.employee_name}'s ${TYPES[loan.loan_type]} loan? It was never deducted.`, {
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      await deleteLoan(loan.id);
      setLoans((prev) => prev.filter((l) => l.id !== loan.id));
    } catch (err) {
      toast.error(errorText(err, "Couldn't delete the loan."));
    }
  };

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const formTotal = Number(form?.monthly_amortization || 0) * Number(form?.terms_months || 0);
  const perCutoff =
    form?.deduct_schedule === "SPLIT"
      ? Number(form?.monthly_amortization || 0) / 2
      : Number(form?.monthly_amortization || 0);

  return (
    <div className="space-y-5">
      <SectionTabs group="Finance" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Loan Amortization</h1>
          <p className="mt-1 max-w-3xl text-sm text-fg-subtle">
            SSS and Pag-IBIG loans that payroll pays down. Each pay run&apos;s Deductions step takes the
            monthly amortization until it&apos;s paid (amortization &times; terms).
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setForm(emptyForm())}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            + Add loan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-fg-subtle">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {[["ALL", "All"], ["SSS", "SSS"], ["PAGIBIG", "Pag-IBIG"]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`rounded-md px-3 py-1.5 ${type === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {[["ACTIVE", "Active"], ["PAID", "Paid"], ["CANCELLED", "Cancelled"], ["ALL", "All"]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`rounded-md px-3 py-1.5 ${status === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search employee, department, ref no..." />
      </div>

      <div className={TABLE_WRAP}>
        <table className="w-full min-w-[1050px] text-sm">
          <thead className={TABLE_HEAD}>
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Loan</th>
              <th className="px-4 py-3 text-right">Loan amount</th>
              <th className="px-4 py-3 text-right">Monthly</th>
              <th className="px-4 py-3 text-left">Terms</th>
              <th className="px-4 py-3 text-left">Balance</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans === null ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-fg-subtle">
                  Loading...
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-fg-subtle">
                  {loans.length ? "No loans match." : "No loans yet. Add one to start deducting it in payroll."}
                </td>
              </tr>
            ) : (
              shown.map((loan) => {
                const pct = loan.total_payable ? Math.min((loan.total_paid / loan.total_payable) * 100, 100) : 0;
                return (
                  <tr key={loan.id} className={`${TABLE_ROW} align-top`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{loan.employee_name}</p>
                      <p className="text-xs text-fg-subtle">{loan.department || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{TYPES[loan.loan_type]}</p>
                      <p className="text-xs text-fg-subtle">{loan.reference_no || "No ref no."}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{peso(loan.loan_amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="tabular-nums">{peso(loan.monthly_amortization)}</p>
                      <p className="text-xs text-fg-subtle">
                        {SCHEDULES.find((s) => s.key === loan.deduct_schedule)?.label}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-fg">
                        {loan.terms_months} mo{" "}
                        <span className="text-xs text-fg-subtle">from {monthLabel(loan.start_date)}</span>
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {loan.months_paid} paid · {loan.months_left} left
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold tabular-nums text-fg">{peso(loan.balance)}</p>
                      <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-surface-active">
                        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {peso(loan.total_paid)} of {peso(loan.total_payable)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={STATUS_TONE[loan.status]}>{STATUS_LABEL[loan.status]}</StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPaymentsFor(loan)}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
                        >
                          Payments ({loan.payments})
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(loan)}
                              className="rounded-lg border border-primary/50 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              Edit
                            </button>
                            {loan.status !== "PAID" && (
                              <button
                                type="button"
                                onClick={() => toggleCancel(loan)}
                                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover"
                              >
                                {loan.status === "CANCELLED" ? "Reopen" : "Cancel"}
                              </button>
                            )}
                            {loan.payments === 0 && (
                              <button
                                type="button"
                                onClick={() => remove(loan)}
                                className="rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && !saving && setForm(null)}
        >
          <form
            onSubmit={submit}
            className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
          >
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-fg">{form.id ? "Edit loan" : "Add loan"}</h2>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Employee</label>
                <SearchSelect
                  value={employees.find((e) => String(e.id) === String(form.employee_id)) || null}
                  options={employees}
                  onChange={(emp) => setForm((prev) => ({ ...prev, employee_id: emp?.id || "" }))}
                  placeholder="Search employee..."
                  getOptionLabel={(e) => (e ? `${e.name}${e.department ? ` · ${e.department}` : ""}` : "")}
                  getOptionValue={(e) => e?.id}
                  disabled={form.has_payments}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Loan type</label>
                  <div className="flex rounded-lg border border-border p-0.5 text-sm">
                    {Object.entries(TYPES).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={form.has_payments}
                        onClick={() => setForm((prev) => ({ ...prev, loan_type: key }))}
                        className={`flex-1 rounded-md px-3 py-1.5 disabled:opacity-60 ${
                          form.loan_type === key ? "bg-primary/10 font-semibold text-primary" : "text-fg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="loan-ref" className="mb-1 block text-xs font-medium text-fg-muted">
                    Reference no. (optional)
                  </label>
                  <input id="loan-ref" value={form.reference_no} onChange={set("reference_no")} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="loan-amount" className="mb-1 block text-xs font-medium text-fg-muted">
                    Loaned amount
                  </label>
                  <input id="loan-amount" type="number" min="0.01" step="0.01" required value={form.loan_amount} onChange={set("loan_amount")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="loan-monthly" className="mb-1 block text-xs font-medium text-fg-muted">
                    Monthly amortization
                  </label>
                  <input id="loan-monthly" type="number" min="0.01" step="0.01" required value={form.monthly_amortization} onChange={set("monthly_amortization")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="loan-terms" className="mb-1 block text-xs font-medium text-fg-muted">
                    Terms (months)
                  </label>
                  <input id="loan-terms" type="number" min="1" max="600" step="1" required value={form.terms_months} onChange={set("terms_months")} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="loan-start" className="mb-1 block text-xs font-medium text-fg-muted">
                    First deduction month
                  </label>
                  <input id="loan-start" type="month" required value={form.start_month} onChange={set("start_month")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="loan-opening" className="mb-1 block text-xs font-medium text-fg-muted">
                    Already paid (optional)
                  </label>
                  <input
                    id="loan-opening"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.opening_paid}
                    onChange={set("opening_paid")}
                    placeholder="Paid before this system"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">When payroll deducts it</label>
                <div className="grid grid-cols-3 gap-2">
                  {SCHEDULES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, deduct_schedule: s.key }))}
                      className={`rounded-lg border px-3 py-2 text-left ${
                        form.deduct_schedule === s.key ? "border-primary bg-primary/10" : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${form.deduct_schedule === s.key ? "text-primary" : "text-fg"}`}>{s.label}</p>
                      <p className="text-[11px] text-fg-subtle">{s.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="loan-notes" className="mb-1 block text-xs font-medium text-fg-muted">
                  Notes (optional)
                </label>
                <input id="loan-notes" value={form.notes} onChange={set("notes")} maxLength={300} className={inputCls} />
              </div>

              {formTotal > 0 && (
                <div className="rounded-lg border border-border bg-surface-hover/60 px-3 py-2 text-xs text-fg-muted">
                  Total to pay: <strong className="text-fg">{peso(formTotal)}</strong> ({form.terms_months} &times;{" "}
                  {peso(form.monthly_amortization)})
                  {Number(form.opening_paid || 0) > 0 && <> · left {peso(formTotal - Number(form.opening_paid))}</>}
                  <br />
                  Semi-monthly pay groups: {peso(perCutoff)}{" "}
                  {form.deduct_schedule === "SPLIT" ? "each cutoff" : `on the ${form.deduct_schedule === "FIRST" ? "1st" : "2nd"} cutoff`}
                  , from {monthLabel(`${form.start_month}-01`)}.
                </div>
              )}
              {form.has_payments && (
                <p className="text-xs text-fg-subtle">
                  Payroll already deducted this loan, so the employee and loan type can&apos;t change.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={saving}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? "Saving..." : form.id ? "Save changes" : "Add loan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {paymentsFor && (
        <PaymentsModal
          loan={paymentsFor}
          canEdit={canEdit}
          onClose={() => setPaymentsFor(null)}
          onChanged={replace}
        />
      )}
    </div>
  );
}

function PaymentsModal({ loan, canEdit, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    getLoanPayments(loan.id)
      .then(setData)
      .catch((err) => {
        toast.error(errorText(err, "Couldn't load payments."));
        onClose();
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan.id]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      onChanged(await addLoanPayment(loan.id, Number(amount), note));
      setAmount("");
      setNote("");
      await load();
      toast.success("Payment recorded.");
    } catch (err) {
      toast.error(errorText(err, "Couldn't record the payment."));
    } finally {
      setSaving(false);
    }
  };

  const current = data?.loan || loan;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {current.employee_name} · {TYPES[current.loan_type]} loan
            </h2>
            <p className="text-xs text-fg-subtle">
              Paid {peso(current.total_paid)} of {peso(current.total_payable)} · balance {peso(current.balance)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-fg-subtle hover:bg-surface-hover hover:text-fg"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {current.opening_paid > 0 && (
            <p className="mb-2 text-xs text-fg-subtle">Already paid before this system: {peso(current.opening_paid)}</p>
          )}
          {!data ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : data.payments.length === 0 ? (
            <p className="text-sm text-fg-subtle">No payments yet. Payroll records one each cutoff it deducts.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {data.payments.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-fg">{cutoffLabel(p.cutoff_period)}</p>
                    <p className="text-xs text-fg-subtle">
                      {[p.note, p.recorded_by].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums text-fg">{peso(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {canEdit && current.balance > 0 && current.status !== "CANCELLED" && (
          <form onSubmit={add} className="space-y-2 border-t border-border px-5 py-3">
            <p className="text-xs font-medium text-fg-muted">Record a payment made outside payroll</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={current.balance}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                aria-label="Payment amount"
                className={`${inputCls} w-32`}
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (e.g. paid at SSS branch)"
                aria-label="Payment note"
                maxLength={200}
                className={`${inputCls} min-w-0 flex-1`}
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
