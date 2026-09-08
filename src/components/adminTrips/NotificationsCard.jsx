const NotificationsCard = () => {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-6 border border-border h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-fg">
          Recent Notifications
        </h2>
        <button className="text-fg-subtle hover:text-fg-muted">•••</button>
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-warning/15 border border-warning rounded-xl p-4">
          <p className="text-sm font-semibold text-warning">
            Unregistered Store
          </p>
          <p className="text-sm text-fg-muted">
            Driver checked in at unknown location.
          </p>
          <p className="text-xs text-fg-subtle mt-1">5 min ago</p>
        </div>

        <div className="bg-success/15 border border-success rounded-xl p-4">
          <p className="text-sm font-semibold text-success">Trip Completed</p>
          <p className="text-sm text-fg-muted">Trip awaiting admin approval.</p>
          <p className="text-xs text-fg-subtle mt-1">10 min ago</p>
        </div>
      </div>

      <button className="mt-6 w-full border border-border rounded-lg py-2 text-sm font-medium hover:bg-surface-hover transition">
        View All
      </button>
    </div>
  );
};

export default NotificationsCard;
