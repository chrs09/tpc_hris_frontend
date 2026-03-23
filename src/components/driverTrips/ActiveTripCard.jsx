// src/components/driverTrips/ActiveTripCard.jsx

import { useEffect, useReducer } from "react";

const calculateDuration = (start) => {
  if (!start) return "-";

  const startTime = new Date(start);
  const now = new Date();

  const diffMs = now - startTime;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffHrs}h ${diffMins}m`;
};

const ActiveTripCard = ({ activeTrip }) => {
  // Just a ticking counter to force re-render
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!activeTrip) return;

    const interval = setInterval(() => {
      forceUpdate();
    }, 60000); // every 1 min

    return () => clearInterval(interval);
  }, [activeTrip]);

  if (!activeTrip) {
    return (
      <div className="bg-[#2b2b2b] border p-6 rounded-2xl text-gray-300">
        You currently have no active trip.
      </div>
    );
  }

  const duration = calculateDuration(activeTrip.start_time);

  return (
    <div className="bg-[#2b2b2b] text-white p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <p className="text-sm opacity-80">Ticket</p>
          <p className="text-xl font-bold">{activeTrip.ticket_no}</p>
        </div>

        <div>
          <p className="text-sm opacity-80">Started</p>
          <p>{new Date(activeTrip.start_time).toLocaleString()}</p>
        </div>

        <div>
          <p className="text-sm opacity-80">Live Duration</p>
          <p className="font-semibold">{duration}</p>
        </div>
      </div>
    </div>
  );
};

export default ActiveTripCard;
