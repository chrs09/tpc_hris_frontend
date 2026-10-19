import { useState } from "react";

// Which columns a table shows, remembered per browser (localStorage, per
// storageKey). columns: [{ key, default?, locked? }] -- default: shown
// until changed; locked: always shown.
export default function useColumnPrefs(storageKey, columns) {
  const defaults = () =>
    new Set(columns.filter((c) => c.locked || c.default !== false).map((c) => c.key));

  const [visible, setVisible] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved)) {
        const known = new Set(columns.map((c) => c.key));
        return new Set([
          ...saved.filter((key) => known.has(key)),
          ...columns.filter((c) => c.locked).map((c) => c.key),
        ]);
      }
    } catch {
      // ignore (private browsing, bad data)
    }
    return defaults();
  });

  const save = (next) => {
    setVisible(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  };

  const toggle = (key) => {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    save(next);
  };

  const reset = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setVisible(defaults());
  };

  return { visible, toggle, reset };
}
