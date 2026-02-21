// [ LOCAL ]
// export const API_URL = "http://192.168.1.6:8000/api";
// [ PRODUCTION ]
export const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// Optional helpers (only if you still want them)
export const getAccessToken = () => localStorage.getItem("access_token");
export const getUserRole = () => localStorage.getItem("role");
export const getUserId = () => localStorage.getItem("user_id");
export const getUserName = () => localStorage.getItem("username");
