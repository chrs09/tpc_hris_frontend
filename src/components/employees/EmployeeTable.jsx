import EmployeeRow from "./EmployeeRow";

export default function EmployeeTable({ employees, onView }) {
  return (
    <div className="hidden md:block bg-[#d4d4d4] rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-[#2b2b2b] text-white text-sm">
          <tr>
            <th className="px-6 py-4">Employee</th>
            <th className="px-6 py-4">Department</th>
            <th className="px-6 py-4">Position</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {employees.map((employee) => (
            <EmployeeRow
              key={employee.id}
              employee={employee}
              onView={onView}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}