import { useEffect, useState } from "react";
import { getFuelForMyApproval } from "../../api/fuelRequests";
import useModuleAccess from "../../hooks/useModuleAccess";
import FuelRequestApprovals from "./FuelRequestApprovals";
import FuelRequests from "./FuelRequests";

// Approvals -> Fuel Request. Two views in one tab:
//   For My Approval -- Org Chart heads with "Fuel Request" ticked approve
//                      before the fuel code (FuelRequestApprovals).
//   All Requests    -- the Trip Manager's list: issue codes, check
//                      receipts, expired / cancelled (FuelRequests).
// Someone with both sees a switch; otherwise just their view.
const MANAGE_ITEM = {
  roles: ["superadmin", "coordinator_admin"],
  moduleKey: "fleet_management.fuel_requests",
};

export default function FuelRequestsTab() {
  const { isVisible, approvesAny, isSuperAdmin } = useModuleAccess();
  const canManage = isVisible(MANAGE_ITEM);
  const canApprove = isSuperAdmin || approvesAny("fuel_request");
  const [picked, setPicked] = useState(null);
  // How many are waiting on this person's approval -- opens on "For My
  // Approval" when there are any, so they aren't missed.
  const [mineCount, setMineCount] = useState(0);
  useEffect(() => {
    if (!canApprove) return;
    getFuelForMyApproval()
      .then((list) => setMineCount((list || []).filter((r) => r.can_act !== false).length))
      .catch(() => setMineCount(0));
  }, [canApprove]);

  const view = picked || (canManage && !mineCount ? "all" : "approval");
  const showSwitch = canManage && canApprove;

  return (
    <div className="space-y-5">
      {showSwitch && (
        <div className="flex w-fit rounded-xl border border-border bg-surface p-1">
          {[
            { key: "approval", label: "For My Approval" },
            { key: "all", label: "All Requests" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPicked(option.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                view === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {option.label}
              {option.key === "approval" && mineCount > 0 && (
                <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-[11px] font-bold text-warning">
                  {mineCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {view === "all" && canManage ? <FuelRequests embedded /> : <FuelRequestApprovals />}
    </div>
  );
}
