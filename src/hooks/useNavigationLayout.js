import { useEffect, useState } from "react";
import { getNavigationLayout } from "../api/navigationLayout";

// The signed-in superadmin's own menu arrangement (sidebar order + phone
// bottom bar; everyone else gets the default), loaded once and shared.
// Settings fires "navigation-layout-changed" after saving so the menu
// updates right away.
export const DEFAULT_LAYOUT = {
  sidebar_order: [],
  mobile_tabs: ["Approvals", "Trip Management", "Tickets"],
};

let cache = null;

export default function useNavigationLayout() {
  const [layout, setLayout] = useState(cache || DEFAULT_LAYOUT);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        cache = await getNavigationLayout();
        if (!cancelled) setLayout(cache);
      } catch {
        // Keep the default arrangement.
      }
    };
    if (!cache) load();
    const onChanged = (event) => {
      cache = event.detail || cache;
      if (event.detail) setLayout(event.detail);
      else load();
    };
    window.addEventListener("navigation-layout-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("navigation-layout-changed", onChanged);
    };
  }, []);

  return layout;
}

// Groups in the saved order; groups not listed keep their default place
// after the listed ones.
export function orderGroups(groups, order) {
  if (!order?.length) return groups;
  const rank = new Map(order.map((label, i) => [label, i]));
  return groups
    .map((group, i) => ({ group, i }))
    .sort((a, b) => {
      const ra = rank.has(a.group.label) ? rank.get(a.group.label) : order.length + a.i;
      const rb = rank.has(b.group.label) ? rank.get(b.group.label) : order.length + b.i;
      return ra - rb;
    })
    .map(({ group }) => group);
}

// Short names for the phone bottom bar.
export const TAB_LABELS = {
  "Trip Management": "Trips",
  "Fleet Management": "Fleet",
  "Cash Advance": "Cash Adv.",
  Administrator: "Admin",
  Dashboard: "Home",
};
