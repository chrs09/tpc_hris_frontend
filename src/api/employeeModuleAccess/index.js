import api from "../services/api";

export const getEmployeesWithAccess = async (department) => {
  const params = department ? `?department=${encodeURIComponent(department)}` : "";
  const res = await api.get(`/employee-module-access/employees${params}`);
  return res.data;
};

export const setEmployeeModuleAccess = async (employeeId, moduleKeys) => {
  const res = await api.put(`/employee-module-access/${employeeId}`, {
    module_keys: moduleKeys,
  });
  return res.data;
};

// Consumed by the Sidebar to decide what a non-superadmin user can see.
export const getMyModuleAccess = async () => {
  const res = await api.get("/employee-module-access/mine");
  return res.data;
};

// Clears an employee's custom module access and reverts them to their
// role's default access.
export const resetEmployeeModuleAccess = async (employeeId) => {
  const res = await api.delete(`/employee-module-access/${employeeId}`);
  return res.data;
};
