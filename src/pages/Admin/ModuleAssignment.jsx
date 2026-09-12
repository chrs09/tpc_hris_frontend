import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getEmployeesWithAccess,
  resetEmployeeModuleAccess,
  setEmployeeModuleAccess,
} from "../../api/employeeModuleAccess";
import { employeeRoleConvert } from "../../constants/employeeRole";
import { MODULE_GROUPS, moduleKey } from "../../constants/modules";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { confirmDialog } from "../../components/ui/dialog/dialogService";

const ModuleAssignmentPage = () => {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployeesWithAccess(department || undefined);
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load employees:", err);
      toast.error("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, department]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(term),
    );
  }, [employees, search]);

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredEmployees,
    15,
  );

  const openManage = (employee) => {
    setEditingEmployee(employee);
    setSelectedKeys(new Set(employee.module_keys || []));
  };

  const closeManage = () => {
    setEditingEmployee(null);
    setSelectedKeys(new Set());
  };

  const toggleKey = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!editingEmployee) return;
    try {
      setSaving(true);
      const keys = Array.from(selectedKeys);
      await setEmployeeModuleAccess(editingEmployee.id, keys);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editingEmployee.id
            ? { ...e, module_keys: keys, has_custom_access: true }
            : e,
        ),
      );
      toast.success(
        "Module access updated. This employee now sees only these modules, regardless of role.",
      );
      closeManage();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!editingEmployee) return;
    if (
      !(await confirmDialog(
        `Reset ${editingEmployee.first_name} ${editingEmployee.last_name} back to their role's default access?`,
      ))
    ) {
      return;
    }
    try {
      setResetting(true);
      await resetEmployeeModuleAccess(editingEmployee.id);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editingEmployee.id
            ? { ...e, module_keys: [], has_custom_access: false }
            : e,
        ),
      );
      toast.success("Reset to role default access.");
      closeManage();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset.");
    } finally {
      setResetting(false);
    }
  };

  const groupCount = (employee, group) => {
    const granted = (employee.module_keys || []).filter((k) =>
      k.startsWith(`${group.key}.`),
    ).length;
    return `${granted}/${group.submodules.length}`;
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-danger font-semibold">
        Access Denied. Superadmin only.
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        <SectionTabs group="Administrator" />

        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-fg-subtle">
              Administration
            </p>
            <h2 className="mt-1 text-2xl font-bold text-fg">
              Module Assignment
            </h2>
            <p className="mt-2 text-sm text-fg-subtle">
              Grant each employee access to specific submodules directly.
              Once you save a selection for someone, they see ONLY those
              modules from then on — their role no longer grants anything
              extra for the groups below.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="w-48 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg shadow-sm outline-none"
            />

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg shadow-sm outline-none"
            >
              <option value="">All Departments</option>
              {Object.entries(employeeRoleConvert).map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover text-fg-muted">
                <tr className="text-xs uppercase tracking-wide">
                  <th className="px-6 py-4 text-left font-medium">
                    Employee
                  </th>
                  <th className="px-4 text-left font-medium">Department</th>
                  {MODULE_GROUPS.map((group) => (
                    <th
                      key={group.key}
                      className="px-4 text-center font-medium"
                    >
                      {group.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={MODULE_GROUPS.length + 3}
                      className="px-6 py-12 text-center text-fg-subtle"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={MODULE_GROUPS.length + 3}
                      className="px-6 py-12 text-center text-fg-subtle"
                    >
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-t border-border transition hover:bg-surface-hover"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-fg">
                            {emp.first_name} {emp.last_name}
                          </div>
                          {emp.has_custom_access && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Customized
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {emp.position}
                        </div>
                      </td>
                      <td className="px-4 text-fg-muted">
                        {emp.department}
                      </td>
                      {MODULE_GROUPS.map((group) => (
                        <td key={group.key} className="px-4 text-center">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              (emp.module_keys || []).some((k) =>
                                k.startsWith(`${group.key}.`),
                              )
                                ? "bg-success/15 text-success"
                                : "bg-surface-active text-fg-subtle"
                            }`}
                          >
                            {groupCount(emp, group)}
                          </span>
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openManage(emp)}
                          className="rounded-lg border border-border px-4 py-1.5 text-sm text-fg transition hover:bg-surface-hover"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-fg">
                  {editingEmployee.first_name} {editingEmployee.last_name}
                </h3>
                <p className="text-sm text-fg-subtle">
                  {editingEmployee.department} · {editingEmployee.position}
                </p>
              </div>
              <button
                onClick={closeManage}
                className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover"
              >
                ✕
              </button>
            </div>

            {editingEmployee.has_custom_access ? (
              <p className="mb-4 rounded-xl bg-primary/10 p-3 text-xs text-fg-muted">
                This employee's access is customized — the checkboxes below
                are the only thing deciding what they see, regardless of
                role.
              </p>
            ) : (
              <p className="mb-4 rounded-xl bg-surface-hover p-3 text-xs text-fg-muted">
                Not customized yet — this employee currently sees whatever
                their role grants by default. Saving below will switch
                them to using only these checkboxes.
              </p>
            )}

            <div className="space-y-5">
              {MODULE_GROUPS.map((group) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-border bg-surface-hover p-4"
                >
                  <p className="mb-3 text-sm font-semibold text-fg">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.submodules.map((sub) => {
                      const key = moduleKey(group.key, sub.key);
                      const checked = selectedKeys.has(key);
                      return (
                        <div key={key} className="flex flex-col gap-2">
                          <label
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition-colors ${
                              checked
                                ? "border-primary bg-primary/10 text-fg"
                                : "border-border text-fg-muted hover:bg-surface"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleKey(key)}
                              className="h-4 w-4 rounded border-border"
                            />
                            {sub.label}
                          </label>

                          {sub.children?.length > 0 && (
                            <div className="ml-4 flex flex-col gap-2 border-l border-border pl-3">
                              {sub.children.map((child) => {
                                const childKey = moduleKey(
                                  group.key,
                                  child.key,
                                );
                                const childChecked = selectedKeys.has(childKey);
                                return (
                                  <label
                                    key={childKey}
                                    title="Optional: leave both unchecked to allow both views once Attendance itself is granted."
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition-colors ${
                                      childChecked
                                        ? "border-primary bg-primary/10 text-fg"
                                        : "border-border text-fg-subtle hover:bg-surface"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={childChecked}
                                      onChange={() => toggleKey(childKey)}
                                      className="h-3.5 w-3.5 rounded border-border"
                                    />
                                    ↳ {child.label}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {editingEmployee.has_custom_access ? (
                <button
                  onClick={handleReset}
                  disabled={saving || resetting}
                  className="rounded-xl border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  {resetting ? "Resetting..." : "Reset to Role Default"}
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeManage}
                  disabled={saving || resetting}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || resetting}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleAssignmentPage;
