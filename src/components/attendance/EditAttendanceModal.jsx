import React, { useState } from "react";
import { Button } from "../ui/button/Button";
import { attendanceStatus } from "../../constants/attendanceStatus";
import ConfirmModal from "../ui/modals/ConfirmModal";

const EditAttendanceModal = ({
  editModal,
  setEditModal,
  onSave,
  attendanceMap,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!editModal) return null;

  const existingRecord =
    attendanceMap?.[`${editModal.employeeId}-${editModal.date}`] || null;

  const isUpdate = !!existingRecord;

  const handleConfirmSave = async () => {
    try {
      setLoading(true);
      await onSave(); // parent handles alert
      setShowConfirm(false);
      setEditModal(null); // close main modal
    } catch {
      // do nothing here
      // parent (AttendanceList) handles errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-60">
        <div className="bg-[#2b2b2b] rounded-xl p-6 w-80 shadow-xl">
          <h3 className="text-lg font-bold mb-3 text-white">
            {isUpdate ? "Update Attendance" : "Create Attendance"}
          </h3>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-400">
                Employee
              </label>

              <p className="text-white font-semibold">
                {editModal.employeeName}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400">
                Date
              </label>

              <p className="text-white">
                {editModal.date}
              </p>
            </div>
          </div>

          <select
            value={editModal.status}
            className="w-full border rounded-lg h-11 px-3 mb-4 text-white bg-[#1e1e1e]"
            onChange={(e) => {
              const newStatus = e.target.value;

              setEditModal((prev) => ({
                ...prev,
                status: newStatus,

                ...(newStatus === "On Leave" || newStatus === "Absent"
                  ? {
                      timeIn: "",
                      timeOut: "",
                    }
                  : {}),
              }));
            }}
          >
            {Object.values(attendanceStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {editModal &&
          !["On Leave", "Absent"].includes(editModal.status) && (
            <div className="border-t border-gray-600 pt-4 mt-4 space-y-3">
              <h4 className="text-white font-semibold">Attendance Time</h4>

              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Time In
                </label>

                <input
                  type="time"
                  value={editModal.timeIn || ""}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      timeIn: e.target.value,
                    }))
                  }
                  className="w-full border rounded h-10 px-3 text-white bg-[#1e1e1e]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Time Out
                </label>

                <input
                  type="time"
                  value={editModal.timeOut || ""}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      timeOut: e.target.value,
                    }))
                  }
                  className="w-full border rounded h-10 px-3 text-white bg-[#1e1e1e]"
                />
              </div>
            </div>
          )}
          {/* REMARKS */}
          {["On Leave", "Absent"].includes(editModal.status) && (
            <div className="border-t border-gray-600 pt-4 mt-4">
              <label className="text-sm text-gray-300 block mb-2">
                {editModal.status === "On Leave"
                  ? "Reason for Leave"
                  : "Reason for Absence"}
              </label>

              <textarea
                value={editModal.remarks || ""}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
                placeholder="Enter reason..."
                rows={4}
                className="w-full border rounded p-3 text-white bg-[#1e1e1e]"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 text-white">
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              Cancel
            </Button>

            {/* <Button onClick={() => setShowConfirm(true)}
              //background color change on hover is not working when disabled, so we handle disabled state with cursor and opacity
            >
              {isUpdate ? "Update" : "Create"}
            </Button> */}
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg"
            >
              {isUpdate ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showConfirm}
        title={isUpdate ? "Confirm Update" : "Confirm Create"}
        message={
          isUpdate
            ? "Are you sure you want to update this attendance?"
            : "Are you sure you want to create attendance for this employee?"
        }
        loading={loading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSave}
      />
    </>
  );
};

export default EditAttendanceModal;
