import { useState, useMemo, useEffect } from "react";
import { useEmployees } from "../../hooks/useEmployee";
import { getEmployeeDetails } from "../../api/employee";

import EmployeeCard from "../../components/employees/EmployeeCard";
import EmployeeDrawer from "../../components/employees/EmployeeDrawer";
import AddEmployeeDrawer from "../../components/employees/AddEmployeeDrawer";

export default function EmployeeListPage() {
  const [isActive, setIsActive] = useState(1);
  const { employees, loading, refetch } = useEmployees(isActive);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const departmentOptions = useMemo(() => {
    const uniqueDepartments = [
      ...new Set(
        employees
          .map((emp) => emp.department)
          .filter((dept) => dept && dept.trim() !== ""),
      ),
    ];

    return ["All", ...uniqueDepartments];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName =
        `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
      const department = emp.department?.toLowerCase() || "";
      const position = emp.position?.toLowerCase() || "";
      const searchValue = search.toLowerCase();

      const matchesSearch =
        fullName.includes(searchValue) ||
        department.includes(searchValue) ||
        position.includes(searchValue) ||
        String(emp.id).includes(searchValue);

      const matchesDepartment =
        departmentFilter === "All" || emp.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [employees, search, departmentFilter]);

  const handleView = async (id) => {
    try {
      setDrawerLoading(true);
      const data = await getEmployeeDetails(id);
      setSelectedEmployee(data);
      setIsViewOpen(true);
    } catch (error) {
      console.error(error);
      setToast({
        type: "error",
        message: "Failed to load employee details.",
      });
    } finally {
      setDrawerLoading(false);
    }
  };

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

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={`flex items-center gap-3 rounded-xl px-5 py-3 text-white shadow-xl min-w-65 transform transition-all duration-300 animate-slide-in ${
              toast.type === "success" ? "bg-green-600" : "bg-red-500"
            }`}
          >
            <span className="text-xl">
              {toast.type === "success" ? "✔" : "✖"}
            </span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2b2b2b] sm:text-3xl">
              Employees
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse employees by department and open any card to view full
              details.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {/* Label */}
              <span className="text-sm font-medium text-gray-700">
                {isActive === 1 ? "Active Employees" : "Inactive Employees"}
              </span>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsActive((prev) => (prev === 1 ? 0 : 1));
                  setDepartmentFilter("All");
                }}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  isActive === 1 ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    isActive === 1 ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <input
                type="text"
                placeholder="Search employee, department, position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 focus:outline-none focus:ring-2 focus:ring-[#2b2b2b]/20 lg:max-w-sm"
              />

              <div className="flex flex-wrap gap-2">
                {departmentOptions.map((dept) => {
                  const count =
                    dept === "All"
                      ? employees.length
                      : employees.filter((emp) => emp.department === dept)
                          .length;

                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDepartmentFilter(dept)}
                      className={`h-10 rounded-xl border px-4 text-sm font-medium transition ${
                        departmentFilter === dept
                          ? "border-[#2b2b2b] bg-[#2b2b2b] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {dept}{" "}
                      <span
                        className={`ml-1 text-xs ${
                          departmentFilter === dept
                            ? "text-gray-200"
                            : "text-gray-400"
                        }`}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-11 rounded-xl bg-[#2b2b2b] px-5 text-white shadow-sm transition hover:bg-[#4e4e4e]"
          >
            + Add Employee
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-[#2b2b2b]">
            {filteredEmployees.length}
          </span>{" "}
          {isActive === 1 ? "active" : "inactive"} employee
          {filteredEmployees.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-[#2b2b2b]">
            No employees found
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Try changing your search or department filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredEmployees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} onView={handleView} />
          ))}
        </div>
      )}

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

      <AddEmployeeDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

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
