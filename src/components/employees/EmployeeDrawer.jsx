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
  const [showInactiveModal, setShowInactiveModal] = useState(false);

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
    setShowInactiveModal(false);
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
    setShowInactiveModal(false);
  };

  const handleChange = (field, value) => {
    if (field === "is_active") {
      const normalizedValue = Number(value);

      if (normalizedValue === 0) {
        setFormData((prev) => ({
          ...prev,
          is_active: 0,
        }));
        setShowInactiveModal(true);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        is_active: 1,
        inactive_reason: "",
        inactive_date: "",
        inactive_remarks: "",
      }));
      return;
    }

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
        contract_file: "CONTRACT",
        nbi_clearance_file: "NBI_CLEARANCE",
        brgy_clearance_file: "BRGY_CLEARANCE",
        company_id_file: "COMPANY_ID",
        account_number_file: "ACCOUNT_NUMBER",
        accountability_file: "ACCOUNTABILITY",
        id_file_file: "ID_FILE",
        healthcard_file: "HEALTHCARD",
        xray_file: "XRAY",
        nc3_file: "NC3",
      };

      if (Number(formData.is_active) === 0) {
        if (!formData.inactive_reason || !formData.inactive_date) {
          setToast({
            type: "error",
            message: "Inactive employee requires reason and inactive date.",
          });

          setTimeout(() => {
            setToast(null);
          }, 2500);
          return;
        }
      }

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
      console.log("=== RAW formData ===");
      console.log(formData);

      console.log("=== FormDataUpload ===");
      for (let pair of formDataUpload.entries()) {
        console.log(pair[0], pair[1]);
      }

      await updateEmployeeDetails(employee.id, formDataUpload);

      setToast({
        type: "success",
        message: "Employee updated successfully.",
      });

      setIsEditing(false);
      setShowInactiveModal(false);

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

          {employee.updated_at && (
            <div className="mt-3 rounded-lg border bg-gray-50 px-4 py-2 text-xs text-gray-600">
              Updated by{" "}
              <span className="font-semibold text-gray-800">
                {employee.updated_by_name || "Unknown"}
              </span>
              <br />
              {new Date(employee.updated_at).toLocaleString()}
            </div>
          )}

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

      {showInactiveModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#2b2b2b]">
              Set Employee as Inactive
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Please provide the required details before saving.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-black">
                  Inactive Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.inactive_reason || ""}
                  onChange={(e) =>
                    handleChange("inactive_reason", e.target.value)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select reason</option>
                  <option value="RESIGNED">Resigned</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="AWOL">AWOL</option>
                  <option value="END_OF_CONTRACT">End of Contract</option>
                  <option value="RETIRED">Retired</option>
                  <option value="OTHERS">Others</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-black">
                  Inactive Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.inactive_date || ""}
                  onChange={(e) =>
                    handleChange("inactive_date", e.target.value)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-black">Remarks</label>
                <textarea
                  rows={3}
                  value={formData.inactive_remarks || ""}
                  onChange={(e) =>
                    handleChange("inactive_remarks", e.target.value)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Optional remarks..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowInactiveModal(false);
                  setFormData((prev) => ({
                    ...prev,
                    is_active: 1,
                    inactive_reason: "",
                    inactive_date: "",
                    inactive_remarks: "",
                  }));
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-black hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setShowInactiveModal(false)}
                className="px-4 py-2 rounded-lg bg-[#2b2b2b] text-white hover:bg-[#444]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
