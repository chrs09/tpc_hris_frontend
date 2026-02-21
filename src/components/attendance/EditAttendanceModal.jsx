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
    attendanceMap?.[
      `${editModal.employeeId}-${editModal.date}`
    ] || null;

  const isUpdate = !!existingRecord;

  const handleConfirmSave = async () => {
    try {
      setLoading(true);
      await onSave();        // parent handles alert
      setShowConfirm(false);
      setEditModal(null);    // close main modal
    } catch{
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
        <div className="bg-[#0b3d5c] rounded-xl p-6 w-80 shadow-xl">

          <h3 className="text-lg font-bold mb-3 text-white">
            {isUpdate ? "Update Attendance" : "Create Attendance"}
          </h3>

          <p className="text-sm mb-2 text-white">
            <strong>{editModal.employeeName}</strong>
          </p>

          <p className="text-sm mb-4 text-white">
            {editModal.date}
          </p>

          <select
            value={editModal.status}
            onChange={(e) =>
              setEditModal((prev) => ({
                ...prev,
                status: e.target.value,
              }))
            }
            className="w-full border rounded h-10 px-3 mb-4"
          >
            {Object.values(attendanceStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setEditModal(null)}
            >
              Cancel
            </Button>

            <Button onClick={() => setShowConfirm(true)}>
              {isUpdate ? "Update" : "Create"}
            </Button>
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