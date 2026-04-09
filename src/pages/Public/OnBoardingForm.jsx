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

const stepConfig = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Personal Information" },
  { id: 3, title: "Family Information" },
  { id: 4, title: "Emergency Contact" },
  { id: 5, title: "Education" },
  { id: 6, title: "Employment History" },
  { id: 7, title: "References" },
  { id: 8, title: "Government Information" },
  { id: 9, title: "Additional Questions" },
];

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
  error = "",
  required = false,
}) {
  const isSelect = Array.isArray(options) && options.length > 0;

  const baseClass =
    "w-full rounded-2xl px-4 py-3 outline-none focus:ring-2 transition";
  const normalClass =
    "border border-gray-300 focus:border-black focus:ring-black/10";
  const errorClass =
    "border border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {isSelect ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className={`${baseClass} ${error ? errorClass : normalClass}`}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
          className={`${baseClass} resize-none ${error ? errorClass : normalClass}`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className={`${baseClass} ${error ? errorClass : normalClass}`}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
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
    <div className="fixed right-4 top-4 z-9999 w-full max-w-sm">
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

function ProgressSteps({ currentStep }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Progress</p>
          <h2 className="text-lg font-bold text-gray-900">
            Step {currentStep} of {stepConfig.length}
          </h2>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {stepConfig[currentStep - 1]?.title}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
        {stepConfig.map((step) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;

          return (
            <div key={step.id} className="space-y-2">
              <div
                className={`h-2 rounded-full ${
                  isDone || isActive ? "bg-black" : "bg-gray-200"
                }`}
              />
              <p
                className={`text-[11px] leading-tight ${
                  isActive ? "font-semibold text-black" : "text-gray-500"
                }`}
              >
                {step.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const digitsOnly = (value = "") => value.replace(/\D/g, "");

const formatSSS = (value = "") => {
  const digits = digitsOnly(value).slice(0, 10);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 9);
  const part3 = digits.slice(9, 10);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  return formatted;
};

const formatPhilHealth = (value = "") => {
  const digits = digitsOnly(value).slice(0, 12);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 11);
  const part3 = digits.slice(11, 12);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  return formatted;
};

const formatPagibig = (value = "") => {
  const digits = digitsOnly(value).slice(0, 12);
  const part1 = digits.slice(0, 4);
  const part2 = digits.slice(4, 8);
  const part3 = digits.slice(8, 12);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  return formatted;
};

const formatTIN = (value = "") => {
  const digits = digitsOnly(value).slice(0, 12);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 12);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  if (part4) formatted += `-${part4}`;
  return formatted;
};

const isValidSSS = (value = "") => /^\d{2}-\d{7}-\d{1}$/.test(value);
const isValidPhilHealth = (value = "") => /^\d{2}-\d{9}-\d{1}$/.test(value);
const isValidPagibig = (value = "") => /^\d{4}-\d{4}-\d{4}$/.test(value);
const isValidTIN = (value = "") => /^\d{3}-\d{3}-\d{3}(-\d{3})?$/.test(value);

const normalizeEmptyToNull = (value) => (value === "" ? null : value);

const backendFieldLabelMap = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  department: "Department",
  position: "Position",
  birthday: "Birthday",
  birthplace: "Birthplace",
  gender: "Gender",
  civil_status: "Civil status",
  religion: "Religion",
  citizenship: "Citizenship",
  height: "Height",
  weight: "Weight",
  language: "Language",
  contact_number: "Contact number",
  current_address: "Current address",
  provincial_address: "Provincial address",
  spouse_name: "Spouse name",
  father_name: "Father name",
  mother_name: "Mother name",
  emergency_contact_name: "Emergency contact name",
  emergency_contact_number: "Emergency contact number",
  emergency_relationship: "Emergency relationship",
  sss: "SSS number",
  philhealth: "PhilHealth number",
  pagibig: "Pag-IBIG number",
  tin: "TIN number",
};

function formatBackendValidation(detail) {
  if (!detail) return "Something went wrong.";

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = item?.loc?.[item.loc.length - 1];
        const fieldLabel = backendFieldLabelMap[field] || field || "Field";
        const msg = item?.msg || "Invalid input.";
        return `${fieldLabel}: ${msg}`;
      })
      .join(" | ");
  }

  if (typeof detail === "object") {
    if (detail.message && Array.isArray(detail.missing_fields)) {
      const missing = detail.missing_fields
        .map((field) => backendFieldLabelMap[field] || field)
        .join(", ");
      return `${detail.message} Missing: ${missing}`;
    }

    if (detail.message) return detail.message;
  }

  return "Something went wrong.";
}

