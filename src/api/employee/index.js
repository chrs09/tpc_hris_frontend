import api from "../services/api";

// Get employee list
export const getEmployeeList = async () => {
  const res = await api.get("/employees/");

  return res.data;
};

// Get employee details
export const getEmployeeDetails = async (employeeId) => {
  const res = await api.get(`/employees/${employeeId}/`);

  return res.data;
};

// Update employee details
export const updateEmployeeDetails = async (employeeId, updatedData) => {
  const res = await api.put(`/employees/${employeeId}/`, updatedData);

  return res.data;
};
