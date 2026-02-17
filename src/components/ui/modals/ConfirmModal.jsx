// components/ui/ConfirmModal.jsx

import React from "react";
import { Button } from "../button/Button";

const ConfirmModal = ({
  isOpen,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-100">
      <div className="bg-[#0b3d5c] rounded-xl w-96 p-6 shadow-2xl border border-[#fba919]">
        <h3 className="text-lg font-bold text-[#fba919] mb-3">{title}</h3>

        <p className="text-sm text-white mb-6">{message}</p>

        <div className="flex justify-end gap-3 text-white">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>

          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
