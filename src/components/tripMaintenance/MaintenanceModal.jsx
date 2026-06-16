import React from "react";
import { X } from "lucide-react";

const MaintenanceModal = ({ isOpen, onClose, title, children, onSave }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>

          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">
            Cancel
          </button>

          <button
            onClick={onSave}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
