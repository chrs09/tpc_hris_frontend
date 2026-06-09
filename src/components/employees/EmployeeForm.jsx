import DefaultProfileImage from "./../../assets/logo/default/default-profile.jpg";
import { civilStatusOptions } from "../../constants/civilStatus";
import { employeeRoles } from "../../constants/employeeRole";

const getFileUrl = (filePath) => {
  if (!filePath) return "";

  return filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_API_URL}/${filePath}`;
};

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

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

const emptyReference = {
  name: "",
  position: "",
  address: "",
  contact: "",
};

const DRIVER_DEPARTMENTS = ["CdcDriver", "CpdcDriver"];

export default function EmployeeForm({
  employee,
  formData,
  isEditing,
  activeTab,
  handleChange,
  handleFileChange,
  previewImage,
  setPreviewImage,
  scheduleTemplates,
}) {
  const profileImageFromDB = employee?.files?.find(
    (f) => f.document_type === "PROFILE_IMAGE",
  )?.file_url;

  const educationRecords = Array.isArray(formData.education_records)
    ? formData.education_records
    : [];

  const employmentHistory = Array.isArray(formData.employment_history)
    ? formData.employment_history
    : [];

  const characterReferences = Array.isArray(formData.character_references)
    ? formData.character_references
    : [];

  const departmentOptions = Object.values(employeeRoles).filter(
    (option) => option !== "All",
  );
  const scheduleOptions =
    scheduleTemplates?.map((schedule) => ({
      value: schedule.id,
      label: schedule.name,
    })) || [];

  const isDriver = DRIVER_DEPARTMENTS.includes(formData.department);

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

  const handleReferenceChange = (index, field, value) => {
    const updated = [...characterReferences];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    handleChange("character_references", updated);
  };

  const addReference = () => {
    if (characterReferences.length >= 3) return;

    handleChange("character_references", [
      ...characterReferences,
      { ...emptyReference },
    ]);
  };

  const removeReference = (index) => {
    const updated = characterReferences.filter((_, i) => i !== index);
    handleChange("character_references", updated);
  };

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
              <h3 className="text-2xl font-bold font-serif capitalize">
                {formData.first_name} {formData.middle_name}{" "}
                {formData.last_name} {formData.suffix || ""}
              </h3>

              <p>
                {formData.position} • {formData.department}
              </p>

              {employee && (
                <p className="text-sm mt-1">Employee ID: {employee.id}</p>
              )}

              {(isEditing || Number(formData.is_active) === 0) && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-600">Status</span>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={() =>
                        handleChange("is_active", formData.is_active ? 0 : 1)
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                        Number(formData.is_active) === 1
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full transition ${
                          Number(formData.is_active) === 1
                            ? "translate-x-6"
                            : ""
                        }`}
                      />
                    </button>
                  )}

                  <span className="text-sm font-medium">
                    {Number(formData.is_active) === 1 ? "Active" : "Inactive"}
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
              label="Middle Name"
              field="middle_name"
              value={formData.middle_name}
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
              label="Suffix"
              field="suffix"
              value={formData.suffix}
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
              label="Daily Rate"
              field="daily_rate"
              value={formData.daily_rate}
              type="number"
              isEditing={isEditing}
              onChange={handleChange}
            />

            <EditableField
              label="Employment Type"
              field="employment_type"
              value={formData.employment_type}
              isEditing={isEditing}
              onChange={handleChange}
              options={[
                "Regular",
                "Probationary",
                "Contractual",
                "Project Based",
              ]}
            />

            <EditableField
              label="Payroll Type"
              field="payroll_type"
              value={formData.payroll_type}
              isEditing={isEditing}
              onChange={handleChange}
              options={["Daily", "Weekly", "Monthly"]}
            />
            <EditableField
              label="Work Schedule"
              field="schedule_template_id"
              value={formData.schedule_template_id}
              isEditing={isEditing}
              onChange={handleChange}
              options={scheduleOptions}
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

          {Number(formData.is_active) === 0 && (
            <Section title="Inactive Employee Details">
              <EditableField
                label="Inactive Reason"
                field="inactive_reason"
                value={formData.inactive_reason}
                isEditing={false}
                onChange={handleChange}
              />
              <EditableField
                label="Inactive Date"
                field="inactive_date"
                value={formData.inactive_date}
                isEditing={false}
                onChange={handleChange}
              />
              <EditableField
                label="Inactive Remarks"
                field="inactive_remarks"
                value={formData.inactive_remarks}
                isEditing={false}
                onChange={handleChange}
              />
            </Section>
          )}
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
                  options={["Primary", "Secondary", "Senior High", "Tertiary"]}
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
                {/* Only show for tertiary */}
                {record.level === "Tertiary" && (
                  <EditableArrayField
                    label="Degree / Course"
                    value={record.degree}
                    isEditing={isEditing}
                    onChange={(value) =>
                      handleEducationChange(index, "degree", value)
                    }
                  />
                )}
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

          <DynamicSection
            title="Character Reference"
            buttonLabel="Add Reference"
            isEditing={isEditing && characterReferences.length < 3}
            onAdd={addReference}
            emptyMessage="No character references yet."
          >
            {characterReferences.map((record, index) => (
              <CardBlock
                key={index}
                title={`Reference ${index + 1}`}
                isEditing={isEditing}
                onRemove={() => removeReference(index)}
              >
                <EditableArrayField
                  label="Reference Name"
                  value={record.name}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleReferenceChange(index, "name", value)
                  }
                />

                <EditableArrayField
                  label="Position"
                  value={record.position}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleReferenceChange(index, "position", value)
                  }
                />

                <EditableArrayField
                  label="Address"
                  value={record.address}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleReferenceChange(index, "address", value)
                  }
                />

                <EditableArrayField
                  label="Contact"
                  value={record.contact}
                  isEditing={isEditing}
                  onChange={(value) =>
                    handleReferenceChange(index, "contact", value)
                  }
                />
              </CardBlock>
            ))}
          </DynamicSection>
        </>
      )}

      {/* ================= GOVERNMENT ================= */}
      {activeTab === "government" && (
        <>
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

          <div className="space-y-4">
            <div className="border-b pb-1">
              <h3 className="text-lg font-semibold text-[#2b2b2b]">
                Government Documents
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Upload scanned copies or screenshots of government
                IDs/documents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FilePreview
                label="SSS"
                field="sss_upload"
                documentType="SSS"
                employee={employee}
                formData={formData}
                isEditing={isEditing}
                onFileChange={handleFileChange}
                setPreviewImage={setPreviewImage}
              />

              <FilePreview
                label="Pag-IBIG"
                field="pagibig_upload"
                documentType="PAGIBIG"
                employee={employee}
                formData={formData}
                isEditing={isEditing}
                onFileChange={handleFileChange}
                setPreviewImage={setPreviewImage}
              />

              <FilePreview
                label="PhilHealth"
                field="philhealth_upload"
                documentType="PHILHEALTH"
                employee={employee}
                formData={formData}
                isEditing={isEditing}
                onFileChange={handleFileChange}
                setPreviewImage={setPreviewImage}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b pb-1">
              <h3 className="text-lg font-semibold text-[#2b2b2b]">
                Bank Details
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Employee payroll and banking information.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EditableField
                label="Bank Type"
                field="bank_type"
                value={formData.bank_type}
                isEditing={isEditing}
                onChange={handleChange}
                options={[
                  "BDO",
                  "GoTyme",
                  "BPI",
                  "Metrobank",
                  "UnionBank",
                  "Gcash",
                  "Cebuana",
                  "Other",
                ]}
              />

              <EditableField
                label="Account Name"
                field="account_name"
                value={formData.account_name}
                isEditing={isEditing}
                onChange={handleChange}
              />

              <EditableField
                label="Account Number"
                field="account_number"
                value={formData.account_number}
                isEditing={isEditing}
                onChange={handleChange}
              />
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Proof of Account
              </h4>

              <div className="max-w-sm">
                <FilePreview
                  label="Upload ATM / Passbook / Screenshot"
                  field="account_number_upload"
                  documentType="ACCOUNT_NUMBER"
                  employee={employee}
                  formData={formData}
                  isEditing={isEditing}
                  onFileChange={handleFileChange}
                  setPreviewImage={setPreviewImage}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= FILES ================= */}
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
            label="Contract"
            field="contract"
            documentType="CONTRACT"
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

          <FilePreview
            label="Accountability"
            field="accountability"
            documentType="ACCOUNTABILITY"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          <FilePreview
            label="Driver's License"
            field="license"
            documentType="LICENSE"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          <FilePreview
            label="Health Card"
            field="healthcard"
            documentType="HEALTHCARD"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          <FilePreview
            label="X-Ray"
            field="xray"
            documentType="XRAY"
            employee={employee}
            formData={formData}
            isEditing={isEditing}
            onFileChange={handleFileChange}
            setPreviewImage={setPreviewImage}
          />

          {isDriver && (
            <FilePreview
              label="NC3"
              field="nc3"
              documentType="NC3"
              employee={employee}
              formData={formData}
              isEditing={isEditing}
              onFileChange={handleFileChange}
              setPreviewImage={setPreviewImage}
            />
          )}
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
            {previewImage.toLowerCase().endsWith(".pdf") ? (
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
      <label className="text-sm text-black font-semibold">{label}</label>

      {isEditing ? (
        isSelect ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-b border-gray-300 focus:border-[#2b2b2b] focus:outline-none py-2 bg-transparent"
          >
            <option value="">Select {label}</option>

            {options.map((option) => (
              <option
                key={typeof option === "object" ? option.value : option}
                value={typeof option === "object" ? option.value : option}
              >
                {typeof option === "object" ? option.label : option}
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
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#2b2b2b] text-[#2b2b2b] text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <label className="text-sm text-black font-semibold">{label}</label>

      {isEditing ? (
        isSelect ? (
          <select
            value={value || ""}
            onChange={(e) =>
              onChange(
                field,
                field === "schedule_template_id"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
            className="w-full border-b border-gray-300 focus:border-[#2b2b2b] focus:outline-none py-2 bg-transparent"
          >
            <option value="">Select {label}</option>

            {options.map((option) => (
              <option
                key={typeof option === "object" ? option.value : option}
                value={typeof option === "object" ? option.value : option}
              >
                {typeof option === "object" ? option.label : option}
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
  const fileObject = formData?.[`${field}_file`];

  const isBlob =
    typeof fileFromForm === "string" && fileFromForm.startsWith("blob:");

  const fileUrl =
    isEditing && isBlob
      ? fileFromForm
      : fileFromDB
        ? getFileUrl(fileFromDB)
        : null;

  const lowerUrl = fileUrl?.toLowerCase?.() || "";

  const isImage =
    (isBlob && fileObject?.type?.startsWith("image/")) ||
    (!isBlob &&
      fileUrl &&
      (lowerUrl.endsWith(".png") ||
        lowerUrl.endsWith(".jpg") ||
        lowerUrl.endsWith(".jpeg") ||
        lowerUrl.endsWith(".webp")));

  const isPDF =
    (isBlob && fileObject?.type === "application/pdf") ||
    (!isBlob && fileUrl && lowerUrl.endsWith(".pdf"));

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition">
      <p className="text-sm text-gray-600 text-center">{label}</p>

      <div
        className="relative w-24 h-24 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer group bg-gray-50"
        onClick={() => fileUrl && setPreviewImage(fileUrl)}
      >
        {fileUrl ? (
          isImage ? (
            <>
              <img
                src={fileUrl}
                alt={label}
                className="w-full h-full object-cover"
              />

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
        <label className="text-xs px-3 py-1.5 bg-[#2b2b2b] text-white rounded-lg cursor-pointer hover:bg-black transition">
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
