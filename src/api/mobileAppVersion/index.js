import api from "../services/api";

export const getMobileAppVersion = async (platform = "android") => {
  const res = await api.get(`/mobile-app-version/${platform}`);
  return res.data;
};

export const setMobileAppVersion = async (platform, payload) => {
  const res = await api.put(`/mobile-app-version/${platform}`, payload);
  return res.data;
};

export const syncMobileAppVersionFromEas = async (platform, profile = "preview") => {
  const res = await api.post(
    `/mobile-app-version/${platform}/sync-from-eas`,
    null,
    { params: { profile } },
  );
  return res.data;
};

export const getMobileAppVersionEasHistory = async (platform, profile = "preview") => {
  const res = await api.get(`/mobile-app-version/${platform}/eas-history`, {
    params: { profile },
  });
  return res.data;
};
