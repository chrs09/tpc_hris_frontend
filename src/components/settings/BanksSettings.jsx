import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { addBank, deleteBank, getBanks, updateBank } from "../../api/banks";
import { confirmDialog, promptDialog } from "../ui/dialog/dialogService";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// Settings -> Banks: the choices for Bank Type on the employee 201 form.
// Hide keeps a bank on employees who already use it; Delete is only for
// banks nobody uses.
export default function BanksSettings() {
  const canEditPage = usePageCanEdit();
  const [banks, setBanks] = useState(null);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    getBanks({ includeHidden: true })
      .then(setBanks)
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setBanks([]);
      });

  useEffect(() => {
    getBanks({ includeHidden: true })
      .then(setBanks)
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setBanks([]);
      });
  }, []);

  const run = async (id, action, success) => {
    try {
      setBusyId(id);
      await action();
      if (success) toast.success(success);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    run("new", () => addBank(name), `${name} added.`).then(() => setNewName(""));
  };

  const handleRename = async (bank) => {
    const name = await promptDialog(
      `Rename ${bank.name}? Employees using it are moved to the new name.`,
      bank.name,
    );
    if (name === null || !name.trim() || name.trim() === bank.name) return;
    run(bank.id, () => updateBank(bank.id, { name: name.trim() }), "Bank renamed.");
  };

  const handleDelete = async (bank) => {
    if (!(await confirmDialog(`Delete ${bank.name} from the list?`))) return;
    run(bank.id, () => deleteBank(bank.id), "Bank deleted.");
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-fg">Banks</h2>
      <p className="mt-1 text-sm text-fg-subtle">
        The Bank Type choices on the employee 201 form.
      </p>

      {canEditPage && (
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New bank, e.g. Maya"
            maxLength={100}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!newName.trim() || busyId === "new"}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}

      {!banks ? (
        <p className="py-6 text-center text-sm text-fg-subtle">Loading...</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
          {banks.map((bank) => (
            <li
              key={bank.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                bank.is_active ? "" : "opacity-60"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-fg">
                  {bank.name}
                  {!bank.is_active && (
                    <span className="ml-2 rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-fg-subtle">
                  {bank.employee_count} employee{bank.employee_count === 1 ? "" : "s"}
                </p>
              </div>
              {canEditPage && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === bank.id}
                    onClick={() => handleRename(bank)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={busyId === bank.id}
                    onClick={() =>
                      run(
                        bank.id,
                        () => updateBank(bank.id, { is_active: !bank.is_active }),
                        bank.is_active ? `${bank.name} hidden.` : `${bank.name} shown.`,
                      )
                    }
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                  >
                    {bank.is_active ? "Hide" : "Show"}
                  </button>
                  {bank.employee_count === 0 && (
                    <button
                      type="button"
                      disabled={busyId === bank.id}
                      onClick={() => handleDelete(bank)}
                      className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
