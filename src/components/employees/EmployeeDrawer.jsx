import { useState } from "react";
import { mapEmployeeToForm } from "../../utils/mapEmployee";
import { updateEmployeeDetails } from "../../api/employee";
import EmployeeForm from "./EmployeeForm";

const tabs = [
  { key: "basic", label: "Basic Information" },
  { key: "personal", label: "Personal Details" },
  { key: "government", label: "Government & Legal" },
  { key: "files", label: "Employment Files" },
];

export default function EmployeeDrawer({
  employee,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("basic");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [toast, setToast] = useState(null);

  if (!isOpen || !employee) return null;

  const displayData = isEditing ? formData : mapEmployeeToForm(employee);

  const handleClose = () => {
    if (isEditing) {
      const confirmLeave = window.confirm("Discard unsaved changes?");
      if (!confirmLeave) return;
    }

    setIsEditing(false);
    setActiveTab("basic");
    setPreviewImage(null);
    onClose();
  };

  const handleEdit = () => {
    setFormData(mapEmployeeToForm(employee));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(mapEmployeeToForm(employee));
    setIsEditing(false);
    setPreviewImage(null);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (field, file) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);

    setFormData((prev) => ({
      ...prev,
      [field]: preview,
      [`${field}_file`]: file,
    }));
  };

  const handleSave = async () => {
    try {
      const DOCUMENT_TYPE_MAP = {
        profile_image_file: "PROFILE_IMAGE",
        cv_file: "CV",
        nbi_clearance_file: "NBI_CLEARANCE",
        brgy_clearance_file: "BRGY_CLEARANCE",
        company_id_file: "COMPANY_ID",
      };

      const formDataUpload = new FormData();

      Object.keys(formData).forEach((key) => {
        const value = formData[key];

        if (key.endsWith("_file") && value instanceof File) {
          const docType = DOCUMENT_TYPE_MAP[key];
          if (!docType) return;

          formDataUpload.append("files", value);
          formDataUpload.append("document_types", docType);
          return;
        }

        if (typeof value === "string" && value.startsWith("blob:")) {
          return;
        }

        if (key === "education_records" || key === "employment_history") {
          formDataUpload.append(key, JSON.stringify(value || []));
          return;
        }

        if (!key.endsWith("_file") && value !== null && value !== undefined) {
          formDataUpload.append(key, value);
        }
      });

      await updateEmployeeDetails(employee.id, formDataUpload);

      setToast({
        type: "success",
        message: "Employee updated successfully.",
      });

      setIsEditing(false);

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setToast(null);
      }, 2500);
    } catch (error) {
      console.error("Update failed:", error);

      setToast({
        type: "error",
        message: "Update failed. Please try again.",
      });

      setTimeout(() => {
        setToast(null);
      }, 2500);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />

      <div className="fixed right-0 top-0 h-full w-full sm:w-175 bg-white z-50 shadow-2xl overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">Employee Details</h2>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg bg-[#2b2b2b] text-white hover:bg-[#444]"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-[#2b2b2b] text-white hover:bg-[#444]"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-black hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="text-xl text-gray-600 hover:text-black"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="border-b px-6">
          <div className="flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? "text-[#2b2b2b] border-b-2 border-[#2b2b2b] font-semibold"
                    : "text-gray-500 hover:text-[#2b2b2b]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <EmployeeForm
          employee={employee}
          formData={displayData}
          isEditing={isEditing}
          activeTab={activeTab}
          handleChange={handleChange}
          handleFileChange={handleFileChange}
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
        />
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-9999">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-white ${
              toast.type === "success" ? "bg-green-600" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
