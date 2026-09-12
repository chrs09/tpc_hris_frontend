import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button/Button";
import { getUserList } from "../../api/users";
import UserDrawer from "../../components/users/UserDrawer";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";

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

  const {
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
    paginatedItems: paginatedUsers,
  } = usePagination(filteredUsers, 10);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-danger font-semibold">
        Access Denied. Superadmin only.
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        <SectionTabs group="Administrator" />

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-fg-subtle">
              Administration
            </p>
            <h2 className="mt-1 text-2xl font-bold text-fg">
              User Management
            </h2>
            <p className="mt-2 text-sm text-fg-subtle">
              Manage access, roles, and account status in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center rounded-xl border border-border bg-surface-hover px-3 py-2 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-4 w-4 text-fg-subtle"
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
                className="w-40 bg-transparent text-sm text-fg outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg shadow-sm outline-none"
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
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg shadow-sm outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button
              className="bg-primary px-4 py-2 text-primary-foreground shadow-sm transition hover:bg-primary-hover"
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
          <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-success shadow-sm">
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
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          {/* ================= MOBILE ================= */}
          <div className="space-y-4 p-4 sm:hidden">
            {loading ? (
              <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-sm text-fg-subtle">
                Loading users...
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-6 text-center text-sm text-fg-subtle">
                No users match the current filters.
              </div>
            ) : (
              paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-border bg-surface-hover p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-fg">
                        {user.username}
                      </div>
                      <div className="text-xs text-fg-subtle">{user.email}</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        user.is_active
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-fg-subtle">Role</span>
                    <span className="text-sm font-medium capitalize text-fg-muted">
                      {user.role}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground transition hover:bg-primary-hover"
                      onClick={() => {
                        setEditingUser(user);
                        setDrawerOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ================= DESKTOP ================= */}
          <div className="hidden p-6 sm:block">
            {loading ? (
              <div className="rounded-2xl border border-border bg-surface-hover p-10 text-center text-sm text-fg-subtle">
                Loading users...
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover text-fg-muted">
                    <tr className="text-xs uppercase tracking-wide">
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
                          className="px-6 py-12 text-center text-fg-subtle"
                        >
                          No users found
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-border transition hover:bg-surface-hover"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-active text-sm font-semibold text-fg-muted">
                                {user.username.charAt(0).toUpperCase()}
                              </div>

                              <div>
                                <div className="font-medium text-fg capitalize">
                                  {user.username}
                                </div>
                                <div className="text-xs text-fg-subtle">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 text-fg-muted capitalize">
                            {user.role}
                          </td>

                          <td className="px-6">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                user.is_active
                                  ? "bg-success/15 text-success"
                                  : "bg-surface-active text-fg-subtle"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-lg border border-border px-4 py-1.5 text-sm text-fg transition hover:bg-surface-hover"
                                onClick={() => {
                                  setEditingUser(user);
                                  setDrawerOpen(true);
                                }}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
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
