import api from "../services/api";

// Create new employee
export const createEmployee = async (formData) => {
  const res = await api.post("/employees/", formData);
  return res.data;
};
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

// Parse CV
export const parseCV = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/employees/parse-cv", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};
