import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
} from "react";
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
} from "../../store/slices/adminUsersSlice";
import type { RootState, AppDispatch } from "../../store/store";

// -------- Types --------

export type UserRole =
  | "ADMIN"
  | "CEO"
  | "COO"
  | "PROCUREMENT_MANAGER"
  | "PROJECT_HEAD"
  | "PROJECT_MANAGER"
  | "USER";

export type AccessType = "ALL" | "PROJECTS";

type LoadingStatus = "idle" | "loading" | "succeeded" | "failed";

export interface Project {
  id: number | string;
  code: string;
  name: string;
}

export interface UserProjectRef extends Project {}

export interface User {
  id: number | string;
  name: string;
  email?: string | null;
  role: UserRole;
  accessType: AccessType;
  projects?: UserProjectRef[];
}

interface AdminUsersAvailableFilters {
  roles: UserRole[];
  accessTypes: AccessType[];
  projects: (number | string)[];
}

interface AdminUsersState {
  items: User[];
  projects: Project[];
  totalItems: number;
  totalPages: number;
  availableFilters: AdminUsersAvailableFilters;
  status: LoadingStatus;
  error: string | null;
}

interface UserFilters {
  roles: UserRole[];
  accessTypes: AccessType[];
  projectIds: string[];
}

type ModalMode = "create" | "edit";

interface UserModalFields {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  accessType: AccessType;
  projectIds: string[];
}

interface UserModalState {
  open: boolean;
  mode: ModalMode;
  userId: number | string | null;
  saving: boolean;
  fields: UserModalFields;
}

interface UserManagementPageProps {
  onRequestReload?: () => void;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

interface RoleOption {
  value: UserRole;
  label: string;
}

interface AccessOption {
  value: AccessType;
  label: string;
}

interface ProjectFilterOption {
  value: string;
  label: string;
}

// -------- Constants --------

const roleOptions: RoleOption[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "CEO", label: "CEO" },
  { value: "COO", label: "COO" },
  { value: "PROCUREMENT_MANAGER", label: "Procurement Manager" },
  { value: "PROJECT_HEAD", label: "Project Head" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "USER", label: "User" },
];

const accessOptions: AccessOption[] = [
  { value: "ALL", label: "All Projects" },
  { value: "PROJECTS", label: "Specific Projects" },
];

const elevatedRoles: Set<UserRole> = new Set([
  "ADMIN",
  "CEO",
  "COO",
  "PROCUREMENT_MANAGER",
  "PROJECT_HEAD",
]);

const projectScopedRoles: Set<UserRole> = new Set([
  "PROJECT_MANAGER",
  "USER",
]);

