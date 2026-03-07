import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button/Button";
import { getUserList } from "../../api/users";
import UserDrawer from "../../components/users/UserDrawer";

const UsersPage = () => {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => {
    if (isSuperAdmin) fetchUsers();
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUserList();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-red-500 font-semibold">
        Access Denied. Superadmin only.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#023047]">User Management</h2>

        <Button
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
          onClick={() => {
            setEditingUser(null);
            setDrawerOpen(true);
          }}
        >
          + Create User
        </Button>
      </div>

      {/* ================= SUCCESS BANNER ================= */}
      {generatedCredentials && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">
          <div className="font-semibold mb-1">User Created Successfully</div>
          <div className="text-sm">
            Username: <strong>{generatedCredentials.username}</strong>
          </div>
          <div className="text-sm">
            Temporary Password:{" "}
            <strong>{generatedCredentials.temporary_password}</strong>
          </div>

          <button
            className="text-xs mt-2 underline"
            onClick={() => setGeneratedCredentials(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= USERS CONTAINER ================= */}
      <div className="bg-white rounded-2xl shadow-sm border">
        {/* ================= MOBILE VIEW ================= */}
        <div className="sm:hidden p-4 space-y-4">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading users...</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="border rounded-xl p-4 shadow-sm bg-gray-50"
              >
                <div className="mb-2">
                  <div className="font-semibold text-gray-800">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Role:</span>
                  <span className="capitalize font-medium">{user.role}</span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <Button
                  size="sm"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => {
                    setEditingUser(user);
                    setDrawerOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            ))
          )}
        </div>

        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden sm:block p-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading users...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 uppercase text-xs tracking-wide">
                <tr className="border-b">
                  <th className="py-3 text-left">User</th>
                  <th className="text-left">Role</th>
                  <th className="text-left">Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="py-3">
                      <div className="font-medium text-gray-800">
                        {user.username}
                      </div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </td>

                    <td className="capitalize text-gray-600">{user.role}</td>

                    <td>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="text-right">
                      <Button
                        size="sm"
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={() => {
                          setEditingUser(user);
                          setDrawerOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= DRAWER ================= */}
      <UserDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editingUser={editingUser}
        refreshUsers={fetchUsers}
        setGeneratedCredentials={setGeneratedCredentials}
      />
    </div>
  );
};

export default UsersPage;
