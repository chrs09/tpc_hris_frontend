import api from "../services/api";
import { scheduleToPh } from "../../utils/scheduleTemplateTime";

// The embedded schedule_template on an employee record is stored/returned
// in UTC (see scheduleTemplateTime.js) -- convert it to PH local right
// here, once, so every consumer of getEmployeeList/getEmployeeDetails
// (Attendance, Payroll, the Employee form) already sees correct wall-clock
// schedule times without having to convert it themselves.
const withPhSchedule = (employee) =>
  employee?.schedule_template
    ? { ...employee, schedule_template: scheduleToPh(employee.schedule_template) }
    : employee;

// Create new employee
export const createEmployee = async (formData) => {
  const res = await api.post("/employees/", formData);
  return res.data;
};
// Get employee list
export const getEmployeeList = async (isActive = 1) => {
  const res = await api.get(`/employees/?is_active=${isActive}`);

  return (res.data || []).map(withPhSchedule);
};

// Get employee details
export const getEmployeeDetails = async (employeeId) => {
  const res = await api.get(`/employees/${employeeId}/`);

  return withPhSchedule(res.data);
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
