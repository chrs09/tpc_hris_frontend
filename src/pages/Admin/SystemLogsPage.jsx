import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getSystemLogs } from "../../api/systemLogs";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import SearchInput from "../../components/ui/searchInput/SearchInput";

// System Logs (superadmin only): every change made through the portal or
// the mobile app -- who did it, when, the URL, what was sent (passwords
// hidden) and the records it changed (old -> new). Kept 180 days.
const PAGE_SIZE = 50;

const methodOptions = [
  { value: "", label: "All actions" },
  { value: "POST", label: "POST (create / submit)" },
  { value: "PUT", label: "PUT (save)" },
  { value: "PATCH", label: "PATCH (update)" },
  { value: "DELETE", label: "DELETE (remove)" },
];

const outcomeOptions = [
  { value: "", label: "Any result" },
  { value: "success", label: "Succeeded" },
  { value: "failed", label: "Refused / failed" },
];

const methodClass = {
  POST: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  PUT: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  PATCH: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  DELETE: "bg-danger/15 text-danger",
};

const statusClass = (code) => {
  if (code >= 500) return "bg-danger/15 text-danger";
  if (code >= 400) return "bg-warning/15 text-warning";
  return "bg-success/15 text-success";
};

const formatPhTime = (value) => {
  if (!value) return "--";
  const iso = /Z$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const tableLabel = (table) =>
  (table || "record").replace(/^tpc_/, "").replace(/_/g, " ");

const showValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const device = (ua) => {
  if (!ua) return "--";
  if (/okhttp|Expo|ReactNative|Dart/i.test(ua)) return "Mobile app";
  if (/Android/i.test(ua)) return "Android browser";
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad browser";
  if (/Windows/i.test(ua)) return "Windows browser";
  if (/Mac OS/i.test(ua)) return "Mac browser";
  return ua.slice(0, 60);
};

function ChangeList({ changes }) {
  if (!changes?.length) {
    return <p className="text-fg-subtle">No records were changed.</p>;
  }
  return (
    <div className="space-y-2">
      {changes.map((change, index) => (
        <div key={index} className="rounded-lg border border-border bg-surface p-3">
          <p className="mb-1.5 font-semibold text-fg">
            <span
              className={
                change.action === "deleted"
                  ? "text-danger"
                  : change.action === "created"
                    ? "text-success"
                    : "text-warning"
              }
            >
              {change.action}
            </span>{" "}
            {tableLabel(change.table)}
            {change.id !== null && change.id !== undefined && ` #${change.id}`}
          </p>
          {Object.keys(change.fields || {}).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody>
                  {Object.entries(change.fields).map(([field, [oldValue, newValue]]) => (
                    <tr key={field} className="border-t border-border first:border-t-0">
                      <td className="whitespace-nowrap py-1 pr-3 font-medium text-fg-muted">
                        {field}
                      </td>
                      {change.action === "updated" && (
                        <td className="py-1 pr-3 text-fg-subtle line-through wrap-break-word">
                          {showValue(oldValue)}
                        </td>
                      )}
                      <td className="py-1 text-fg wrap-break-word">
                        {change.action === "updated" && "→ "}
                        {showValue(newValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("");
  const [debounced, setDebounced] = useState({ search: "", username: "" });
  const [method, setMethod] = useState("");
  const [outcome, setOutcome] = useState("");
  const [changedOnly, setChangedOnly] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced({ search, username });
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search, username]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSystemLogs({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: debounced.search,
        username: debounced.username,
        method,
        outcome,
        changedOnly,
        dateFrom,
        dateTo,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load system logs:", error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, method, outcome, changedOnly, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">System Logs</h2>
          <p className="text-sm text-fg-subtle">
            Every change made in the portal or the app: who did it, when, the
            URL, what was sent and the records it changed. Kept for 180 days.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="h-10 rounded-lg border border-border px-4 text-sm text-fg hover:bg-surface-hover"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search URL, change, value..."
        />
        <input
          id="system-logs-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="User"
          className="h-10 w-36 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary"
        />
        <div className="w-48">
          <SearchSelect
            value={methodOptions.find((o) => o.value === method) || null}
            options={methodOptions}
            onChange={(o) => resetPage(setMethod)(o?.value ?? "")}
            placeholder="All actions"
          />
        </div>
        <div className="w-44">
          <SearchSelect
            value={outcomeOptions.find((o) => o.value === outcome) || null}
            options={outcomeOptions}
            onChange={(o) => resetPage(setOutcome)(o?.value ?? "")}
            placeholder="Any result"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          From
          <input
            id="system-logs-from"
            type="date"
            value={dateFrom}
            onChange={(e) => resetPage(setDateFrom)(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-fg"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          To
          <input
            id="system-logs-to"
            type="date"
            value={dateTo}
            onChange={(e) => resetPage(setDateTo)(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-fg"
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-fg-muted">
          <input
            id="system-logs-changed"
            type="checkbox"
            checked={changedOnly}
            onChange={(e) => resetPage(setChangedOnly)(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Only ones that changed data
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr className="text-xs uppercase tracking-wide">
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">What changed</th>
                <th className="px-4 py-3 text-left font-medium">URL</th>
                <th className="px-4 py-3 text-left font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-fg-subtle">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-fg-subtle">
                    No changes logged for these filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        className="cursor-pointer border-t border-border transition hover:bg-surface-hover"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-3 py-3 text-fg-subtle">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                          {formatPhTime(log.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {log.username ? (
                            <span className="text-fg">
                              {log.username}
                              {log.role && (
                                <span className="ml-1 text-xs text-fg-subtle">({log.role})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-fg-subtle">Not signed in</span>
                          )}
                          {log.impersonated_by && (
                            <span className="block text-[11px] text-warning">
                              via View As by {log.impersonated_by}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              methodClass[log.method] || "bg-surface-active text-fg-muted"
                            }`}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-fg">{log.summary}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-fg-muted">{log.path}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                              log.status_code,
                            )}`}
                          >
                            {log.status_code}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-t border-border bg-surface-hover">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid gap-4 text-xs lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                              <div className="min-w-0 space-y-3">
                                <div>
                                  <p className="font-semibold text-fg-muted">Full URL</p>
                                  <p className="wrap-break-word text-fg">
                                    {log.method} {log.path}
                                    {log.query ? `?${log.query}` : ""}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="font-semibold text-fg-muted">User</p>
                                    <p className="text-fg">
                                      {log.username || "--"}
                                      {log.user_id ? ` (#${log.user_id})` : ""}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-fg-muted">Took</p>
                                    <p className="text-fg">
                                      {log.duration_ms != null ? `${log.duration_ms} ms` : "--"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-fg-muted">IP address</p>
                                    <p className="text-fg">{log.ip || "--"}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-fg-muted">Device</p>
                                    <p className="text-fg" title={log.user_agent || ""}>
                                      {device(log.user_agent)}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="font-semibold text-fg-muted">
                                    What was sent (passwords hidden)
                                  </p>
                                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-background p-3 text-fg">
                                    {log.body ? JSON.stringify(log.body, null, 2) : "Nothing sent"}
                                  </pre>
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="mb-1.5 font-semibold text-fg-muted">
                                  Records changed
                                </p>
                                <ChangeList changes={log.changes} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-fg-subtle">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
