import api from "../services/api";

export const getAdminApplicantQuestions = async () => {
  const res = await api.get("admin/applicant-questions");
  return res.data;
};

export const createApplicantQuestion = async (payload) => {
  const res = await api.post("admin/applicant-questions", payload);
  return res.data;
};

export const updateApplicantQuestion = async (questionId, payload) => {
  const res = await api.put(`admin/applicant-questions/${questionId}`, payload);
  return res.data;
};
