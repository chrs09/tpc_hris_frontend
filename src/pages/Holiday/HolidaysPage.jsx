// HolidaysPage.jsx
import { useState, useEffect, useCallback } from "react";
import AddHolidayModal from "../../components/holidays/AddHolidayModal";
import EditHolidayModal from "../../components/holidays/EditHolidayModal";
import { getHolidays, deleteHoliday, syncHolidays } from "../../api/holidays";
import { Trash2, Pencil } from "lucide-react";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolidays(year);
      setHolidays(data);
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncHolidays(year);
      await fetchHolidays();
      alert(
        `Synced: ${result.created} added, ${result.updated} updated, ${result.skipped} skipped`,
      );
    } catch (err) {
      alert(err.response?.data?.detail || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      await deleteHoliday(id);
      fetchHolidays();
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed");
    }
  };

  const typeStyles = {
    regular: "bg-surface-active text-fg-muted",
    special_non_working: "bg-warning/15 text-warning",
    special_working: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-fg">Holidays</h1>
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none text-sm font-medium text-fg-muted bg-surface-hover border border-border rounded-full pl-3 pr-7 py-1 cursor-pointer hover:bg-surface-active transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Array.from({ length: 10 }, (_, i) => 2024 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-subtle pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm font-medium text-fg-muted border border-border rounded-lg px-3.5 py-2 hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncing ? "Syncing…" : "Sync from API"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-red-600 rounded-lg px-3.5 py-2 hover:bg-red-700 shadow-sm transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Holiday
          </button>
        </div>
      </div>

      {/* MOBILE: card list */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center text-sm text-fg-subtle">
            Loading holidays…
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-surface border border-dashed border-border rounded-xl p-6 text-center text-sm text-fg-subtle">
            No holidays found for {year}
          </div>
        ) : (
          holidays.map((h) => (
            <div
              key={h.id}
              className="bg-surface border border-border rounded-xl shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-fg-subtle">{h.holiday_date}</p>
                  <p className="font-medium text-fg">
                    {h.holiday_name}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingHoliday(h)}
                    title="Edit holiday"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-fg-subtle hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {h.source === "manual" && (
                    <button
                      onClick={() => handleDelete(h.id)}
                      title="Delete holiday"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${typeStyles[h.holiday_type] || "bg-surface-active text-fg-muted"}`}
                >
                  {h.holiday_type.replace(/_/g, " ")}
                </span>

                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    h.source === "manual"
                      ? "bg-danger/15 text-danger"
                      : "bg-surface-active text-fg-subtle"
                  }`}
                >
                  {h.source === "manual"
                    ? h.override_api
                      ? "Manual · override"
                      : "Manual"
                    : "API"}
                </span>

                <span className="text-xs text-fg-subtle capitalize">
                  {h.scope}
                  {h.city ? ` – ${h.city}` : ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP: table */}
      <div className="hidden md:block bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-hover border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-fg-subtle text-xs uppercase tracking-wide">
                Date
              </th>
              <th className="px-5 py-3 font-medium text-fg-subtle text-xs uppercase tracking-wide">
                Name
              </th>
              <th className="px-5 py-3 font-medium text-fg-subtle text-xs uppercase tracking-wide">
                Type
              </th>
              <th className="px-5 py-3 font-medium text-fg-subtle text-xs uppercase tracking-wide">
                Scope
              </th>
              <th className="px-5 py-3 font-medium text-fg-subtle text-xs uppercase tracking-wide">
                Source
              </th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-fg-subtle"
                >
                  Loading holidays…
                </td>
              </tr>
            ) : holidays.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-fg-subtle"
                >
                  No holidays found for {year}
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-5 py-3 text-fg-subtle whitespace-nowrap">
                    {h.holiday_date}
                  </td>
                  <td className="px-5 py-3 text-fg font-medium">
                    {h.holiday_name}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${typeStyles[h.holiday_type] || "bg-surface-active text-fg-muted"}`}
                    >
                      {h.holiday_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-fg-subtle capitalize">
                    {h.scope}
                    {h.city ? ` – ${h.city}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        h.source === "manual"
                          ? "bg-danger/15 text-danger"
                          : "bg-surface-active text-fg-subtle"
                      }`}
                    >
                      {h.source === "manual"
                        ? h.override_api
                          ? "Manual · override"
                          : "Manual"
                        : "API"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingHoliday(h)}
                        title="Edit holiday"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-fg-subtle hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {h.source === "manual" && (
                        <button
                          onClick={() => handleDelete(h.id)}
                          title="Delete holiday"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddHolidayModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchHolidays();
          }}
        />
      )}

      {editingHoliday && (
        <EditHolidayModal
          holiday={editingHoliday}
          onClose={() => setEditingHoliday(null)}
          onSaved={() => {
            setEditingHoliday(null);
            fetchHolidays();
          }}
        />
      )}
    </div>
  );
}
