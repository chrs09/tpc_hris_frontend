export default function EmployeeMobileCard({ employee, onView }) {
  return (
    <div className="bg-[#d4d4d4] rounded-2xl shadow-sm p-5 w-full">
      <div className="mb-4">
        <p className="font-semibold text-gray-800 text-base">
          {employee.first_name} {employee.last_name}
        </p>

        <p className="text-sm text-gray-500">{employee.department}</p>

        <p className="text-sm text-gray-500">{employee.position}</p>
      </div>

      <button
        onClick={() => onView(employee.id)}
        className="w-full py-2.5 bg-[#2b2b2b] text-white rounded-xl"
      >
        View Profile
      </button>
    </div>
  );
}
