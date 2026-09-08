import { useState, useEffect } from "react";
import { Truck, Tags, Plus, Search, Pencil, Trash2 } from "lucide-react";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
// api
import {
  getVehicleUnits,
  getRateProfiles,
  createVehicleUnit,
  createRateProfile,
  updateVehicleUnit,
  updateRateProfile,
} from "../../api/adminTripManagement/tripMaintenance";
import { toast } from "react-hot-toast";

export default function TripMaintenance() {
  const [activeTab, setActiveTab] = useState("units");

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [tripRates, setTripRates] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    unit_code: "",
    plate_number: "",
    description: "",
  });
  const [rateForm, setRateForm] = useState({
    profile_name: "",
    helper_count: 0,
    driver_first_trip_rate: "",
    driver_next_trip_rate: "",
    helper_first_trip_rate: "",
    helper_next_trip_rate: "",
  });

  const loadVehicleUnits = async () => {
    try {
      const response = await getVehicleUnits();

      console.log(response);

      setVehicleUnits(response || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRateProfiles = async () => {
    try {
      const response = await getRateProfiles();

      console.log("Rate Profiles Response:", response);

      setTripRates(response || []);
    } catch (error) {
      console.error("Failed to load rate profiles", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadVehicleUnits();
      await loadRateProfiles();
    };

    loadData();
  }, []);

  const handleCreateVehicleUnit = async () => {
    try {
      await createVehicleUnit(vehicleForm);

      toast.success("Vehicle unit created successfully");

      await loadVehicleUnits();

      setVehicleForm({
        unit_code: "",
        plate_number: "",
        description: "",
      });

      setShowUnitModal(false);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.detail || "Failed to create vehicle unit.",
      );
    }
  };

  const handleCreateRateProfile = async () => {
    try {
      await createRateProfile(rateForm);

      toast.success("Rate profile created successfully");

      await loadRateProfiles();

      setShowCategoryModal(false);

      setRateForm({
        profile_name: "",
        helper_count: 0,
        driver_first_trip_rate: "",
        driver_next_trip_rate: "",
        helper_first_trip_rate: "",
        helper_next_trip_rate: "",
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to create rate profile",
      );
    }
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);

    setRateForm({
      profile_name: profile.profile_name || "",

      helper_count: profile.helper_count || 0,

      driver_first_trip_rate: profile.driver_first_trip_rate || 0,

      driver_next_trip_rate: profile.driver_next_trip_rate || 0,

      helper_first_trip_rate: profile.helper_first_trip_rate || 0,

      helper_next_trip_rate: profile.helper_next_trip_rate || 0,
    });

    setShowCategoryModal(true);
  };

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);

    setVehicleForm({
      unit_code: unit.unit_code || "",
      plate_number: unit.plate_number || "",
      description: unit.description || "",
    });

    setShowUnitModal(true);
  };

  const handleUpdateRateProfile = async () => {
    try {
      await updateRateProfile(editingProfile.id, rateForm);

      toast.success("Rate profile updated successfully");

      await loadRateProfiles();

      setEditingProfile(null);

      setShowCategoryModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to update profile");
    }
  };

  const handleUpdateVehicleUnit = async () => {
    try {
      await updateVehicleUnit(editingUnit.id, vehicleForm);

      toast.success("Vehicle unit updated successfully");

      await loadVehicleUnits();

      setEditingUnit(null);

      setShowUnitModal(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to update vehicle unit",
      );
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-fg">Trip Management Maintenance</h1>

        <p className="text-fg-muted mt-1">
          Manage vehicle units, trip categories, and future trip rates.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab("units")}
          className={`rounded-xl p-2.5 sm:p-4 text-left border transition-all duration-200 hover:shadow-md
          ${
            activeTab === "units"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-fg"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Truck size={22} className="shrink-0" />
            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                Vehicle Units
              </h2>

              <p className="text-xs sm:text-sm opacity-70">
                {vehicleUnits.length} Active Units
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("rates")}
          className={`rounded-xl p-2.5 sm:p-4 text-left border transition-all duration-200 hover:shadow-md
            ${
              activeTab === "rates"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-fg"
            }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Tags size={22} className="shrink-0" />
            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                Trip Categories & Rates
              </h2>

              <p className="text-xs sm:text-sm opacity-70">
                {tripRates.length} Rate Profiles
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* CONTENT */}
      {/* VEHICLE UNITS */}
      {activeTab === "units" && (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            {/* <h2 className="text-xl font-semibold">
                Vehicle Units
              </h2> */}

            <div className="flex gap-2">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-3 text-fg-subtle"
                />
                <input
                  type="text"
                  placeholder="Search unit..."
                  className="border border-border rounded-lg pl-10 pr-4 py-2 bg-surface text-fg"
                />
              </div>

              <button
                onClick={() => {
                  setEditingUnit(null);

                  setVehicleForm({
                    unit_code: "",
                    plate_number: "",
                    description: "",
                  });

                  setShowUnitModal(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={18} />
                Add Unit
              </button>
            </div>
          </div>

          {/* card */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vehicleUnits.map((unit) => (
              <div
                key={unit.id}
                className="
                    bg-surface
                    border
                    border-border
                    rounded-2xl
                    p-5
                    hover:shadow-lg
                    hover:-translate-y-1
                    transition-all
                    duration-200
                    overflow-hidden
                    text-fg
                  "
              >
                <div className="h-1 bg-blue-500 -mx-5 -mt-5 mb-4" />

                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{unit.unit_code}</h3>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-fg-subtle">Plate:</span>

                    <span className="font-medium">{unit.plate_number}</span>
                  </div>

                  <Truck size={20} />
                </div>

                <div className="mt-4 bg-surface-hover rounded-xl p-3">
                  <p className="text-xs text-fg-subtle mb-1">Description</p>

                  <p className="text-sm">{unit.description || "N/A"}</p>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span
                    className="
                        px-3 py-1
                        rounded-full
                        text-xs
                        bg-success/15
                        text-success
                      "
                  >
                    Active
                  </span>

                  <button
                    onClick={() => handleEditUnit(unit)}
                    className="
                        text-primary
                        hover:text-primary-hover
                      "
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CATEGORIES */}
      {activeTab === "rates" && (
        <>
          <div className="flex justify-between mb-4">
            {/* <h2 className="text-xl font-semibold">
                Trip Categories & Rates
            </h2> */}

            <button
              onClick={() => {
                setEditingProfile(null);

                setRateForm({
                  profile_name: "",
                  helper_count: 0,
                  driver_first_trip_rate: "",
                  driver_next_trip_rate: "",
                  helper_first_trip_rate: "",
                  helper_next_trip_rate: "",
                });

                setShowCategoryModal(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Add Category
            </button>
          </div>

          {/* card */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tripRates.map((rate) => (
              <div
                key={rate.id}
                className="
                    bg-surface
                    border
                    border-border
                    rounded-2xl
                    p-5
                    hover:shadow-lg
                    hover:-translate-y-1
                    transition-all
                    duration-200
                    overflow-hidden
                    text-fg
                  "
              >
                <div className="h-1 bg-emerald-500 -mx-5 -mt-5 mb-4" />

                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{rate.profile_name}</h3>

                    <p className="text-sm text-fg-muted">
                      {rate.helper_count} Helper(s)
                    </p>
                  </div>

                  <Tags size={20} />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-surface-hover rounded-xl p-3">
                    <p className="text-xs text-fg-subtle">Driver 1st</p>

                    <p className="font-bold">
                      {formatCurrency(rate.driver_first_trip_rate)}
                    </p>
                  </div>

                  <div className="bg-surface-hover rounded-xl p-3">
                    <p className="text-xs text-fg-subtle">Driver Next Trip</p>

                    <p className="font-bold">
                      {formatCurrency(rate.driver_next_trip_rate)}
                    </p>
                  </div>

                  <div className="bg-surface-hover rounded-xl p-3">
                    <p className="text-xs text-fg-subtle">Helper First Trip</p>

                    <p className="font-bold">
                      {formatCurrency(rate.helper_first_trip_rate)}
                    </p>
                  </div>

                  <div className="bg-surface-hover rounded-xl p-3">
                    <p className="text-xs text-fg-subtle">Helper Next Trip</p>

                    <p className="font-bold">
                      {formatCurrency(rate.helper_next_trip_rate)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => handleEditProfile(rate)}
                    className="
                        p-2
                        rounded-lg
                        hover:bg-primary/10
                        text-primary
                      "
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <MaintenanceModal
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        title={editingUnit ? "Edit Vehicle Unit" : "Add Vehicle Unit"}
        onSave={editingUnit ? handleUpdateVehicleUnit : handleCreateVehicleUnit}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Unit Code</label>

            <input
              value={vehicleForm.unit_code}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  unit_code: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="ELF-01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Plate Number
            </label>

            <input
              value={vehicleForm.plate_number}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  plate_number: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="ABC-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Description
            </label>

            <input
              value={vehicleForm.description}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  description: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="Isuzu Elf"
            />
          </div>
        </div>
      </MaintenanceModal>
      <MaintenanceModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={editingProfile ? "Edit Rate Profile" : "Add Rate Profile"}
        onSave={
          editingProfile ? handleUpdateRateProfile : handleCreateRateProfile
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Category</label>

            <input
              value={rateForm.profile_name}
              onChange={(e) =>
                setRateForm({
                  ...rateForm,
                  profile_name: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="CPDC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Helpers</label>

            <select
              value={rateForm.helper_count}
              onChange={(e) =>
                setRateForm({
                  ...rateForm,
                  helper_count: parseInt(e.target.value),
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Driver 1st Trip
              </label>

              <input
                type="number"
                value={rateForm.driver_first_trip_rate}
                onChange={(e) =>
                  setRateForm({
                    ...rateForm,
                    driver_first_trip_rate: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="565"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Driver Next Trip
              </label>

              <input
                type="number"
                value={rateForm.driver_next_trip_rate}
                onChange={(e) =>
                  setRateForm({
                    ...rateForm,
                    driver_next_trip_rate: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Helper 1st Trip
              </label>

              <input
                type="number"
                value={rateForm.helper_first_trip_rate}
                onChange={(e) =>
                  setRateForm({
                    ...rateForm,
                    helper_first_trip_rate: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="217"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Helper Next Trip
              </label>

              <input
                type="number"
                value={rateForm.helper_next_trip_rate}
                onChange={(e) =>
                  setRateForm({
                    ...rateForm,
                    helper_next_trip_rate: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="100"
              />
            </div>
          </div>
        </div>
      </MaintenanceModal>
    </div>
  );
}
