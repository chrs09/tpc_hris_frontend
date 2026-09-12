import { Link, useLocation } from "react-router-dom";
import { getNavGroups } from "../../../constants/navGroups";
import useModuleAccess from "../../../hooks/useModuleAccess";

// In-page tab bar for switching between the sibling pages of a sidebar
// group (e.g. Trip Management's Trips / Office Trip Review / Start Trip
// (Bypass) / Trip Categories & Rates / Daily Dispatch Board) without
// going back to the sidebar's click-to-expand dropdown. Drop this at the
// top of any page that belongs to a multi-page group; renders nothing
// for single-page groups or once access filtering leaves only one
// visible sibling.
export default function SectionTabs({ group }) {
  const location = useLocation();
  const { role, isVisible } = useModuleAccess();

  const found = getNavGroups(role).find((g) => g.label === group);
  if (!found) return null;

  const visibleChildren = found.children.filter(isVisible);
  if (visibleChildren.length <= 1) return null;

  return (
    // Sticky (fixed) at the top of the content area so it stays visible
    // while scrolling down a long page -- switching pages within the
    // group never requires scrolling back up first. top-16 clears the
    // fixed mobile top bar (h-16); it collapses to top-0 on desktop,
    // where that bar is hidden.
    <div className="sticky top-16 md:top-0 z-20 mb-6 flex gap-1 overflow-x-auto border-b border-border bg-background">
      {visibleChildren.map((item) => {
        const pathname = item.path.split("?")[0];
        const active = location.pathname === pathname;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-fg-subtle hover:text-fg"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
