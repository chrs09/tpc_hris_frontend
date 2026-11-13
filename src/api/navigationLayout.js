import api from "./services/api";

// Menu arrangement set by the superadmin (Administrator -> Settings ->
// Navigation): sidebar group order and the phone bottom bar's groups.
// See app/api/admin/navigation_layout.py.
export const getNavigationLayout = async () => (await api.get("/navigation-layout")).data;

export const saveNavigationLayout = async (layout) =>
  (await api.put("/navigation-layout", layout)).data;
