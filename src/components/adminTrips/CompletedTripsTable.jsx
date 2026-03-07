const CompletedTripsTable = ({ trips = [] }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-gray-600">
        <tr>
          <th className="px-6 py-3 text-left">Trip ID</th>
          <th className="px-6 py-3 text-left">Driver</th>
          <th className="px-6 py-3 text-left">Ticket No</th>
          <th className="px-6 py-3 text-left">Completed At</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {trips.length === 0 ? (
          <tr>
            <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
              No completed trips
            </td>
          </tr>
        ) : (
          trips.map((trip) => (
            <tr key={trip.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">{trip.id}</td>
              <td className="px-6 py-4">
                {trip.driver?.name || trip.driver_id}
              </td>
              <td className="px-6 py-4 font-medium">{trip.ticket_no}</td>
              <td className="px-6 py-4">
                {new Date(trip.completed_at).toLocaleString()}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default CompletedTripsTable;
