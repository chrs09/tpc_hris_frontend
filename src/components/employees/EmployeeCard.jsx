import DefaultProfileImage from "../../assets/logo/default/default-profile.jpg";

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  return filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_API_URL}/${filePath}`;
};

export default function EmployeeCard({ employee, onView }) {
  const profileImage = employee?.files?.find(
    (file) => file.document_type === "PROFILE_IMAGE",
  )?.file_url;

  const imageSrc = profileImage
    ? getFileUrl(profileImage)
    : DefaultProfileImage;

  const fullName =
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

  const initials = `${employee.first_name?.[0] || ""}${
    employee.last_name?.[0] || ""
  }`;

  return (
    <button
      type="button"
      onClick={() => onView(employee.id)}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:bg-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 hover:cursor-pointer"
    >
      {/* TOP */}
      <div className="flex items-center gap-4">
        {/* IMAGE */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // fallback if image fails (important for old S3 broken files)
                e.target.style.display = "none";
                e.target.parentNode.innerText = initials || "?";
              }}
            />
          ) : (
            initials || "?"
          )}
        </div>

        {/* INFO */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[#2b2b2b] truncate capitalize">
            {fullName || "Unnamed Employee"}
          </h3>

          <p className="text-sm text-gray-500 truncate">
            {employee.position || "-"}
          </p>
        </div>
      </div>

      {/* TAGS */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
          {employee.department || "No Department"}
        </span>

        <span
          className={`text-xs px-2 py-1 rounded-lg ${
            employee.is_active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {employee.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* FOOTER */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-400 flex justify-between">
        <span>ID: {employee.id}</span>
        <span className="text-[#2b2b2b] font-medium">View →</span>
      </div>
    </button>
  );
}
