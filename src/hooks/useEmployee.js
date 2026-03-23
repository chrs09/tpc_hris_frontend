import { useEffect, useState, useCallback } from "react";
import { getEmployeeList } from "../api/employee/index";

export const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployeeList();
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    refetch: fetchEmployees, // 🔥 THIS IS THE KEY
  };
};