import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  createDispatch,
  getDispatches,
} from "../../api/adminDispatch/index";

import { getEmployeeList } from "../../api/employee/index";

import {
  getVehicleUnits,
  getRateProfiles,
} from "../../api/adminTripManagement/tripMaintenance";
import ShipmentTable from "../../components/coordinator/ShipmentTable";

const emptyRow = () => ({
  id: null,
  dispatchId: null,

  shipmentNo: "",
  dealer: "",
  hauler: "",

  driver: null,
  helpers: [],

  vehicle: null,
  tripProfile: null,

  pallets: "",
  cases: "",

  status: "NEW",

  editing: true,
  isNew: true,
});

const todayISO = () => new Date().toISOString().split("T")[0];

export default function ShipmentPlanning() {
  const [rows, setRows] = useState([emptyRow()]);

  const [drivers, setDrivers] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tripProfiles, setTripProfiles] = useState([]);

  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [planDate, setPlanDate] = useState(todayISO());
  const [saveState, setSaveState] = useState("idle"); // idle | saved

  const filled = rows.filter((r) => r.shipmentNo || r.dealer);
  const totalPallets = rows.reduce((sum, r) => sum + (Number(r.pallets) || 0), 0);
  const totalCases = rows.reduce((sum, r) => sum + (Number(r.cases) || 0), 0);
  const newRows = rows.filter((row) => row.isNew);

 

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
          employees,
          vehicleList,
          profileList,
          dispatchList,
      ] = await Promise.all([
          getEmployeeList(),
          getVehicleUnits(),
          getRateProfiles(),
          getDispatches(planDate),
      ]);

      // ==========================
      // Build dropdown options
      // ==========================

      const driverOptions = employees
        .filter(
          (e) =>
            e.department?.toLowerCase().includes("driver") &&
            e.user_id
        )
        .map((e) => ({
          id: e.user_id,
          employeeId: e.id,
          label: `${e.first_name} ${e.last_name}`,
        }));

      const helperOptions = employees
        .filter((e) =>
          e.department?.toLowerCase().includes("helper")
        )
        .map((e) => ({
          id: e.id,
          label: `${e.first_name} ${e.last_name}`,
        }));

      const vehicleOptions = vehicleList.map((v) => ({
        id: v.id,
        label: v.plate_number,
      }));

      const profileOptions = profileList.map((p) => ({
        id: p.id,
        label: p.profile_name,
        helperCount: p.helper_count,
      }));

      // ==========================
      // ⭐ PUT mappedRows HERE
      // ==========================

      const mappedRows = dispatchList.flatMap((dispatch) =>
        dispatch.items.map((item) => ({
          id: item.id,
          dispatchId: dispatch.id,

          shipmentNo: item.shipment_no,
          dealer: item.dealer_name,
          hauler: item.hauler_name,

          driver:
            driverOptions.find((d) => d.id === item.driver_id) ?? null,

          helpers:
            helperOptions.filter((h) =>
              item.helpers?.some((x) => x.helper_id === h.id)
            ),

          vehicle:
            vehicleOptions.find(
              (v) => v.id === item.vehicle_unit_id
            ) ?? null,

          tripProfile:
            profileOptions.find(
              (p) => p.id === item.trip_rate_profile_id
            ) ?? null,

          pallets: item.pallets,
          cases: item.cases,

          status: item.status,

          editing: false,
          isNew: false,
        }))
      );

      // ==========================
      // Set state
      // ==========================

      setDrivers(driverOptions);
      setHelpers(helperOptions);
      setVehicles(vehicleOptions);
      setTripProfiles(profileOptions);

      setDispatches(dispatchList);

      mappedRows.sort((a, b) => a.id - b.id);

      setRows(mappedRows.length ? mappedRows : [emptyRow()]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [planDate]);

 useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {

      if (newRows.length === 0) {
        toast.info("There are no new shipments to save.");
        return;
      }

      for (const row of newRows) {
          if (!row.shipmentNo) {
              toast.error("Shipment number is required.");
              return;
          }

          if (!row.driver) {
              toast.error("Driver is required.");
              return;
          }

          if (!row.vehicle) {
              toast.error("Vehicle is required.");
              return;
          }

          if (!row.tripProfile) {
              toast.error("Trip profile is required.");
              return;
          }
      }

      const payload = {
        plan_date: planDate,
        items: newRows.map((row) => ({
          shipment_no: row.shipmentNo,
          dealer_name: row.dealer,
          hauler_name: row.hauler,
          driver_id: row.driver?.id,
          vehicle_unit_id: row.vehicle.id,
          trip_rate_profile_id: row.tripProfile.id,
          pallets: Number(row.pallets),
          cases: Number(row.cases),
          helpers: row.helpers.map((h) => ({
            helper_id: h.id,
          })),
        })),
      };

      console.log("ROWS");
      console.log(rows);

      console.log("PAYLOAD");
      console.log(JSON.stringify(payload, null, 2));

      await createDispatch(payload);

      await loadData();

      // setRows([emptyRow()]);

      setSaveState("saved");

      toast.success("Shipment plan saved successfully.");

      setTimeout(() => {
        setSaveState("idle");
      }, 1800);

    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-sm text-slate-500">
          Loading shipment planning...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 p-8">
      <div className="mx-auto max-w-350 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Shipment Planning
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Assign dealers, haulers, and load counts before dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" />
              </svg>
              <input
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                className="bg-transparent text-sm text-slate-800 focus:outline-none"
              />
            </label>

            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="M7 8l5-5 5 5" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Upload Load Plan
            </button>

            <button
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:bg-amber-100 active:bg-amber-200"
              onClick={() => {
                  const last = rows[rows.length - 1];

                  if (last?.editing) {
                      toast.error("Finish editing the current row first.");
                      return;
                  }

                  setRows((prev) => [...prev, emptyRow()]);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add Row
            </button>

            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60"
            >
              {saveState === "saved" ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>

                  <span>
                      Save {newRows.length} Shipment{newRows.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 sm:max-w-md">
          <Stat label="Shipments" value={filled.length} />
          <Stat label="Pallets" value={totalPallets} accent="amber" />
          <Stat label="Cases" value={totalCases} accent="amber" />
          <Stat label="Dispatches" value={dispatches.length} />
        </div>

        <ShipmentTable
            rows={rows}
            setRows={setRows}

            drivers={drivers}
            helpers={helpers}
            vehicles={vehicles}
            tripProfiles={tripProfiles}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent === "amber" ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}