import { useEffect, useState } from "react";
import { getMyModuleAccess } from "../api/employeeModuleAccess";

// Shared per-employee module-grant state (Module Assignment page), used
// by both Sidebar.jsx and SectionTabs.jsx so the same "what can this
// user see" rule lives in one place. Once superadmin has explicitly
// configured an employee (hasCustomAccess), their access to
// moduleKey-bearing nav items comes ONLY from grantedModules -- role no
// longer grants anything for those items. Until configured, role-based
// access applies. Not needed for superadmin, who always sees everything.
export default function useModuleAccess() {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const [grantedModules, setGrantedModules] = useState(new Set());
  const [hasCustomAccess, setHasCustomAccess] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) return;
    getMyModuleAccess()
      .then((data) => {
        setGrantedModules(new Set(data.module_keys || []));
        setHasCustomAccess(Boolean(data.has_custom_access));
      })
      .catch(() => {
        setGrantedModules(new Set());
        setHasCustomAccess(false);
      });
  }, [isSuperAdmin]);

  const isVisible = (item) => {
    if (role === "superadmin") return true;
    if (!item.moduleKey) return item.roles.includes(role);
    if (hasCustomAccess) return grantedModules.has(item.moduleKey);
    return item.roles.includes(role);
  };

  return { role, isSuperAdmin, grantedModules, hasCustomAccess, isVisible };
}
