import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  getApplicantOnboarding,
  saveApplicantOnboarding,
  submitApplicantOnboarding,
} from "../../api/applicantOnboarding";

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
  occupation: "",
  address: "",
  contact: "",
};

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  department: "",
  position: "",

  birthday: "",
  birthplace: "",
  gender: "",
  civil_status: "",
  religion: "",
  citizenship: "",
  height: "",
  weight: "",
  language: "",
  contact_number: "",
  current_address: "",
  provincial_address: "",

  spouse_name: "",
  father_name: "",
  mother_name: "",

  emergency_contact_name: "",
  emergency_contact_number: "",
  emergency_relationship: "",

  sss: "",
  philhealth: "",
  pagibig: "",
  tin: "",

  education_records: [],
  employment_history: [],
  references: [],
};

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-bold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  name,
  type = "text",
  options = null,
  placeholder = "",
}) {
  const isSelect = Array.isArray(options) && options.length > 0;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {isSelect ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
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
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
        />
      )}
    </div>
  );
}

function DynamicCard({ title, onRemove, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast.show) return null;

  const styles = {
    success: "border-green-200 bg-green-50 text-green-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div className="fixed top-4 right-4 z-9999 w-full max-w-sm">
      <div
        className={`rounded-2xl border px-4 py-3 shadow-lg ${styles[toast.type] || styles.info}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnBoardingForm() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [applicant, setApplicant] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const genderOptions = useMemo(
    () => ["Male", "Female", "Other", "Prefer not to say"],
    [],
  );

  const civilStatusOptions = useMemo(
    () => ["Single", "Married", "Widowed", "Separated"],
    [],
  );

  const showToast = useCallback((message, type = "info") => {
    setToast({ show: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.show]);

  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getApplicantOnboarding(token);
      setApplicant(data.applicant);

      const onboarding = data.onboarding || {};

      setForm({
        ...initialForm,
        ...onboarding,
        first_name: onboarding.first_name || data.applicant?.first_name || "",
        last_name: onboarding.last_name || data.applicant?.last_name || "",
        email: onboarding.email || data.applicant?.email || "",
        contact_number:
          onboarding.contact_number || data.applicant?.contact_number || "",
        position: onboarding.position || data.applicant?.position_applied || "",
        education_records: data.education_records || [],
        employment_history: data.employment_history || [],
        references: data.references || [],
      });
    } catch (err) {
      console.error("Failed to load onboarding form:", err);

      const message = err?.response?.data?.detail
        ? typeof err.response.data.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(err.response.data.detail)
        : "Failed to load onboarding form.";

      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (token) loadForm();
  }, [token, loadForm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEducationChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.education_records];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education_records: updated };
    });
  };

  const addEducation = () => {
    setForm((prev) => ({
      ...prev,
      education_records: [...prev.education_records, { ...emptyEducation }],
    }));
  };

  const removeEducation = (index) => {
    setForm((prev) => ({
      ...prev,
      education_records: prev.education_records.filter((_, i) => i !== index),
    }));
  };

  const handleEmploymentChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.employment_history];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, employment_history: updated };
    });
  };

  const addEmployment = () => {
    setForm((prev) => ({
      ...prev,
      employment_history: [...prev.employment_history, { ...emptyEmployment }],
    }));
  };

  const removeEmployment = (index) => {
    setForm((prev) => ({
      ...prev,
      employment_history: prev.employment_history.filter((_, i) => i !== index),
    }));
  };

  const handleReferenceChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.references];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, references: updated };
    });
  };

  const addReference = () => {
    setForm((prev) => ({
      ...prev,
      references: [...prev.references, { ...emptyReference }],
    }));
  };

  const removeReference = (index) => {
    setForm((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      await saveApplicantOnboarding(token, {
        ...form,
        education_records: form.education_records || [],
        employment_history: form.employment_history || [],
        references: form.references || [],
      });

      await loadForm();
      showToast("Form saved successfully.", "success");
    } catch (err) {
      console.error("Failed to save onboarding form:", err);

      const message = err?.response?.data?.detail
        ? typeof err.response.data.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(err.response.data.detail)
        : "Failed to save onboarding form.";

      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError("");

      await saveApplicantOnboarding(token, {
        ...form,
        education_records: form.education_records || [],
        employment_history: form.employment_history || [],
        references: form.references || [],
      });

      await submitApplicantOnboarding(token);
      await loadForm();
      showToast("Form submitted successfully.", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to submit onboarding form:", err);

      const message = err?.response?.data?.detail
        ? typeof err.response.data.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(err.response.data.detail)
        : "Failed to submit onboarding form.";

      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
          Loading employment form...
        </div>
      </div>
    );
  }

  if (error && !applicant) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <Toast toast={toast} onClose={closeToast} />
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-600 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <Toast toast={toast} onClose={closeToast} />

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Employment Information Form
          </h1>
          <p className="mt-2 text-gray-500">
            Please complete the required information below.
          </p>

          {applicant && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Applicant:</span>{" "}
                {applicant.first_name} {applicant.last_name}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Applied Position:</span>{" "}
                {applicant.position_applied || "-"}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <Section title="Basic Information">
          <Field
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
          />
          <Field
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
          />
          <Field
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
          />
          <Field
            label="Department"
            name="department"
            value={form.department}
            onChange={handleChange}
          />
          <Field
            label="Position"
            name="position"
            value={form.position}
            onChange={handleChange}
          />
        </Section>

        <Section title="Personal Information">
          <Field
            label="Birthday"
            name="birthday"
            value={form.birthday}
            onChange={handleChange}
            type="date"
          />
          <Field
            label="Birthplace"
            name="birthplace"
            value={form.birthplace}
            onChange={handleChange}
          />
          <Field
            label="Gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            options={genderOptions}
          />
          <Field
            label="Civil Status"
            name="civil_status"
            value={form.civil_status}
            onChange={handleChange}
            options={civilStatusOptions}
          />
          <Field
            label="Religion"
            name="religion"
            value={form.religion}
            onChange={handleChange}
          />
          <Field
            label="Citizenship"
            name="citizenship"
            value={form.citizenship}
            onChange={handleChange}
          />
          <Field
            label="Height"
            name="height"
            value={form.height}
            onChange={handleChange}
          />
          <Field
            label="Weight"
            name="weight"
            value={form.weight}
            onChange={handleChange}
          />
          <Field
            label="Language"
            name="language"
            value={form.language}
            onChange={handleChange}
          />
          <Field
            label="Contact Number"
            name="contact_number"
            value={form.contact_number}
            onChange={handleChange}
          />
          <Field
            label="Current Address"
            name="current_address"
            value={form.current_address}
            onChange={handleChange}
          />
          <Field
            label="Provincial Address"
            name="provincial_address"
            value={form.provincial_address}
            onChange={handleChange}
          />
        </Section>

        <Section title="Family Information">
          <Field
            label="Spouse Name"
            name="spouse_name"
            value={form.spouse_name}
            onChange={handleChange}
          />
          <Field
            label="Father Name"
            name="father_name"
            value={form.father_name}
            onChange={handleChange}
          />
          <Field
            label="Mother Name"
            name="mother_name"
            value={form.mother_name}
            onChange={handleChange}
          />
        </Section>

        <Section title="Emergency Contact">
          <Field
            label="Emergency Contact Name"
            name="emergency_contact_name"
            value={form.emergency_contact_name}
            onChange={handleChange}
          />
          <Field
            label="Emergency Contact Number"
            name="emergency_contact_number"
            value={form.emergency_contact_number}
            onChange={handleChange}
          />
          <Field
            label="Relationship"
            name="emergency_relationship"
            value={form.emergency_relationship}
            onChange={handleChange}
          />
        </Section>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Education</h2>
            <button
              type="button"
              onClick={addEducation}
              className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Education
            </button>
          </div>

          <div className="space-y-4">
            {form.education_records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No education records yet.
              </div>
            ) : (
              form.education_records.map((record, index) => (
                <DynamicCard
                  key={index}
                  title={`Education ${index + 1}`}
                  onRemove={() => removeEducation(index)}
                >
                  <Field
                    label="Level"
                    value={record.level}
                    onChange={(e) =>
                      handleEducationChange(index, "level", e.target.value)
                    }
                    name={`education_level_${index}`}
                  />
                  <Field
                    label="Institution"
                    value={record.institution}
                    onChange={(e) =>
                      handleEducationChange(
                        index,
                        "institution",
                        e.target.value,
                      )
                    }
                    name={`education_institution_${index}`}
                  />
                  <Field
                    label="Degree / Course"
                    value={record.degree}
                    onChange={(e) =>
                      handleEducationChange(index, "degree", e.target.value)
                    }
                    name={`education_degree_${index}`}
                  />
                  <Field
                    label="Year From"
                    value={record.year_from}
                    onChange={(e) =>
                      handleEducationChange(index, "year_from", e.target.value)
                    }
                    name={`education_year_from_${index}`}
                  />
                  <Field
                    label="Year To"
                    value={record.year_to}
                    onChange={(e) =>
                      handleEducationChange(index, "year_to", e.target.value)
                    }
                    name={`education_year_to_${index}`}
                  />
                  <Field
                    label="Skills"
                    value={record.skills}
                    onChange={(e) =>
                      handleEducationChange(index, "skills", e.target.value)
                    }
                    name={`education_skills_${index}`}
                  />
                </DynamicCard>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Employment History
            </h2>
            <button
              type="button"
              onClick={addEmployment}
              className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Employment
            </button>
          </div>

          <div className="space-y-4">
            {form.employment_history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No employment history yet.
              </div>
            ) : (
              form.employment_history.map((record, index) => (
                <DynamicCard
                  key={index}
                  title={`Employment ${index + 1}`}
                  onRemove={() => removeEmployment(index)}
                >
                  <Field
                    label="Company Name"
                    value={record.company_name}
                    onChange={(e) =>
                      handleEmploymentChange(
                        index,
                        "company_name",
                        e.target.value,
                      )
                    }
                    name={`employment_company_${index}`}
                  />
                  <Field
                    label="Position"
                    value={record.position}
                    onChange={(e) =>
                      handleEmploymentChange(index, "position", e.target.value)
                    }
                    name={`employment_position_${index}`}
                  />
                  <Field
                    label="Date From"
                    value={record.date_from}
                    onChange={(e) =>
                      handleEmploymentChange(index, "date_from", e.target.value)
                    }
                    name={`employment_date_from_${index}`}
                    type="date"
                  />
                  <Field
                    label="Date To"
                    value={record.date_to}
                    onChange={(e) =>
                      handleEmploymentChange(index, "date_to", e.target.value)
                    }
                    name={`employment_date_to_${index}`}
                    type="date"
                  />
                </DynamicCard>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">References</h2>
            <button
              type="button"
              onClick={addReference}
              className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Reference
            </button>
          </div>

          <div className="space-y-4">
            {form.references.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No references yet.
              </div>
            ) : (
              form.references.map((record, index) => (
                <DynamicCard
                  key={index}
                  title={`Reference ${index + 1}`}
                  onRemove={() => removeReference(index)}
                >
                  <Field
                    label="Name"
                    value={record.name}
                    onChange={(e) =>
                      handleReferenceChange(index, "name", e.target.value)
                    }
                    name={`reference_name_${index}`}
                  />
                  <Field
                    label="Occupation"
                    value={record.occupation}
                    onChange={(e) =>
                      handleReferenceChange(index, "occupation", e.target.value)
                    }
                    name={`reference_occupation_${index}`}
                  />
                  <Field
                    label="Address"
                    value={record.address}
                    onChange={(e) =>
                      handleReferenceChange(index, "address", e.target.value)
                    }
                    name={`reference_address_${index}`}
                  />
                  <Field
                    label="Contact"
                    value={record.contact}
                    onChange={(e) =>
                      handleReferenceChange(index, "contact", e.target.value)
                    }
                    name={`reference_contact_${index}`}
                  />
                </DynamicCard>
              ))
            )}
          </div>
        </div>

        <Section title="Government Information">
          <Field
            label="SSS Number"
            name="sss"
            value={form.sss}
            onChange={handleChange}
          />
          <Field
            label="PhilHealth Number"
            name="philhealth"
            value={form.philhealth}
            onChange={handleChange}
          />
          <Field
            label="Pag-IBIG Number"
            name="pagibig"
            value={form.pagibig}
            onChange={handleChange}
          />
          <Field
            label="TIN Number"
            name="tin"
            value={form.tin}
            onChange={handleChange}
          />
        </Section>

        <div className="flex flex-col justify-end gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || submitting}
            className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Form"}
          </button>
        </div>
      </div>
    </div>
  );
}
