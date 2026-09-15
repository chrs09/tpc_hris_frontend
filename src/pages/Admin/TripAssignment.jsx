import React from "react";
import StartTripForDriverCard from "../../components/adminTrips/StartTripForDriverCard";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

// Formerly "Start Trip (Bypass)" -- renamed since "bypass" now refers to
// the separate Trip Bypass feature (acting as a driver on a stuck trip,
// see TripBypassPage.jsx). This page is unchanged: dispatch a trip to a
// driver from the office.
const TripAssignment = () => {
  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-fg">
          Trip Assignment
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

export default TripAssignment;
