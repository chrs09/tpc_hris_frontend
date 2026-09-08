const CompletedTripsTable = ({ trips = [] }) => (
  <div className="bg-surface rounded-xl border border-border overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-surface-hover text-fg-muted">
        <tr>
          <th className="px-6 py-3 text-left">Trip ID</th>
          <th className="px-6 py-3 text-left">Driver</th>
          <th className="px-6 py-3 text-left">Ticket No</th>
          <th className="px-6 py-3 text-left">Completed At</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {trips.length === 0 ? (
          <tr>
            <td colSpan="4" className="px-6 py-8 text-center text-fg-subtle">
              No completed trips
            </td>
          </tr>
        ) : (
          trips.map((trip) => (
            <tr key={trip.id} className="hover:bg-surface-hover">
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
