// [ LOCAL ]
// export const API_URL = "http://192.168.1.6:8000/api";
// [ PRODUCTION ]
export const API_URL = `${import.meta.env.VITE_API_URL}/api`;

//storing of access key token in local storage
export const getAccessToken = () => localStorage.getItem("access_token");
export const tokenType = () => localStorage.getItem("tokenType");

//helper to get full authorization header
export const getAuthHeader = () => {
  const token = localStorage.getItem("access_token");
  const type = localStorage.getItem("token_type");
  return token && type ? { Authorization: `${type} ${token}` } : {};
};
