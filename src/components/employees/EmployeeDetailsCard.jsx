export default function EmployeeDetailsCard({ employee }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">
          {employee.first_name} {employee.last_name}
        </h2>
        <p className="text-gray-500">
          {employee.position} • {employee.department}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>
              <div>{employee.email}</div>
            </div>

            <div>
              <span className="text-gray-500">Date Hired:</span>
              <div>{employee.date_hired}</div>
            </div>
          </div>
        </div>

        <GovernmentBenefitsCard employee={employee} />
      </div>
    </div>
  );
}
