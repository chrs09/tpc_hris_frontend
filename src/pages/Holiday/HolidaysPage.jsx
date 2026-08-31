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
    regular: "bg-slate-100 text-slate-600",
    special_non_working: "bg-amber-50 text-amber-700",
    special_working: "bg-sky-50 text-sky-700",
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Holidays</h1>
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full pl-3 pr-7 py-1 cursor-pointer hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              {Array.from({ length: 10 }, (_, i) => 2024 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
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
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-3.5 py-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                Date
              </th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                Name
              </th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                Type
              </th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
                Scope
              </th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">
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
                  className="px-5 py-10 text-center text-slate-400"
                >
                  Loading holidays…
                </td>
              </tr>
            ) : holidays.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-400"
                >
                  No holidays found for {year}
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {h.holiday_date}
                  </td>
                  <td className="px-5 py-3 text-slate-800 font-medium">
                    {h.holiday_name}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${typeStyles[h.holiday_type] || "bg-slate-100 text-slate-600"}`}
                    >
                      {h.holiday_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 capitalize">
                    {h.scope}
                    {h.city ? ` – ${h.city}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        h.source === "manual"
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-500"
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
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {h.source === "manual" && (
                        <button
                          onClick={() => handleDelete(h.id)}
                          title="Delete holiday"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
