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

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

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

  // ================= FILTER =================
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / usersPerPage),
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-red-500 font-semibold">
        Access Denied. Superadmin only.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#2b2b2b]">User Management</h2>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search user..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded-lg px-3 py-2 w-48"
          />

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="driver">Driver</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <Button
            className="bg-[#2b2b2b] hover:bg-[#a09f9f] text-white"
            onClick={() => {
              setEditingUser(null);
              setDrawerOpen(true);
            }}
          >
            + Create User
          </Button>
        </div>
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
        {/* ================= MOBILE ================= */}
        <div className="sm:hidden p-4 space-y-4">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading users...</p>
          ) : (
            paginatedUsers.map((user) => (
              <div
                key={user.id}
                className="border rounded-xl p-4 shadow-sm bg-gray-50"
              >
                <div className="mb-2">
                  <div className="font-semibold text-gray-800 ">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Role:</span>
                  <span className="capitalize font-medium">{user.role}</span>
                </div>

                <div className="flex justify-between mb-4">
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
                  className="w-full bg-[#2b2b2b] hover:bg-[#a09f9f] text-white"
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

        {/* ================= DESKTOP ================= */}
        <div className="hidden sm:block p-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading users...</p>
          ) : (
            <div className="rounded-2xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500 text-xs uppercase tracking-wide">
                    <th className="py-4 px-6 text-left font-medium">User</th>
                    <th className="px-6 text-left font-medium">Role</th>
                    <th className="px-6 text-left font-medium">Status</th>
                    <th className="px-6 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center py-10 text-gray-400"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-t hover:bg-gray-50 transition"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                              {user.username.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <div className="font-medium text-gray-800 capitalize">
                                {user.username}
                              </div>
                              <div className="text-xs text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 text-gray-600 capitalize">
                          {user.role}
                        </td>

                        <td className="px-6">
                          <span
                            className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                              user.is_active
                                ? "bg-green-50 text-green-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-6 text-right">
                          <button
                            className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                            onClick={() => {
                              setEditingUser(user);
                              setDrawerOpen(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-4 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-100"
            >
              Prev
            </button>

            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-4 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
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
