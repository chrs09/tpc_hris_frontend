import { createContext, useContext } from "react";

// Current dashboard page's module + whether the logged-in person may
// change things on it -- filled in by PageAccessProvider
// (hooks/usePageAccess.jsx). Defaults to editable outside the provider or
// on pages that aren't tied to a module.
export const PageAccessContext = createContext({ moduleKey: null, canEdit: true });

// True when the current page's add/edit/delete/approve controls should
// show; false for "Can edit: No" (view-only) on the Org Chart, or when the
// person's role/grants don't allow changes.
export function usePageCanEdit() {
  return useContext(PageAccessContext).canEdit;
}
