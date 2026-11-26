import { useEffect, useState } from "react";
import { getMyProfile } from "../../api/employee";

// The logged-in person for the dashboard greeting: name and role from the
// login, photo / position / department from their own employee record
// (fetched once per page load).

const fileUrl = (path) =>
  !path ? null : path.startsWith("http") ? path : `${import.meta.env.VITE_API_URL}/${path}`;
// One fetch per page load for the logged-in person's photo / position.
let profileCache = null;
const loadMe = () => {
  if (!profileCache) {
    profileCache = getMyProfile().catch(() => null);
  }
  return profileCache;
};

export function useMe() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    let alive = true;
    loadMe().then((data) => alive && setMe(data));
    return () => {
      alive = false;
    };
  }, []);
  const photo = me?.files?.find((f) => f.document_type === "PROFILE_IMAGE")?.file_url;
  return {
    name: localStorage.getItem("full_name") || localStorage.getItem("username") || "",
    role: localStorage.getItem("role") || "",
    position: me?.position || "",
    department: me?.department || "",
    photo: fileUrl(photo),
  };
}

export const greeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

