import { useEffect, useState } from "react";
import api from "../../api/services/api"; // adjust path

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    const loadApplicants = async () => {
      try {
        const res = await api.get("/admin/applicants");
        setApplicants(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadApplicants();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Applicants</h1>

      {applicants.length === 0 ? (
        <p>No applicants found</p>
      ) : (
        applicants.map((app) => (
          <div key={app.id} className="border p-3 mb-2 rounded">
            {app.first_name} {app.last_name}
          </div>
        ))
      )}
    </div>
  );
}
