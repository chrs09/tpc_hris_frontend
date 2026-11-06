import { useCallback, useEffect, useState } from "react";
import { getMyTripExpenses } from "../../api/tripExpenses";
import TripExpenseDetail from "./TripExpenseDetail";
import TripExpenseFileModal from "./TripExpenseFileModal";
import TripExpenseRow from "./TripExpenseRow";

// The driver's own trip budgets and expense reports (driver dashboard):
// request a budget / start a report, liquidate, attach receipts, submit.
// Returns { button, content } so the dashboard can place the "+ New"
// button in its card header.
export default function useMyTripExpenses() {
  const [expenses, setExpenses] = useState(null);
  const [filing, setFiling] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      setExpenses(await getMyTripExpenses());
    } catch {
      setExpenses([]);
    }
  }, []);

  useEffect(() => {
    getMyTripExpenses()
      .then(setExpenses)
      .catch(() => setExpenses([]));
  }, []);

  const button = (
    <button
      type="button"
      onClick={() => setFiling(true)}
      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
    >
      + New
    </button>
  );

  const content = (
    <>
      {expenses === null ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : expenses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-hover p-5 text-center text-sm text-fg-muted">
          No trip budgets or expense reports yet.
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.slice(0, 10).map((expense) => (
            <TripExpenseRow key={expense.id} expense={expense} onOpen={setOpen} />
          ))}
        </div>
      )}

      {filing && (
        <TripExpenseFileModal
          onClose={() => setFiling(false)}
          onFiled={async (created) => {
            await load();
            // A report goes straight to attaching receipts.
            if (created?.kind === "report") setOpen(created);
          }}
        />
      )}
      {open && (
        <TripExpenseDetail
          expense={open}
          mode="driver"
          onClose={() => setOpen(null)}
          onChanged={async (updated) => {
            await load();
            if (updated?.id) setOpen(updated);
          }}
        />
      )}
    </>
  );

  return { button, content };
}
