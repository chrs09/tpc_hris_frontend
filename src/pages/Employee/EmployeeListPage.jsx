import { useState, useMemo } from "react";
import toast from "react-hot-toast";
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

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [sortBy, setSortBy] = useState("lastname");
  const [sortOrder, setSortOrder] = useState("asc");

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

  const filteredAndSortedEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
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

    filtered.sort((a, b) => {
      let result = 0;

      if (sortBy === "id") {
        result = Number(a.id) - Number(b.id);
      } else {
        result = (a.last_name || "").localeCompare(b.last_name || "");
      }

      return sortOrder === "asc" ? result : -result;
    });

    return filtered;
  }, [employees, search, departmentFilter, sortBy, sortOrder]);

  const handleView = async (id) => {
    try {
      setDrawerLoading(true);

      const data = await getEmployeeDetails(id);

      setSelectedEmployee(data);
      setIsViewOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load employee details.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    toast.success("Employee created successfully.");
    setIsCreateOpen(false);
    refetch();
  };

  const handleUpdateSuccess = () => {
    setIsViewOpen(false);
    refetch();
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2b2b2b] sm:text-3xl">
              Employees
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Browse employees by department and open any card to view full
              details.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-11 w-fit rounded-xl bg-[#2b2b2b] px-5 text-white shadow-sm transition hover:bg-[#4e4e4e]"
          >
            + Add Employee
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {isActive === 1 ? "Active Employees" : "Inactive Employees"}
            </span>

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

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              type="text"
              placeholder="Search employee, department, position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 focus:outline-none focus:ring-2 focus:ring-[#2b2b2b]/20 lg:max-w-sm"
            />

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2">
              <span className="text-sm font-medium text-gray-700">Sort:</span>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="lastname">Last Name</option>
                <option value="id">Employee ID</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {departmentOptions.map((dept) => {
              const count =
                dept === "All"
                  ? employees.length
                  : employees.filter((emp) => emp.department === dept).length;

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

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-[#2b2b2b]">
            {filteredAndSortedEmployees.length}
          </span>{" "}
          {isActive === 1 ? "active" : "inactive"} employee
          {filteredAndSortedEmployees.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filteredAndSortedEmployees.length === 0 ? (
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
          {filteredAndSortedEmployees.map((emp) => (
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
