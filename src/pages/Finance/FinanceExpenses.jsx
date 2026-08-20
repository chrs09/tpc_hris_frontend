import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createFinanceExpense,
  getFinanceExpenses,
  updateFinanceExpense,
} from "../../api/financeExpenses";

import ExpenseDrawer from "../../components/financeExpenses/ExpenseDrawer";

const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateOnly = (value) => {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const unique = (items) => [
  ...new Set(items.filter(Boolean)),
];

/*
 * Convert backend snake_case fields into the
 * camelCase fields already used by the UI.
 */
const mapExpenseFromApi = (expense) => ({
  ...expense,

  encodedDate: expense.encoded_date,

  postingPeriod: expense.posting_period,

  poNumber: expense.po_number,

  receiptNumber: expense.receipt_number,

  receiptImage: expense.receipt_image_url,

  unitPrice: expense.unit_price,

  additionalDetails:
    expense.additional_details,

  requestedBy:
    expense.requested_by,

  receivedBy:
    expense.received_by,

  dateCountered:
    expense.date_countered,

  counterNumber:
    expense.counter_number,

  datePaid:
    expense.date_paid,

  checkNumber:
    expense.check_number,

  checkAmount:
    expense.check_amount,

  receiptNumber2:
    expense.receipt_number_2,
});

/*
 * Convert the drawer's camelCase form into
 * FormData expected by FastAPI.
 */
const buildExpenseFormData = (expense) => {
  const formData = new FormData();

  formData.append(
    "posting_period",
    expense.postingPeriod || "",
  );

  formData.append(
    "date",
    expense.date || "",
  );

  formData.append(
    "po_number",
    expense.poNumber || "",
  );

  formData.append(
    "supplier",
    expense.supplier || "",
  );

  formData.append(
    "receipt_number",
    expense.receiptNumber || "",
  );

  formData.append(
    "qty",
    expense.qty ?? 1,
  );

  formData.append(
    "unit",
    expense.unit || "Piece",
  );

  formData.append(
    "particulars",
    expense.particulars || "",
  );

  formData.append(
    "unit_price",
    expense.unitPrice ?? "",
  );

  formData.append(
    "responsible",
    expense.responsible || "",
  );

  formData.append(
    "additional_details",
    expense.additionalDetails || "",
  );

  formData.append(
    "requested_by",
    expense.requestedBy || "",
  );

  formData.append(
    "received_by",
    expense.receivedBy || "",
  );

  formData.append(
    "category",
    expense.category || "",
  );

  formData.append(
    "account",
    expense.account || "",
  );

  formData.append(
    "notes",
    expense.notes || "",
  );

  formData.append(
    "date_countered",
    expense.dateCountered || "",
  );

  formData.append(
    "counter_number",
    expense.counterNumber || "",
  );

  formData.append(
    "date_paid",
    expense.datePaid || "",
  );

  formData.append(
    "bank",
    expense.bank || "",
  );

  formData.append(
    "check_number",
    expense.checkNumber || "",
  );

  formData.append(
    "check_amount",
    expense.checkAmount ?? "",
  );

  formData.append(
    "receipt_number_2",
    expense.receiptNumber2 || "",
  );

  formData.append(
    "status",
    expense.status || "Pending",
  );

  formData.append(
    "ap",
    expense.ap ?? "",
  );

  formData.append(
    "remarks",
    expense.remarks || "",
  );

  /*
   * Only append the image when the user selected
   * a new file.
   *
   * Existing receipt_image_url is already stored
   * in the database, so we don't send it back.
   */
  if (expense.receiptImage instanceof File) {
    formData.append(
      "receipt_image",
      expense.receiptImage,
    );
  }

  return formData;
};

export default function FinanceExpenses() {
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [supplier, setSupplier] =
    useState("All Suppliers");

  const [category, setCategory] =
    useState("All Categories");

  const [status, setStatus] =
    useState("All Status");

  const [month, setMonth] =
    useState("All Months");

  const [selected, setSelected] =
    useState(null);

  const [drawerMode, setDrawerMode] =
    useState("view");

  /*
   * ==========================================
   * LOAD EXPENSES
   * ==========================================
   */

  const loadExpenses = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getFinanceExpenses();

        /*
         * Supports both:
         *
         * response.data
         *
         * and:
         *
         * response.data.data
         *
         * depending on your api_response format.
         */
        const data =
          response?.data?.data ??
          response?.data ??
          [];

        const mapped = Array.isArray(data)
          ? data.map(mapExpenseFromApi)
          : [];

        setRows(mapped);
      } catch (err) {
        console.error(
          "Failed to load finance expenses:",
          err,
        );

        setError(
          err?.response?.data?.detail ||
            "Failed to load expenses.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /*
   * Load when page opens.
   */
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  /*
   * ==========================================
   * FILTER OPTIONS
   * ==========================================
   */

  const suppliers = useMemo(
    () =>
      unique(
        rows.map(
          (r) => r.supplier,
        ),
      ),
    [rows],
  );

  const categories = useMemo(
    () =>
      unique(
        rows.map(
          (r) => r.category,
        ),
      ),
    [rows],
  );

  const statuses = useMemo(
    () =>
      unique(
        rows.map(
          (r) => r.status || "Pending",
        ),
      ),
    [rows],
  );

  const months = useMemo(() => {
    return unique(
      rows.map((r) => {
        if (!r.date) {
          return null;
        }

        const d = new Date(r.date);

        if (
          Number.isNaN(
            d.getTime(),
          )
        ) {
          return null;
        }

        return `${d.getFullYear()}-${String(
          d.getMonth() + 1,
        ).padStart(2, "0")}`;
      }),
    )
      .sort()
      .reverse();
  }, [rows]);

  /*
   * ==========================================
   * FILTERED ROWS
   * ==========================================
   */

  const filtered = useMemo(() => {
    const q =
      search
        .trim()
        .toLowerCase();

    return rows.filter((row) => {
      const haystack = [
        row.receiptNumber,

        row.receiptNumber2,

        row.poNumber,

        row.supplier,

        row.particulars,

        row.responsible,

        row.account,

        row.category,

        row.remarks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const rowMonth = row.date
        ? (() => {
            const d = new Date(
              row.date,
            );

            return Number.isNaN(
              d.getTime(),
            )
              ? ""
              : `${d.getFullYear()}-${String(
                  d.getMonth() + 1,
                ).padStart(2, "0")}`;
          })()
        : "";

      return (
        (!q ||
          haystack.includes(q)) &&

        (supplier ===
          "All Suppliers" ||
          row.supplier ===
            supplier) &&

        (category ===
          "All Categories" ||
          row.category ===
            category) &&

        (status ===
          "All Status" ||
          (row.status ||
            "Pending") ===
            status) &&

        (month ===
          "All Months" ||
          rowMonth ===
            month)
      );
    });
  }, [
    rows,
    search,
    supplier,
    category,
    status,
    month,
  ]);

  /*
   * ==========================================
   * SUMMARY
   * ==========================================
   */

  const total = filtered.reduce(
    (sum, row) =>
      sum +
      Number(
        row.amount || 0,
      ),
    0,
  );

  const paid = filtered
    .filter(
      (row) =>
        row.datePaid ||
        row.status === "Paid",
    )
    .reduce(
      (sum, row) =>
        sum +
        Number(
          row.amount || 0,
        ),
      0,
    );

  const pending = total - paid;

  /*
   * ==========================================
   * DRAWER
   * ==========================================
   */

  const openCreate = () => {
    setSelected(null);
    setDrawerMode("create");
    setError("");
  };

  const openView = (row) => {
    setSelected(row);
    setDrawerMode("view");
    setError("");
  };

  const openEdit = (row) => {
    setSelected(row);
    setDrawerMode("edit");
    setError("");
  };

  /*
   * ==========================================
   * SAVE EXPENSE
   * ==========================================
   */

  const handleSave = async (
    expense,
  ) => {
    try {
      setSaving(true);
      setError("");

      const formData =
        buildExpenseFormData(
          expense,
        );

      /*
       * CREATE
       */
      if (!expense.id) {
        await createFinanceExpense(
          formData,
        );
      }

      /*
       * UPDATE
       */
      else {
        await updateFinanceExpense(
          expense.id,
          formData,
        );
      }

      /*
       * Reload from database.
       *
       * This is important because the database
       * generates the ID, timestamps and
       * receipt_image_url.
       */
      await loadExpenses();

      setSelected(null);
      setDrawerMode("view");
    } catch (err) {
      console.error(
        "Failed to save finance expense:",
        err,
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to save expense.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-400">
        {/* ======================================
            HEADER
        ====================================== */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Finance
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Expenses
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track expense entries,
              countering, payments,
              and accounts payable.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            + Add Expense
          </button>
        </div>

        {/* ======================================
            ERROR
        ====================================== */}

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="ml-4 font-semibold text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* ======================================
            SUMMARY
        ====================================== */}

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Total Expenses"
            value={money(total)}
          />

          <SummaryCard
            label="Paid"
            value={money(paid)}
          />

          <SummaryCard
            label="Pending AP"
            value={money(pending)}
          />
        </div>

        {/* ======================================
            TABLE CARD
        ====================================== */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Filters */}
          <div className="border-b border-slate-200 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
                placeholder="Search receipt, supplier, particulars..."
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 lg:col-span-2"
              />

              <Filter
                value={supplier}
                onChange={
                  setSupplier
                }
                options={[
                  "All Suppliers",
                  ...suppliers,
                ]}
              />

              <Filter
                value={category}
                onChange={
                  setCategory
                }
                options={[
                  "All Categories",
                  ...categories,
                ]}
              />

              <Filter
                value={status}
                onChange={
                  setStatus
                }
                options={[
                  "All Status",
                  ...statuses,
                ]}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Posting month:
              </span>

              <Filter
                value={month}
                onChange={setMonth}
                options={[
                  "All Months",
                  ...months,
                ]}
              />

              <span className="ml-auto text-xs text-slate-400">
                Showing{" "}
                {filtered.length}{" "}
                of {rows.length}{" "}
                expenses
              </span>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
              Loading expenses...
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-275 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Receipt #
                  </th>

                  <th className="px-4 py-3">
                    Supplier
                  </th>

                  <th className="px-4 py-3">
                    Particulars
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Account
                  </th>

                  <th className="px-4 py-3 text-right">
                    Qty.
                  </th>

                  <th className="px-4 py-3 text-right">
                    Unit Price
                  </th>

                  <th className="px-4 py-3 text-right">
                    Amount
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  filtered.map(
                    (row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {dateOnly(
                            row.date,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-800">
                          {row.receiptNumber ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {row.supplier ||
                            "—"}
                        </td>

                        <td className="max-w-70 px-4 py-3 text-sm text-slate-700">
                          <div
                            className="truncate"
                            title={
                              row.particulars ||
                              ""
                            }
                          >
                            {row.particulars ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {row.category ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {row.account ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {row.qty ??
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {money(
                            row.unitPrice,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                          {money(
                            row.amount,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            status={
                              row.status ||
                              "Pending"
                            }
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openView(
                                  row,
                                )
                              }
                              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  row,
                                )
                              }
                              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}

                {!loading &&
                  filtered.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-16 text-center"
                      >
                        <p className="text-sm font-medium text-slate-700">
                          {rows.length ===
                          0
                            ? "No expenses yet"
                            : "No expenses found"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {rows.length ===
                          0
                            ? "Click Add Expense to create your first expense."
                            : "Try changing your filters or search term."}
                        </p>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================
          DRAWER
      ======================================== */}

      <ExpenseDrawer
        key={`${drawerMode}-${selected?.id ?? "new"}`}
        open={
          drawerMode !== "view" ||
          Boolean(selected)
        }
        expense={selected}
        mode={drawerMode}
        onClose={() => {
          setSelected(null);
          setDrawerMode("view");
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

/*
 * ============================================
 * SUMMARY CARD
 * ============================================
 */

function SummaryCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/*
 * ============================================
 * FILTER
 * ============================================
 */

function Filter({
  value,
  onChange,
  options,
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(
          e.target.value,
        )
      }
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
    >
      {options.map(
        (option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ),
      )}
    </select>
  );
}

/*
 * ============================================
 * STATUS BADGE
 * ============================================
 */

function StatusBadge({
  status,
}) {
  const styles = {
    Paid:
      "bg-emerald-50 text-emerald-700 border-emerald-100",

    Pending:
      "bg-amber-50 text-amber-700 border-amber-100",

    Cancelled:
      "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] ||
        styles.Pending
      }`}
    >
      {status}
    </span>
  );
}