import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import useModuleAccess from "./useModuleAccess";
import { getNavGroups } from "../constants/navGroups";
import { PageAccessContext } from "./usePageCanEdit";

// Which module the current dashboard page belongs to, and whether the
// logged-in person may change things on it. Worked out once for the
// whole dashboard from the nav config (page path -> module key + the
// roles that get it by default), using the same rule the backend
// enforces: superadmin always; a "Can edit: No" grant (Org Chart ->
// What they can access) makes the page view-only; otherwise the page's
// default roles or a grant. Pages/components just call usePageCanEdit()
// and hide their add/edit/delete/approve controls when it's false.
const pathOf = (path) => (typeof path === "string" ? path.split("?")[0] : "");
const tabOf = (path) =>
  typeof path === "string" && path.includes("?")
    ? new URLSearchParams(path.split("?")[1]).get("tab")
    : null;

export function PageAccessProvider({ children }) {
  const location = useLocation();
  const { role, canEdit, approverOf } = useModuleAccess();

  const value = useMemo(() => {
    const items = getNavGroups(role).flatMap((g) => g.children || []);
    const currentTab = new URLSearchParams(location.search).get("tab");
    const candidates = items.filter(
      (item) => item.moduleKey && pathOf(item.path) === location.pathname,
    );
    // Pages split by ?tab= (e.g. Fleet: Vehicle List / Maintenance).
    const match =
      candidates.find((item) => tabOf(item.path) && tabOf(item.path) === currentTab) ||
      candidates.find((item) => !tabOf(item.path)) ||
      candidates[0];

    if (!match) return { moduleKey: null, canEdit: true };
    // An Org Chart head can approve on the matching approval page even
    // without the module itself (the backend checks it's their turn).
    const approvesHere = items.some(
      (item) =>
        item.approverKind &&
        pathOf(item.path) === location.pathname &&
        (!tabOf(item.path) || tabOf(item.path) === currentTab) &&
        [].concat(item.approverKind).some((k) => approverOf[k]),
    );
    return {
      moduleKey: match.moduleKey,
      canEdit: approvesHere || canEdit(match.moduleKey, match.roles || []),
    };
  }, [location.pathname, location.search, role, canEdit, approverOf]);

  return (
    <PageAccessContext.Provider value={value}>{children}</PageAccessContext.Provider>
  );
}
