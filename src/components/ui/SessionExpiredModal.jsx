import React from "react";
import { Button } from "./button/Button";

const SessionExpiredModal = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-100 rounded-2xl shadow-2xl p-6 text-center animate-fadeIn">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Session Expired
        </h2>

        <p className="text-gray-600 mb-6">
          Your session has ended for security reasons. Please log in again to
          continue.
        </p>

        <Button className="w-full" onClick={onConfirm}>
          Go to Login
        </Button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
