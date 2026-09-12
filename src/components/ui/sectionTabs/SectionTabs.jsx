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
    // Single outer element -- pages drop <SectionTabs /> as the first
    // child of a space-y-5 container, so this must stay one element or
    // that container's auto-margins would land on the wrong piece below.
    // Desktop: this wrapper itself is the sticky bar (unchanged from
    // before). Mobile: the inner bar is truly fixed instead of sticky
    // (sticky was getting covered by/overlapping page content in some
    // layouts), pinned below the fixed mobile top bar (top-16, h-16);
    // the wrapper then just reserves that height (h-16) in normal flow
    // so content below doesn't jump up underneath it.
    <div className="h-20 md:sticky md:top-0 md:z-20 md:mb-6 md:h-auto">
      <div className="fixed left-4 right-4 top-16 z-20 flex gap-1 overflow-x-auto border-b border-border bg-background md:static md:left-auto md:right-auto md:top-auto md:z-auto">
        {visibleChildren.map((item) => {
          const pathname = item.path.split("?")[0];
          const active = location.pathname === pathname;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`whitespace-nowrap border-b-2 px-5 py-3 text-base font-medium transition-colors md:px-4 md:py-2 md:text-sm ${
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
    </div>
  );
}
