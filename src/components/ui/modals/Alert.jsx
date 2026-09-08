import React from "react";

const Alert = ({ type = "success", message, onClose }) => {
  const base =
    "px-4 py-3 rounded-lg shadow-md flex justify-between items-center";

  const variants = {
    success: "bg-success/15 text-success border border-success/30",
    error: "bg-danger/15 text-danger border border-danger/30",
    warning: "bg-warning/15 text-warning border border-warning/30",
  };

  return (
    <div className={`${base} ${variants[type]}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 font-bold hover:opacity-70">
        ✕
      </button>
    </div>
  );
};

export default Alert;
