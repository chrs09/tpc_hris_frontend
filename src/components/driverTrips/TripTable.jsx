import React, { useState } from "react";

const calculateDuration = (start, end) => {
  if (!start || !end) return "-";

  const startDate = new Date(start);
  const endDate = new Date(end);

  const diffMs = endDate - startDate;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

const TripTable = ({ trips = [], title }) => {
  const [page, setPage] = useState(1);
  const perPage = 2;

  const totalPages = Math.ceil(trips.length / perPage);

  const paginatedTrips = trips.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-hidden border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[#023047] text-white">
            <tr>
              <th className="p-3 text-left">Ticket</th>
              <th className="p-3 text-left">Start</th>
              <th className="p-3 text-left">End</th>
              <th className="p-3 text-left">Duration</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.map((trip) => (
              <tr key={trip.id} className="border-t bg-[#023047]">
                <td className="p-3 text-white">{trip.ticket_no}</td>
                <td className="p-3 text-white">{trip.start_time}</td>
                <td className="p-3 text-white">{trip.end_time || "-"}</td>
                <td className="p-3 text-white">
                  {calculateDuration(trip.start_time, trip.end_time)}
                </td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold
                        ${
                          trip.status === "COMPLETED"
                            ? "bg-green-800 text-white"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                  >
                    {trip.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARDS ================= */}
      <div className="md:hidden flex flex-col gap-3">
        {paginatedTrips.map((trip) => (
          <div
            key={trip.id}
            className="bg-[#023047] text-white rounded-xl p-4 shadow"
          >
            <div className="text-sm mb-2">
              <span className="opacity-70">Ticket</span>
              <div className="font-semibold">{trip.ticket_no}</div>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <div>
                <span className="opacity-70 block">Start</span>
                {trip.start_time}
              </div>

              <div>
                <span className="opacity-70 block">End</span>
                {trip.end_time || "-"}
              </div>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1 text-xs rounded-full font-semibold
                    ${
                      trip.status === "COMPLETED"
                        ? "bg-green-800 text-white"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
              >
                {trip.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-[#ffa903] rounded disabled:opacity-40"
          >
            Prev
          </button>

          <span className="text-sm">
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-[#ffa903] rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TripTable;
