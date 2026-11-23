import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Plus, Pencil } from "lucide-react";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
} from "../../api/adminTripManagement/tripMaintenance";
import { toast } from "react-hot-toast";
import usePagination from "../../hooks/usePagination";
import useViewType from "../../hooks/useViewType";
import Pagination from "../../components/ui/pagination/Pagination";
import ViewToggle from "../../components/ui/viewToggle/ViewToggle";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch, urlQuery } from "../../utils/search";

const EMPTY_FORM = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  supplier_type: "",
  category: "",
  category_other: "",
  tin: "",
  vat_registered: null, // true | false | null (not answered)
};

// Finance fields (backend: trip_maintenance.py SUPPLIER_CATEGORIES).
const SUPPLIER_TYPES = [
  { key: "INDIVIDUAL", label: "Individual" },
  { key: "COMPANY", label: "Company" },
];
const CATEGORIES = ["Fuel", "Repairs", "Tires", "Parts", "Freight", "Supplies", "Utilities", "Services", "Others"];
const typeLabel = (key) => SUPPLIER_TYPES.find((t) => t.key === key)?.label;

// Type and category required; a company must say if it's VAT registered;
// VAT registered needs a TIN (9 or 12 digits). Same rules as the backend.
const formProblem = (form) => {
  if (!form.name.trim()) return "Enter the supplier name.";
  if (!form.supplier_type) return "Pick the supplier type: Individual or Company.";
  const category = form.category === "Others" ? form.category_other.trim() : form.category;
  if (!category) return form.category === "Others" ? "Type the category." : "Pick the supplier category.";
  if (form.supplier_type === "COMPANY" && form.vat_registered === null)
    return "Say whether this company is VAT registered.";
  const digits = form.tin.replace(/\D/g, "");
  if (form.vat_registered && !digits) return "A VAT-registered supplier needs a TIN.";
  if (digits && ![9, 12].includes(digits.length)) return "TIN must be 9 or 12 digits.";
  return null;
};

const toPayload = (form) => ({
  name: form.name.trim(),
  contact_person: form.contact_person,
  phone: form.phone,
  email: form.email,
  address: form.address,
  supplier_type: form.supplier_type,
  category: form.category === "Others" ? form.category_other.trim() || "Others" : form.category,
  tin: form.tin,
  vat_registered: form.vat_registered ? "true" : "false",
});

const segBtn = (active) =>
  `flex-1 rounded-md px-3 py-1.5 text-sm ${
    active ? "bg-primary/10 font-semibold text-primary" : "text-fg-muted hover:bg-surface-hover"
  }`;

