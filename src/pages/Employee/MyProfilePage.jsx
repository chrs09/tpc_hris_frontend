import { useEffect, useState } from "react";
import { getMyProfile } from "../../api/employee";
import { getScheduleTemplates } from "../../api/scheduleTemplates";
import { mapEmployeeToForm } from "../../utils/mapEmployee";
import EmployeeForm from "../../components/employees/EmployeeForm";

// My Profile: the logged-in person's own 201 record, read-only. Same
// sections as HRIS -> Employees, without Work History. Salary and
// allowance show for superadmin only (for now). Changes go through HR.
const TABS = [
  { key: "basic", label: "Basic Information" },
  { key: "personal", label: "Personal Details" },
  { key: "government", label: "Government & Legal" },
  { key: "files", label: "Employment Files" },
];

const noop = () => {};

export default function MyProfilePage() {
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    getMyProfile()
      .then(setEmployee)
      .catch((err) =>
        setError(
          err?.response?.data?.detail || "Couldn't load your profile. Try again later.",
        ),
      );
    getScheduleTemplates()
      .then((data) => setScheduleTemplates(data || []))
      .catch(() => setScheduleTemplates([]));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center">
        <h2 className="text-xl font-bold text-fg">My Profile</h2>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
      </div>
    );
  }

  if (!employee) {
    return <p className="p-6 text-sm text-fg-subtle">Loading your profile...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">My Profile</h2>
          <p className="text-sm text-fg-subtle">
            Your own employee record. To change anything, ask HR.
          </p>
        </div>
        <span className="rounded-full bg-surface-active px-3 py-1 text-xs font-medium text-fg-muted">
          View only
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 sm:px-6">
          <div className="flex space-x-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-4 text-sm ${
                  activeTab === tab.key
                    ? "border-b-2 border-fg font-semibold text-fg"
                    : "text-fg-subtle hover:text-fg"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <EmployeeForm
          employee={employee}
          formData={mapEmployeeToForm(employee)}
          isEditing={false}
          activeTab={activeTab}
          handleChange={noop}
          handleFileChange={noop}
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
          scheduleTemplates={scheduleTemplates}
        />
      </div>
    </div>
  );
}
