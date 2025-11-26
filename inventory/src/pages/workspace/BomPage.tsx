import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import usePagination from "../../hooks/usePagination";
import { setSelectedProject } from "../../store/slices/workspaceSlice";
import type { RootState, AppDispatch } from "../../store/store";

// ---- Types ---- //

export interface WorkspaceProject {
  id: string | number;
  code: string;
  name: string;
}

export interface BomRow {
  projectId: string | number;
  materialRef?: string | number | null;
  code?: string | null;
  name?: string | null;
  category?: string | null;
  allocatedQty?: number | null;
  requiredQty?: number | null;
  qty?: number | null;
  orderedQty?: number | null;
  receivedQty?: number | null;
  utilizedQty?: number | null;
  balanceQty?: number | null;
}

export interface WorkspaceSliceState {
  assignedProjects: WorkspaceProject[];
  selectedProjectId: string | null;
  bomByProject: Record<string, BomRow[]>;
}

// ---- Child components ---- //

interface ProjectSelectorProps {
  projects: WorkspaceProject[];
  value: string | null;
  onChange?: (value: string | null) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  value,
  onChange,
}) => {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value || null)}
      className="rounded border border-slate-200 px-3 py-2 text-sm"
    >
      {!value && <option value="">Select project</option>}
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.code} — {project.name}
        </option>
      ))}
    </select>
  );
};

// ---- Main page ---- //

const BomPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { assignedProjects, selectedProjectId, bomByProject } = useSelector<
    RootState,
    WorkspaceSliceState
  >((state) => state.workspace as WorkspaceSliceState);

  const [search, setSearch] = useState<string>("");

  const rows = useMemo<BomRow[]>(() => {
    const bom =
      (selectedProjectId && bomByProject?.[selectedProjectId]) || [];

    if (!search.trim()) return bom;

    const term = search.toLowerCase();
    return bom.filter(
      (row) =>
        row.code?.toLowerCase().includes(term) ||
        row.name?.toLowerCase().includes(term) ||
        row.category?.toLowerCase().includes(term)
    );
  }, [bomByProject, search, selectedProjectId]);

  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    currentItems,
    setPage,
    setPageSize,
  } = usePagination<BomRow>(rows, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-800">
            Bill of Materials
          </h1>
          <p className="text-sm text-slate-500">
            Live allocations fetched from the backend.
          </p>
        </div>
        <ProjectSelector
          projects={assignedProjects}
          value={selectedProjectId}
          onChange={(projectId) => dispatch(setSelectedProject(projectId))}
        />
      </div>

      <div className="table-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            type="search"
            className="w-full max-w-xs rounded-full border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search material, code or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-sm text-slate-500">{rows.length} items</div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Material</th>
                <th>Category</th>
                <th className="cell-number">Allocated</th>
                <th className="cell-number">Ordered</th>
                <th className="cell-number">Received</th>
                <th className="cell-number">Issued</th>
                <th className="cell-number">Balance</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row) => (
                <tr
                  key={`${row.projectId}-${row.materialRef ?? row.code ?? ""}`}
                >
                  <td className="font-mono text-[11px]">{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.category}</td>
                  <td className="cell-number">
                    {row.allocatedQty ??
                      row.requiredQty ??
                      row.qty ??
                      0}
                  </td>
                  <td className="cell-number">{row.orderedQty ?? 0}</td>
                  <td className="cell-number">{row.receivedQty ?? 0}</td>
                  <td className="cell-number">{row.utilizedQty ?? 0}</td>
                  <td className="cell-number">{row.balanceQty ?? 0}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-4 text-center text-slate-500"
                  >
                    No materials available for this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
};

export default BomPage;
