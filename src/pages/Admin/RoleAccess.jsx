import { useState } from "react";
import { ALL_ROLES, ROLE_ACCESS_GROUPS, roleLabel } from "../../constants/roleAccess";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

const RoleAccessPage = () => {
  const currentRole = localStorage.getItem("role");
  const isSuperAdmin = currentRole === "superadmin";

  const [selectedRole, setSelectedRole] = useState("admin");

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
            <h2 className="mt-1 text-2xl font-bold text-fg">Role Access</h2>
            <p className="mt-2 text-sm text-fg-subtle">
              Pick a role to see exactly which modules it can currently
              access. This is read-only — a specific employee's access can
              still be widened individually in Module Assignment.
            </p>
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg shadow-sm outline-none"
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {ROLE_ACCESS_GROUPS.map((group) => {
            const visibleChildren = group.children.filter((item) =>
              item.roles.includes(selectedRole),
            );

            return (
              <div
                key={group.label}
                className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-border bg-surface-hover px-5 py-3">
                  <span className="text-sm font-semibold text-fg">
                    {group.label}
                  </span>
                  <span className="text-xs text-fg-subtle">
                    {visibleChildren.length}/{group.children.length}
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {group.children.map((item) => {
                    const hasAccess = item.roles.includes(selectedRole);
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between px-5 py-3"
                      >
                        <span
                          className={`text-sm ${hasAccess ? "text-fg" : "text-fg-subtle"}`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            hasAccess
                              ? "bg-success/15 text-success"
                              : "bg-surface-active text-fg-subtle"
                          }`}
                        >
                          {hasAccess ? "Accessible" : "No access"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleAccessPage;
