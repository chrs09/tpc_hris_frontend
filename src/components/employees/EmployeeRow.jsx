export default function EmployeeRow({ employee, onView }) {
  return (
    <tr className="hover:bg-[#b3b3b3] transition cursor-pointer">
      <td className="px-6 py-4 font-medium text-black">
        {employee.first_name} {employee.last_name}
      </td>

      <td className="px-6 py-4 text-black">{employee.department}</td>

      <td className="px-6 py-4 text-black">{employee.position}</td>

      <td className="px-6 py-4 text-right">
        <button
          onClick={() => onView(employee.id)}
          className="px-4 py-1.5 text-sm bg-[#2b2b2b] text-white rounded-lg hover:bg-[#494848] cursor-pointer transition"
        >
          View
        </button>
      </td>
    </tr>
  );
}
