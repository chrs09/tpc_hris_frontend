import React from "react";
import StartTripForDriverCard from "../../components/adminTrips/StartTripForDriverCard";

const TripBypass = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 bg-background min-h-screen space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-fg">
          Start Trip (Bypass)
        </h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Start a trip on behalf of a driver who can't file it themselves
          right now. The driver checks in/out from their own phone once
          it's started.
        </p>
      </div>

      <StartTripForDriverCard alwaysExpanded />
    </div>
  );
};

export default TripBypass;
