import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { addBank, getBanks, updateBank } from "../../api/banks";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// Finance -> Bank Master: the Bank Type choices on the employee 201 form.
// Banks are never deleted -- one that's no longer offered is hidden, so
// employees already on it keep it.
export default function BankMaster() {
  const canEditPage = usePageCanEdit();
  const [banks, setBanks] = useState(null);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const fetchBanks = () =>
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
      toast.success(success);
      await fetchBanks();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (await run("new", () => addBank(name), `${name} added.`)) setNewName("");
  };

  const handleRename = async (bank) => {
    const name = await promptDialog(
      `Rename ${bank.name}? Employees using it are moved to the new name.`,
      bank.name,
    );
    if (name === null || !name.trim() || name.trim() === bank.name) return;
    run(bank.id, () => updateBank(bank.id, { name: name.trim() }), "Bank renamed.");
  };

  const visible = (banks || []).filter((bank) => matchesSearch(search, bank.name));

  return (
    <div className="space-y-5">
      <SectionTabs group="Finance" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Bank Master</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            The Bank Type choices on the employee 201 form. Hide a bank to stop
            offering it -- employees already on it keep it.
          </p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search bank..." />
      </div>

      {canEditPage && (
        <form onSubmit={handleAdd} className="flex max-w-md gap-2">
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
            Add Bank
          </button>
        </form>
      )}

      {!banks ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm text-fg">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Bank</th>
                <th className="px-4 py-3 text-left font-medium">Employees</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((bank) => (
                <tr
                  key={bank.id}
                  className={`border-t border-border ${bank.is_active ? "" : "opacity-60"}`}
                >
                  <td className="px-4 py-3 font-medium">{bank.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{bank.employee_count}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        bank.is_active
                          ? "bg-success/15 text-success"
                          : "bg-surface-active text-fg-muted"
                      }`}
                    >
                      {bank.is_active ? "Shown" : "Hidden"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {canEditPage && (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === bank.id}
                          onClick={() => handleRename(bank)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
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
                              bank.is_active
                                ? `${bank.name} hidden from the 201 form.`
                                : `${bank.name} shown on the 201 form.`,
                            )
                          }
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                        >
                          {bank.is_active ? "Hide" : "Show"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-fg-subtle">
                    No banks match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
