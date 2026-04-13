import {
  isValidPagibig,
  isValidPhilHealth,
  isValidSSS,
  isValidTIN,
} from "./formatters";

export function validateStepData(step, form, questions, questionResponses) {
  const errors = {};
  const questionErrors = {};

  if (step === 1) {
    if (!form.first_name.trim()) errors.first_name = "First name is required.";
    if (!form.last_name.trim()) errors.last_name = "Last name is required.";

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!form.position.trim()) {
      errors.position = "Position is required.";
    }
  }

  if (step === 2) {
    if (!form.birthday) errors.birthday = "Birthday is required.";
    if (!form.birthplace.trim()) errors.birthplace = "Birthplace is required.";
    if (!form.gender.trim()) errors.gender = "Gender is required.";
    if (!form.civil_status.trim()) errors.civil_status = "Civil status is required.";
    if (!form.religion.trim()) errors.religion = "Religion is required.";
    if (!form.citizenship.trim()) errors.citizenship = "Citizenship is required.";
    if (!form.height.trim()) errors.height = "Height is required.";
    if (!form.weight.trim()) errors.weight = "Weight is required.";
    if (!form.language.trim()) errors.language = "Language is required.";

    if (!form.contact_number.trim()) {
      errors.contact_number = "Contact number is required.";
    } else if (!/^[0-9+\-\s()]{7,20}$/.test(form.contact_number)) {
      errors.contact_number = "Enter a valid contact number.";
    }

    if (!form.current_address.trim()) {
      errors.current_address = "Current address is required.";
    }

    if (!form.provincial_address.trim()) {
      errors.provincial_address = "Provincial address is required.";
    }
  }

  if (step === 4) {
    if (!form.emergency_contact_name.trim()) {
      errors.emergency_contact_name = "Emergency contact name is required.";
    }
    if (!form.emergency_contact_number.trim()) {
      errors.emergency_contact_number = "Emergency contact number is required.";
    }
    if (!form.emergency_relationship.trim()) {
      errors.emergency_relationship = "Relationship is required.";
    }
  }

  if (step === 5) {
    form.education_records.forEach((record, index) => {
      if (!`${record.level || ""}`.trim()) {
        errors[`education_records.${index}.level`] = "Level is required.";
      }
      if (!`${record.institution || ""}`.trim()) {
        errors[`education_records.${index}.institution`] =
          "Institution is required.";
      }
      if (!`${record.degree || ""}`.trim()) {
        errors[`education_records.${index}.degree`] =
          "Degree / Course is required.";
      }
      if (!`${record.year_from || ""}`.trim()) {
        errors[`education_records.${index}.year_from`] =
          "Year from is required.";
      }
      if (!`${record.year_to || ""}`.trim()) {
        errors[`education_records.${index}.year_to`] = "Year to is required.";
      }
    });
  }

  if (step === 6) {
    form.employment_history.forEach((record, index) => {
      if (!`${record.company_name || ""}`.trim()) {
        errors[`employment_history.${index}.company_name`] =
          "Company name is required.";
      }
      if (!`${record.position || ""}`.trim()) {
        errors[`employment_history.${index}.position`] = "Position is required.";
      }
      if (!`${record.date_from || ""}`.trim()) {
        errors[`employment_history.${index}.date_from`] =
          "Date from is required.";
      }
      if (!`${record.date_to || ""}`.trim()) {
        errors[`employment_history.${index}.date_to`] = "Date to is required.";
      }
    });
  }

  if (step === 7) {
    if (!`${form.expected_salary || ""}`.trim()) {
      errors.expected_salary = "Expected salary is required.";
    }
    if (!`${form.salary_type || ""}`.trim()) {
      errors.salary_type = "Salary type is required.";
    }
  }

  if (step === 8) {
    if (form.references.length > 3) {
      errors.references = "Only up to 3 character references are allowed.";
    }

    form.references.forEach((record, index) => {
      if (!`${record.name || ""}`.trim()) {
        errors[`references.${index}.name`] = "Name is required.";
      }
      if (!`${record.occupation || ""}`.trim()) {
        errors[`references.${index}.occupation`] = "Occupation is required.";
      }
      if (!`${record.address || ""}`.trim()) {
        errors[`references.${index}.address`] = "Address is required.";
      }
      if (!`${record.contact || ""}`.trim()) {
        errors[`references.${index}.contact`] = "Contact is required.";
      }
    });
  }

  if (step === 9) {
    if (!form.sss.trim()) {
      errors.sss = "SSS number is required.";
    } else if (!isValidSSS(form.sss)) {
      errors.sss = "SSS format must be 12-3456789-0";
    }

    if (!form.philhealth.trim()) {
      errors.philhealth = "PhilHealth number is required.";
    } else if (!isValidPhilHealth(form.philhealth)) {
      errors.philhealth = "PhilHealth format must be 12-345678901-2";
    }

    if (!form.pagibig.trim()) {
      errors.pagibig = "Pag-IBIG number is required.";
    } else if (!isValidPagibig(form.pagibig)) {
      errors.pagibig = "Pag-IBIG format must be 1234-5678-9012";
    }

    if (!form.tin.trim()) {
      errors.tin = "TIN number is required.";
    } else if (!isValidTIN(form.tin)) {
      errors.tin = "TIN format must be 123-456-789 or 123-456-789-000";
    }
  }

  if (step === 10) {
    questions.forEach((q) => {
      const value = questionResponses[q.question_key];

      const shouldHide =
        q.depends_on_question_key &&
        questionResponses[q.depends_on_question_key] !== q.depends_on_value;

      if (shouldHide) return;

      if (q.is_required && !value?.toString().trim()) {
        questionErrors[q.question_key] = `${q.question_text} is required.`;
      }
    });
  }

  return { errors, questionErrors };
}