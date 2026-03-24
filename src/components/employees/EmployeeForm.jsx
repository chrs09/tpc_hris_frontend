import DefaultProfileImage from "./../../assets/logo/default/default-profile.jpg";
import { civilStatusOptions } from "../../constants/civilStatus";
import { employeeRoles } from "../../constants/employeeRole";

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  return filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_API_URL}/${filePath}`;
};
const genderOptions = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
];

const emptyEducation = {
  level: "",
  institution: "",
  degree: "",
  year_from: "",
  year_to: "",
  skills: "",
};

const emptyEmployment = {
  company_name: "",
  position: "",
  date_from: "",
  date_to: "",
};

export default function EmployeeForm({
  employee,
  formData,
  isEditing,
  activeTab,
  handleChange,
  handleFileChange,
  previewImage,
  setPreviewImage,
}) {
  const profileImageFromDB = employee?.files?.find(
    (f) => f.document_type === "PROFILE_IMAGE",
  )?.file_url;


  const educationRecords = formData.education_records || [];
  const employmentHistory = formData.employment_history || [];

  const handleEducationChange = (index, field, value) => {
    const updated = [...educationRecords];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    handleChange("education_records", updated);
  };

  const addEducation = () => {
    handleChange("education_records", [
      ...educationRecords,
      { ...emptyEducation },
    ]);
  };

  const removeEducation = (index) => {
    const updated = educationRecords.filter((_, i) => i !== index);
    handleChange("education_records", updated);
  };

  const handleEmploymentChange = (index, field, value) => {
    const updated = [...employmentHistory];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    handleChange("employment_history", updated);
  };

  const addEmployment = () => {
    handleChange("employment_history", [
      ...employmentHistory,
      { ...emptyEmployment },
    ]);
  };

  const removeEmployment = (index) => {
    const updated = employmentHistory.filter((_, i) => i !== index);
    handleChange("employment_history", updated);
  };

  const departmentOptions = Object.values(employeeRoles).filter(
    (option) => option !== "All",
  );
  return (
    <div className="p-6 space-y-10">
      {/* ================= BASIC ================= */}
      {activeTab === "basic" && (
        <>
          <div className="flex items-center gap-6 mb-6">
            <img
              src={
                formData.profile_image?.startsWith("blob:")
                  ? formData.profile_image
                  : profileImageFromDB
                    ? getFileUrl(profileImageFromDB)
                    : DefaultProfileImage
              }
              alt="Profile"
              onClick={() =>
                setPreviewImage(
                  formData.profile_image?.startsWith("blob:")
                    ? formData.profile_image
                    : profileImageFromDB
                      ? getFileUrl(profileImageFromDB)
                      : DefaultProfileImage,
                )
              }
              className="w-28 h-28 rounded-xl object-cover border cursor-pointer"
            />

            <div>
              <h3 className="text-2xl font-bold font-serif">
                {formData.first_name} {formData.last_name}
              </h3>

              <p>
                {formData.position} • {formData.department}
              </p>

              {employee && (
                <p className="text-sm mt-1">Employee ID: {employee.id}</p>
              )}

              {isEditing && employee && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-600">Status</span>

                  <button
                    type="button"
                    onClick={() =>
                      handleChange("is_active", formData.is_active ? 0 : 1)
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 ${
                      formData.is_active ? "bg-green-500" : "bg-gray-400"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full ${
                        formData.is_active ? "translate-x-6" : ""
                      }`}
                    />
                  </button>

                  <span className="text-sm font-medium">
                    {formData.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Section title="Basic Information">
            <EditableField
              label="First Name"
              field="first_name"
              value={formData.first_name}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Last Name"
              field="last_name"
              value={formData.last_name}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Email"
              field="email"
              value={formData.email}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Department"
              field="department"
              value={formData.department}
              isEditing={isEditing}
              onChange={handleChange}
              options={departmentOptions}
            />
            <EditableField
              label="Position"
              field="position"
              value={formData.position}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Date Hired"
              field="date_hired"
              value={formData.date_hired}
              type="date"
              isEditing={isEditing}
              onChange={handleChange}
            />
          </Section>
        </>
      )}

      {/* ================= PERSONAL ================= */}
      {activeTab === "personal" && (
        <>
          <Section title="Personal Information">
            <EditableField
              label="Birthday"
              field="birthday"
              value={formData.birthday}
              type="date"
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Birthplace"
              field="birthplace"
              value={formData.birthplace}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Civil Status"
              field="civil_status"
              value={formData.civil_status}
              isEditing={isEditing}
              onChange={handleChange}
              options={civilStatusOptions}
            />
            <EditableField
              label="Gender"
              field="gender"
              value={formData.gender}
              isEditing={isEditing}
              onChange={handleChange}
              options={genderOptions}
            />
            <EditableField
              label="Citizenship"
              field="citizenship"
              value={formData.citizenship}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Religion"
              field="religion"
              value={formData.religion}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Height"
              field="height"
              value={formData.height}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Weight"
              field="weight"
              value={formData.weight}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Language"
              field="language"
              value={formData.language}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Contact Number"
              field="contact_number"
              value={formData.contact_number}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Current Address"
              field="current_address"
              value={formData.current_address}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Provincial Address"
              field="provincial_address"
              value={formData.provincial_address}
              isEditing={isEditing}
              onChange={handleChange}
            />
          </Section>

          <Section title="Family Information">
            <EditableField
              label="Spouse"
              field="spouse"
              value={formData.spouse}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Father Name"
              field="father_name"
              value={formData.father_name}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Mother Name"
              field="mother_name"
              value={formData.mother_name}
              isEditing={isEditing}
              onChange={handleChange}
            />
          </Section>

          <Section title="Emergency Contact">
            <EditableField
              label="Contact Name"
              field="emergency_contact_name"
              value={formData.emergency_contact_name}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Contact Number"
              field="emergency_contact_number"
              value={formData.emergency_contact_number}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Relationship"
              field="emergency_relationship"
              value={formData.emergency_relationship}
              isEditing={isEditing}
              onChange={handleChange}
            />
          </Section>

          <DynamicSection
            title="Education"
            buttonLabel="Add School"
            isEditing={isEditing}
            onAdd={addEducation}
            emptyMessage="No education records yet."
          >
            {educationRecords.map((record, index) => (
              <CardBlock
                key={index}
                title={`School ${index + 1}`}
                isEditing={isEditing}
                onRemove={() => removeEducation(index)}
              >
                <EditableArrayField
                  label="Level"
                  value={record.level}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEducationChange(index, "level", value)
                  }
                />
                <EditableArrayField
                  label="Institution"
                  value={record.institution}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEducationChange(index, "institution", value)
                  }
                />
                <EditableArrayField
                  label="Degree / Course"
                  value={record.degree}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEducationChange(index, "degree", value)
                  }
                />
                <EditableArrayField
                  label="Year From"
                  value={record.year_from}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEducationChange(index, "year_from", value)
                  }
                />
                <EditableArrayField
                  label="Year To"
                  value={record.year_to}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEducationChange(index, "year_to", value)
                  }
                />
                <EditableArrayField
                  label="Skills"
                  value={record.skills}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEducationChange(index, "skills", value)
                  }
                />
              </CardBlock>
            ))}
          </DynamicSection>

          <DynamicSection
            title="Employment History"
            buttonLabel="Add Employment"
            isEditing={isEditing}
            onAdd={addEmployment}
            emptyMessage="No employment records yet."
          >
            {employmentHistory.map((record, index) => (
              <CardBlock
                key={index}
                title={`Employment ${index + 1}`}
                isEditing={isEditing}
                onRemove={() => removeEmployment(index)}
              >
                <EditableArrayField
                  label="Company Name"
                  value={record.company_name}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEmploymentChange(index, "company_name", value)
                  }
                />
                <EditableArrayField
                  label="Position"
                  value={record.position}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEmploymentChange(index, "position", value)
                  }
                />
                <EditableArrayField
                  label="Date From"
                  type="date"
                  value={record.date_from}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEmploymentChange(index, "date_from", value)
                  }
                />
                <EditableArrayField
                  label="Date To"
                  type="date"
                  value={record.date_to}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleEmploymentChange(index, "date_to", value)
                  }
                />
              </CardBlock>
            ))}
          </DynamicSection>

          <Section title="Character Reference">
            <EditableField
              label="Reference Name"
              field="ref_name"
              value={formData.ref_name}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Occupation"
              field="ref_occupation"
              value={formData.ref_occupation}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Address"
              field="ref_address"
              value={formData.ref_address}
              isEditing={isEditing}
              onChange={handleChange}
            />
            <EditableField
              label="Contact"
              field="ref_contact"
              value={formData.ref_contact}
              isEditing={isEditing}
              onChange={handleChange}
            />
          </Section>
        </>
      )}

      {/* GOVERNMENT */}
      {activeTab === "government" && (
        <Section title="Government Information">
          <EditableField
            label="SSS Number"
            field="sss"
            value={formData.sss}
            isEditing={isEditing}
            onChange={handleChange}
          />
          <EditableField
            label="PhilHealth Number"
            field="philhealth"
            value={formData.philhealth}
            isEditing={isEditing}
            onChange={handleChange}
          />
          <EditableField
            label="Pag-IBIG Number"
            field="pagibig"
            value={formData.pagibig}
            isEditing={isEditing}
            onChange={handleChange}
          />
          <EditableField
            label="TIN Number"
            field="tin"
            value={formData.tin}
            isEditing={isEditing}
            onChange={handleChange}
          />
        </Section>
      )}

      {/* FILES */}
      {activeTab === "files" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <FilePreview
            label="Profile Image"
            field="profile_image"
            documentType="PROFILE_IMAGE"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          <FilePreview
            label="CV"
            field="cv"
            documentType="CV"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />
          <FilePreview
            label="NBI Clearance"
            field="nbi_clearance"
            documentType="NBI_CLEARANCE"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          <FilePreview
            label="Barangay Clearance"
            field="brgy_clearance"
            documentType="BRGY_CLEARANCE"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          <FilePreview
            label="Company ID"
            field="company_id"
            documentType="COMPANY_ID"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />
        </div>
      )}
      {previewImage && (
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
      )}
    </div>
  );
}