function extractBackendFieldErrors(detail) {
  const fieldErrors = {};

  if (!Array.isArray(detail)) return fieldErrors;

  detail.forEach((item) => {
    const field = item?.loc?.[item.loc.length - 1];
    if (!field) return;

    fieldErrors[field] = item?.msg || "Invalid input.";
  });

  return fieldErrors;
}

function normalizePosition(value = "") {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function inferRoleFromPosition(position = "") {
  const normalized = normalizePosition(position);

  if (normalized.includes("helper")) return "helper";
  if (normalized.includes("driver")) return "driver";

  return "admin";
}

function getQuestionOptions(question) {
  if (question.question_type !== "select") return null;
  return ["Yes", "No"];
}

export default function OnBoardingForm() {
  const { token } = useParams();

  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [applicant, setApplicant] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const [questions, setQuestions] = useState([]);
  const [questionResponses, setQuestionResponses] = useState({});
  const [questionErrors, setQuestionErrors] = useState({});

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
        birthday: onboarding.birthday || "",
        sss: formatSSS(onboarding.sss || ""),
        philhealth: formatPhilHealth(onboarding.philhealth || ""),
        pagibig: formatPagibig(onboarding.pagibig || ""),
        tin: formatTIN(onboarding.tin || ""),
        education_records: data.education_records || [],
        employment_history:
          (data.employment_history || []).map((item) => ({
            ...item,
            date_from: item.date_from || "",
            date_to: item.date_to || "",
          })) || [],
        references: data.references || [],
      });

      setQuestions(data.questions || []);

      const initialResponses = {};
      (data.questions || []).forEach((question) => {
        initialResponses[question.question_key] = "";
      });

      (data.question_responses || []).forEach((response) => {
        if (response.question_key) {
          initialResponses[response.question_key] = response.answer_text || "";
        }
      });

      setQuestionResponses(initialResponses);
    } catch (err) {
      console.error("Failed to load onboarding form:", err);

      const detail = err?.response?.data?.detail;
      const message = formatBackendValidation(detail);

      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (token) loadForm();
  }, [token, loadForm]);

  const role = useMemo(() => {
    return inferRoleFromPosition(
      form.position || applicant?.position_applied || "",
    );
  }, [form.position, applicant]);

  const applicableQuestions = useMemo(() => {
    if (role === "helper") {
      return questions.filter((q) => q.question_key.startsWith("helper_"));
    }

    if (role === "driver") {
      return questions.filter(
        (q) =>
          !q.question_key.startsWith("helper_") &&
          !q.question_key.startsWith("admin_"),
      );
    }

    return questions.filter((q) => q.question_key.startsWith("admin_"));
  }, [questions, role]);

  const buildPayload = useCallback(() => {
    return {
      ...form,
      birthday: normalizeEmptyToNull(form.birthday),
      education_records: (form.education_records || []).map((record) => ({
        ...record,
        year_from: normalizeEmptyToNull(record.year_from),
        year_to: normalizeEmptyToNull(record.year_to),
      })),
      employment_history: (form.employment_history || []).map((record) => ({
        ...record,
        date_from: normalizeEmptyToNull(record.date_from),
        date_to: normalizeEmptyToNull(record.date_to),
      })),
      references: form.references || [],
      question_responses: applicableQuestions.map((question) => ({
        question_key: question.question_key,
        answer_text: questionResponses[question.question_key] || "",
      })),
    };
  }, [form, applicableQuestions, questionResponses]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    let formattedValue = value;

    if (name === "sss") {
      formattedValue = formatSSS(value);
    } else if (name === "philhealth") {
      formattedValue = formatPhilHealth(value);
    } else if (name === "pagibig") {
      formattedValue = formatPagibig(value);
    } else if (name === "tin") {
      formattedValue = formatTIN(value);
    }

    setForm((prev) => ({ ...prev, [name]: formattedValue }));

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;

    setQuestionResponses((prev) => ({
      ...prev,
      [name]: value,
    }));

    setQuestionErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  const handleEducationChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.education_records];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education_records: updated };
    });

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`education_records.${index}.${field}`];
      delete updated.education_records;
      return updated;
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

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`employment_history.${index}.${field}`];
      delete updated.employment_history;
      return updated;
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

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`references.${index}.${field}`];
      return updated;
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

  const validateQuestions = useCallback(() => {
    const newQuestionErrors = {};

    applicableQuestions.forEach((question) => {
      const rawValue = questionResponses[question.question_key];
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

      if (question.is_required && !value) {
        newQuestionErrors[question.question_key] =
          `${question.question_text} is required.`;
      }
    });

    return newQuestionErrors;
  }, [applicableQuestions, questionResponses]);

  const validateStep = (currentStep = step) => {
    const newErrors = {};
    let newQuestionErrors = {};

    if (currentStep === 1) {
      if (!form.first_name.trim())
        newErrors.first_name = "First name is required.";
      if (!form.last_name.trim())
        newErrors.last_name = "Last name is required.";

      if (!form.email.trim()) {
        newErrors.email = "Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        newErrors.email = "Enter a valid email address.";
      }

      if (!form.position.trim()) {
        newErrors.position = "Position is required.";
      }
    }

    if (currentStep === 2) {
      if (!form.birthday) newErrors.birthday = "Birthday is required.";
      if (!form.birthplace.trim())
        newErrors.birthplace = "Birthplace is required.";
      if (!form.gender.trim()) newErrors.gender = "Gender is required.";
      if (!form.civil_status.trim())
        newErrors.civil_status = "Civil status is required.";
      if (!form.religion.trim()) newErrors.religion = "Religion is required.";
      if (!form.citizenship.trim())
        newErrors.citizenship = "Citizenship is required.";
      if (!form.height.trim()) newErrors.height = "Height is required.";
      if (!form.weight.trim()) newErrors.weight = "Weight is required.";
      if (!form.language.trim()) newErrors.language = "Language is required.";

      if (!form.contact_number.trim()) {
        newErrors.contact_number = "Contact number is required.";
      } else if (!/^[0-9+\-\s()]{7,20}$/.test(form.contact_number)) {
        newErrors.contact_number = "Enter a valid contact number.";
      }

      if (!form.current_address.trim()) {
        newErrors.current_address = "Current address is required.";
      }
      if (!form.provincial_address.trim()) {
        newErrors.provincial_address = "Provincial address is required.";
      }
    }

    if (currentStep === 4) {
      if (!form.emergency_contact_name.trim()) {
        newErrors.emergency_contact_name =
          "Emergency contact name is required.";
      }
      if (!form.emergency_contact_number.trim()) {
        newErrors.emergency_contact_number =
          "Emergency contact number is required.";
      }
      if (!form.emergency_relationship.trim()) {
        newErrors.emergency_relationship = "Relationship is required.";
      }
    }

    if (currentStep === 5) {
      if (form.education_records.length === 0) {
        newErrors.education_records =
          "At least one education record is required.";
      } else {
        form.education_records.forEach((record, index) => {
          if (!`${record.level || ""}`.trim()) {
            newErrors[`education_records.${index}.level`] =
              "Level is required.";
          }
          if (!`${record.institution || ""}`.trim()) {
            newErrors[`education_records.${index}.institution`] =
              "Institution is required.";
          }
          if (!`${record.degree || ""}`.trim()) {
            newErrors[`education_records.${index}.degree`] =
              "Degree / Course is required.";
          }
          if (!`${record.year_from || ""}`.trim()) {
            newErrors[`education_records.${index}.year_from`] =
              "Year from is required.";
          }
          if (!`${record.year_to || ""}`.trim()) {
            newErrors[`education_records.${index}.year_to`] =
              "Year to is required.";
          }
        });
      }
    }

    if (currentStep === 6) {
      if (form.employment_history.length === 0) {
        newErrors.employment_history =
          "At least one employment history is required.";
      } else {
        form.employment_history.forEach((record, index) => {
          if (!`${record.company_name || ""}`.trim()) {
            newErrors[`employment_history.${index}.company_name`] =
              "Company name is required.";
          }
          if (!`${record.position || ""}`.trim()) {
            newErrors[`employment_history.${index}.position`] =
              "Position is required.";
          }
          if (!`${record.date_from || ""}`.trim()) {
            newErrors[`employment_history.${index}.date_from`] =
              "Date from is required.";
          }
          if (!`${record.date_to || ""}`.trim()) {
            newErrors[`employment_history.${index}.date_to`] =
              "Date to is required.";
          }
        });
      }
    }

    if (currentStep === 8) {
      if (!form.sss.trim()) {
        newErrors.sss = "SSS number is required.";
      } else if (!isValidSSS(form.sss)) {
        newErrors.sss = "SSS format must be 12-3456789-0";
      }

      if (!form.philhealth.trim()) {
        newErrors.philhealth = "PhilHealth number is required.";
      } else if (!isValidPhilHealth(form.philhealth)) {
        newErrors.philhealth = "PhilHealth format must be 12-345678901-2";
      }

      if (!form.pagibig.trim()) {
        newErrors.pagibig = "Pag-IBIG number is required.";
      } else if (!isValidPagibig(form.pagibig)) {
        newErrors.pagibig = "Pag-IBIG format must be 1234-5678-9012";
      }

      if (!form.tin.trim()) {
        newErrors.tin = "TIN number is required.";
      } else if (!isValidTIN(form.tin)) {
        newErrors.tin = "TIN format must be 123-456-789 or 123-456-789-000";
      }
    }

    if (currentStep === 9) {
      newQuestionErrors = validateQuestions();
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    setQuestionErrors(newQuestionErrors);

    return (
      Object.keys(newErrors).length === 0 &&
      Object.keys(newQuestionErrors).length === 0
    );
  };

  const validateAllSteps = () => {
    let isValid = true;
    let combinedErrors = {};

    for (let i = 1; i <= stepConfig.length; i += 1) {
      const tempErrors = {};

      if (i === 1) {
        if (!form.first_name.trim())
          tempErrors.first_name = "First name is required.";
        if (!form.last_name.trim())
          tempErrors.last_name = "Last name is required.";

        if (!form.email.trim()) {
          tempErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          tempErrors.email = "Enter a valid email address.";
        }

        if (!form.position.trim())
          tempErrors.position = "Position is required.";
      }

      if (i === 2) {
        if (!form.birthday) tempErrors.birthday = "Birthday is required.";
        if (!form.birthplace.trim())
          tempErrors.birthplace = "Birthplace is required.";
        if (!form.gender.trim()) tempErrors.gender = "Gender is required.";
        if (!form.civil_status.trim())
          tempErrors.civil_status = "Civil status is required.";
        if (!form.religion.trim())
          tempErrors.religion = "Religion is required.";
        if (!form.citizenship.trim())
          tempErrors.citizenship = "Citizenship is required.";
        if (!form.height.trim()) tempErrors.height = "Height is required.";
        if (!form.weight.trim()) tempErrors.weight = "Weight is required.";
        if (!form.language.trim())
          tempErrors.language = "Language is required.";

        if (!form.contact_number.trim()) {
          tempErrors.contact_number = "Contact number is required.";
        } else if (!/^[0-9+\-\s()]{7,20}$/.test(form.contact_number)) {
          tempErrors.contact_number = "Enter a valid contact number.";
        }

        if (!form.current_address.trim()) {
          tempErrors.current_address = "Current address is required.";
        }
        if (!form.provincial_address.trim()) {
          tempErrors.provincial_address = "Provincial address is required.";
        }
      }

      if (i === 4) {
        if (!form.emergency_contact_name.trim()) {
          tempErrors.emergency_contact_name =
            "Emergency contact name is required.";
        }
        if (!form.emergency_contact_number.trim()) {
          tempErrors.emergency_contact_number =
            "Emergency contact number is required.";
        }
        if (!form.emergency_relationship.trim()) {
          tempErrors.emergency_relationship = "Relationship is required.";
        }
      }

      if (i === 5) {
        if (form.education_records.length === 0) {
          tempErrors.education_records =
            "At least one education record is required.";
        } else {
          form.education_records.forEach((record, index) => {
            if (!`${record.level || ""}`.trim()) {
              tempErrors[`education_records.${index}.level`] =
                "Level is required.";
            }
            if (!`${record.institution || ""}`.trim()) {
              tempErrors[`education_records.${index}.institution`] =
                "Institution is required.";
            }
            if (!`${record.degree || ""}`.trim()) {
              tempErrors[`education_records.${index}.degree`] =
                "Degree / Course is required.";
            }
            if (!`${record.year_from || ""}`.trim()) {
              tempErrors[`education_records.${index}.year_from`] =
                "Year from is required.";
            }
            if (!`${record.year_to || ""}`.trim()) {
              tempErrors[`education_records.${index}.year_to`] =
                "Year to is required.";
            }
          });
        }
      }

      if (i === 6) {
        if (form.employment_history.length === 0) {
          tempErrors.employment_history =
            "At least one employment history is required.";
        } else {
          form.employment_history.forEach((record, index) => {
            if (!`${record.company_name || ""}`.trim()) {
              tempErrors[`employment_history.${index}.company_name`] =
                "Company name is required.";
            }
            if (!`${record.position || ""}`.trim()) {
              tempErrors[`employment_history.${index}.position`] =
                "Position is required.";
            }
            if (!`${record.date_from || ""}`.trim()) {
              tempErrors[`employment_history.${index}.date_from`] =
                "Date from is required.";
            }
            if (!`${record.date_to || ""}`.trim()) {
              tempErrors[`employment_history.${index}.date_to`] =
                "Date to is required.";
            }
          });
        }
      }

      if (i === 8) {
        if (!form.sss.trim()) {
          tempErrors.sss = "SSS number is required.";
        } else if (!isValidSSS(form.sss)) {
          tempErrors.sss = "SSS format must be 12-3456789-0";
        }

        if (!form.philhealth.trim()) {
          tempErrors.philhealth = "PhilHealth number is required.";
        } else if (!isValidPhilHealth(form.philhealth)) {
          tempErrors.philhealth = "PhilHealth format must be 12-345678901-2";
        }

        if (!form.pagibig.trim()) {
          tempErrors.pagibig = "Pag-IBIG number is required.";
        } else if (!isValidPagibig(form.pagibig)) {
          tempErrors.pagibig = "Pag-IBIG format must be 1234-5678-9012";
        }

        if (!form.tin.trim()) {
          tempErrors.tin = "TIN number is required.";
        } else if (!isValidTIN(form.tin)) {
          tempErrors.tin = "TIN format must be 123-456-789 or 123-456-789-000";
        }
      }

      if (Object.keys(tempErrors).length > 0) {
        isValid = false;
      }

      combinedErrors = { ...combinedErrors, ...tempErrors };
    }

    const combinedQuestionErrors = validateQuestions();

    if (Object.keys(combinedQuestionErrors).length > 0) {
      isValid = false;
    }

    setErrors(combinedErrors);
    setQuestionErrors(combinedQuestionErrors);

    return isValid;
  };

  const handleSave = async (showSuccessToast = true) => {
    try {
      setSaving(true);
      setError("");

      await saveApplicantOnboarding(token, buildPayload());

      if (showSuccessToast) {
        showToast("Form saved successfully.", "success");
      }
    } catch (err) {
      console.error("Failed to save onboarding form:", err);

      const detail = err?.response?.data?.detail;
      const message = formatBackendValidation(detail);
      const backendErrors = extractBackendFieldErrors(detail);

      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }));
      }

      setError(message);
      showToast(message, "error");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const isValid = validateStep(step);

    if (!isValid) {
      setError("Please complete the required fields before continuing.");
      showToast("Please fill the highlighted fields first.", "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      await handleSave(false);
      setError("");
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // error handled in handleSave
    }
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const isValid = validateAllSteps();

    if (!isValid) {
      setError("Please complete all required fields.");
      showToast("Please fill the highlighted fields first.", "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await saveApplicantOnboarding(token, buildPayload());
      await submitApplicantOnboarding(token);
      await loadForm();

      showToast("Form submitted successfully.", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to submit onboarding form:", err);

      const detail = err?.response?.data?.detail;
      const message = formatBackendValidation(detail);
      const backendErrors = extractBackendFieldErrors(detail);

      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }));
      }

      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionsStep = () => {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            Additional Questions
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Please answer the questions below before submitting your form.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Question set for:{" "}
            <span className="font-semibold capitalize text-gray-700">
              {role}
            </span>
          </p>
        </div>

        <div className="space-y-5">
          {applicableQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              No additional questions available for this position.
            </div>
          ) : (
            applicableQuestions.map((question) => (
              <Field
                key={question.id}
                label={question.question_text}
                name={question.question_key}
                type={question.question_type}
                value={questionResponses[question.question_key] || ""}
                onChange={handleQuestionChange}
                options={getQuestionOptions(question)}
                error={questionErrors[question.question_key]}
                required={question.is_required}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return (
          <Section title="Basic Information">
            <Field
              label="First Name"
              name="first_name"
              value={form.first_name}
              error={errors.first_name}
              required
              onChange={handleChange}
            />
            <Field
              label="Last Name"
              name="last_name"
              value={form.last_name}
              error={errors.last_name}
              required
              onChange={handleChange}
            />
            <Field
              label="Email"
              name="email"
              value={form.email}
              error={errors.email}
              required
              onChange={handleChange}
              type="email"
            />
            <Field
              label="Department"
              name="department"
              value={form.department}
              error={errors.department}
              onChange={handleChange}
            />
            <Field
              label="Position"
              name="position"
              value={form.position}
              error={errors.position}
              required
              onChange={handleChange}
            />
          </Section>
        );

      case 2:
        return (
          <Section title="Personal Information">
            <Field
              label="Birthday"
              name="birthday"
              value={form.birthday}
              error={errors.birthday}
              required
              onChange={handleChange}
              type="date"
            />
            <Field
              label="Birthplace"
              name="birthplace"
              value={form.birthplace}
              error={errors.birthplace}
              required
              onChange={handleChange}
            />
            <Field
              label="Gender"
              name="gender"
              value={form.gender}
              error={errors.gender}
              required
              onChange={handleChange}
              options={genderOptions}
            />
            <Field
              label="Civil Status"
              name="civil_status"
              value={form.civil_status}
              error={errors.civil_status}
              required
              onChange={handleChange}
              options={civilStatusOptions}
            />
            <Field
              label="Religion"
              name="religion"
              value={form.religion}
              error={errors.religion}
              required
              onChange={handleChange}
            />
            <Field
              label="Citizenship"
              name="citizenship"
              value={form.citizenship}
              error={errors.citizenship}
              required
              onChange={handleChange}
            />
            <Field
              label="Height"
              name="height"
              value={form.height}
              error={errors.height}
              required
              onChange={handleChange}
            />
            <Field
              label="Weight"
              name="weight"
              value={form.weight}
              error={errors.weight}
              required
              onChange={handleChange}
            />
            <Field
              label="Language"
              name="language"
              value={form.language}
              error={errors.language}
              required
              onChange={handleChange}
            />
            <Field
              label="Contact Number"
              name="contact_number"
              value={form.contact_number}
              error={errors.contact_number}
              required
              onChange={handleChange}
            />
            <Field
              label="Current Address"
              name="current_address"
              value={form.current_address}
              error={errors.current_address}
              required
              onChange={handleChange}
            />
            <Field
              label="Provincial Address"
              name="provincial_address"
              value={form.provincial_address}
              error={errors.provincial_address}
              required
              onChange={handleChange}
            />
          </Section>
        );

      case 3:
        return (
          <Section title="Family Information">
            <Field
              label="Spouse Name"
              name="spouse_name"
              value={form.spouse_name}
              error={errors.spouse_name}
              onChange={handleChange}
            />
            <Field
              label="Father Name"
              name="father_name"
              value={form.father_name}
              error={errors.father_name}
              onChange={handleChange}
            />
            <Field
              label="Mother Name"
              name="mother_name"
              value={form.mother_name}
              error={errors.mother_name}
              onChange={handleChange}
            />
          </Section>
        );

      case 4:
        return (
          <Section title="Emergency Contact">
            <Field
              label="Emergency Contact Name"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              error={errors.emergency_contact_name}
              required
              onChange={handleChange}
            />
            <Field
              label="Emergency Contact Number"
              name="emergency_contact_number"
              value={form.emergency_contact_number}
              error={errors.emergency_contact_number}
              required
              onChange={handleChange}
            />
            <Field
              label="Relationship"
              name="emergency_relationship"
              value={form.emergency_relationship}
              error={errors.emergency_relationship}
              required
              onChange={handleChange}
            />
          </Section>
        );

      case 5:
        return (
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
                <div
                  className={`rounded-2xl border border-dashed p-4 text-sm ${
                    errors.education_records
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-gray-300 bg-gray-50 text-gray-500"
                  }`}
                >
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
                      error={errors[`education_records.${index}.level`]}
                      required
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
                      error={errors[`education_records.${index}.institution`]}
                      required
                    />
                    <Field
                      label="Degree / Course"
                      value={record.degree}
                      onChange={(e) =>
                        handleEducationChange(index, "degree", e.target.value)
                      }
                      name={`education_degree_${index}`}
                      error={errors[`education_records.${index}.degree`]}
                      required
                    />
                    <Field
                      label="Year From"
                      value={record.year_from}
                      onChange={(e) =>
                        handleEducationChange(
                          index,
                          "year_from",
                          e.target.value,
                        )
                      }
                      name={`education_year_from_${index}`}
                      error={errors[`education_records.${index}.year_from`]}
                      required
                    />
                    <Field
                      label="Year To"
                      value={record.year_to}
                      onChange={(e) =>
                        handleEducationChange(index, "year_to", e.target.value)
                      }
                      name={`education_year_to_${index}`}
                      error={errors[`education_records.${index}.year_to`]}
                      required
                    />
                    <Field
                      label="Skills"
                      value={record.skills}
                      onChange={(e) =>
                        handleEducationChange(index, "skills", e.target.value)
                      }
                      name={`education_skills_${index}`}
                      error={errors[`education_records.${index}.skills`]}
                    />
                  </DynamicCard>
                ))
              )}
            </div>
          </div>
        );

      case 6:
        return (
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
                <div
                  className={`rounded-2xl border border-dashed p-4 text-sm ${
                    errors.employment_history
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-gray-300 bg-gray-50 text-gray-500"
                  }`}
                >
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
                      error={errors[`employment_history.${index}.company_name`]}
                      required
                    />
                    <Field
                      label="Position"
                      value={record.position}
                      onChange={(e) =>
                        handleEmploymentChange(
                          index,
                          "position",
                          e.target.value,
                        )
                      }
                      name={`employment_position_${index}`}
                      error={errors[`employment_history.${index}.position`]}
                      required
                    />
                    <Field
                      label="Date From"
                      value={record.date_from}
                      onChange={(e) =>
                        handleEmploymentChange(
                          index,
                          "date_from",
                          e.target.value,
                        )
                      }
                      name={`employment_date_from_${index}`}
                      error={errors[`employment_history.${index}.date_from`]}
                      required
                      type="date"
                    />
                    <Field
                      label="Date To"
                      value={record.date_to}
                      onChange={(e) =>
                        handleEmploymentChange(index, "date_to", e.target.value)
                      }
                      name={`employment_date_to_${index}`}
                      error={errors[`employment_history.${index}.date_to`]}
                      required
                      type="date"
                    />
                  </DynamicCard>
                ))
              )}
            </div>
          </div>
        );

      case 7:
        return (
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
                        handleReferenceChange(
                          index,
                          "occupation",
                          e.target.value,
                        )
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
        );

      case 8:
        return (
          <Section title="Government Information">
            <Field
              label="SSS Number"
              name="sss"
              value={form.sss}
              onChange={handleChange}
              error={errors.sss}
              required
            />
            <Field
              label="PhilHealth Number"
              name="philhealth"
              value={form.philhealth}
              onChange={handleChange}
              error={errors.philhealth}
              required
            />
            <Field
              label="Pag-IBIG Number"
              name="pagibig"
              value={form.pagibig}
              onChange={handleChange}
              error={errors.pagibig}
              required
            />
            <Field
              label="TIN Number"
              name="tin"
              value={form.tin}
              onChange={handleChange}
              error={errors.tin}
              required
            />
          </Section>
        );

      case 9:
        return renderQuestionsStep();

      default:
        return null;
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

        <ProgressSteps currentStep={step} />

        {renderCurrentStep()}

        <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || saving || submitting}
              className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || submitting}
              className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {step < stepConfig.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving || submitting}
                className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || submitting}
                className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Form"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
