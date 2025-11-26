import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import {
  clearProjectError,
  createProject,
  deleteProject,
  searchProjects,
  updateProject,
} from "../../store/slices/adminProjectsSlice";
import type { RootState, AppDispatch } from "../../store/store";

// ---- Types ----

type LoadingStatus = "idle" | "loading" | "succeeded" | "failed";

export interface Project {
  id: number | string;
  code: string;
  name: string;
}

interface AdminProjectsAvailableFilters {
  prefixes: string[];
}

interface AdminProjectsState {
  items: Project[];
  totalItems: number;
  totalPages: number;
  status: LoadingStatus;
  availableFilters: AdminProjectsAvailableFilters;
  error: string | null;
}

interface ProjectFormFields {
  code: string;
  name: string;
}

type ModalMode = "create" | "edit";

interface ProjectModalState {
  open: boolean;
  mode: ModalMode;
  projectId: number | string | null;
  fields: ProjectFormFields;
  saving: boolean;
}

interface ProjectFilters {
  prefixes: string[];
  allocation: string;
}

interface ProjectManagementPageProps {
  onRequestReload?: () => void;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// ---- Helpers ----

const emptyProject: ProjectFormFields = { code: "", name: "" };

const createEmptyModal = (): ProjectModalState => ({
  open: false,
  mode: "create",
  projectId: null,
  fields: { ...emptyProject },
  saving: false,
});

// ---- Modal Component ----

function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 text-[11px] text-slate-700">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
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

// ---- Main Component ----

const ProjectManagementPage: React.FC<ProjectManagementPageProps> = ({
  onRequestReload,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const token = useSelector((state: RootState) => state.auth.token);

  const {
    items: projects,
    totalItems,
    totalPages,
    status,
    availableFilters,
    error,
  } = useSelector<RootState, AdminProjectsState>(
    (state) => state.adminProjects as AdminProjectsState
  );

  const loading = status === "loading";

  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<ProjectFilters>({
    prefixes: [],
    allocation: "",
  });
  const [modalState, setModalState] = useState<ProjectModalState>(createEmptyModal);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    await dispatch(
      searchProjects({
        token,
        query: {
          page,
          size: pageSize,
          search,
          startsWith: filters.prefixes,
          allocation: filters.allocation,
        },
      })
    );
  }, [dispatch, filters.allocation, filters.prefixes, page, pageSize, search, token]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearProjectError());
    }
  }, [dispatch, error]);

  const closeModal = () => setModalState(createEmptyModal());

  const openCreateProject = () => {
    setModalState({ ...createEmptyModal(), open: true });
  };

  const openEditProject = (project: Project) => {
    setModalState({
      open: true,
      mode: "edit",
      projectId: project.id,
      fields: { code: project.code || "", name: project.name || "" },
      saving: false,
    });
  };

  const handleFieldChange = (field: keyof ProjectFormFields, value: string) => {
    setModalState((prev) => ({
      ...prev,
      fields: { ...prev.fields, [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    const payload = {
      code: modalState.fields.code?.trim() || "",
      name: modalState.fields.name?.trim() || "",
    };
    if (!payload.code || !payload.name) {
      toast.error("Code and project name are required");
      return;
    }
    setModalState((prev) => ({ ...prev, saving: true }));
    try {
      if (modalState.mode === "edit" && modalState.projectId != null) {
        await dispatch(
          updateProject({ token, projectId: modalState.projectId, payload })
        ).unwrap();
        toast.success("Project updated");
      } else {
        await dispatch(createProject({ token, payload })).unwrap();
        toast.success("Project created");
      }
      closeModal();
      await loadProjects();
      onRequestReload?.();
    } catch (err: unknown) {
      setModalState((prev) => ({ ...prev, saving: false }));
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to save project";
      toast.error(message);
    }
  };

  const handleDelete = async (projectId: number | string | null | undefined) => {
    if (!token || projectId == null) return;
    const confirmDelete =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this project?");
    if (!confirmDelete) return;
    try {
      await dispatch(deleteProject({ token, projectId })).unwrap();
      toast.success("Project removed");
      await loadProjects();
      onRequestReload?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to delete project";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">
            Project Management
          </div>
          <p className="text-[11px] text-slate-500">
            Create, edit, view and delete project codes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateProject}
          className="rounded-full bg-slate-900 px-4 py-1 text-[11px] text-white"
        >
          Add Project
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search projects"
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
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Code starts with
            </span>
            <select
              multiple
              value={filters.prefixes}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
                setFilters((prev) => ({ ...prev, prefixes: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {availableFilters.prefixes.map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">
              Hold Cmd/Ctrl to multi-select
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Allocation
            </span>
            <select
              value={filters.allocation}
              onChange={(event) => {
                setFilters((prev) => ({
                  ...prev,
                  allocation: event.target.value,
                }));
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Any</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="UNALLOCATED">Unallocated</option>
            </select>
            <span className="text-[10px] text-slate-400">
              Filter by whether BOM is assigned
            </span>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFilters({ prefixes: [], allocation: "" });
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
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <div className="text-[11px] font-semibold text-slate-900">
            Projects ({totalItems})
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
              onChange={(event) => {
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
                <th className="cell-tight">Code</th>
                <th>Project</th>
                <th className="cell-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="font-mono text-[11px] text-slate-900">
                    {project.code}
                  </td>
                  <td>{project.name}</td>
                  <td className="cell-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditProject(project)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] text-slate-600 hover:border-[var(--primary)] hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-[10px] text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-[11px] text-slate-500"
                  >
                    {loading ? "Loading projects…" : "No projects found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalState.open}
        title={modalState.mode === "edit" ? "Edit Project" : "Add Project"}
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
        <div className="grid gap-3 text-[11px] text-slate-700">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Code
            </span>
            <input
              type="text"
              value={modalState.fields.code}
              onChange={(event) =>
                handleFieldChange("code", event.target.value)
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="PRJ-001"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Project name
            </span>
            <input
              type="text"
              value={modalState.fields.name}
              onChange={(event) =>
                handleFieldChange("name", event.target.value)
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="New project"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectManagementPage;