export default function SuppliersPage() {
  const canEditPage = usePageCanEdit();
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewType, setViewType] = useViewType("suppliers_view_type");
  const [search, setSearch] = useState(urlQuery);
  const navigate = useNavigate();
  // A supplier with a map location is also a customer / delivery point
  // and a trip start point. "Add map location" opens Customers prefilled.
  const addLocation = (supplier) => {
    const params = new URLSearchParams({
      from_supplier: String(supplier.id),
      name: supplier.name || "",
      address: supplier.address || "",
    });
    navigate(`/dashboard/admin/stores?${params.toString()}`);
  };
  const LocationCell = ({ supplier }) =>
    supplier.location_name ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
        <MapPin size={12} />
        Also a customer
      </span>
    ) : canEditPage ? (
      <button
        type="button"
        onClick={() => addLocation(supplier)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <MapPin size={12} />
        Add map location
      </button>
    ) : (
      <span className="text-xs text-fg-subtle">No location</span>
    );
  const filteredSuppliers = suppliers.filter((supplier) =>
    matchesSearch(
      search,
      supplier.name,
      supplier.contact_person,
      supplier.phone,
      supplier.email,
      supplier.address,
      supplier.category,
      supplier.tin,
      typeLabel(supplier.supplier_type),
    ),
  );
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredSuppliers,
    9,
  );

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers();
      setSuppliers(response || []);
    } catch (error) {
      console.error("Failed to load suppliers", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadSuppliers();
    };

    loadData();
  }, []);

  const handleCreate = async () => {
    const problem = formProblem(form);
    if (problem) return toast.error(problem);
    try {
      await createSupplier(toPayload(form));
      toast.success("Supplier created successfully");
      await loadSuppliers();
      setForm(EMPTY_FORM);
      setShowModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create supplier.");
    }
  };

  const handleUpdate = async () => {
    const problem = formProblem(form);
    if (problem) return toast.error(problem);
    try {
      await updateSupplier(editingSupplier.id, toPayload(form));
      toast.success("Supplier updated successfully");
      await loadSuppliers();
      setEditingSupplier(null);
      setShowModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to update supplier.");
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      supplier_type: supplier.supplier_type || "",
      // A typed category (not in the list) opens as Others + the text.
      category: !supplier.category ? "" : CATEGORIES.includes(supplier.category) ? supplier.category : "Others",
      category_other:
        supplier.category && !CATEGORIES.includes(supplier.category) ? supplier.category : "",
      tin: supplier.tin || "",
      vat_registered: supplier.vat_registered ?? null,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-fg">Suppliers</h1>
        <p className="text-fg-muted mt-1">
          Manage your supplier contacts. A supplier with a map location is also a
          customer, and trips can start there. Customers marked &quot;Also a
          supplier&quot; show up here automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {canEditPage && (
          <button
          onClick={() => {
            setEditingSupplier(null);
            setForm(EMPTY_FORM);
            setShowModal(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Supplier
        </button>
        )}

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers..."
          className="sm:ml-auto"
        />
        <ViewToggle viewType={viewType} onChange={setViewType} />
      </div>

      {viewType === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm text-fg">
            <thead className="bg-surface-hover text-fg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type / Category</th>
                <th className="px-4 py-3 text-left font-medium">TIN / VAT</th>
                <th className="px-4 py-3 text-left font-medium">
                  Contact Person
                </th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Address</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="border-t border-border hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3 text-fg-muted">
                    {supplier.supplier_type ? (
                      <>
                        <p>{typeLabel(supplier.supplier_type)}</p>
                        <p className="text-xs text-fg-subtle">{supplier.category}</p>
                      </>
                    ) : (
                      <span className="text-xs text-warning">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    <p>{supplier.tin || "-"}</p>
                    {supplier.vat_registered != null && (
                      <p className="text-xs text-fg-subtle">
                        {supplier.vat_registered ? "VAT registered" : "Non-VAT"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {supplier.contact_person || "-"}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {supplier.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {supplier.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {supplier.address || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <LocationCell supplier={supplier} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        supplier.is_active
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {supplier.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEditPage && (
                      <button
                      onClick={() => handleEdit(supplier)}
                      className="text-primary hover:text-primary-hover"
                    >
                      <Pencil size={16} />
                    </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedItems.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-surface border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden text-fg"
            >
              <div className="h-1 bg-amber-500 -mx-5 -mt-5 mb-4" />

              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{supplier.name}</h3>
                <Building2 size={20} />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {supplier.supplier_type ? (
                  <>
                    <span className="rounded-full bg-surface-active px-2 py-0.5 text-xs font-medium text-fg-muted">
                      {typeLabel(supplier.supplier_type)}
                    </span>
                    {supplier.category && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {supplier.category}
                      </span>
                    )}
                    {supplier.vat_registered != null && (
                      <span className="rounded-full bg-surface-active px-2 py-0.5 text-xs font-medium text-fg-muted">
                        {supplier.vat_registered ? "VAT" : "Non-VAT"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                    Type and category not set
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-sm text-fg-muted">
                {supplier.tin && <p>TIN {supplier.tin}</p>}
                <p>{supplier.contact_person || "No contact person"}</p>
                <p>{supplier.phone || "No phone"}</p>
                <p>{supplier.email || "No email"}</p>
                <p>{supplier.address || "No address"}</p>
                <div className="pt-1">
                  <LocationCell supplier={supplier} />
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    supplier.is_active
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger"
                  }`}
                >
                  {supplier.is_active ? "Active" : "Inactive"}
                </span>

                {canEditPage && (
                  <button
                  onClick={() => handleEdit(supplier)}
                  className="text-primary hover:text-primary-hover"
                >
                  <Pencil size={16} />
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <MaintenanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
        onSave={editingSupplier ? handleUpdate : handleCreate}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-fg">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="Company / Individual name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Supplier type <span className="text-danger">*</span>
              </label>
              <div className="flex rounded-lg border border-border p-0.5">
                {SUPPLIER_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        supplier_type: t.key,
                        // Individuals default to non-VAT; a company must answer.
                        vat_registered:
                          form.vat_registered ?? (t.key === "INDIVIDUAL" ? false : null),
                      })
                    }
                    className={segBtn(form.supplier_type === t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="supplier-category" className="block text-sm font-medium mb-1 text-fg">
                Supplier category <span className="text-danger">*</span>
              </label>
              <select
                id="supplier-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              >
                <option value="">Expense type...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {form.category === "Others" && (
                <input
                  id="supplier-category-other"
                  value={form.category_other}
                  onChange={(e) => setForm({ ...form, category_other: e.target.value })}
                  maxLength={60}
                  className="mt-2 w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                  placeholder="Type the category"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                VAT registered{" "}
                {form.supplier_type === "COMPANY" && <span className="text-danger">*</span>}
              </label>
              <div className="flex rounded-lg border border-border p-0.5">
                {[
                  [true, "Yes"],
                  [false, "No"],
                ].map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm({ ...form, vat_registered: value })}
                    className={segBtn(form.vat_registered === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-fg-subtle">Required for a company.</p>
            </div>
            <div>
              <label htmlFor="supplier-tin" className="block text-sm font-medium mb-1 text-fg">
                TIN {form.vat_registered && <span className="text-danger">*</span>}
              </label>
              <input
                id="supplier-tin"
                value={form.tin}
                onChange={(e) => setForm({ ...form, tin: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="123-456-789-000"
                inputMode="numeric"
              />
              <p className="mt-1 text-xs text-fg-subtle">
                {form.vat_registered ? "Required: VAT registered." : "Optional unless VAT registered."}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Contact Person
            </label>
            <input
              value={form.contact_person}
              onChange={(e) =>
                setForm({ ...form, contact_person: e.target.value })
              }
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="09171234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-fg">
              Address
            </label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-fg"
              placeholder="Street, City"
            />
          </div>
        </div>
      </MaintenanceModal>
    </div>
  );
}
