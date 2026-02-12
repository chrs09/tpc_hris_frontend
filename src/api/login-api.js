import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

// user login
export const userLogin = async (username, password) => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            username: username,
            password: password
        });
        return res.data;
    }
    catch (err) {
        console.eror(err.response?.data || err.message);
        return null;
    }
}

//user registration
export const userRegister = async (uername, email, password) => {
    try {
        const res = await axios.post(`${API_URL}/register`, {
            username: uername,
            email: email,
            password: password
        });
        return res.data;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}
