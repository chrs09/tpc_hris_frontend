import axios from "axios";
import { API_URL, getAuthHeader } from "../config";
//get employee list
export const getEmployeeList = async () => {
    try {
        const res = await axios.get(`${API_URL}/employees/`, {
            headers: {
                ...getAuthHeader()
            }
        });
        return res.data;
    }
    catch (err) {
        console.error(err.response?.data || err.message);
        return [];
    }
}

//get employee details
export const getEmployeeDetails = async (employeeId) => {
    try {
        const res = await axios.get(`${API_URL}/employees/${employeeId}/`);
        return res.data;
    }
    catch (err) {
        console.error(err.response?.data || err.message);
        return null;
    }
}

//update employee details
export const updateEmployeeDetails = async (employeeId, updatedData) => {
    try {
        const res = await axios.put(`${API_URL}/employees/${employeeId}/`, updatedData);
        return res.data;
    }
    catch (err) {
        console.error(err.response?.data || err.message);
        return null;
    }
}


