import { useState, useMemo } from "react";
import { TailSpin } from "react-loader-spinner";
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
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16 text-fg-muted">
        <TailSpin
          visible
          height="60"
          width="60"
          color="#2b2b2b"
          ariaLabel="loading-employees"
        />
        <p className="text-sm">Loading employees...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">
              Employees
            </h1>

            <p className="mt-1 text-sm text-fg-subtle">
              Browse employees by department and open any card to view full
              details.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-11 w-fit rounded-xl bg-primary px-5 text-primary-foreground shadow-sm transition hover:bg-primary-hover"
          >
            + Add Employee
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-fg-muted">
              {isActive === 1 ? "Active Employees" : "Inactive Employees"}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsActive((prev) => (prev === 1 ? 0 : 1));
                setDepartmentFilter("All");
              }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                isActive === 1 ? "bg-success" : "bg-surface-active"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow-md transition-transform duration-300 ${
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
              className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-fg focus:outline-none focus:ring-2 focus:ring-primary/30 lg:max-w-sm"
            />

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2">
              <span className="text-sm font-medium text-fg-muted">Sort:</span>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg focus:outline-none"
              >
                <option value="lastname">Last Name</option>
                <option value="id">Employee ID</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg focus:outline-none"
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
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-fg-muted hover:border-border hover:bg-surface-hover"
                  }`}
                >
                  {dept}{" "}
                  <span
                    className={`ml-1 text-xs ${
                      departmentFilter === dept
                        ? "text-primary-foreground/70"
                        : "text-fg-subtle"
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
        <p className="text-sm text-fg-subtle">
          Showing{" "}
          <span className="font-semibold text-fg">
            {filteredAndSortedEmployees.length}
          </span>{" "}
          {isActive === 1 ? "active" : "inactive"} employee
          {filteredAndSortedEmployees.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filteredAndSortedEmployees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-fg">
            No employees found
          </p>

          <p className="mt-2 text-sm text-fg-subtle">
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
