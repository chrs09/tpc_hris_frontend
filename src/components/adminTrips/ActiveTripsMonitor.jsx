import React from "react";

const ActiveTripsMonitor = ({ trips = [] }) => {
  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-[#2b2b2b] rounded-xl overflow-hidden">
        <table className="w-full text-white text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Driver</th>
              <th className="px-4 py-3 text-left">Ticket</th>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left">Current Stop</th>
              <th className="px-4 py-3 text-right">Duration</th>
            </tr>
          </thead>

          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-300">
                  No active trips
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr
                  key={trip.id}
                  className="hover:bg-[#a09f9f] bg-[#b3b3b3] text-black"
                >
                  <td className="px-4 py-4 capitalize">{trip.username}</td>
                  <td className="px-4 py-4 capitalize">{trip.ticket_no}</td>
                  <td className="px-4 py-4">
                    {new Date(trip.start_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    {trip.current_stop || "In Transit"}
                  </td>
                  <td className="px-4 py-4 text-right">{trip.duration}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden flex flex-col gap-3">
        {trips.length === 0 ? (
          <div className="text-center text-gray-400 py-6">No active trips</div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-[#2b2b2b] text-white p-4 rounded-xl"
            >
              <p className="font-semibold capitalize">{trip.username}</p>

              <div className="text-sm mt-2">
                <span className="opacity-70 block capitalize">Ticket</span>
                {trip.ticket_no}
              </div>

              <div className="flex justify-between mt-2 text-sm">
                <div>
                  <span className="opacity-70 block">Started</span>
                  {new Date(trip.start_time).toLocaleString()}
                </div>

                <div>
                  <span className="opacity-70 block">Stop</span>
                  {trip.current_stop || "Transit"}
                </div>
              </div>

              <div className="text-right text-sm mt-2">
                Duration: {trip.duration}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default ActiveTripsMonitor;
