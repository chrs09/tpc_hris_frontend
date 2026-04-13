import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getApplicantOnboarding,
  saveApplicantOnboarding,
  submitApplicantOnboarding,
} from "../../api/applicantOnboarding";

import Field from "../../components/onboarding/Field";
import SectionCard from "../../components/onboarding/SectionCard";
import DynamicListSection from "../../components/onboarding/DynamicListSection";
import ProgressSteps from "../../components/onboarding/ProgressSteps";

import {
  backendFieldLabelMap,
  civilStatusOptions,
  emptyEducation,
  emptyEmployment,
  emptyReference,
  genderOptions,
  initialForm,
  salaryTypeOptions,
  stepConfig,
} from "../../utils/onboarding/constants";

import {
  formatMoney,
  formatPagibig,
  formatPhilHealth,
  formatSSS,
  formatTIN,
} from "../../utils/onboarding/formatters";

import {
  buildPayload,
  buildQuestionResponseMap,
  extractBackendFieldErrors,
  formatBackendValidation,
  mapApiDataToForm,
} from "../../utils/onboarding/helpers";

import { validateStepData } from "../../utils/onboarding/validation";

function SubmissionSuccessScreen({ applicant, submittedAt }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Your Onboarding Form is Saved Successfully
            </h1>
            <p className="mt-3 text-base text-gray-600">
              Thank you. Your onboarding form has already been submitted and is
              now under review.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Applicant:</span>{" "}
              {applicant?.first_name} {applicant?.last_name}
            </p>
            <p className="mt-2">
              <span className="font-semibold">Applied Position:</span>{" "}
              {applicant?.position_applied || "-"}
            </p>
            <p className="mt-2">
              <span className="font-semibold">Status:</span> Submitted
            </p>
            <p className="mt-2">
              <span className="font-semibold">Submitted At:</span>{" "}
              {submittedAt
                ? new Date(submittedAt).toLocaleString()
                : applicant?.onboarding_submitted_at
                  ? new Date(applicant.onboarding_submitted_at).toLocaleString()
                  : "-"}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            You do not need to fill out this form again unless the HR team asks
            you to update your details.
          </div>
        </div>
      </div>
    </div>
  );
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

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);

  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getApplicantOnboarding(token);

      setApplicant(data.applicant || null);
      setForm(mapApiDataToForm(data));
      setQuestions(data.questions || []);
      setQuestionResponses(
        buildQuestionResponseMap(data.question_responses || []),
      );

      const submitted = Boolean(data?.onboarding?.is_submitted);
      setIsSubmitted(submitted);
      setSubmittedAt(data?.onboarding?.submitted_at || null);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = formatBackendValidation(detail, backendFieldLabelMap);

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadForm();
  }, [token, loadForm]);

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
    } else if (name === "current_salary" || name === "expected_salary") {
      formattedValue = formatMoney(value);
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

  const updateArrayField = (arrayKey, index, field, value) => {
    setForm((prev) => {
      const updated = [...prev[arrayKey]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [arrayKey]: updated };
    });

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`${arrayKey}.${index}.${field}`];
      delete updated[arrayKey];
      return updated;
    });
  };

  const addArrayItem = (arrayKey, emptyItem, maxItems = null) => {
    setForm((prev) => {
      if (maxItems && prev[arrayKey].length >= maxItems) return prev;

      return {
        ...prev,
        [arrayKey]: [...prev[arrayKey], { ...emptyItem }],
      };
    });
  };

  const removeArrayItem = (arrayKey, index) => {
    setForm((prev) => {
      if (prev[arrayKey].length === 1) return prev;

      return {
        ...prev,
        [arrayKey]: prev[arrayKey].filter((_, i) => i !== index),
      };
    });
  };

  const validateCurrentStep = () => {
    const { errors: stepErrors, questionErrors: stepQuestionErrors } =
      validateStepData(step, form, questions, questionResponses);

    setErrors((prev) => ({ ...prev, ...stepErrors }));
    setQuestionErrors(stepQuestionErrors);

    return (
      Object.keys(stepErrors).length === 0 &&
      Object.keys(stepQuestionErrors).length === 0
    );
  };

  const validateAllSteps = () => {
    let mergedErrors = {};
    let mergedQuestionErrors = {};

    for (let i = 1; i <= stepConfig.length; i += 1) {
      const { errors: stepErrors, questionErrors: stepQuestionErrors } =
        validateStepData(i, form, questions, questionResponses);

      mergedErrors = { ...mergedErrors, ...stepErrors };
      mergedQuestionErrors = { ...mergedQuestionErrors, ...stepQuestionErrors };
    }

    setErrors(mergedErrors);
    setQuestionErrors(mergedQuestionErrors);

    return (
      Object.keys(mergedErrors).length === 0 &&
      Object.keys(mergedQuestionErrors).length === 0
    );
  };

  const handleSave = async (showSuccessToastMessage = true) => {
    try {
      setSaving(true);
      setError("");

      await saveApplicantOnboarding(
        token,
        buildPayload(form, questionResponses),
      );

      if (showSuccessToastMessage) {
        toast.success("Form saved successfully.");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = formatBackendValidation(detail, backendFieldLabelMap);
      const backendErrors = extractBackendFieldErrors(detail);

      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }));
      }

      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const isValid = validateCurrentStep();

    if (!isValid) {
      setError("Please complete the required fields before continuing.");
      toast.error("Please fill the highlighted fields first.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      await handleSave(false);
      setError("");
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      //
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
      toast.error("Please fill the highlighted fields first.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await saveApplicantOnboarding(
        token,
        buildPayload(form, questionResponses),
      );

      const submitResponse = await submitApplicantOnboarding(token);

      setIsSubmitted(true);
      setSubmittedAt(submitResponse?.submitted_at || new Date().toISOString());

      toast.success("Form submitted successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = formatBackendValidation(detail, backendFieldLabelMap);
      const backendErrors = extractBackendFieldErrors(detail);

      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }));
      }

      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const educationRenderer = useMemo(
    () => (index) => ({
      onRemove: () => removeArrayItem("education_records", index),
      content: (
        <>
          <Field
            label="Level"
            value={form.education_records[index].level}
            onChange={(e) =>
              updateArrayField(
                "education_records",
                index,
                "level",
                e.target.value,
              )
            }
            name={`education_level_${index}`}
            error={errors[`education_records.${index}.level`]}
            required
          />
          <Field
            label="Institution"
            value={form.education_records[index].institution}
            onChange={(e) =>
              updateArrayField(
                "education_records",
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
            value={form.education_records[index].degree}
            onChange={(e) =>
              updateArrayField(
                "education_records",
                index,
                "degree",
                e.target.value,
              )
            }
            name={`education_degree_${index}`}
            error={errors[`education_records.${index}.degree`]}
            required
          />
          <Field
            label="Year From"
            value={form.education_records[index].year_from}
            onChange={(e) =>
              updateArrayField(
                "education_records",
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
            value={form.education_records[index].year_to}
            onChange={(e) =>
              updateArrayField(
                "education_records",
                index,
                "year_to",
                e.target.value,
              )
            }
            name={`education_year_to_${index}`}
            error={errors[`education_records.${index}.year_to`]}
            required
          />
          <Field
            label="Skills"
            value={form.education_records[index].skills}
            onChange={(e) =>
              updateArrayField(
                "education_records",
                index,
                "skills",
                e.target.value,
              )
            }
            name={`education_skills_${index}`}
            error={errors[`education_records.${index}.skills`]}
          />
        </>
      ),
    }),
    [form.education_records, errors],
  );

  const employmentRenderer = useMemo(
    () => (index) => ({
      onRemove: () => removeArrayItem("employment_history", index),
      content: (
        <>
          <Field
            label="Company Name"
            value={form.employment_history[index].company_name}
            onChange={(e) =>
              updateArrayField(
                "employment_history",
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
            value={form.employment_history[index].position}
            onChange={(e) =>
              updateArrayField(
                "employment_history",
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
            type="date"
            value={form.employment_history[index].date_from}
            onChange={(e) =>
              updateArrayField(
                "employment_history",
                index,
                "date_from",
                e.target.value,
              )
            }
            name={`employment_date_from_${index}`}
            error={errors[`employment_history.${index}.date_from`]}
            required
          />
          <Field
            label="Date To"
            type="date"
            value={form.employment_history[index].date_to}
            onChange={(e) =>
              updateArrayField(
                "employment_history",
                index,
                "date_to",
                e.target.value,
              )
            }
            name={`employment_date_to_${index}`}
            error={errors[`employment_history.${index}.date_to`]}
            required
          />
        </>
      ),
    }),
    [form.employment_history, errors],
  );

  const referencesRenderer = useMemo(
    () => (index) => ({
      onRemove: () => removeArrayItem("references", index),
      content: (
        <>
          <Field
            label="Name"
            value={form.references[index].name}
            onChange={(e) =>
              updateArrayField("references", index, "name", e.target.value)
            }
            name={`reference_name_${index}`}
            error={errors[`references.${index}.name`]}
            required
          />
          <Field
            label="Occupation"
            value={form.references[index].occupation}
            onChange={(e) =>
              updateArrayField(
                "references",
                index,
                "occupation",
                e.target.value,
              )
            }
            name={`reference_occupation_${index}`}
            error={errors[`references.${index}.occupation`]}
            required
          />
          <Field
            label="Address"
            value={form.references[index].address}
            onChange={(e) =>
              updateArrayField("references", index, "address", e.target.value)
            }
            name={`reference_address_${index}`}
            error={errors[`references.${index}.address`]}
            required
          />
          <Field
            label="Contact"
            value={form.references[index].contact}
            onChange={(e) =>
              updateArrayField("references", index, "contact", e.target.value)
            }
            name={`reference_contact_${index}`}
            error={errors[`references.${index}.contact`]}
            required
          />
        </>
      ),
    }),
    [form.references, errors],
  );

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
        </div>

        <div className="space-y-5">
          {questions.map((q) => {
            const shouldHide =
              q.depends_on_question_key &&
              questionResponses[q.depends_on_question_key] !==
                q.depends_on_value;

            if (shouldHide) return null;

            let options = null;

            if (Array.isArray(q.options)) {
              options = q.options;
            } else if (typeof q.options === "string") {
              try {
                const parsed = JSON.parse(q.options);
                options = Array.isArray(parsed) ? parsed : null;
              } catch {
                options = null;
              }
            }

            return (
              <Field
                key={q.question_key}
                label={q.question_text}
                name={q.question_key}
                type={q.question_type || "text"}
                value={questionResponses[q.question_key] || ""}
                onChange={handleQuestionChange}
                options={options}
                placeholder={q.placeholder || ""}
                error={questionErrors[q.question_key]}
                required={q.is_required}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return (
          <SectionCard title="Basic Information">
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
              type="email"
              value={form.email}
              error={errors.email}
              required
              onChange={handleChange}
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
          </SectionCard>
        );

      case 2:
        return (
          <SectionCard title="Personal Information">
            <Field
              label="Birthday"
              name="birthday"
              type="date"
              value={form.birthday}
              error={errors.birthday}
              required
              onChange={handleChange}
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
          </SectionCard>
        );

      case 3:
        return (
          <SectionCard title="Family Information">
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
          </SectionCard>
        );

      case 4:
        return (
          <SectionCard title="Emergency Contact">
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
          </SectionCard>
        );

      case 5:
        return (
          <DynamicListSection
            title="Education"
            itemTitle="Education"
            addLabel="Add Education"
            items={form.education_records}
            onAdd={() => addArrayItem("education_records", emptyEducation)}
            renderItem={educationRenderer}
            error={errors.education_records}
          />
        );

      case 6:
        return (
          <DynamicListSection
            title="Employment History"
            itemTitle="Employment"
            addLabel="Add Employment"
            items={form.employment_history}
            onAdd={() => addArrayItem("employment_history", emptyEmployment)}
            renderItem={employmentRenderer}
            error={errors.employment_history}
          />
        );

      case 7:
        return (
          <SectionCard title="Salary Information">
            <Field
              label="Current Salary"
              name="current_salary"
              value={form.current_salary}
              error={errors.current_salary}
              onChange={handleChange}
              placeholder="e.g. 15,000"
            />
            <Field
              label="Expected Salary"
              name="expected_salary"
              value={form.expected_salary}
              error={errors.expected_salary}
              required
              onChange={handleChange}
              placeholder="e.g. 18,000"
            />
            <Field
              label="Salary Type"
              name="salary_type"
              value={form.salary_type}
              error={errors.salary_type}
              required
              onChange={handleChange}
              options={salaryTypeOptions}
            />
          </SectionCard>
        );

      case 8:
        return (
          <DynamicListSection
            title="Character References"
            itemTitle="Reference"
            addLabel="Add Reference"
            items={form.references}
            onAdd={() => addArrayItem("references", emptyReference, 3)}
            renderItem={referencesRenderer}
            error={errors.references}
            maxItems={3}
          />
        );

      case 9:
        return (
          <SectionCard title="Government Information">
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
          </SectionCard>
        );

      case 10:
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
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-600 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <SubmissionSuccessScreen
        applicant={applicant}
        submittedAt={submittedAt}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
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

        <ProgressSteps currentStep={step} steps={stepConfig} />

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
