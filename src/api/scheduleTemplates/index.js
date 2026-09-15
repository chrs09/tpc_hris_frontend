import api from "../services/api";
import { scheduleToPh, scheduleToUtc } from "../../utils/scheduleTemplateTime";

// Backend expects multipart Form fields, not JSON -- see
// app/api/schedule_template.py.
const toFormData = (payload) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value === null ? "" : value);
    }
  });
  return formData;
};

// The UTC->PH conversion below is scoped to THIS page only (Work
// Schedules) -- schedule_template data consumed elsewhere (Attendance,
// Payroll, Employee form via api/employee) is read raw/unconverted, since
// not every row's stored time is actually in UTC and a blanket
// conversion previously corrupted live payroll OT calculations for rows
// that were already correct. See scheduleTemplateTime.js.
export const getScheduleTemplates = async () => {
  const res = await api.get("/schedule-templates/");
  return (res.data || []).map(scheduleToPh);
};

export const getScheduleTemplate = async (id) => {
  const res = await api.get(`/schedule-templates/${id}`);
  return scheduleToPh(res.data);
};

export const createScheduleTemplate = async (payload) => {
  const res = await api.post(
    "/schedule-templates/",
    toFormData(scheduleToUtc(payload)),
  );
  return res.data;
};

export const updateScheduleTemplate = async (id, payload) => {
  const res = await api.patch(
    `/schedule-templates/${id}`,
    toFormData(scheduleToUtc(payload)),
  );
  return res.data;
};

export const deleteScheduleTemplate = async (id) => {
  const res = await api.delete(`/schedule-templates/${id}`);
  return res.data;
};
