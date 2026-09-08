// src/components/adminTrips/StatusBadge.jsx

const StatusBadge = ({ status }) => {
  const base =
    "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center";

  const styles = {
    PENDING_APPROVAL: "bg-warning/15 text-warning",
    ACTIVE: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-success/15 text-success",
    CANCELLED: "bg-danger/15 text-danger",
  };

  return (
    <span
      className={`${base} ${styles[status] || "bg-surface-active text-fg-muted"}`}
    >
      {status?.replace("_", " ")}
    </span>
  );
};

export default StatusBadge;
