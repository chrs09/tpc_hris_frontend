export default function EmployeeMobileCard({ employee, onView }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-5 w-full">
      <div className="mb-4">
        <p className="font-semibold text-fg text-base">
          {employee.first_name} {employee.last_name}
        </p>

        <p className="text-sm text-fg-subtle">{employee.department}</p>

        <p className="text-sm text-fg-subtle">{employee.position}</p>
      </div>

      <button
        onClick={() => onView(employee.id)}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl"
      >
        View Profile
      </button>
    </div>
  );
}
