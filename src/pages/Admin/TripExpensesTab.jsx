import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getEmployeeList } from "../../api/employee";
import {
  getTripExpenses,
  getTripExpensesForMyApproval,
} from "../../api/tripExpenses";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import TripExpenseDetail from "../../components/tripExpenses/TripExpenseDetail";
import TripExpenseFileModal from "../../components/tripExpenses/TripExpenseFileModal";
import TripExpenseRow from "../../components/tripExpenses/TripExpenseRow";
import useModuleAccess from "../../hooks/useModuleAccess";
import { matchesSearch } from "../../utils/search";

const FILTERS = [
  { value: "needs_action", label: "To do" },
  { value: "open", label: "Open" },
  { value: "", label: "All" },
];

// Approvals -> Trip Expenses: drivers' trip budgets and expense reports.
// Org Chart heads (Trip Expenses ticked) approve budgets; Finance (Finance
// -> Trip Expenses) releases budgets, reviews liquidations / reports and
// settles them, and can file for a driver.
export default function TripExpensesTab() {
  const { role, isVisible } = useModuleAccess();
  const isFinance =
    role === "superadmin" ||
    isVisible({ moduleKey: "finance.trip_expenses", roles: ["superadmin", "admin"] });

  const [mine, setMine] = useState([]);
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("needs_action");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const [filing, setFiling] = useState(false);
  const [employees, setEmployees] = useState([]);

  const fetchAll = useCallback(
    () =>
      Promise.all([
        getTripExpensesForMyApproval(),
        isFinance ? getTripExpenses(filter) : Promise.resolve(null),
      ]),
    [isFinance, filter],
  );
  const apply = ([forMe, all]) => {
    setMine(forMe);
    setRows(all);
  };
  const fail = (error) => {
    toast.error(error?.response?.data?.detail || "Could not load trip expenses.");
    setRows([]);
  };
  const load = () => fetchAll().then(apply).catch(fail);

  useEffect(() => {
    fetchAll().then(apply).catch(fail);
  }, [fetchAll]);

  useEffect(() => {
    if (!isFinance) return;
    getEmployeeList()
      .then((list) =>
        setEmployees(
          list.map((e) => ({
            value: e.id,
            label: `${e.first_name || ""} ${e.last_name || ""}`.trim() + (e.department ? ` · ${e.department}` : ""),
          })),
        ),
      )
      .catch(() => setEmployees([]));
  }, [isFinance]);

  const shown = useMemo(
    () =>
      (rows || []).filter((r) =>
        matchesSearch(search, r.employee_name, r.trip_label, r.purpose, r.vehicle_unit_label),
      ),
    [rows, search],
  );

  const mode = (expense) =>
    isFinance && expense.status !== "pending_approval" ? "finance" : "approver";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Trip Expenses</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Drivers&apos; trip budgets (released, then liquidated) and expense reports
            (reimbursed with payroll).
          </p>
        </div>
        {isFinance && (
          <button
            type="button"
            onClick={() => setFiling(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            + File for a driver
          </button>
        )}
      </div>

      {mine.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-fg">Waiting for my approval ({mine.length})</h2>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {mine.map((expense) => (
              <TripExpenseRow key={expense.id} expense={expense} onOpen={(e) => setOpen({ e, mode: "approver" })} showName />
            ))}
          </div>
        </section>
      )}

      {isFinance ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5 text-sm">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`rounded-md px-3 py-1.5 ${
                    filter === f.value ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search driver, trip, purpose..." />
          </div>
          {rows === null ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
              {filter === "needs_action" ? "Nothing to release or review." : "No trip expenses."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {shown.map((expense) => (
                <TripExpenseRow
                  key={expense.id}
                  expense={expense}
                  onOpen={(e) => setOpen({ e, mode: mode(e) })}
                  showName
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        mine.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-subtle">
            No trip budgets waiting for your approval.
          </div>
        )
      )}

      {filing && (
        <TripExpenseFileModal
          employees={employees}
          onClose={() => setFiling(false)}
          onFiled={async (created) => {
            await load();
            if (created) setOpen({ e: created, mode: "finance" });
          }}
        />
      )}
      {open && (
        <TripExpenseDetail
          expense={open.e}
          mode={open.mode}
          onClose={() => setOpen(null)}
          onChanged={async (updated) => {
            await load();
            if (updated?.id) setOpen({ e: updated, mode: open.mode === "approver" && isFinance && updated.status !== "pending_approval" ? "finance" : open.mode });
          }}
        />
      )}
    </div>
  );
}
