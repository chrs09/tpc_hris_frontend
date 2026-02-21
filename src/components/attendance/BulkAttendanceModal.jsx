import React, { useState } from "react";
import { Button } from "../ui/button/Button";
import { attendanceStatus } from "../../constants/attendanceStatus";
import { employeeRoles } from "../../constants/employeeRole";
import ConfirmModal from "../ui/modals/ConfirmModal";
import Alert from "../ui/modals/Alert";

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
    (emp) => roleFilter === "All" || emp.role === roleFilter
  );

  const handleSubmit = () => {
    const employeesToSave = filteredEmployees.filter(
      (emp) => !attendanceMap[`${emp.id}-${today}`]
    );

    // 🚫 If ALL already recorded
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
    } catch{
    // 
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* MAIN BULK MODAL */}
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60">
        <div className="bg-[#023047] rounded-2xl p-6 w-2/3 max-h-[85vh] overflow-y-auto border-2 border-[#fba919] shadow-xl relative">


          <h2 className="text-xl font-bold mb-6 text-[#fba919]">
            Bulk Check Attendance
          </h2>

          {/* Role Filter */}
          <div className="mb-4">
            <label className="mr-2 text-white font-medium">
              Filter by Role:
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border rounded px-3 h-9"
            >
              {Object.values(employeeRoles).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <table className="w-full text-sm text-white border">
            <thead>
              <tr className="bg-[#0b3d5c]">
                <th className="border p-2">Employee</th>
                <th className="border p-2">Department</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((emp) => {
                const alreadyRecorded =
                  attendanceMap[`${emp.id}-${today}`];

                return (
                  <tr key={emp.id}>
                    <td className="border p-2 text-center">
                      {emp.name}
                    </td>
                    <td className="border p-2 text-center">
                      {emp.role}
                    </td>
                    <td className="border p-2 text-center">
                      <select
                        disabled={alreadyRecorded}
                        value={
                          alreadyRecorded
                            ? alreadyRecorded
                            : selections[emp.id] || "Present"
                        }
                        onChange={(e) =>
                          setSelections((prev) => ({
                            ...prev,
                            [emp.id]: e.target.value,
                          }))
                        }
                        className={`border rounded px-2 h-8 ${
                          alreadyRecorded
                            ? "bg-gray-500 text-gray-300"
                            : "bg-white text-black"
                        }`}
                      >
                        {Object.values(attendanceStatus).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* CONFIRM SAVE MODAL */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm Bulk Save"
        message={`You are about to save attendance for ${pendingPayload.length} employee(s). Continue?`}
        loading={loading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSave}
      />

      {/* INFO MODAL (Already Recorded) */}
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