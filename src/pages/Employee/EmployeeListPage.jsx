import { useState, useMemo, useEffect } from "react";
import { useEmployees } from "../../hooks/useEmployee";
import { getEmployeeDetails } from "../../api/employee";

import EmployeeTable from "../../components/employees/EmployeeTable";
import EmployeeMobileCard from "../../components/employees/EmployeeMobileCard";
import EmployeeDrawer from "../../components/employees/EmployeeDrawer";
import AddEmployeeDrawer from "../../components/employees/AddEmployeeDrawer";

export default function EmployeeListPage() {
  const { employees, loading, refetch } = useEmployees();

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // ================= FILTER =================
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName =
        `${emp.first_name} ${emp.last_name}`.toLowerCase();

      return (
        fullName.includes(search.toLowerCase()) ||
        emp.department?.toLowerCase().includes(search.toLowerCase()) ||
        emp.position?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [employees, search]);

  const totalPages = Math.ceil(
    filteredEmployees.length / ITEMS_PER_PAGE
  );

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ================= VIEW =================
  const handleView = async (id) => {
    try {
      setDrawerLoading(true);
      const data = await getEmployeeDetails(id);
      setSelectedEmployee(data);
      setIsViewOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setDrawerLoading(false);
    }
  };

  // ================= SUCCESS HANDLERS =================
  const handleCreateSuccess = () => {
    setToast({ type: "success", message: "Employee added successfully" });
    setIsCreateOpen(false);
    refetch();
  };

  const handleUpdateSuccess = () => {
    setToast({ type: "success", message: "Employee updated successfully" });
    setIsViewOpen(false);
    refetch();
  };

  // ================= AUTO HIDE TOAST =================
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <>
      {/* ================= TOAST ================= */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white min-w-65
            transform transition-all duration-300 animate-slide-in
            ${toast.type === "success" ? "bg-green-600" : "bg-red-500"}`}
          >
            {/* ICON */}
            <span className="text-xl">
              {toast.type === "success" ? "✔" : "✖"}
            </span>

            {/* MESSAGE */}
            <span className="text-sm font-medium">
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* ================= PAGE ================= */}
      <div className="bg-gray-50 min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">Employees</h1>

        {/* CONTROLS */}
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-3 h-10 w-full sm:w-64"
          />

          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 px-5 bg-[#2b2b2b] text-white rounded-lg hover:bg-[#4e4e4e] transition"
          >
            + Add Employee
          </button>
        </div>

        {/* TABLE */}
        <EmployeeTable
          employees={paginatedEmployees}
          onView={handleView}
        />

        {/* MOBILE */}
        <div className="md:hidden space-y-4">
          {paginatedEmployees.map((emp) => (
            <EmployeeMobileCard
              key={emp.id}
              employee={emp}
              onView={handleView}
            />
          ))}
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>

          <span>
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>

        {/* VIEW DRAWER */}
        <EmployeeDrawer
          key={selectedEmployee?.id}
          isOpen={isViewOpen}
          employee={selectedEmployee}
          loading={drawerLoading}
          onClose={() => {
            setIsViewOpen(false);
            setSelectedEmployee(null);
          }}
          onSuccess={handleUpdateSuccess}
        />

        {/* ADD DRAWER */}
        <AddEmployeeDrawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>

      {/* ================= ANIMATION ================= */}
      <style>
        {`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateX(40px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
        `}
      </style>
    </>
  );
}