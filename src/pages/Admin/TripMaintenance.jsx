import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Truck, Wrench, Plus, Search, Pencil, Trash2 } from "lucide-react";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import {
  getVehicleUnits,
  createVehicleUnit,
  updateVehicleUnit,
  getVehicleMaintenanceRecords,
  createVehicleMaintenanceRecord,
  updateVehicleMaintenanceRecord,
  deleteVehicleMaintenanceRecord,
} from "../../api/adminTripManagement/tripMaintenance";
import { toast } from "react-hot-toast";

const EMPTY_MAINTENANCE_FORM = {
  vehicle_unit_id: "",
  maintenance_type: "",
  description: "",
  service_date: "",
  next_due_date: "",
  odometer_reading: "",
  cost: "",
};

export default function TripMaintenance() {
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "maintenance" ? "maintenance" : "units";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    unit_code: "",
    plate_number: "",
    description: "",
  });
  const [maintenanceForm, setMaintenanceForm] = useState(
    EMPTY_MAINTENANCE_FORM,
  );

  const unitsPagination = usePagination(vehicleUnits, 9);
  const maintenancePagination = usePagination(maintenanceRecords, 10);

  const loadVehicleUnits = async () => {
    try {
      const response = await getVehicleUnits();
      setVehicleUnits(response || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadMaintenanceRecords = async () => {
    try {
      const response = await getVehicleMaintenanceRecords();
      setMaintenanceRecords(response || []);
    } catch (error) {
      console.error("Failed to load maintenance records", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadVehicleUnits();
      await loadMaintenanceRecords();
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

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);

    setVehicleForm({
      unit_code: unit.unit_code || "",
      plate_number: unit.plate_number || "",
      description: unit.description || "",
    });

    setShowUnitModal(true);
  };

  const handleCreateMaintenanceRecord = async () => {
    try {
      await createVehicleMaintenanceRecord(maintenanceForm);

      toast.success("Maintenance record created successfully");

      await loadMaintenanceRecords();

      setMaintenanceForm(EMPTY_MAINTENANCE_FORM);
      setShowMaintenanceModal(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to create maintenance record.",
      );
    }
  };

  const handleUpdateMaintenanceRecord = async () => {
    try {
      await updateVehicleMaintenanceRecord(editingRecord.id, maintenanceForm);

      toast.success("Maintenance record updated successfully");

      await loadMaintenanceRecords();

      setEditingRecord(null);
      setShowMaintenanceModal(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to update maintenance record.",
      );
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);

    setMaintenanceForm({
      vehicle_unit_id: record.vehicle_unit_id || "",
      maintenance_type: record.maintenance_type || "",
      description: record.description || "",
      service_date: record.service_date ? record.service_date.slice(0, 10) : "",
      next_due_date: record.next_due_date
        ? record.next_due_date.slice(0, 10)
        : "",
      odometer_reading: record.odometer_reading || "",
      cost: record.cost || "",
    });

    setShowMaintenanceModal(true);
  };

  const handleDeleteRecord = async (record) => {
    if (!(await confirmDialog(`Delete this ${record.maintenance_type} record?`))) return;

    try {
      await deleteVehicleMaintenanceRecord(record.id);
      toast.success("Maintenance record deleted");
      await loadMaintenanceRecords();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to delete maintenance record.",
      );
    }
  };

  const formatCurrency = (value) =>
    value == null
      ? "-"
      : new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          minimumFractionDigits: 0,
        }).format(value);

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-fg">Fleet Management</h1>

        <p className="text-fg-muted mt-1">
          Manage your vehicle list and their maintenance records.
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
                Vehicle List
              </h2>

              <p className="text-xs sm:text-sm opacity-70">
                {vehicleUnits.length} Active Units
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`rounded-xl p-2.5 sm:p-4 text-left border transition-all duration-200 hover:shadow-md
            ${
              activeTab === "maintenance"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-fg"
            }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Wrench size={22} className="shrink-0" />
            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                Vehicle Maintenance
              </h2>

              <p className="text-xs sm:text-sm opacity-70">
                {maintenanceRecords.length} Records
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* VEHICLE LIST */}
      {activeTab === "units" && (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {unitsPagination.paginatedItems.map((unit) => (
              <div
                key={unit.id}
                className="bg-surface border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden text-fg"
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
                  <span className="px-3 py-1 rounded-full text-xs bg-success/15 text-success">
                    Active
                  </span>

                  <button
                    onClick={() => handleEditUnit(unit)}
                    className="text-primary hover:text-primary-hover"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={unitsPagination.page}
            totalPages={unitsPagination.totalPages}
            onChange={unitsPagination.setPage}
          />
        </>
      )}

      {/* VEHICLE MAINTENANCE */}
      {activeTab === "maintenance" && (
        <>
          <div className="flex justify-between mb-4">
            <button
              onClick={() => {
                setEditingRecord(null);
                setMaintenanceForm(EMPTY_MAINTENANCE_FORM);
                setShowMaintenanceModal(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Add Record
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-fg">
              <thead className="bg-surface-hover text-fg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Service Date</th>
                  <th className="px-4 py-3 text-left font-medium">Next Due</th>
                  <th className="px-4 py-3 text-left font-medium">Odometer</th>
                  <th className="px-4 py-3 text-left font-medium">Cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-fg-subtle">
                      No maintenance records
                    </td>
                  </tr>
                ) : (
                  maintenancePagination.paginatedItems.map((record) => (
                    <tr
                      key={record.id}
                      className="border-t border-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3">
                        {record.vehicle_unit
                          ? `${record.vehicle_unit.unit_code} - ${record.vehicle_unit.plate_number}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3">{record.maintenance_type}</td>
                      <td className="px-4 py-3">
                        {formatDate(record.service_date)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(record.next_due_date)}
                      </td>
                      <td className="px-4 py-3">
                        {record.odometer_reading ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(record.cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditRecord(record)}
                            className="text-primary hover:text-primary-hover"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record)}
                            className="text-danger hover:text-danger-hover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={maintenancePagination.page}
            totalPages={maintenancePagination.totalPages}
            onChange={maintenancePagination.setPage}
          />
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
            <label className="block text-sm font-medium mb-1 text-fg">
              Unit Code
            </label>
            <input
              value={vehicleForm.unit_code}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, unit_code: e.target.value })
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
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title={editingRecord ? "Edit Maintenance Record" : "Add Maintenance Record"}
        onSave={
          editingRecord
            ? handleUpdateMaintenanceRecord
            : handleCreateMaintenanceRecord
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Vehicle
            </label>
            <select
              value={maintenanceForm.vehicle_unit_id}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  vehicle_unit_id: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
            >
              <option value="">Select vehicle</option>
              {vehicleUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_code} - {unit.plate_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Maintenance Type
            </label>
            <input
              value={maintenanceForm.maintenance_type}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  maintenance_type: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="Oil Change, Brake Repair, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Description
            </label>
            <input
              value={maintenanceForm.description}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  description: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="Details of the service performed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Service Date
              </label>
              <input
                type="date"
                value={maintenanceForm.service_date}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    service_date: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Next Due Date
              </label>
              <input
                type="date"
                value={maintenanceForm.next_due_date}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    next_due_date: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Odometer Reading
              </label>
              <input
                type="number"
                value={maintenanceForm.odometer_reading}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    odometer_reading: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="45000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Cost
              </label>
              <input
                type="number"
                value={maintenanceForm.cost}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    cost: e.target.value,
                  })
                }
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="1500"
              />
            </div>
          </div>
        </div>
      </MaintenanceModal>
    </div>
  );
}
