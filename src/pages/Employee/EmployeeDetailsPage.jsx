import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getEmployeeDetails } from "../../api/employee/index";
import EmployeeDetailsCard from "../../components/employees/EmployeeDetailsCard";

export default function EmployeeDetailsPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await getEmployeeDetails(id);
        setEmployee(data);
      } catch {
        setError("Failed to load employee.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) return <div className="p-8">Loading employee...</div>;
  if (!employee) return <div className="p-8">Employee not found</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 md:px-8 py-6">
        <EmployeeDetailsCard employee={employee} />
      </div>
    </div>
  );
}
