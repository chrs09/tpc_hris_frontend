// src/components/driverTrips/SummaryCard.jsx

const SummaryCard = ({ title, value }) => {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
      <p className="text-fg-muted text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2 text-fg">{value}</p>
    </div>
  );
};

export default SummaryCard;
