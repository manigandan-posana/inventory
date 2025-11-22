import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import {
  clearUserError,
  createUser,
  deleteUser,
  loadUserProjects,
  searchUsers,
  updateUser,
} from "../../store/adminUsersSlice";

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "CEO", label: "CEO" },
  { value: "COO", label: "COO" },
  { value: "PROCUREMENT_MANAGER", label: "Procurement Manager" },
  { value: "PROJECT_HEAD", label: "Project Head" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "USER", label: "User" },
];

const accessOptions = [
  { value: "ALL", label: "All Projects" },
  { value: "PROJECTS", label: "Specific Projects" },
];

const elevatedRoles = new Set(["ADMIN", "CEO", "COO", "PROCUREMENT_MANAGER", "PROJECT_HEAD"]);
const projectScopedRoles = new Set(["PROJECT_MANAGER", "USER"]);

const createEmptyModal = () => ({
  open: false,
  mode: "create",
  userId: null,
  saving: false,
  fields: {
    name: "",
    email: "",
    password: "",
    role: "USER",
    accessType: "PROJECTS",
    projectIds: [],
  },
});

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 text-[11px] text-slate-700">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            className="rounded border border-slate-200 px-2 py-[3px] text-[10px] text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto py-3">{children}</div>
        {footer && <div className="border-t border-slate-200 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

export default function UserManagementPage({ onRequestReload }) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const {
    items: users,
    projects,
    totalItems,
    totalPages,
    availableFilters,
    status,
    error,
  } = useSelector((state) => state.adminUsers);
  const loading = status === "loading";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ roles: [], accessTypes: [], projectIds: [] });
  const [modalState, setModalState] = useState(createEmptyModal);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    await dispatch(
      searchUsers({
        token,
        query: {
          page,
          size: pageSize,
          search,
          role: filters.roles,
          accessType: filters.accessTypes,
          projectId: filters.projectIds,
        },
      })
    );
  }, [dispatch, filters.accessTypes, filters.projectIds, filters.roles, page, pageSize, search, token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (token) {
      dispatch(loadUserProjects(token));
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearUserError());
    }
  }, [dispatch, error]);

  const closeModal = () => setModalState(createEmptyModal());

  const openCreateUser = () => {
    setModalState({ ...createEmptyModal(), open: true });
  };

  const openEditUser = (user) => {
    setModalState({
      open: true,
      mode: "edit",
      userId: user.id,
      saving: false,
      fields: {
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: user.role || "USER",
        accessType: user.accessType || (elevatedRoles.has(user.role) ? "ALL" : "PROJECTS"),
        projectIds: (user.projects || []).map((project) => project.id),
      },
    });
  };

  const handleFieldChange = (field, value) => {
    setModalState((prev) => ({
      ...prev,
      fields: { ...prev.fields, [field]: value },
    }));
  };

  const handleRoleChange = (value) => {
    setModalState((prev) => {
      const nextAccess = elevatedRoles.has(value) ? "ALL" : prev.fields.accessType || "PROJECTS";
      const nextProjects = projectScopedRoles.has(value) ? prev.fields.projectIds : [];
      return {
        ...prev,
        fields: {
          ...prev.fields,
          role: value,
          accessType: nextAccess,
          projectIds: nextProjects,
        },
      };
    });
  };

  const requiresProjects = projectScopedRoles.has(modalState.fields.role);
  const accessLocked = elevatedRoles.has(modalState.fields.role);

  const handleSubmit = async () => {
    if (!token) return;
    const payload = {
      name: modalState.fields.name?.trim() || "",
      password: modalState.fields.password?.trim() || "",
      role: modalState.fields.role,
      accessType: modalState.fields.accessType,
      projectIds: modalState.fields.projectIds,
    };
    if (!payload.name) {
      toast.error("Name is required");
      return;
    }
    if (modalState.mode === "create" && !payload.password) {
      toast.error("Password is required for new users");
      return;
    }
    if (requiresProjects && (!payload.projectIds || payload.projectIds.length === 0)) {
      toast.error("Select at least one project");
      return;
    }
    if (modalState.fields.email?.trim()) {
      payload.email = modalState.fields.email.trim();
    }

    setModalState((prev) => ({ ...prev, saving: true }));
    try {
      if (modalState.mode === "edit" && modalState.userId) {
        await dispatch(updateUser({ token, userId: modalState.userId, payload })).unwrap();
        toast.success("User updated");
      } else {
        await dispatch(createUser({ token, payload })).unwrap();
        toast.success("User created");
      }
      closeModal();
      await loadUsers();
      onRequestReload?.();
    } catch (err) {
      setModalState((prev) => ({ ...prev, saving: false }));
      toast.error(err.message || "Unable to save user");
    }
  };

  const handleDelete = async (userId) => {
    if (!token || !userId) return;
    const confirmDelete = typeof window === "undefined" ? true : window.confirm("Delete this user?");
    if (!confirmDelete) return;
    try {
      await dispatch(deleteUser({ token, userId })).unwrap();
      toast.success("User removed");
      await loadUsers();
      onRequestReload?.();
    } catch (err) {
      toast.error(err.message || "Unable to delete user");
    }
  };

  const filterRoleOptions = useMemo(
    () => (availableFilters.roles.length ? availableFilters.roles : roleOptions.map((r) => r.value)),
    [availableFilters.roles]
  );
  const filterAccessOptions = useMemo(
    () => (availableFilters.accessTypes.length ? availableFilters.accessTypes : accessOptions.map((option) => option.value)),
    [availableFilters.accessTypes]
  );
  const projectFilterOptions = useMemo(
    () =>
      (availableFilters.projects.length
        ? availableFilters.projects.map((value) => ({ value, label: value }))
        : projects.map((project) => ({ value: project.id, label: `${project.code}` }))
      ),
    [availableFilters.projects, projects]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">User Management</div>
          <p className="text-[11px] text-slate-500">Add, edit and delete users. All changes persist via the backend.</p>
        </div>
        <button
          type="button"
          onClick={openCreateUser}
          className="rounded-full bg-slate-900 px-4 py-1 text-[11px] text-white"
        >
          Add User
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search users"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full rounded-full border border-slate-200 px-3 py-2 text-[11px] text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-0 sm:w-72"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
        >
          {filtersOpen ? "Hide filters" : "Advanced filters"}
        </button>
        {error && <span className="text-[11px] text-rose-500">{error}</span>}
      </div>
      {filtersOpen && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 text-[11px] text-slate-600 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Roles</span>
            <select
              multiple
              value={filters.roles}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setFilters((prev) => ({ ...prev, roles: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {filterRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">Hold Cmd/Ctrl to multi-select</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Access type</span>
            <select
              multiple
              value={filters.accessTypes}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setFilters((prev) => ({ ...prev, accessTypes: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {filterAccessOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">Filter by access scope</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Projects</span>
            <select
              multiple
              value={filters.projectIds}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setFilters((prev) => ({ ...prev, projectIds: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {projectFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">Filter by assigned project codes</span>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFilters({ roles: [], accessTypes: [], projectIds: [] });
                setSearch("");
                setPage(1);
              }}
              className="rounded-full border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-[11px] text-slate-700 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-[11px] font-semibold text-slate-900">Users ({totalItems})</div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            {loading && <span className="text-amber-600">Refreshing…</span>}
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded border border-slate-200 bg-white px-2 py-1"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Name</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Email</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Role</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Access</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Projects</th>
                <th className="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-900">{user.name}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{user.email || "—"}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{user.role}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{user.accessType}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {(user.projects || []).map((project) => project.code).join(", ") || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-[10px] text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[11px] text-slate-500">
                    {loading ? "Loading users…" : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalState.open}
        title={modalState.mode === "edit" ? "Edit User" : "Add User"}
        onClose={closeModal}
        footer={(
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-slate-200 px-4 py-2 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={modalState.saving}
              onClick={handleSubmit}
              className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {modalState.saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      >
        <div className="grid gap-3 text-[11px] text-slate-700 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Name</span>
            <input
              type="text"
              value={modalState.fields.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Jane Doe"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Email</span>
            <input
              type="email"
              value={modalState.fields.email}
              onChange={(event) => handleFieldChange("email", event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="user@example.com"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Password</span>
            <input
              type="password"
              value={modalState.fields.password}
              onChange={(event) => handleFieldChange("password", event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder={modalState.mode === "edit" ? "(leave blank to keep)" : "Set password"}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Role</span>
            <select
              value={modalState.fields.role}
              onChange={(event) => handleRoleChange(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Access</span>
            <select
              value={modalState.fields.accessType}
              onChange={(event) => handleFieldChange("accessType", event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              disabled={accessLocked}
            >
              {accessOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {accessLocked && (
              <span className="text-[10px] text-slate-400">Access is fixed for elevated roles</span>
            )}
          </label>
          {requiresProjects && (
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Projects</span>
              <select
                multiple
                value={modalState.fields.projectIds}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                  handleFieldChange("projectIds", values);
                }}
                className="min-h-[120px] rounded-xl border border-slate-200 px-3 py-2"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} — {project.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">Hold Cmd/Ctrl to multi-select projects</span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
