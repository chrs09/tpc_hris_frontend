import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Truck,
  Wrench,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  History,
  ClipboardList,
  LayoutGrid,
  List,
  Tag,
} from "lucide-react";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import VehicleChecklistModal from "../../components/tripMaintenance/VehicleChecklistModal";
import SearchSelect from "../../components/SearchSelect";
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
  getVehicleORHistory,
} from "../../api/adminTripManagement/tripMaintenance";
import {
  getTruckTypes,
  createTruckType,
  updateTruckType,
  deleteTruckType,
} from "../../api/adminTripManagement/truckTypes";
import { toast } from "react-hot-toast";

// Remembers the user's Cards/List preference for the Vehicle List tab
// across visits -- purely a per-browser UI convenience, not synced.
const VIEW_TYPE_STORAGE_KEY = "fleet_vehicle_view_type";

const EMPTY_MAINTENANCE_FORM = {
  vehicle_unit_id: "",
  maintenance_type: "",
  description: "",
  service_date: "",
  next_due_date: "",
  odometer_reading: "",
  cost: "",
};

const EMPTY_VEHICLE_FORM = {
  unit_code: "",
  plate_number: "",
  description: "",
  truck_type_id: "",
  cr_number: "",
  cr_document: null,
  or_number: "",
  or_expiration_date: "",
  or_document: null,
};

// Renewal is treated as coming due within 30 days of expiring.
const CR_OR_WARNING_DAYS = 30;

const getExpirationStatus = (expirationDate) => {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return "expired";
  if (daysLeft <= CR_OR_WARNING_DAYS) return "expiring";
  return "valid";
};

// `hasExpiration` false means the document (e.g. the CR, which never
// expires in PH LTO rules -- only the OR does) never shows an
// expiration badge at all, regardless of what's on file.
const DocumentStatusBlock = ({
  label,
  number,
  documentUrl,
  expirationDate,
  hasExpiration = true,
  onViewHistory,
}) => {
  const status = hasExpiration ? getExpirationStatus(expirationDate) : null;
  const styles =
    status === "expired"
      ? "bg-danger/15 text-danger"
      : status === "expiring"
        ? "bg-warning/15 text-warning"
        : "bg-success/15 text-success";
  const statusLabel =
    status === "expired"
      ? "Expired"
      : status === "expiring"
        ? "Renewal due soon"
        : "Valid";

  return (
    <div className="bg-surface-hover rounded-xl p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-subtle">{label}</p>
        <div className="flex items-center gap-3">
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-primary hover:underline"
            >
              <History size={12} />
              History
            </button>
          )}
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <FileText size={12} />
              View
            </a>
          )}
        </div>
      </div>

      {number && <p className="text-sm">{number}</p>}

      {!hasExpiration ? (
        <p className="text-xs text-fg-subtle">No expiration (does not expire)</p>
      ) : expirationDate ? (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
        >
          {statusLabel} · {new Date(expirationDate).toLocaleDateString()}
        </span>
      ) : (
        <p className="text-xs text-fg-subtle">No expiration date on file</p>
      )}
    </div>
  );
};

