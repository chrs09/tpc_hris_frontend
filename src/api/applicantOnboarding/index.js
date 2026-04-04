import api from "../services/api";

// PUBLIC (no auth required)

export const getApplicantOnboarding = async (token) => {
  const res = await api.get(`/public/applicant-onboarding/${token}`);
  return res.data;
};

export const saveApplicantOnboarding = async (token, payload) => {
  const res = await api.post(`/public/applicant-onboarding/${token}`, payload);
  return res.data;
};

export const submitApplicantOnboarding = async (token) => {
  const res = await api.post(`/public/applicant-onboarding/${token}/submit`);
  return res.data;
};