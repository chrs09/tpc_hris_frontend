import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getDepartmentHeads,
  setDepartmentHead,
  getCashAdvanceHeads,
  setCashAdvanceHead,
} from "../../api/orgHierarchy";
import { getUserList } from "../../api/users";

const OrgHierarchyPage = () => {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const [rows, setRows] = useState([]);
  // Cash Advance Immediate Head -- a separate assignment per department
  // from the general "Immediate Head" above, used only to resolve who
  // approves cash advance requests. Kept as its own array (same
  // DEPARTMENTS order as `rows`, from the same backend list) rather than
  // merged into `rows`, since it's saved through a different endpoint.
  const [caRows, setCaRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Shared edit modal for both hierarchies -- `editingType` picks which
  // one is being edited ("head" = general/overtime, "cash_advance" =
  // cash advance only), so one modal/save handler serves both columns.
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingType, setEditingType] = useState("head");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [heads, caHeads, userList] = await Promise.all([
        getDepartmentHeads(),
        getCashAdvanceHeads(),
        getUserList(),
      ]);
      setRows(heads);
      setCaRows(caHeads);
      setUsers(userList);
    } catch (err) {
      console.error("Failed to load org hierarchy:", err);
      toast.error("Failed to load org hierarchy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadData();
  }, [isSuperAdmin]);

  const caRowFor = (department) =>
    caRows.find((r) => r.department === department);

  const openEdit = (department, type, currentHead) => {
    setEditingDepartment(department);
    setEditingType(type);
    setSelectedUserId(currentHead ? String(currentHead.id) : "");
  };

  const closeEdit = () => {
    setEditingDepartment(null);
    setSelectedUserId("");
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast.error("Select who this department reports to.");
      return;
    }

    try {
      setSaving(true);
      if (editingType === "cash_advance") {
        await setCashAdvanceHead(editingDepartment, Number(selectedUserId));
        toast.success(`${editingDepartment}'s cash advance head updated.`);
      } else {
        await setDepartmentHead(editingDepartment, Number(selectedUserId));
        toast.success(`${editingDepartment}'s immediate head updated.`);
      }
      closeEdit();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-danger font-semibold">
        Access Denied. Superadmin only.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-fg-subtle">
            Administration
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fg">
            Reporting Hierarchy
          </h2>
          <p className="mt-2 text-sm text-fg-subtle">
            Set which person each department's employees report to as their
            immediate head — e.g. Motorpool directs to Marjorie, Admin
            directs to the superadmin. Cash Advance Head is a separate,
            optional assignment used only to route cash advance approvals;
            if left unset, cash advance requests fall back to a superadmin
            instead of being blocked.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr className="text-xs uppercase tracking-wide">
                <th className="px-6 py-4 text-left font-medium">
                  Department
                </th>
                <th className="px-6 text-left font-medium">
                  Immediate Head
                </th>
                <th className="px-6 py-4 text-right font-medium">Action</th>
                <th className="border-l border-border px-6 text-left font-medium">
                  Cash Advance Head
                </th>
                <th className="px-6 py-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-fg-subtle">
                    Loading...
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const caRow = caRowFor(row.department);
                  return (
                    <tr
                      key={row.department}
                      className="border-t border-border transition hover:bg-surface-hover"
                    >
                      <td className="px-6 py-4 font-medium text-fg">
                        {row.department}
                      </td>
                      <td className="px-6 py-4 text-fg-muted">
                        {row.head ? (
                          <span>
                            {row.head.employee_name || row.head.username}{" "}
                            <span className="text-xs text-fg-subtle">
                              ({row.head.username})
                            </span>
                          </span>
                        ) : (
                          <span className="text-fg-subtle italic">
                            Not set
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEdit(row.department, "head", row.head)}
                          className="rounded-lg border border-border px-4 py-1.5 text-sm text-fg transition hover:bg-surface-hover"
                        >
                          {row.head ? "Change" : "Set Head"}
                        </button>
                      </td>
                      <td className="border-l border-border px-6 py-4 text-fg-muted">
                        {caRow?.head ? (
                          <span>
                            {caRow.head.employee_name || caRow.head.username}{" "}
                            <span className="text-xs text-fg-subtle">
                              ({caRow.head.username})
                            </span>
                          </span>
                        ) : (
                          <span className="text-fg-subtle italic">
                            Not set — falls back to superadmin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            openEdit(row.department, "cash_advance", caRow?.head)
                          }
                          className="rounded-lg border border-border px-4 py-1.5 text-sm text-fg transition hover:bg-surface-hover"
                        >
                          {caRow?.head ? "Change" : "Set Head"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-bold text-fg">
              {editingDepartment} —{" "}
              {editingType === "cash_advance"
                ? "Cash Advance Head"
                : "Immediate Head"}
            </h3>
            <p className="mt-1 text-sm text-fg-subtle">
              {editingType === "cash_advance"
                ? `Cash advance requests filed by ${editingDepartment} employees will be routed to this person for approval.`
                : `Employees in ${editingDepartment} will report to this person.`}
            </p>

            <div className="mt-4">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select a person</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgHierarchyPage;
