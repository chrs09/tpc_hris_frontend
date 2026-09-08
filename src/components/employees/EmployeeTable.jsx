import EmployeeRow from "./EmployeeRow";

export default function EmployeeTable({ employees, onView }) {
  return (
    <div className="hidden md:block bg-surface rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-fg text-background text-sm">
          <tr>
            <th className="px-6 py-4">Employee</th>
            <th className="px-6 py-4">Department</th>
            <th className="px-6 py-4">Position</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
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
