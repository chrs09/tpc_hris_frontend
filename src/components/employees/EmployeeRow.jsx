export default function EmployeeRow({ employee, onView }) {
  return (
    <tr className="hover:bg-surface-hover transition cursor-pointer">
      <td className="px-6 py-4 font-medium text-fg capitalize">
        {employee.first_name} {employee.last_name}
      </td>

      <td className="px-6 py-4 text-fg capitalize">{employee.department}</td>

      <td className="px-6 py-4 text-fg capitalize">{employee.position}</td>

      <td className="px-6 py-4 text-right">
        <button
          onClick={() => onView(employee.id)}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover cursor-pointer transition"
        >
          View
        </button>
      </td>
    </tr>
  );
}
