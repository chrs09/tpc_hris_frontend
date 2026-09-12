import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getErrorLogs } from "../../api/errorLogs";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

const PAGE_SIZE = 50;

const statusBadgeClass = (statusCode) => {
  if (statusCode >= 500) return "bg-danger/15 text-danger";
  if (statusCode >= 400) return "bg-warning/15 text-warning";
  return "bg-surface-active text-fg-muted";
};

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusCode, setStatusCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getErrorLogs({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        statusCode: statusCode || undefined,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load error logs:", error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusCode]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Error Logs</h2>
          <p className="text-sm text-fg-subtle">
            Same alerts posted to Slack's #production-errors -- unhandled
            server errors and failed requests (400+).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusCode}
            onChange={(e) => {
              setStatusCode(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
          >
            <option value="">All statuses</option>
            <option value="500">500 (server errors)</option>
            <option value="422">422 (validation)</option>
            <option value="404">404 (not found)</option>
            <option value="403">403 (forbidden)</option>
            <option value="401">401 (unauthorized)</option>
            <option value="400">400 (bad request)</option>
          </select>

          <button
            type="button"
            onClick={loadLogs}
            className="h-10 rounded-lg border border-border px-4 text-sm text-fg hover:bg-surface-hover"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr className="text-xs uppercase tracking-wide">
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">URL</th>
                <th className="px-4 py-3 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-fg-subtle">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-fg-subtle">
                    No errors logged.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;

                  return (
                    <Fragment key={log.id}>
                      <tr
                        className="cursor-pointer border-t border-border transition hover:bg-surface-hover"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : log.id)
                        }
                      >
                        <td className="px-3 py-3 text-fg-subtle">
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString()
                            : "--"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                              log.status_code,
                            )}`}
                          >
                            {log.status_code}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-fg">
                          {log.method}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-fg-muted">
                          {log.url}
                        </td>
                        <td className="max-w-sm truncate px-4 py-3 text-fg-muted">
                          {log.error_type
                            ? `${log.error_type}: `
                            : ""}
                          {typeof log.detail === "string"
                            ? log.detail
                            : JSON.stringify(log.detail)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-t border-border bg-surface-hover">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-3 text-xs">
                              <div>
                                <p className="font-semibold text-fg-muted">
                                  Full URL
                                </p>
                                <p className="wrap-break-word text-fg">
                                  {log.url}
                                </p>
                              </div>

                              <div>
                                <p className="font-semibold text-fg-muted">
                                  Detail
                                </p>
                                <pre className="whitespace-pre-wrap wrap-break-word text-fg">
                                  {typeof log.detail === "string"
                                    ? log.detail
                                    : JSON.stringify(log.detail, null, 2)}
                                </pre>
                              </div>

                              {log.traceback && (
                                <div>
                                  <p className="font-semibold text-fg-muted">
                                    Traceback
                                  </p>
                                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-background p-3 text-fg">
                                    {log.traceback}
                                  </pre>
                                </div>
                              )}
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
