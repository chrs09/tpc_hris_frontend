import api from "../services/api";

export const getApplicants = async () => {
  const res = await api.get("/admin/applicants");
  return res.data;
};

export const getApplicantOnboarding = async (id) => {
  const res = await api.get(`/admin/applicants/${id}/onboarding`);
  return res.data;
};

export const getApplicantDetail = async (id) => {
  const res = await api.get(`/admin/applicants/${id}`);
  return res.data;
};

export const updateApplicantStatus = async (id, payload) => {
  const res = await api.patch(`/admin/applicants/${id}/status`, payload);
  return res.data;
};

export const getApplicantRemarks = async (id) => {
  const res = await api.get(`/admin/applicants/${id}/remarks`);
  return res.data;
};

export const addApplicantRemark = async (id, formData) => {
  const res = await api.post(`/admin/applicants/${id}/remarks`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const convertApplicantToEmployee = async (applicantId, payload) => {
  const response = await api.post(
    `/admin/applicants/${applicantId}/convert-to-employee`,
    payload,
  );
  return response.data;
};

export const generateEmploymentForm = async (applicantId) => {
  const response = await api.post(
    `/admin/applicants/${applicantId}/generate-employment-form`,
  );
  return response.data;
};
