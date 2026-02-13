export const API_URL = "http://127.0.0.1:8000/api";

//storing of access key token in local storage
export const getAccessToken = () => localStorage.getItem("accessToken");
export const tokenType = () => localStorage.getItem("tokenType");

//helper to get full authorization header
export const getAuthHeader = () => {
    const token = localStorage.getItem("access_token");
    const type = localStorage.getItem("token_type");
    return token && type ? { Authorization: `${type} ${token}` } : {};
};