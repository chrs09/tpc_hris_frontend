import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { getNavGroups } from "../../constants/navGroups";
import { saveNavigationLayout } from "../../api/navigationLayout";
import useNavigationLayout, {
  DEFAULT_LAYOUT,
  orderGroups,
  TAB_LABELS,
} from "../../hooks/useNavigationLayout";

const MAX_TABS = 4;

// Settings -> Navigation (superadmin): the sidebar's group order and which
// groups sit in the phone's bottom bar, for everyone. People still only
// see what they can open.
export default function NavigationLayoutCard({ canEdit }) {
  const saved = useNavigationLayout();
  const allLabels = useMemo(() => getNavGroups("superadmin").map((g) => g.label), []);
  const [order, setOrder] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrder(orderGroups(allLabels.map((label) => ({ label })), saved.sidebar_order).map((g) => g.label));
    setTabs((saved.mobile_tabs || []).filter((l) => allLabels.includes(l)));
  }, [saved, allLabels]);

  const move = (list, setList, index, delta) => {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
  };

  const toggleTab = (label) => {
    if (tabs.includes(label)) setTabs(tabs.filter((t) => t !== label));
    else if (tabs.length < MAX_TABS) setTabs([...tabs, label]);
    else toast.error(`Pick up to ${MAX_TABS}. Remove one first.`);
  };

  const save = async () => {
    try {
      setSaving(true);
      const result = await saveNavigationLayout({ sidebar_order: order, mobile_tabs: tabs });
      window.dispatchEvent(new CustomEvent("navigation-layout-changed", { detail: result }));
      toast.success("Navigation saved. Everyone sees it on their next page load.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setOrder(allLabels);
    setTabs(DEFAULT_LAYOUT.mobile_tabs);
  };

  const arrowBtn =
    "rounded-md p-1 text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Navigation</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            The sidebar order and the phone bottom bar, for everyone. People only see the
            groups they can open.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
            >
              <RotateCcw size={14} /> Default
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* SIDEBAR ORDER */}
        <section>
          <h3 className="text-sm font-semibold text-fg">Sidebar order</h3>
          <p className="mb-2 text-xs text-fg-subtle">Top to bottom. Also the order of the phone Menu.</p>
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {order.map((label, index) => (
              <li key={label} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-5 text-right text-xs tabular-nums text-fg-subtle">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-fg">{label}</span>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      aria-label={`Move ${label} up`}
                      onClick={() => move(order, setOrder, index, -1)}
                      disabled={index === 0}
                      className={arrowBtn}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${label} down`}
                      onClick={() => move(order, setOrder, index, 1)}
                      disabled={index === order.length - 1}
                      className={arrowBtn}
                    >
                      <ArrowDown size={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* PHONE BOTTOM BAR */}
        <section>
          <h3 className="text-sm font-semibold text-fg">Phone bottom bar</h3>
          <p className="mb-2 text-xs text-fg-subtle">
            Home and Menu are always there. Pick up to {MAX_TABS} groups in between ({tabs.length}/
            {MAX_TABS}).
          </p>

          {/* preview */}
          <div className="mb-3 flex overflow-hidden rounded-xl border border-border bg-background text-[11px] font-semibold text-fg-muted">
            {["Home", ...tabs.map((t) => TAB_LABELS[t] || t), "Menu"].map((name, i) => (
              <span key={`${name}-${i}`} className="flex-1 truncate px-1 py-2 text-center">
                {name}
              </span>
            ))}
          </div>

          {tabs.length > 0 && (
            <ol className="mb-3 divide-y divide-border overflow-hidden rounded-xl border border-primary/40">
              {tabs.map((label, index) => (
                <li key={label} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-fg">
                    {label}
                    {TAB_LABELS[label] && (
                      <span className="ml-1 text-xs text-fg-subtle">shown as &quot;{TAB_LABELS[label]}&quot;</span>
                    )}
                  </span>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        aria-label={`Move ${label} left`}
                        onClick={() => move(tabs, setTabs, index, -1)}
                        disabled={index === 0}
                        className={arrowBtn}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${label} right`}
                        onClick={() => move(tabs, setTabs, index, 1)}
                        disabled={index === tabs.length - 1}
                        className={arrowBtn}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap gap-2">
            {allLabels
              .filter((label) => label !== "Dashboard")
              .map((label) => {
                const on = tabs.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleTab(label)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-default ${
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-fg-muted hover:bg-surface-hover"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {label}
                  </button>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
}
