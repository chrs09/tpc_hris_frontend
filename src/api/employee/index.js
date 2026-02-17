import api from "../services/api";
import { getAuthHeader } from "../config";

// Get employee list
export const getEmployeeList = async () => {
  const res = await api.get("/employees/", {
    headers: getAuthHeader(),
  });

  return res.data;
};

// Get employee details
export const getEmployeeDetails = async (employeeId) => {
  const res = await api.get(`/employees/${employeeId}/`, {
    headers: getAuthHeader(),
  });

  return res.data;
};

// Update employee details
export const updateEmployeeDetails = async (employeeId, updatedData) => {
  const res = await api.put(`/employees/${employeeId}/`, updatedData, {
    headers: getAuthHeader(),
  });

  return res.data;
};
