export const emptyEducation = {
  level: "",
  institution: "",
  degree: "",
  year_from: "",
  year_to: "",
  skills: "",
};

export const emptyEmployment = {
  company_name: "",
  position: "",
  date_from: "",
  date_to: "",
  reason_for_leaving: "",
  salary_history: "",
  salary_type: "",
};

export const emptyReference = {
  name: "",
  position: "",
  address: "",
  contact: "",
};

export const initialForm = {
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

  education_records: [{ ...emptyEducation }],
  employment_history: [{ ...emptyEmployment }],

  current_salary: "",
  expected_salary: "",
  salary_type: "",

  references: [{ ...emptyReference }],

  sss: "",
  philhealth: "",
  pagibig: "",
  tin: "",
};

export const stepConfig = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Personal Information" },
  { id: 3, title: "Family Information" },
  { id: 4, title: "Emergency Contact" },
  { id: 5, title: "Education" },
  { id: 6, title: "Employment History" },
  { id: 7, title: "Salary" },
  { id: 8, title: "References" },
  { id: 9, title: "Government Information" },
  { id: 10, title: "Additional Questions" },
];

export const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
export const civilStatusOptions = ["Single", "Married", "Widowed", "Separated"];
export const salaryTypeOptions = ["Monthly", "Semi-monthly", "Weekly", "Daily"];

export const backendFieldLabelMap = {
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
  current_salary: "Current salary",
  expected_salary: "Expected salary",
  salary_type: "Salary type",
  sss: "SSS number",
  philhealth: "PhilHealth number",
  pagibig: "Pag-IBIG number",
  tin: "TIN number",

  // ??
  "employment_history.company_name": "Employment company name",
  "employment_history.position": "Employment position",
  "employment_history.date_from": "Employment date from",
  "employment_history.date_to": "Employment date to",
  "employment_history.reason_for_leaving": "Reason for leaving",
  "employment_history.salary_history": "Salary history",
  "employment_history.salary_type": "Employment salary type",

  "references.name": "Reference name",
  "references.position": "Reference position",
  "references.address": "Reference address",
  "references.contact": "Reference contact",
};
