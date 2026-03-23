import { useEffect, useState } from "react";
import api from "../../api/services/api"; // adjust path

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);

  const fetchApplicants = async () => {
    try {
      const res = await api.get("/admin/applicants");
      setApplicants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Applicants</h1>
    </div>
  );
}