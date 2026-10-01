import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { getNavGroups } from "../../constants/navGroups";
import useModuleAccess from "../../hooks/useModuleAccess";
import AttendanceApprovals from "../Attendance/AttendanceApprovals";
import CashAdvanceApprovals from "../Admin/CashAdvanceApprovals";
import LeaveManagement from "../Leave/LeaveManagement";
import OvertimeApprovals from "../Overtime/OvertimeApprovals";

// Approvals -- every kind of approval in one place, one tab each
// (Attendance, Cash Advance, Overtime, Leave). Which tabs show is the same
// access as before (see the "Approvals" group in constants/navGroups.js);
// each tab is the existing approval page, without its own section tabs.
const TABS = {
  attendance: AttendanceApprovals,
  cash_advance: CashAdvanceApprovals,
  overtime: OvertimeApprovals,
  leave: LeaveManagement,
};

const tabOf = (path) => new URLSearchParams(path.split("?")[1] || "").get("tab");

export default function ApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, isVisible } = useModuleAccess();

  const visibleTabs = (
    getNavGroups(role).find((group) => group.label === "Approvals")?.children || []
  )
    .filter(isVisible)
    .map((item) => tabOf(item.path))
    .filter((tab) => TABS[tab]);

  // The asked-for tab (links, bells), else the first one this person can
  // use. Access loads a moment after the page, so an asked-for tab isn't
  // second-guessed here -- the server checks every action anyway.
  const requested = searchParams.get("tab");
  const tab = TABS[requested] ? requested : visibleTabs[0];

  useEffect(() => {
    if (!requested && tab) {
      setSearchParams({ tab }, { replace: true });
    }
  }, [tab, requested, setSearchParams]);

  const Tab = TABS[tab];

  return (
    <div className="space-y-5">
      <SectionTabs group="Approvals" />
      {Tab ? (
        <Tab embedded />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-subtle">
          You don&apos;t have any approvals to handle.
        </div>
      )}
    </div>
  );
}
