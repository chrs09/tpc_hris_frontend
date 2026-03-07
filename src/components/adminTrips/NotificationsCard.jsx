const NotificationsCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Recent Notifications
        </h2>
        <button className="text-gray-400 hover:text-gray-600">•••</button>
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-yellow-700">
            Unregistered Store
          </p>
          <p className="text-sm text-gray-600">
            Driver checked in at unknown location.
          </p>
          <p className="text-xs text-gray-400 mt-1">5 min ago</p>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700">Trip Completed</p>
          <p className="text-sm text-gray-600">Trip awaiting admin approval.</p>
          <p className="text-xs text-gray-400 mt-1">10 min ago</p>
        </div>
      </div>

      <button className="mt-6 w-full border border-gray-200 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition">
        View All
      </button>
    </div>
  );
};

export default NotificationsCard;
