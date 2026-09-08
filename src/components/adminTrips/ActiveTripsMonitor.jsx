import React from "react";

const ActiveTripsMonitor = ({ trips = [] }) => {
  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-fg text-sm">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Driver</th>
              <th className="px-4 py-3 text-left font-medium">Ticket</th>
              <th className="px-4 py-3 text-left font-medium">Started</th>
              <th className="px-4 py-3 text-left font-medium">Current Stop</th>
              <th className="px-4 py-3 text-right font-medium">Duration</th>
            </tr>
          </thead>

          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-fg-subtle">
                  No active trips
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr
                  key={trip.id}
                  className="border-t border-border hover:bg-surface-hover"
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
          <div className="text-center text-fg-subtle py-6">No active trips</div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-surface border border-border text-fg p-4 rounded-xl"
            >
              <p className="font-semibold capitalize">{trip.username}</p>

              <div className="text-sm mt-2">
                <span className="text-fg-muted block capitalize">Ticket</span>
                {trip.ticket_no}
              </div>

              <div className="flex justify-between mt-2 text-sm">
                <div>
                  <span className="text-fg-muted block">Started</span>
                  {new Date(trip.start_time).toLocaleString()}
                </div>

                <div>
                  <span className="text-fg-muted block">Stop</span>
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
