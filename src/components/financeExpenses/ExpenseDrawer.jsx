import { useMemo, useState } from "react";

const emptyExpense = {
  date: "",
  postingPeriod: "",
  poNumber: "",
  supplier: "",
  receiptNumber: "",
  receiptImage: null,

  qty: 1,
  unit: "Piece",
  particulars: "",
  unitPrice: "",
  amount: "",

  responsible: "",
  additionalDetails: "",
  requestedBy: "",
  receivedBy: "",

  category: "Others",
  account: "CST",
  notes: "",

  dateCountered: "",
  counterNumber: "",

  datePaid: "",
  bank: "",
  checkNumber: "",
  checkAmount: "",
  receiptNumber2: "",

  status: "Pending",
  ap: "",
  remarks: "",
};

const units = [
  "Piece",
  "Unit",
  "Set",
  "Box",
  "Pack",
  "Bottle",
  "Can",
  "Liter",
  "Meter",
  "Kilogram",
  "Gram",
  "Hour",
  "Day",
  "Trip",
  "Job",
  "Other",
];

const categories = [
  "Others",
  "Supplies",
  "Auto parts",
  "Legal",
  "Tires",
];

const accounts = ["CST", "Tytan"];

const statuses = [
  "Pending",
  "Paid",
  "Cancelled",
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder = "",
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <input
        type={type}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export default function ExpenseDrawer({
  open,
  expense,
  mode = "view",
  onClose,
  onSave,
  saving = false,
}) {
  /*
   * The parent should give this component a key based on
   * mode + expense.id.
   *
   * That allows us to initialize the form directly from
   * the selected expense without useEffect.
   */
  const [form, setForm] = useState(() => ({
    ...emptyExpense,
    ...(expense || {}),
  }));

  const isView = mode === "view";

  const update = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /*
   * Calculate amount automatically.
   */
  const calculatedAmount = useMemo(() => {
    const qty = Number(form.qty || 0);
    const unitPrice = Number(form.unitPrice || 0);

    return qty * unitPrice;
  }, [form.qty, form.unitPrice]);

  /*
   * Image preview.
   *
   * If the backend gave us a URL, use it directly.
   *
   * If the user selected a new File, create an object URL.
   */
  const previewUrl = useMemo(() => {
    if (!form.receiptImage) {
      return null;
    }

    if (typeof form.receiptImage === "string") {
      return form.receiptImage;
    }

    if (form.receiptImage instanceof File) {
      return URL.createObjectURL(form.receiptImage);
    }

    return null;
  }, [form.receiptImage]);

  /*
   * Important:
   *
   * We don't store previewUrl in state, so there is no
   * setState() inside an effect.
   */

  if (!open) {
    return null;
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    update("receiptImage", file);
  };

  const removeImage = () => {
    update("receiptImage", null);
  };

  const save = () => {
    const amount = Number.isFinite(calculatedAmount)
      ? calculatedAmount
      : 0;

    onSave({
      ...form,
      amount,
      id: expense?.id,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close expense drawer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30"
      />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Finance / Expenses
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {mode === "create"
                ? "Add Expense"
                : form.receiptNumber ||
                  `Expense #${form.id}`}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {mode === "create"
                ? "Create a new expense record."
                : isView
                  ? "Review the expense information."
                  : "Update the expense information."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* ==============================
              EXPENSE DETAILS
          ============================== */}

          <Section title="Expense Details">
            <Field
              label="Date"
              type="date"
              disabled={isView}
              value={form.date?.slice(0, 10)}
              onChange={(value) =>
                update("date", value)
              }
            />

            <Field
              label="Posting Period"
              disabled={isView}
              value={form.postingPeriod}
              onChange={(value) =>
                update("postingPeriod", value)
              }
            />

            <Field
              label="PO #"
              disabled={isView}
              value={form.poNumber}
              onChange={(value) =>
                update("poNumber", value)
              }
            />

            <Field
              label="Supplier"
              disabled={isView}
              value={form.supplier}
              onChange={(value) =>
                update("supplier", value)
              }
            />

            <Field
              label="Receipt #"
              disabled={isView}
              value={form.receiptNumber}
              onChange={(value) =>
                update("receiptNumber", value)
              }
            />

            {/* Receipt Image */}
            <div className="md:col-span-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500">
                  Receipt / Expense Image
                </span>

                {!isView && (
                  <input
                    type="file"
                    accept="image/*"
                    disabled={saving}
                    onChange={handleImageChange}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                )}

                {previewUrl ? (
                  <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={previewUrl}
                      alt="Expense receipt"
                      className="max-h-72 w-full object-contain"
                    />

                    {!isView && (
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={saving}
                        className="absolute right-2 top-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                    No receipt image uploaded.
                  </div>
                )}
              </label>
            </div>

            <Field
              label="Particulars"
              disabled={isView}
              value={form.particulars}
              onChange={(value) =>
                update("particulars", value)
              }
            />

            <Field
              label="Qty."
              type="number"
              disabled={isView}
              value={form.qty}
              onChange={(value) =>
                update("qty", value)
              }
            />

            <SelectField
              label="Unit"
              disabled={isView}
              value={form.unit}
              options={units}
              onChange={(value) =>
                update("unit", value)
              }
            />

            <Field
              label="Unit Price"
              type="number"
              disabled={isView}
              value={form.unitPrice}
              onChange={(value) =>
                update("unitPrice", value)
              }
            />

            <Field
              label="Amount"
              type="number"
              disabled
              value={
                calculatedAmount ||
                form.amount ||
                ""
              }
              onChange={() => {}}
            />

            <Field
              label="Responsible"
              disabled={isView}
              value={form.responsible}
              onChange={(value) =>
                update("responsible", value)
              }
            />

            <Field
              label="Additional Details"
              disabled={isView}
              value={form.additionalDetails}
              onChange={(value) =>
                update("additionalDetails", value)
              }
            />

            <SelectField
              label="Category"
              disabled={isView}
              value={form.category}
              options={categories}
              onChange={(value) =>
                update("category", value)
              }
            />

            <SelectField
              label="Account"
              disabled={isView}
              value={form.account}
              options={accounts}
              onChange={(value) =>
                update("account", value)
              }
            />
          </Section>

          {/* ==============================
              REQUEST / RECEIVING
          ============================== */}

          <Section title="Request / Receiving">
            <Field
              label="Requested By"
              disabled={isView}
              value={form.requestedBy}
              onChange={(value) =>
                update("requestedBy", value)
              }
            />

            <Field
              label="Received By"
              disabled={isView}
              value={form.receivedBy}
              onChange={(value) =>
                update("receivedBy", value)
              }
            />

            <div className="md:col-span-2">
              <Field
                label="Notes"
                disabled={isView}
                value={form.notes}
                onChange={(value) =>
                  update("notes", value)
                }
              />
            </div>
          </Section>

          {/* ==============================
              COUNTERING
          ============================== */}

          <Section title="Countering">
            <Field
              label="Date Countered"
              type="date"
              disabled={isView}
              value={form.dateCountered?.slice(
                0,
                10,
              )}
              onChange={(value) =>
                update("dateCountered", value)
              }
            />

            <Field
              label="Counter #"
              disabled={isView}
              value={form.counterNumber}
              onChange={(value) =>
                update("counterNumber", value)
              }
            />
          </Section>

          {/* ==============================
              PAYMENT
          ============================== */}

          <Section title="Payment">
            <Field
              label="Date Paid"
              type="date"
              disabled={isView}
              value={form.datePaid?.slice(0, 10)}
              onChange={(value) =>
                update("datePaid", value)
              }
            />

            <Field
              label="Bank"
              disabled={isView}
              value={form.bank}
              onChange={(value) =>
                update("bank", value)
              }
            />

            <Field
              label="Check #"
              disabled={isView}
              value={form.checkNumber}
              onChange={(value) =>
                update("checkNumber", value)
              }
            />

            <Field
              label="Check Amount"
              type="number"
              disabled={isView}
              value={form.checkAmount}
              onChange={(value) =>
                update("checkAmount", value)
              }
            />

            <Field
              label="Receipt #2"
              disabled={isView}
              value={form.receiptNumber2}
              onChange={(value) =>
                update("receiptNumber2", value)
              }
            />
          </Section>

          {/* ==============================
              ACCOUNTS PAYABLE
          ============================== */}

          <Section title="Accounts Payable">
            <SelectField
              label="Status"
              disabled={isView}
              value={form.status || "Pending"}
              options={statuses}
              onChange={(value) =>
                update("status", value)
              }
            />

            <Field
              label="AP"
              type="number"
              disabled={isView}
              value={form.ap}
              onChange={(value) =>
                update("ap", value)
              }
            />

            <div className="md:col-span-2">
              <Field
                label="Remarks"
                disabled={isView}
                value={form.remarks}
                onChange={(value) =>
                  update("remarks", value)
                }
              />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isView ? "Close" : "Cancel"}
          </button>

          {!isView && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Save Expense"
                  : "Save Changes"}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}