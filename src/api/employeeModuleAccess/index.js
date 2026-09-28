import api from "../services/api";

export const getEmployeesWithAccess = async (department) => {
  const params = department ? `?department=${encodeURIComponent(department)}` : "";
  const res = await api.get(`/employee-module-access/employees${params}`);
  return res.data;
};

// readOnlyKeys (optional): granted keys that are view-only ("Can edit:
// No"). Leave it out to keep each key's current setting.
export const setEmployeeModuleAccess = async (
  employeeId,
  moduleKeys,
  readOnlyKeys,
) => {
  const res = await api.put(`/employee-module-access/${employeeId}`, {
    module_keys: moduleKeys,
    ...(readOnlyKeys ? { read_only_keys: readOnlyKeys } : {}),
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
