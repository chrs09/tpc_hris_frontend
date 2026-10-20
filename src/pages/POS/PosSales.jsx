import { useMemo, useState } from "react";
import { Receipt, Search, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import ReceiptModal from "../../components/pos/ReceiptModal";
import { PAYMENT_METHODS, loadSales, methodLabel, peso } from "./posData";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "all", label: "All" },
];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export default function PosSales() {
  const [sales] = useState(loadSales);
  const [range, setRange] = useState("today");
  const [method, setMethod] = useState("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    const from =
      range === "today" ? startOfToday() : range === "7d" ? startOfToday() - 6 * 86400000 : 0;
    const q = search.trim().toLowerCase();
    return sales.filter(
      (s) =>
        new Date(s.at).getTime() >= from &&
        (method === "all" || s.method === method) &&
        (!q ||
          String(s.no).includes(q) ||
          (s.customer || "").toLowerCase().includes(q) ||
          s.cashier.toLowerCase().includes(q) ||
          s.lines.some((l) => l.name.toLowerCase().includes(q))),
    );
  }, [sales, range, method, search]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce((sum, s) => sum + s.total, 0);
    const items = filtered.reduce((sum, s) => sum + s.items, 0);
    const byMethod = PAYMENT_METHODS.map((m) => ({
      ...m,
      total: filtered.filter((s) => s.method === m.key).reduce((sum, s) => sum + s.total, 0),
    }));
    return {
      revenue,
      count: filtered.length,
      avg: filtered.length ? revenue / filtered.length : 0,
      items,
      byMethod,
    };
  }, [filtered]);

  const cards = [
    { label: "Sales", value: peso(stats.revenue), icon: TrendingUp },
    { label: "Transactions", value: stats.count, icon: Receipt },
    { label: "Avg. Sale", value: peso(stats.avg), icon: Wallet },
    { label: "Items Sold", value: stats.items, icon: ShoppingBag },
  ];

  return (
    <>
      <SectionTabs group="POS" />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">Sales</h1>
            <p className="text-sm text-fg-subtle">Transactions and daily totals.</p>
          </div>
          <div className="flex w-fit rounded-xl border border-border bg-surface p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  range === r.key ? "bg-primary text-primary-foreground" : "text-fg-muted hover:text-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => {
            const CardIcon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between text-fg-subtle">
                  <span className="text-xs font-semibold uppercase tracking-wide">{card.label}</span>
                  <CardIcon size={16} />
                </div>
                <p className="mt-2 text-xl font-bold text-fg sm:text-2xl">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Payment mix */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            By payment method
          </p>
          <div className="space-y-2.5">
            {stats.byMethod.map((m) => {
              const pct = stats.revenue ? (m.total / stats.revenue) * 100 : 0;
              return (
                <div key={m.key} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-fg-muted">{m.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right font-medium text-fg">{peso(m.total)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt #, customer, cashier or item"
              className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none"
          >
            <option value="all">All payments</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-subtle">
            No sales for this filter.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm md:block">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover text-fg-muted">
                  <tr className="text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Receipt</th>
                    <th className="px-5 py-3 text-left font-medium">Date / Time</th>
                    <th className="px-5 py-3 text-left font-medium">Items</th>
                    <th className="px-5 py-3 text-left font-medium">Payment</th>
                    <th className="px-5 py-3 text-left font-medium">Customer</th>
                    <th className="px-5 py-3 text-left font-medium">Cashier</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setViewing(s)}
                      className="cursor-pointer border-t border-border transition hover:bg-surface-hover"
                    >
                      <td className="px-5 py-3 font-medium text-fg">#{s.no}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-fg-muted">
                        {new Date(s.at).toLocaleString()}
                      </td>
                      <td className="max-w-[260px] px-5 py-3 text-fg-muted">
                        <span className="line-clamp-1">
                          {s.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-surface-active px-2.5 py-1 text-xs font-medium text-fg-muted">
                          {methodLabel(s.method)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-fg-muted">{s.customer || "—"}</td>
                      <td className="px-5 py-3 text-fg-muted">{s.cashier}</td>
                      <td className="px-5 py-3 text-right font-semibold text-fg">{peso(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone cards */}
            <div className="space-y-2 md:hidden">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setViewing(s)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">
                      #{s.no} · {methodLabel(s.method)}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      {new Date(s.at).toLocaleString()} · {s.items} item{s.items !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-base font-bold text-fg">{peso(s.total)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ReceiptModal sale={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
