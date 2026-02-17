import React from "react";

const Alert = ({ type = "success", message, onClose }) => {
  const base = "px-4 py-3 rounded-lg shadow-md flex justify-between items-center";

  const variants = {
    success: "bg-green-100 text-green-800 border border-green-400",
    error: "bg-red-100 text-red-800 border border-red-400",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-400",
  };

  return (
    <div className={`${base} ${variants[type]}`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-4 font-bold hover:opacity-70"
      >
        ✕
      </button>
    </div>
  );
};

export default Alert;