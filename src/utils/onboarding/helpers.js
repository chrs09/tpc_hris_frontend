import {
  emptyEducation,
  emptyEmployment,
  emptyReference,
  initialForm,
} from "./constants";
import {
  formatPagibig,
  formatPhilHealth,
  formatSSS,
  formatTIN,
  unformatMoney,
} from "./formatters";

export const normalizeEmptyToNull = (value) => (value === "" ? null : value);

export function ensureMinimumItems(items, fallbackItem, minimum = 1) {
  const safeItems = Array.isArray(items) ? [...items] : [];

  while (safeItems.length < minimum) {
    safeItems.push({ ...fallbackItem });
  }

  return safeItems;
}

export function formatBackendValidation(detail, backendFieldLabelMap) {
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

export function extractBackendFieldErrors(detail) {
  const fieldErrors = {};

  if (!Array.isArray(detail)) return fieldErrors;

  detail.forEach((item) => {
    const field = item?.loc?.[item.loc.length - 1];
    if (!field) return;

    fieldErrors[field] = item?.msg || "Invalid input.";
  });

  return fieldErrors;
}

export function mapApiDataToForm(data) {
  const onboarding = data.onboarding || {};

  return {
    ...initialForm,
    ...onboarding,

    first_name: onboarding.first_name || data.applicant?.first_name || "",
    last_name: onboarding.last_name || data.applicant?.last_name || "",
    email: onboarding.email || data.applicant?.email || "",
    contact_number:
      onboarding.contact_number || data.applicant?.contact_number || "",
    position: onboarding.position || data.applicant?.position_applied || "",

    birthday: onboarding.birthday || "",

    current_salary: onboarding.current_salary || "",
    expected_salary: onboarding.expected_salary || "",
    salary_type: onboarding.salary_type || "",

    sss: formatSSS(onboarding.sss || ""),
    philhealth: formatPhilHealth(onboarding.philhealth || ""),
    pagibig: formatPagibig(onboarding.pagibig || ""),
    tin: formatTIN(onboarding.tin || ""),

    education_records: ensureMinimumItems(
      data.education_records || [],
      emptyEducation,
      1,
    ),

    employment_history: ensureMinimumItems(
      (data.employment_history || []).map((item) => ({
        ...item,
        date_from: item.date_from || "",
        date_to: item.date_to || "",
        reason_for_leaving: item.reason_for_leaving || "",
        salary_history: item.salary_history || "",
        salary_type: item.salary_type || "",
      })),
      emptyEmployment,
      1,
    ),

    references: ensureMinimumItems(
      (data.references || []).map((item) => ({
        ...item,
        position: item.position || "",
      })),
      emptyReference,
      2,
    ),
  };
}

export function buildPayload(form, questionResponses) {
  return {
    ...form,
    birthday: normalizeEmptyToNull(form.birthday),

    current_salary: normalizeEmptyToNull(unformatMoney(form.current_salary)),
    expected_salary: normalizeEmptyToNull(unformatMoney(form.expected_salary)),
    salary_type: normalizeEmptyToNull(form.salary_type),

    education_records: (form.education_records || []).map((record) => ({
      ...record,
      year_from: normalizeEmptyToNull(record.year_from),
      year_to: normalizeEmptyToNull(record.year_to),
    })),

    employment_history: (form.employment_history || []).map((record) => ({
      ...record,
      date_from: normalizeEmptyToNull(record.date_from),
      date_to: normalizeEmptyToNull(record.date_to),
      reason_for_leaving: normalizeEmptyToNull(record.reason_for_leaving),
      salary_history: normalizeEmptyToNull(
        unformatMoney(record.salary_history),
      ),
      salary_type: normalizeEmptyToNull(record.salary_type),
    })),

    references: (form.references || []).map((record) => ({
      ...record,
      name: normalizeEmptyToNull(record.name),
      position: normalizeEmptyToNull(record.position),
      address: normalizeEmptyToNull(record.address),
      contact: normalizeEmptyToNull(record.contact),
    })),

    question_responses: Object.keys(questionResponses).map((key) => ({
      question_key: key,
      answer_text: questionResponses[key] || null,
    })),
  };
}

export function buildQuestionResponseMap(questionResponses = []) {
  const responseMap = {};

  questionResponses.forEach((item) => {
    responseMap[item.question_key] = item.answer_text || "";
  });

  return responseMap;
}
