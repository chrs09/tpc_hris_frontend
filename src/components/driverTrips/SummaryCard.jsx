// src/components/driverTrips/SummaryCard.jsx

const SummaryCard = ({ title, value }) => {
  return (
    <div className="bg-[#2b2b2b] p-6 rounded-2xl border shadow">
      <p className="text-gray-300 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2 text-white">{value}</p>
    </div>
  );
};

export default SummaryCard;
