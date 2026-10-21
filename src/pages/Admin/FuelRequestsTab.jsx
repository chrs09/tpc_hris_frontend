import { useState } from "react";
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

  const view = picked || (canManage ? "all" : "approval");
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
            </button>
          ))}
        </div>
      )}

      {view === "all" && canManage ? <FuelRequests embedded /> : <FuelRequestApprovals />}
    </div>
  );
}
