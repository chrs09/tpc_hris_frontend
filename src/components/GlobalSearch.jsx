import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Search, X } from "lucide-react";
import api from "../api/services/api";
import { getNavGroups } from "../constants/navGroups";
import { matchesSearch } from "../utils/search";

// Superadmin's global search (Ctrl+K, or the search button in the
// sidebar / phone top bar): one word matched anywhere (%word%) in
// employees, users, applicants, trips, locations, customers, suppliers,
// vehicles, expenses and tickets, plus the menu's pages. Each result links
// to the page that lists it, opened filtered by the same word. Backend:
// app/api/admin/global_search.py.
export default function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Search once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!open || term.length < 2) return undefined;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/global-search", { params: { q: term } });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || "Search failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [term, open]);

  // Menu pages whose name matches.
  const pages = useMemo(() => {
    if (term.length < 2) return [];
    const out = [];
    for (const group of getNavGroups("superadmin")) {
      for (const item of group.children) {
        if (matchesSearch(term, item.label, group.label)) {
          out.push({
            title: item.label === group.label ? item.label : `${group.label} · ${item.label}`,
            path: item.path,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [term]);

  if (!open) return null;

  const groups = term.length >= 2 ? data?.groups || [] : [];
  const nothing = term.length >= 2 && !loading && !error && !groups.length && !pages.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={18} className="shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            id="global-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search names, shipments, plates, invoices, tickets..."
            autoComplete="off"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
          />
          {loading && <span className="text-xs text-fg-subtle">Searching...</span>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {term.length < 2 && (
            <p className="px-3 py-6 text-center text-sm text-fg-subtle">
              Type at least 2 characters. Matches anywhere in the text, e.g. &quot;cons&quot; finds
              Consolacion.
            </p>
          )}
          {error && <p className="px-3 py-4 text-sm text-danger">{error}</p>}
          {nothing && (
            <p className="px-3 py-6 text-center text-sm text-fg-subtle">Nothing found for &quot;{term}&quot;.</p>
          )}

          {pages.length > 0 && (
            <ResultGroup label="Pages" items={pages} onClose={onClose} />
          )}
          {groups.map((g) => (
            <ResultGroup
              key={g.key}
              label={g.label}
              items={g.items}
              more={g.more ? g.path_all : null}
              onClose={onClose}
            />
          ))}
        </div>

        <p className="border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
          Ctrl+K to open · Esc to close · Each result opens its page filtered by the same word
        </p>
      </div>
    </div>
  );
}

function ResultGroup({ label, items, more, onClose }) {
  const location = useLocation();
  // Already on that page: reload it so it picks up the new ?q=.
  const go = (path) => (e) => {
    if (path.split("?")[0] === location.pathname) {
      e.preventDefault();
      window.location.assign(path);
    }
    onClose();
  };
  return (
    <section className="mb-2">
      <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </h3>
      <ul>
        {items.map((item, i) => (
          <li key={`${item.path}-${i}`}>
            <Link
              to={item.path}
              onClick={go(item.path)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{item.title}</span>
                {item.subtitle && (
                  <span className="block truncate text-xs text-fg-subtle">{item.subtitle}</span>
                )}
              </span>
              <ChevronRight size={15} className="shrink-0 text-fg-subtle" />
            </Link>
          </li>
        ))}
      </ul>
      {more && (
        <Link
          to={more}
          onClick={go(more)}
          className="block px-3 py-1.5 text-xs font-semibold text-primary hover:underline"
        >
          See all {label.toLowerCase()} matching
        </Link>
      )}
    </section>
  );
}