const createEmptyModal = (): UserModalState => ({
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

// -------- Modal component --------

function Modal({ open, title, onClose, children, footer }: ModalProps) {
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

// -------- Main component --------

const UserManagementPage: React.FC<UserManagementPageProps> = ({
  onRequestReload,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const token = useSelector((state: RootState) => state.auth.token);

  const {
    items: users,
    projects,
    totalItems,
    totalPages,
    availableFilters,
    status,
    error,
  } = useSelector<RootState, AdminUsersState>(
    (state) => state.adminUsers as AdminUsersState
  );

  const loading = status === "loading";

  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<UserFilters>({
    roles: [],
    accessTypes: [],
    projectIds: [],
  });
  const [modalState, setModalState] = useState<UserModalState>(createEmptyModal);

  // ---- Data loading ----

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
    void loadUsers();
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

  // ---- Modal helpers ----

  const closeModal = () => setModalState(createEmptyModal());

  const openCreateUser = () => {
    setModalState({ ...createEmptyModal(), open: true });
  };

  const openEditUser = (user: User) => {
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
        accessType:
          user.accessType ||
          (elevatedRoles.has(user.role) ? "ALL" : "PROJECTS"),
        projectIds: (user.projects || []).map((project) => String(project.id)),
      },
    });
  };

  const handleFieldChange = <K extends keyof UserModalFields>(
    field: K,
    value: UserModalFields[K]
  ) => {
    setModalState((prev) => ({
      ...prev,
      fields: { ...prev.fields, [field]: value },
    }));
  };

  const handleRoleChange = (value: UserRole) => {
    setModalState((prev) => {
      const nextAccess: AccessType = elevatedRoles.has(value)
        ? "ALL"
        : prev.fields.accessType || "PROJECTS";
      const nextProjects: string[] = projectScopedRoles.has(value)
        ? prev.fields.projectIds
        : [];
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

  // ---- Submit / delete ----

  interface UserPayload {
    name: string;
    password?: string;
    email?: string;
    role: UserRole;
    accessType: AccessType;
    projectIds: string[];
  }

  const handleSubmit = async () => {
    if (!token) return;

    const rawName = modalState.fields.name.trim();
    const rawPassword = modalState.fields.password.trim();
    const rawEmail = modalState.fields.email.trim();

    if (!rawName) {
      toast.error("Name is required");
      return;
    }
    if (modalState.mode === "create" && !rawPassword) {
      toast.error("Password is required for new users");
      return;
    }
    if (
      requiresProjects &&
      (!modalState.fields.projectIds ||
        modalState.fields.projectIds.length === 0)
    ) {
      toast.error("Select at least one project");
      return;
    }

    const payload: UserPayload = {
      name: rawName,
      role: modalState.fields.role,
      accessType: modalState.fields.accessType,
      projectIds: modalState.fields.projectIds,
    };

    if (rawPassword) {
      payload.password = rawPassword;
    }
    if (rawEmail) {
      payload.email = rawEmail;
    }

    setModalState((prev) => ({ ...prev, saving: true }));
    try {
      if (modalState.mode === "edit" && modalState.userId != null) {
        await dispatch(
          updateUser({
            token,
            userId: modalState.userId,
            payload,
          })
        ).unwrap();
        toast.success("User updated");
      } else {
        await dispatch(createUser({ token, payload })).unwrap();
        toast.success("User created");
      }
      closeModal();
      await loadUsers();
      onRequestReload?.();
    } catch (err: unknown) {
      setModalState((prev) => ({ ...prev, saving: false }));
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to save user";
      toast.error(message);
    }
  };

  const handleDelete = async (userId: number | string | null | undefined) => {
    if (!token || userId == null) return;
    const confirmDelete =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this user?");
    if (!confirmDelete) return;
    try {
      await dispatch(deleteUser({ token, userId })).unwrap();
      toast.success("User removed");
      await loadUsers();
      onRequestReload?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to delete user";
      toast.error(message);
    }
  };

  // ---- Filter options ----

  const filterRoleOptions = useMemo<UserRole[]>(
    () =>
      availableFilters.roles.length
        ? availableFilters.roles
        : roleOptions.map((r) => r.value),
    [availableFilters.roles]
  );

  const filterAccessOptions = useMemo<AccessType[]>(
    () =>
      availableFilters.accessTypes.length
        ? availableFilters.accessTypes
        : accessOptions.map((option) => option.value),
    [availableFilters.accessTypes]
  );

  const projectFilterOptions = useMemo<ProjectFilterOption[]>(
    () =>
      availableFilters.projects.length
        ? availableFilters.projects.map((value) => {
            const lookup = projects.find(
              (project) => String(project.id) === String(value)
            );
            return {
              value: String(value),
              label: lookup
                ? `${lookup.code} - ${lookup.name}`
                : String(value),
            };
          })
        : projects.map((project) => ({
            value: String(project.id),
            label: `${project.code} - ${project.name}`,
          })),
    [availableFilters.projects, projects]
  );

  // ---- JSX ----

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">
            User Management
          </div>
          <p className="text-[11px] text-slate-500">
            Add, edit and delete users. All changes persist via the backend.
          </p>
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
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
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
          {/* Roles filter */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Roles
            </span>
            <select
              multiple
              value={filters.roles}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value as UserRole);
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
            <span className="text-[10px] text-slate-400">
              Hold Cmd/Ctrl to multi-select
            </span>
          </label>

          {/* Access type filter */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Access type
            </span>
            <select
              multiple
              value={filters.accessTypes}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value as AccessType);
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
            <span className="text-[10px] text-slate-400">
              Filter by access scope
            </span>
          </label>

          {/* Projects filter */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Projects
            </span>
            <select
              multiple
              value={filters.projectIds}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
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
            <span className="text-[10px] text-slate-400">
              Filter by assigned project codes
            </span>
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

      {/* Users table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-[11px] text-slate-700 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <div className="text-[11px] font-semibold text-slate-900">
            Users ({totalItems})
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
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
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px]"
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
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Access</th>
                <th>Projects</th>
                <th className="cell-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold text-slate-900">{user.name}</td>
                  <td className="cell-tight">{user.email || "—"}</td>
                  <td>{user.role}</td>
                  <td>{user.accessType}</td>
                  <td className="cell-tight">
                    {(user.projects || [])
                      .map((project) => project.code)
                      .join(", ") || "—"}
                  </td>
                  <td className="cell-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] text-slate-600 hover:border-[var(--primary)] hover:bg-blue-50"
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
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-[11px] text-slate-500"
                  >
                    {loading ? "Loading users…" : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modalState.open}
        title={modalState.mode === "edit" ? "Edit User" : "Add User"}
        onClose={closeModal}
        footer={
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
        }
      >
        <div className="grid gap-3 text-[11px] text-slate-700 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Name
            </span>
            <input
              type="text"
              value={modalState.fields.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange("name", event.target.value)
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Jane Doe"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Email
            </span>
            <input
              type="email"
              value={modalState.fields.email}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange("email", event.target.value)
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="user@example.com"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Password
            </span>
            <input
              type="password"
              value={modalState.fields.password}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange("password", event.target.value)
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder={
                modalState.mode === "edit"
                  ? "(leave blank to keep)"
                  : "Set password"
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Role
            </span>
            <select
              value={modalState.fields.role}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleRoleChange(event.target.value as UserRole)
              }
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
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Access
            </span>
            <select
              value={modalState.fields.accessType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleFieldChange("accessType", event.target.value as AccessType)
              }
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
              <span className="text-[10px] text-slate-400">
                Access is fixed for elevated roles
              </span>
            )}
          </label>

          {requiresProjects && (
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Projects
              </span>
              <select
                multiple
                value={modalState.fields.projectIds}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const values = Array.from(
                    event.target.selectedOptions
                  ).map((option) => option.value);
                  handleFieldChange("projectIds", values);
                }}
                className="min-h-[120px] rounded-xl border border-slate-200 px-3 py-2"
              >
                {projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.code} — {project.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">
                Hold Cmd/Ctrl to multi-select projects
              </span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