// CR and OR are two separate physical documents -- this renders one
// number/expiration/upload block, reused once per document in the
// Add/Edit Vehicle Unit form (fieldPrefix is "cr" or "or").
const DocumentFormSection = ({
  title,
  fieldPrefix,
  vehicleForm,
  setVehicleForm,
  existingUrl,
  hasExpiration = true,
}) => {
  const numberField = `${fieldPrefix}_number`;
  const expirationField = `${fieldPrefix}_expiration_date`;
  const documentField = `${fieldPrefix}_document`;

  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm font-semibold text-fg mb-3">{title}</p>

      <div
        className={`grid grid-cols-1 gap-4 ${hasExpiration ? "sm:grid-cols-2" : ""}`}
      >
        <div>
          <label className="block text-sm font-medium mb-1 text-fg">
            Number
          </label>
          <input
            value={vehicleForm[numberField]}
            onChange={(e) =>
              setVehicleForm({
                ...vehicleForm,
                [numberField]: e.target.value,
              })
            }
            className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
            placeholder="e.g. 1234567890"
          />
        </div>

        {hasExpiration && (
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Expiration Date
            </label>
            <input
              type="date"
              value={vehicleForm[expirationField]}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  [expirationField]: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
            />
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1 text-fg">
          Document
        </label>

        {existingUrl && !vehicleForm[documentField] && (
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <FileText size={14} />
            View current document
          </a>
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) =>
            setVehicleForm({
              ...vehicleForm,
              [documentField]: e.target.files?.[0] || null,
            })
          }
          className="w-full rounded-lg border border-border bg-surface p-2 text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
        />
        <p className="mt-1 text-xs text-fg-subtle">
          {existingUrl
            ? "Uploading a new file replaces the current document."
            : "PNG, JPEG, WEBP, or PDF."}
        </p>
      </div>
    </div>
  );
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
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [maintenanceForm, setMaintenanceForm] = useState(
    EMPTY_MAINTENANCE_FORM,
  );

  const [orHistoryUnit, setOrHistoryUnit] = useState(null);
  const [orHistory, setOrHistory] = useState([]);
  const [loadingOrHistory, setLoadingOrHistory] = useState(false);

  const openOrHistory = async (unit) => {
    setOrHistoryUnit(unit);
    setOrHistory([]);
    setLoadingOrHistory(true);
    try {
      const response = await getVehicleORHistory(unit.id);
      setOrHistory(response || []);
    } catch (error) {
      console.error("Failed to load OR history", error);
      toast.error("Failed to load OR history.");
    } finally {
      setLoadingOrHistory(false);
    }
  };

  const closeOrHistory = () => {
    setOrHistoryUnit(null);
    setOrHistory([]);
  };

  const [checklistUnit, setChecklistUnit] = useState(null);

  const [truckTypes, setTruckTypes] = useState([]);
  const [truckTypeForm, setTruckTypeForm] = useState({ name: "", size: "" });
  const [editingTruckType, setEditingTruckType] = useState(null);

  const [viewType, setViewType] = useState(() => {
    try {
      return localStorage.getItem(VIEW_TYPE_STORAGE_KEY) === "list"
        ? "list"
        : "cards";
    } catch {
      return "cards";
    }
  });

  const changeViewType = (type) => {
    setViewType(type);
    try {
      localStorage.setItem(VIEW_TYPE_STORAGE_KEY, type);
    } catch {
      // ignore (private browsing, storage disabled, etc.)
    }
  };

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

  const loadTruckTypes = async () => {
    try {
      const response = await getTruckTypes();
      setTruckTypes(response?.data || []);
    } catch (error) {
      console.error("Failed to load truck types", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadVehicleUnits();
      await loadMaintenanceRecords();
      await loadTruckTypes();
    };

    loadData();
  }, []);

  const handleCreateVehicleUnit = async () => {
    try {
      await createVehicleUnit(vehicleForm);

      toast.success("Vehicle unit created successfully");

      await loadVehicleUnits();

      setVehicleForm(EMPTY_VEHICLE_FORM);

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
      truck_type_id: unit.truck_type_id || "",
      cr_number: unit.cr_number || "",
      cr_document: null,
      or_number: unit.or_number || "",
      or_expiration_date: unit.or_expiration_date
        ? unit.or_expiration_date.slice(0, 10)
        : "",
      or_document: null,
    });

    setShowUnitModal(true);
  };

  const handleCreateTruckType = async () => {
    if (!truckTypeForm.name.trim()) {
      toast.error("Truck type name is required.");
      return;
    }
    try {
      await createTruckType(truckTypeForm);
      toast.success("Truck type added");
      await loadTruckTypes();
      setTruckTypeForm({ name: "", size: "" });
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to add truck type.",
      );
    }
  };

  const handleUpdateTruckType = async () => {
    if (!truckTypeForm.name.trim()) {
      toast.error("Truck type name is required.");
      return;
    }
    try {
      await updateTruckType(editingTruckType.id, truckTypeForm);
      toast.success("Truck type updated");
      await loadTruckTypes();
      setEditingTruckType(null);
      setTruckTypeForm({ name: "", size: "" });
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to update truck type.",
      );
    }
  };

  const handleEditTruckType = (truckType) => {
    setEditingTruckType(truckType);
    setTruckTypeForm({
      name: truckType.name || "",
      size: truckType.size || "",
    });
  };

  const cancelEditTruckType = () => {
    setEditingTruckType(null);
    setTruckTypeForm({ name: "", size: "" });
  };

  const handleDeleteTruckType = async (truckType) => {
    if (!(await confirmDialog(`Delete truck type "${truckType.name}"?`))) return;

    try {
      await deleteTruckType(truckType.id);
      toast.success("Truck type deleted");
      await loadTruckTypes();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Failed to delete truck type.",
      );
    }
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
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
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

        <button
          onClick={() => setActiveTab("truck-types")}
          className={`rounded-xl p-2.5 sm:p-4 text-left border transition-all duration-200 hover:shadow-md
            ${
              activeTab === "truck-types"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-fg"
            }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Tag size={22} className="shrink-0" />
            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                Truck Types
              </h2>

              <p className="text-xs sm:text-sm opacity-70">
                {truckTypes.length} Types
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

                  setVehicleForm(EMPTY_VEHICLE_FORM);

                  setShowUnitModal(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={18} />
                Add Unit
              </button>
            </div>

            <div className="flex items-center gap-1 border border-border rounded-lg p-1 self-start bg-surface">
              <button
                type="button"
                onClick={() => changeViewType("cards")}
                title="Card view"
                className={`p-1.5 rounded-md ${
                  viewType === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => changeViewType("list")}
                title="List view"
                className={`p-1.5 rounded-md ${
                  viewType === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {viewType === "list" ? (
            <div className="bg-surface border border-border rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-fg">
                <thead className="bg-surface-hover text-fg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Unit Code</th>
                    <th className="px-4 py-3 text-left font-medium">Plate</th>
                    <th className="px-4 py-3 text-left font-medium">Truck Type</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium">CR</th>
                    <th className="px-4 py-3 text-left font-medium">OR</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {unitsPagination.paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-fg-subtle">
                        No vehicle units
                      </td>
                    </tr>
                  ) : (
                    unitsPagination.paginatedItems.map((unit) => {
                      const orStatus = getExpirationStatus(
                        unit.or_expiration_date,
                      );
                      return (
                        <tr
                          key={unit.id}
                          className="border-t border-border hover:bg-surface-hover"
                        >
                          <td className="px-4 py-3 font-semibold">
                            {unit.unit_code}
                          </td>
                          <td className="px-4 py-3">{unit.plate_number}</td>
                          <td className="px-4 py-3">
                            {unit.truck_type_name
                              ? `${unit.truck_type_name}${
                                  unit.truck_type_size
                                    ? ` (${unit.truck_type_size})`
                                    : ""
                                }`
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {unit.description || "N/A"}
                          </td>
                          <td className="px-4 py-3">{unit.cr_number || "-"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{unit.or_number || "-"}</span>
                              {orStatus && (
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    orStatus === "expired"
                                      ? "bg-danger/15 text-danger"
                                      : orStatus === "expiring"
                                        ? "bg-warning/15 text-warning"
                                        : "bg-success/15 text-success"
                                  }`}
                                >
                                  {orStatus === "expired"
                                    ? "Expired"
                                    : orStatus === "expiring"
                                      ? "Renewal due"
                                      : "Valid"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-full text-xs bg-success/15 text-success">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => openOrHistory(unit)}
                                title="OR History"
                                className="text-fg-muted hover:text-primary"
                              >
                                <History size={16} />
                              </button>
                              <button
                                onClick={() => setChecklistUnit(unit)}
                                title="Vehicle Checklist"
                                className="text-fg-muted hover:text-primary"
                              >
                                <ClipboardList size={16} />
                              </button>
                              <button
                                onClick={() => handleEditUnit(unit)}
                                className="text-primary hover:text-primary-hover"
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
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

                {unit.truck_type_name && (
                  <p className="mt-1 text-xs text-fg-subtle">
                    {unit.truck_type_name}
                    {unit.truck_type_size ? ` · ${unit.truck_type_size}` : ""}
                  </p>
                )}

                <div className="mt-4 bg-surface-hover rounded-xl p-3">
                  <p className="text-xs text-fg-subtle mb-1">Description</p>
                  <p className="text-sm">{unit.description || "N/A"}</p>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DocumentStatusBlock
                    label="CR"
                    number={unit.cr_number}
                    documentUrl={unit.cr_document_url}
                    hasExpiration={false}
                  />
                  <DocumentStatusBlock
                    label="OR"
                    number={unit.or_number}
                    documentUrl={unit.or_document_url}
                    expirationDate={unit.or_expiration_date}
                    onViewHistory={() => openOrHistory(unit)}
                  />
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="px-3 py-1 rounded-full text-xs bg-success/15 text-success">
                    Active
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setChecklistUnit(unit)}
                      title="Vehicle Checklist"
                      className="text-fg-muted hover:text-primary"
                    >
                      <ClipboardList size={16} />
                    </button>
                    <button
                      onClick={() => handleEditUnit(unit)}
                      className="text-primary hover:text-primary-hover"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

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

      {/* TRUCK TYPES */}
      {activeTab === "truck-types" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-4 h-fit">
            <h3 className="font-semibold text-fg mb-3">
              {editingTruckType ? "Edit Truck Type" : "Add Truck Type"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-fg">
                  Name
                </label>
                <input
                  value={truckTypeForm.name}
                  onChange={(e) =>
                    setTruckTypeForm({
                      ...truckTypeForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                  placeholder="e.g. 10-Wheeler Wingvan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-fg">
                  Size
                </label>
                <input
                  value={truckTypeForm.size}
                  onChange={(e) =>
                    setTruckTypeForm({
                      ...truckTypeForm,
                      size: e.target.value,
                    })
                  }
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                  placeholder="e.g. 32ft, 6 tons"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={
                    editingTruckType
                      ? handleUpdateTruckType
                      : handleCreateTruckType
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} />
                  {editingTruckType ? "Save" : "Add"}
                </button>

                {editingTruckType && (
                  <button
                    onClick={cancelEditTruckType}
                    className="px-4 py-2 rounded-lg border border-border text-fg hover:bg-surface-hover"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-fg">
              <thead className="bg-surface-hover text-fg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Size</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {truckTypes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-fg-subtle">
                      No truck types yet
                    </td>
                  </tr>
                ) : (
                  truckTypes.map((truckType) => (
                    <tr
                      key={truckType.id}
                      className="border-t border-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3 font-medium">
                        {truckType.name}
                      </td>
                      <td className="px-4 py-3">{truckType.size || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditTruckType(truckType)}
                            className="text-primary hover:text-primary-hover"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTruckType(truckType)}
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
        </div>
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

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Truck Type
            </label>
            <select
              value={vehicleForm.truck_type_id}
              onChange={(e) =>
                setVehicleForm({
                  ...vehicleForm,
                  truck_type_id: e.target.value,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
            >
              <option value="">Select truck type (optional)</option>
              {truckTypes.map((truckType) => (
                <option key={truckType.id} value={truckType.id}>
                  {truckType.name}
                  {truckType.size ? ` (${truckType.size})` : ""}
                </option>
              ))}
            </select>
          </div>

          <DocumentFormSection
            title="CR (Certificate of Registration)"
            fieldPrefix="cr"
            vehicleForm={vehicleForm}
            setVehicleForm={setVehicleForm}
            existingUrl={editingUnit?.cr_document_url}
            hasExpiration={false}
          />

          <DocumentFormSection
            title="OR (Official Receipt)"
            fieldPrefix="or"
            vehicleForm={vehicleForm}
            setVehicleForm={setVehicleForm}
            existingUrl={editingUnit?.or_document_url}
          />
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
            <SearchSelect
              value={vehicleUnits.find(
                (unit) =>
                  String(unit.id) === String(maintenanceForm.vehicle_unit_id),
              )}
              options={vehicleUnits}
              onChange={(unit) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  vehicle_unit_id: unit?.id || "",
                })
              }
              placeholder="Select vehicle"
              getOptionLabel={(unit) =>
                unit ? `${unit.unit_code} - ${unit.plate_number}` : ""
              }
              getOptionValue={(unit) => unit?.id}
            />
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

      {/* OR RENEWAL HISTORY */}
      {orHistoryUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md text-fg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold">OR Renewal History</h2>
                <p className="text-xs text-fg-subtle">
                  {orHistoryUnit.unit_code || orHistoryUnit.plate_number}
                </p>
              </div>
              <button
                onClick={closeOrHistory}
                className="text-fg-muted hover:text-fg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {loadingOrHistory ? (
                <p className="text-sm text-fg-subtle">Loading...</p>
              ) : orHistory.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  No previous OR on file -- this is the first one entered.
                </p>
              ) : (
                orHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-surface-hover rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {entry.or_number || "(no number on file)"}
                      </p>
                      {entry.or_document_url && (
                        <a
                          href={entry.or_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <FileText size={12} />
                          View
                        </a>
                      )}
                    </div>
                    {entry.or_expiration_date && (
                      <p className="text-xs text-fg-subtle">
                        Expired:{" "}
                        {new Date(entry.or_expiration_date).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-fg-subtle">
                      Replaced:{" "}
                      {new Date(entry.replaced_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border px-6 py-4 flex justify-end shrink-0">
              <button
                onClick={closeOrHistory}
                className="px-4 py-2 rounded-lg border border-border text-fg hover:bg-surface-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {checklistUnit && (
        <VehicleChecklistModal
          vehicleUnit={checklistUnit}
          onClose={() => setChecklistUnit(null)}
        />
      )}
    </div>
  );
}
