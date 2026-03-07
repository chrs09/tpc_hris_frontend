import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button/Button";
import { getEmployeeList } from "../../api/employee";
import { createUser, updateUser } from "../../api/users";

const UserDrawer = ({
  isOpen,
  onClose,
  editingUser,
  refreshUsers,
  setGeneratedCredentials,
}) => {
  const isEditMode = !!editingUser;

  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("driver");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && !isEditMode) {
      fetchEmployees();
    }
  }, [isOpen, isEditMode]);

  useEffect(() => {
    if (editingUser) {
      setRole(editingUser.role);
      setIsActive(editingUser.is_active);
    } else {
      setRole("driver");
      setEmployeeId("");
      setIsActive(true);
    }
  }, [editingUser]);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployeeList();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEditMode) {
        await updateUser(editingUser.id, {
          role,
          is_active: isActive,
        });
      } else {
        const response = await createUser({
          employee_id: parseInt(employeeId),
          role,
        });
        setGeneratedCredentials(response);
      }

      await refreshUsers();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50">
      <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-white shadow-lg p-6 overflow-y-auto">
        <h3 className="text-xl font-bold mb-6">
          {isEditMode ? "Edit User" : "Create User"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isEditMode && (
            <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
              <div>
                <p className="text-xs text-gray-500">Username</p>
                <p className="font-semibold">{editingUser.username}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-700">{editingUser.email}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                      isActive ? "bg-green-400" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        isActive ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isEditMode && (
            <div>
              <label className="block text-sm mb-1">Select Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full border rounded-lg p-2"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="admin">Admin</option>
              <option value="driver">Driver</option>
              <option value="helper">Helper</option>
            </select>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 text-black"
            >
              {loading ? "Saving..." : isEditMode ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserDrawer;
