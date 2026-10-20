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

// Documents (optional) -- one file per document type, replaced on re-upload
export const uploadApplicantOnboardingFile = async (token, documentType, file) => {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("file", file);
  const res = await api.post(
    `/public/applicant-onboarding/${token}/files`,
    formData,
  );
  return res.data;
};

export const deleteApplicantOnboardingFile = async (token, documentType) => {
  const res = await api.delete(
    `/public/applicant-onboarding/${token}/files/${documentType}`,
  );
  return res.data;
};
