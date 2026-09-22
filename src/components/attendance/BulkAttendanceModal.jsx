import React, { useState } from "react";
import { Button } from "../ui/button/Button";
import { attendanceStatus } from "../../constants/attendanceStatus";
import { employeeRoles } from "../../constants/employeeRole";
import ConfirmModal from "../ui/modals/ConfirmModal";
import SearchSelect from "../SearchSelect";

const BulkAttendanceModal = ({
  isOpen,
  onClose,
  employees,
  attendanceMap,
  today,
  onSave,
}) => {
  const [roleFilter, setRoleFilter] = useState("All");
  const [selections, setSelections] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState([]);
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState(null);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(
    (emp) => roleFilter === "All" || emp.role === roleFilter,
  );

  const handleSubmit = () => {
    const employeesToSave = filteredEmployees.filter(
      (emp) => !attendanceMap[`${emp.id}-${today}`],
    );

    if (employeesToSave.length === 0) {
      setInfoModal({
        title: "Attendance Already Recorded",
        message:
          "Employees in this department already have attendance for today.",
      });
      return;
    }

    const payload = employeesToSave.map((emp) => ({
      employee_id: emp.id,
      status: selections[emp.id] || "Present",
    }));

    setPendingPayload(payload);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    try {
      setLoading(true);
      await onSave(pendingPayload);
      setShowConfirm(false);
      setSelections({});
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60 px-2">
        <div className="bg-[#2b2b2b] rounded-2xl w-full max-w-[95vw] md:max-w-4xl max-h-[90vh] flex flex-col border border-[#d4d4d4] shadow-xl">
          {/* HEADER */}
          <div className="p-4 sm:p-6 border-b border-[#444]">
            <h2 className="text-lg sm:text-xl font-bold text-[#fba919]">
              Bulk Check Attendance
            </h2>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-white font-medium">Filter by Role:</label>
              <SearchSelect
                value={roleFilter}
                options={Object.values(employeeRoles)}
                onChange={(role) => setRoleFilter(role)}
                placeholder="Select Role"
              />
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* ✅ MOBILE VIEW (CARDS) */}
            <div className="md:hidden space-y-3">
              {filteredEmployees.map((emp) => {
                const alreadyRecorded = attendanceMap[`${emp.id}-${today}`];
                const alreadyRecordedStatus = alreadyRecorded?.status;

                return (
                  <div
                    key={emp.id}
                    className="bg-[#1f1f1f] border border-[#444] rounded-xl p-4 space-y-3"
                  >
                    <div>
                      <p className="text-xs text-gray-400">Employee</p>
                      <p className="text-white font-medium">{emp.name}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Department</p>
                      <p className="text-white">{emp.role}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <SearchSelect
                        disabled={alreadyRecorded}
                        value={
                          alreadyRecorded
                            ? alreadyRecordedStatus
                            : selections[emp.id] || "Present"
                        }
                        options={Object.values(attendanceStatus)}
                        onChange={(status) =>
                          setSelections((prev) => ({
                            ...prev,
                            [emp.id]: status,
                          }))
                        }
                        placeholder="Select Status"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ✅ DESKTOP VIEW (TABLE) */}
            <div className="hidden md:block">
              <table className="w-full text-sm text-white table-fixed">
                <thead>
                  <tr>
                    <th className="border p-2 w-[40%]">Employee</th>
                    <th className="border p-2 w-[30%]">Department</th>
                    <th className="border p-2 w-[30%]">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((emp) => {
                    const alreadyRecorded = attendanceMap[`${emp.id}-${today}`];

                    return (
                      <tr key={emp.id} className="hover:bg-[#1f1f1f]">
                        <td className="border p-2 text-center truncate">
                          {emp.name}
                        </td>

                        <td className="border p-2 text-center truncate">
                          {emp.role}
                        </td>

                        <td className="border p-2 text-center">
                          <SearchSelect
                            disabled={alreadyRecorded}
                            value={
                              alreadyRecorded
                                ? alreadyRecorded
                                : selections[emp.id] || "Present"
                            }
                            options={Object.values(attendanceStatus)}
                            onChange={(status) =>
                              setSelections((prev) => ({
                                ...prev,
                                [emp.id]: status,
                              }))
                            }
                            placeholder="Select Status"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-[#444] flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto">
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* CONFIRM */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm Bulk Save"
        message={`You are about to save attendance for ${pendingPayload.length} employee(s). Continue?`}
        loading={loading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSave}
      />

      {/* INFO */}
      <ConfirmModal
        isOpen={!!infoModal}
        title={infoModal?.title}
        message={infoModal?.message}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setInfoModal(null)}
        onCancel={() => setInfoModal(null)}
      />
    </>
  );
};

export default BulkAttendanceModal;
