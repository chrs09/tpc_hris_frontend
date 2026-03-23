import { useState } from "react";
import { mapEmployeeToForm } from "../../utils/mapEmployee";
import { updateEmployeeDetails } from "../../api/employee";
import DefaultProfileImage from "./../../assets/logo/default/default-profile.jpg";
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
  const [formData, setFormData] = useState(() =>
    employee ? mapEmployeeToForm(employee) : {},
  );
  const [previewImage, setPreviewImage] = useState(null);
  const [toast, setToast] = useState(null);

  if (!isOpen || !employee) return null;

  const handleClose = () => {
    if (isEditing) {
      const confirmLeave = window.confirm("Discard unsaved changes?");
      if (!confirmLeave) return;
    }
    onClose();
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

        // ✅ FILES
        if (key.endsWith("_file") && value instanceof File) {
          const docType = DOCUMENT_TYPE_MAP[key];

          if (!docType) return;

          formDataUpload.append("files", value);
          formDataUpload.append("document_types", docType);
        }

        // ✅ NORMAL FIELDS
        else if (
          !key.endsWith("_file") &&
          value !== null &&
          value !== undefined &&
          !(typeof value === "string" && value.startsWith("blob:"))
        ) {
          formDataUpload.append(key, value);
        }
      });

      await updateEmployeeDetails(employee.id, formDataUpload);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Update failed:", err);

      setToast({ type: "error", message: "Update failed. Please try again." });
    }
  };

  const handleCancel = () => {
    setFormData(mapEmployeeToForm(employee));
    setIsEditing(false);
  };

  // const profileImageFromDB = employee.files?.find(
  //   (f) => f.document_type === "PROFILE_IMAGE"
  // )?.file_url;

  console.log("FILES:", employee.files);
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-175 bg-white z-50 shadow-2xl overflow-y-auto">
        {/* HEADER */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Employee Details</h2>

          <div className="flex gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 bg-[#2b2b2b] text-white rounded-lg cursor-pointer hover:bg-[#494848]"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-[#2b2b2b] text-white rounded-lg cursor-pointer hover:bg-[#494848] transition"
                >
                  Save
                </button>

                <button
                  onClick={handleCancel}
                  className="px-4 py-1.5 bg-gray-300 rounded-lg cursor-pointer hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </>
            )}

            <button onClick={handleClose}>✕</button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b px-6">
          <div className="flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
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
          formData={formData}
          isEditing={isEditing}
          activeTab={activeTab}
          handleChange={handleChange}
          handleFileChange={handleFileChange}
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
        />
      </div>

      {/* IMAGE PREVIEW */}
      {/* {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-100 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white p-2 rounded-xl max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImage.endsWith(".pdf") ? (
              <iframe
                src={previewImage}
                title="PDF Preview"
                className="w-[80vw] h-[80vh]"
              />
            ) : (
              <img
                src={previewImage}
                alt="preview"
                className="max-h-[80vh] max-w-[90vw] rounded-xl"
              />
            )}
          </div>
        </div>
      )} */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-9999">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-white transition ${
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
