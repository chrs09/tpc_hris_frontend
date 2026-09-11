import { useState, useEffect } from "react";
import { Building2, Plus, Pencil } from "lucide-react";
import MaintenanceModal from "../../components/tripMaintenance/MaintenanceModal";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
} from "../../api/adminTripManagement/tripMaintenance";
import { toast } from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

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
    try {
      await createSupplier(form);
      toast.success("Supplier created successfully");
      await loadSuppliers();
      setForm(EMPTY_FORM);
      setShowModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create supplier.");
    }
  };

  const handleUpdate = async () => {
    try {
      await updateSupplier(editingSupplier.id, form);
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
    });
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg">Suppliers</h1>
        <p className="text-fg-muted mt-1">Manage your supplier contacts.</p>
      </div>

      <div className="flex justify-between mb-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-surface border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden text-fg"
          >
            <div className="h-1 bg-amber-500 -mx-5 -mt-5 mb-4" />

            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">{supplier.name}</h3>
              <Building2 size={20} />
            </div>

            <div className="mt-3 space-y-1 text-sm text-fg-muted">
              <p>{supplier.contact_person || "No contact person"}</p>
              <p>{supplier.phone || "No phone"}</p>
              <p>{supplier.email || "No email"}</p>
              <p>{supplier.address || "No address"}</p>
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

              <button
                onClick={() => handleEdit(supplier)}
                className="text-primary hover:text-primary-hover"
              >
                <Pencil size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

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