/* SECTION */
function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#2b2b2b] mb-4 border-b pb-1">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

function EditableArrayField({
  label,
  value,
  isEditing,
  onChange,
  type = "text",
  options = null,
}) {
  const isSelect = Array.isArray(options) && options.length > 0;

  return (
    <div className="space-y-1">
      <label className="text-sm text-black">{label}</label>

      {isEditing ? (
        isSelect ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-b border-gray-300 focus:border-[#2b2b2b] focus:outline-none py-2 bg-transparent"
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-b border-gray-300 focus:border-[#2b2b2b] focus:outline-none py-2 bg-transparent"
          />
        )
      ) : (
        <p className="font-serif">{value || "-"}</p>
      )}
    </div>
  );
}

function DynamicSection({
  title,
  buttonLabel,
  isEditing,
  onAdd,
  emptyMessage,
  children,
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [];
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold text-[#2b2b2b]">{title}</h3>
      </div>

      {!hasItems ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{emptyMessage}</p>

          {isEditing && (
            <div>
              <button
                type="button"
                onClick={onAdd}
                className="px-4 py-2 rounded-lg border border-[#2b2b2b] text-[#2b2b2b] text-sm hover:bg-gray-50"
              >
                {buttonLabel}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-5">{items}</div>

          {isEditing && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onAdd}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#2b2b2b] text-[#2b2b2b] text-sm hover:bg-gray-50"
              >
                {buttonLabel}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CardBlock({ title, isEditing, onRemove, children }) {
  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-[#2b2b2b]">{title}</h4>

        {isEditing && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
}
/* EDITABLE FIELD */
function EditableField({
  label,
  field,
  value,
  isEditing,
  onChange,
  type = "text",
  options = null,
}) {
  const isSelect = Array.isArray(options) && options.length > 0;

  return (
    <div className="space-y-1">
      <label className="text-sm text-black">{label}</label>

      {isEditing ? (
        isSelect ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full border-b border-gray-300 focus:border-[#2b2b2b] focus:outline-none py-2 bg-transparent"
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full border-b border-gray-300 focus:border-[#2b2b2b] focus:outline-none py-2 bg-transparent"
          />
        )
      ) : (
        <p className="font-serif">{value || "-"}</p>
      )}
    </div>
  );
}

/* FILE PREVIEW */
function FilePreview({
  label,
  field,
  documentType,
  employee,
  formData,
  isEditing,
  onFileChange,
  setPreviewImage,
}) {
  const fileFromDB = employee?.files?.find(
    (f) => f.document_type === documentType,
  )?.file_url;

  const fileFromForm = formData?.[field];
  const fileObject = formData?.[`${field}_file`]; // 🔥 actual File

  const isBlob = fileFromForm?.startsWith("blob:");

  const fileUrl =
    isEditing && isBlob
      ? fileFromForm
      : fileFromDB
        ? getFileUrl(fileFromDB)
        : null;

  // 🔥 FIXED TYPE DETECTION
  const isImage =
    (isBlob && fileObject?.type.startsWith("image/")) ||
    (!isBlob &&
      fileUrl &&
      (fileUrl.endsWith(".png") ||
        fileUrl.endsWith(".jpg") ||
        fileUrl.endsWith(".jpeg")));

  const isPDF =
    (isBlob && fileObject?.type === "application/pdf") ||
    (!isBlob && fileUrl && fileUrl.endsWith(".pdf"));

  return (
    <div className="border rounded-xl p-4 bg-gray-50 flex flex-col items-center gap-3">
      <p className="text-sm text-gray-600">{label}</p>

      <div
        className="relative w-28 h-28 border rounded-xl flex items-center justify-center overflow-hidden cursor-pointer group"
        onClick={() => fileUrl && setPreviewImage(fileUrl)}
      >
        {fileUrl ? (
          isImage ? (
            <>
              <img src={fileUrl} className="w-full h-full object-cover" />

              {/* 🔥 HOVER OVERLAY */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="text-white text-xl">👁</span>
              </div>
            </>
          ) : isPDF ? (
            <div className="flex flex-col items-center justify-center text-red-600">
              <span className="text-3xl">📄</span>
              <span className="text-xs mt-1">PDF</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">File</span>
          )
        ) : (
          <span className="text-xs text-gray-400">No File</span>
        )}
      </div>

      {isEditing && (
        <label className="text-xs px-3 py-1 bg-[#2b2b2b] text-white rounded-md cursor-pointer">
          Upload
          <input
            type="file"
            hidden
            onChange={(e) => onFileChange(field, e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}
