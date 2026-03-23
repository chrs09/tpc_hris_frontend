import { useState } from "react";
// import { employeeRoles } from "../../constants/employeeRole";
// import { civilStatusOptions } from "../../constants/civilStatus";
import { createEmployee } from "../../api/employee";
import EmployeeForm from "./EmployeeForm";

const tabs = [
  { key: "basic", label: "Basic Information" },
  { key: "personal", label: "Personal Details" },
  { key: "government", label: "Government & Legal" },
  { key: "files", label: "Employment Files" },
];

export default function AddEmployeeDrawer({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [previewImage, setPreviewImage] = useState(null);
  const initialFormState = {
    // BASIC
    first_name: "",
    last_name: "",
    email: "",
    department: "",
    position: "",
    date_hired: "",

    // PERSONAL
    birthday: "",
    birthplace: "",
    civil_status: "",
    religion: "",
    gender: "",
    citizenship: "",
    height: "",
    weight: "",
    language: "",
    contact_number: "",
    current_address: "",
    provincial_address: "",
    spouse: "",
    father_name: "",
    mother_name: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    emergency_relationship: "",

    // EDUCATION
    elementary: "",
    highschool: "",
    college: "",
    degree: "",
    skills: "",

    // PREVIOUS EMPLOYMENT
    prev_company: "",
    prev_position: "",
    prev_from: "",
    prev_to: "",

    // CHARACTER REFERENCE
    ref_name: "",
    ref_occupation: "",
    ref_address: "",
    ref_contact: "",

    // GOVERNMENT
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  };

  const initialFileState = {
    profile_image: null,
    resume: null,
    biodata: null,
    nbi_clearance: null,
    barangay_clearance: null,
    company_id: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [files, setFiles] = useState(initialFileState);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveTab("basic");
    setFormData(initialFormState);
    setFiles(initialFileState);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (!selectedFiles.length) return;
    setFiles({ ...files, [name]: selectedFiles[0] });
  };

  const handleSubmit = async () => {
    try {
      console.log("Submitting employee...");

      const formDataUpload = new FormData();

      // ✅ TEXT FIELDS (skip empty)
      Object.keys(formData).forEach((key) => {
        const value = formData[key];

        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          !(typeof value === "string" && value.startsWith("blob:"))
        ) {
          formDataUpload.append(key, value);
        }
      });

      // ✅ FILES → convert to files[] + document_types[]
      const DOCUMENT_TYPE_MAP = {
        profile_image_file: "PROFILE_IMAGE",
        cv_file: "CV",
        nbi_clearance_file: "NBI_CLEARANCE",
        brgy_clearance_file: "BRGY_CLEARANCE",
        company_id_file: "COMPANY_ID",
      };

      Object.keys(formData).forEach((key) => {
        const value = formData[key];

        if (key.endsWith("_file") && value instanceof File) {
          const docType = DOCUMENT_TYPE_MAP[key];

          if (!docType) return;

          formDataUpload.append("files", value);
          formDataUpload.append("document_types", docType);
        }
      });

      // 🔍 DEBUG (optional but useful)
      for (let pair of formDataUpload.entries()) {
        console.log(pair[0], pair[1]);
      }


      await createEmployee(formDataUpload);

       if (onSuccess) onSuccess();

    } catch (error) {
      console.error("ERROR RESPONSE:", error.response?.data);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />

      <div className="fixed right-0 top-0 h-full w-full sm:w-175 bg-white z-50 shadow-2xl overflow-y-auto">

        {/* HEADER */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-black">
            Add Employee
          </h2>
          <button onClick={handleClose}>✕</button>
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
                    ? "text-[#2b2b2b] font-semibold border-b-2 border-[#2b2b2b]"
                    : "text-gray-500 hover:text-[#2b2b2b]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <EmployeeForm
          activeTab={activeTab}
          formData={formData}
         onChange={handleChange}
         onFileChange={handleFileChange}
         handleChange={(field, value) =>
           setFormData((prev) => ({ ...prev, [field]: value }))
         }
         handleFileChange={(field, file) => {
           if (!file) return;
        
           const preview = URL.createObjectURL(file);
        
           setFormData((prev) => ({
             ...prev,
             [field]: preview,
             [`${field}_file`]: file,
           }));
         }}
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
          isEditing={true}
        />

        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-[#2b2b2b] text-white rounded">
            Save Employee
          </button>
        </div>

      </div>
    </>
  );
}
