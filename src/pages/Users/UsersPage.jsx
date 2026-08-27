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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8fafc_0%,#f3f4f6_40%,#eef2f7_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gray-500">
              Administration
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#2b2b2b]">
              User Management
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Manage access, roles, and account status in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search user..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-40 bg-transparent text-sm outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none"
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
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button
              className="bg-[#2b2b2b] px-4 py-2 text-white shadow-sm transition hover:bg-[#4a4a4a]"
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
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">User Created Successfully</div>
                <div className="mt-1 text-sm">
                  Username: <strong>{generatedCredentials.username}</strong>
                </div>
                <div className="text-sm">
                  Temporary Password:{" "}
                  <strong>{generatedCredentials.temporary_password}</strong>
                </div>
              </div>

              <button
                className="text-sm font-medium underline"
                onClick={() => setGeneratedCredentials(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ================= USERS CONTAINER ================= */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {/* ================= MOBILE ================= */}
          <div className="space-y-4 p-4 sm:hidden">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Loading users...
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No users match the current filters.
              </div>
            ) : (
              paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-800">
                        {user.username}
                      </div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Role</span>
                    <span className="text-sm font-medium capitalize text-gray-700">
                      {user.role}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-[#2b2b2b] text-white transition hover:bg-[#4a4a4a]"
                    onClick={() => {
                      setEditingUser(user);
                      setDrawerOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* ================= DESKTOP ================= */}
          <div className="hidden p-6 sm:block">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
                Loading users...
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-[#2b2b2b] text-white">
                    <tr className="text-xs uppercase tracking-wide text-white">
                      <th className="px-6 py-4 text-left font-medium">User</th>
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
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          No users found
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-gray-200 transition hover:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
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
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
                              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm transition hover:bg-gray-100"
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
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>

              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
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
