import { useState } from "react";

// Remembers a page's card-vs-list view choice in localStorage, keyed
// per page (storageKey) so different list pages can each keep their
// own independent preference -- mirrors the pattern originally built
// for Fleet Management's vehicle list.
export default function useViewType(storageKey, defaultType = "cards") {
  const [viewType, setViewTypeState] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === "list" || stored === "cards" ? stored : defaultType;
    } catch {
      return defaultType;
    }
  });

  const setViewType = (type) => {
    setViewTypeState(type);
    try {
      localStorage.setItem(storageKey, type);
    } catch {
      // ignore (private browsing, storage disabled, etc.)
    }
  };

  return [viewType, setViewType];
}
