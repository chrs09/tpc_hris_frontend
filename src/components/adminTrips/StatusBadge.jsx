// src/components/adminTrips/StatusBadge.jsx

const StatusBadge = ({ status }) => {
  const base =
    "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center";

  const styles = {
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`${base} ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status?.replace("_", " ")}
    </span>
  );
};

export default StatusBadge;
