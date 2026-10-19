import api from "./services/api";

// Administrator -> Verify Photo (backend: app/api/photo_verify.py).
export const verifyPhotoFile = async (file) => {
  const body = new FormData();
  body.append("photo", file);
  return (await api.post("/photo-verify", body)).data;
};

export const verifyPhotoRef = async (ref) =>
  (await api.get(`/photo-verify/${encodeURIComponent(ref)}`)).data;
