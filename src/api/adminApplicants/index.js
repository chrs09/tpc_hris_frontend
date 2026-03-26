import api from "../services/api";

export const getApplicants = async () => {
  const res = await api.get("/admin/applicants");
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

export const addApplicantRemark = async (id, payload) => {
  const res = await api.post(`/admin/applicants/${id}/remarks`, payload);
  return res.data;
};

export const convertApplicantToEmployee = async (applicantId, payload) => {
  const response = await api.post(
    `/admin/applicants/${applicantId}/convert-to-employee`,
    payload,
  );
  return response.data;
};
