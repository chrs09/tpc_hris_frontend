import api from "../services/api";

// Create new employee
export const createEmployee = async (formData) => {
  const res = await api.post("/employees/", formData);
  return res.data;
};
// Get employee list
export const getEmployeeList = async (isActive = 1) => {
  const res = await api.get(`/employees/?is_active=${isActive}`);

  return res.data;
};

// Get employee details
export const getEmployeeDetails = async (employeeId) => {
  const res = await api.get(`/employees/${employeeId}/`);

  return res.data;
};

// Update employee details
export const updateEmployeeDetails = async (employeeId, updatedData) => {
  const res = await api.patch(`/employees/${employeeId}`, updatedData);
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

// Separation details of an inactive employee (201 -> Inactive Employee
// Details): date clearance completed + resignation letter, clearance and
// waiver & quitclaim scans.
export const getSeparationDetails = async (employeeId) =>
  (await api.get(`/employees/${employeeId}/separation`)).data;

export const saveClearanceDate = async (employeeId, date) => {
  const body = new FormData();
  body.append("clearance_completed_date", date || "");
  return (await api.patch(`/employees/${employeeId}/separation`, body)).data;
};

export const uploadSeparationDocument = async (employeeId, documentType, file) => {
  const body = new FormData();
  body.append("document_type", documentType);
  body.append("file", file);
  return (await api.post(`/employees/${employeeId}/separation/documents`, body)).data;
};

export const deleteSeparationDocument = async (employeeId, fileId) =>
  (await api.delete(`/employees/${employeeId}/separation/documents/${fileId}`)).data;

// Work History (internal): department / position / pay changes with an
// effective date. A future date is scheduled and applied on that day.
export const getJobHistory = async (employeeId) =>
  (await api.get(`/employees/${employeeId}/job-history`)).data;

export const recordJobChange = async (employeeId, payload) =>
  (await api.post(`/employees/${employeeId}/job-history`, payload)).data;

export const cancelJobChange = async (employeeId, changeId) =>
  (await api.delete(`/employees/${employeeId}/job-history/${changeId}`)).data;
