// utils/mapEmployee.js
export const mapEmployeeToForm = (employee) => {
  return {
    id: employee.id,

    // BASIC
    first_name: employee.first_name || "",
    last_name: employee.last_name || "",
    email: employee.email || "",
    position: employee.position || "",
    department: employee.department || "",
    date_hired: employee.date_hired?.slice(0, 10) || "",
    is_active: employee.is_active,

    // PERSONAL
    birthday: employee.personal_details?.birthday || "",
    birthplace: employee.personal_details?.birthplace || "",
    civil_status: employee.personal_details?.civil_status || "",
    gender: employee.personal_details?.gender || "",
    religion: employee.personal_details?.religion || "",
    citizenship: employee.personal_details?.citizenship || "",
    height: employee.personal_details?.height || "",
    weight: employee.personal_details?.weight || "",
    language: employee.personal_details?.language || "",
    contact_number: employee.personal_details?.contact_number || "",
    current_address: employee.personal_details?.current_address || "",
    provincial_address: employee.personal_details?.provincial_address || "",

    // FAMILY
    spouse: employee.family_details?.spouse_name || "",
    father_name: employee.family_details?.father_name || "",
    mother_name: employee.family_details?.mother_name || "",

    // REFERENCE
    ref_name: employee.character_reference?.name || "",
    ref_contact: employee.character_reference?.contact || "",
    ref_position: employee.character_reference?.position || "",
    ref_address: employee.character_reference?.address || "",

    // GOVERNMENT
    sss: employee.government_details?.sss_number || "",
    philhealth: employee.government_details?.philhealth_number || "",
    pagibig: employee.government_details?.pagibig_number || "",
    tin: employee.government_details?.tin_number || "",

    // EMERGENCY
    emergency_contact_name:
      employee.emergency_contacts?.[0]?.contact_name || "",
    emergency_contact_number:
      employee.emergency_contacts?.[0]?.contact_number || "",
    emergency_relationship:
      employee.emergency_contacts?.[0]?.relationship_type || "",

    education_records: employee.education_records || [],
    employment_history: employee.employment_history || [],

    inactive_reason: employee.inactive_record?.inactive_reason || "",
    inactive_date: employee.inactive_record?.inactive_date || "",
    inactive_remarks: employee.inactive_record?.inactive_remarks || "",

    // FILES
    profile_image:
      employee.documents?.find((d) => d.document_type === "profile_image")
        ?.file_path || "",
    resume:
      employee.documents?.find((d) => d.document_type === "resume")
        ?.file_path || "",
  };
};
