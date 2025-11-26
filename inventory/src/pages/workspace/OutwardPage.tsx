import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PaginationControls from "../../components/PaginationControls";
import usePagination from "../../hooks/usePagination";
import { refreshInventoryCodes, submitOutward } from "../../store/slices/workspaceSlice";
import {
  clearOutwardSelections,
  setOutwardField,
  setOutwardModalLine,
  setOutwardModalValues,
  setOutwardSaving,
  setOutwardSelectedLine,
} from "../../store/slices/workspaceUiSlice";
import type { RootState } from "../../store/store";

// ---------- Types ---------- //

export interface ProjectSummary {
  id: string | number;
  code: string;
  name: string;
}

export interface BomLine {
  id?: string | number;
  materialId?: string | number;
  code?: string;
  name?: string;
  unit?: string;
  balanceQty?: number | null;
  allocatedQty?: number | null;
  qty?: number | null;
  [key: string]: unknown;
}

export interface AvailableMaterial extends BomLine {
  materialId: string;
  inStockQty: number;
}

export interface OutwardHistoryRecord {
  id: string | number;
  code: string;
  projectName?: string | null;
  issueTo?: string | null;
  status?: string | null;
  date?: string | null;
  items?: number | null;
  lines?: OutwardHistoryLine[];
  [key: string]: unknown;
}

export interface OutwardHistoryLine {
  id: string | number;
  materialName?: string | null;
  name?: string | null;
  materialCode?: string | null;
  code?: string | null;
  unit?: string | null;
  issueQty?: number | null;
  [key: string]: unknown;
}

export interface WorkspaceCodes {
  inward?: string;
  outward?: string;
  // allow other codes from backend
  [key: string]: string | undefined;
}

export interface WorkspaceStateShape {
  codes: WorkspaceCodes;
  outwardHistory: OutwardHistoryRecord[];
  assignedProjects: ProjectSummary[];
  bomByProject?: Record<string, BomLine[]>;
}

export interface AuthStateShape {
  token?: string | null;
  // other auth fields ignored here
  [key: string]: unknown;
}

export interface OutwardSelectedLineValues {
  issueQty: number | string;
}

export interface OutwardModalValues {
  issueQty: number | string;
}

export interface OutwardUiState {
  projectId: string;
  issueTo: string;
  status: string; // "OPEN" | "CLOSED" etc.
  date: string;
  closeDate: string;
  saving: boolean;
  selectedLines: Record<string, OutwardSelectedLineValues>;
  modalLine: AvailableMaterial | null;
  modalValues: OutwardModalValues;
}

export interface WorkspaceUiStateShape {
  outward: OutwardUiState;
  // other UI slices ignored
  [key: string]: unknown;
}

interface IssueModalProps {
  line: AvailableMaterial | null;
  values: OutwardModalValues;
  onChange: (values: OutwardModalValues) => void;
  onSave: () => void;
  onClose: () => void;
}

// ---------- Helpers ---------- //

function formatDate(value?: string | Date | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function today(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------- Issue Modal ---------- //

const IssueModal: React.FC<IssueModalProps> = ({
  line,
  values,
  onChange,
  onSave,
  onClose,
}) => {
  if (!line) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-3">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {line.code} — {line.name}
            </div>
            <div className="text-xs text-slate-500">
              {line.unit} · In stock:{" "}
              {line.inStockQty ??
                line.balanceQty ??
                line.allocatedQty ??
                line.qty ??
                "-"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Issue quantity
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.issueQty}
            onChange={(e) => onChange({ issueQty: e.target.value })}
            className="rounded border border-slate-200 px-3 py-2"
          />
        </label>

        <p className="mt-3 text-xs text-slate-500">
          Save to include this material in the outward request.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save line
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Page Component ---------- //

const OutwardPage: React.FC = () => {
  const dispatch = useDispatch();

  const { codes, outwardHistory, assignedProjects, bomByProject } = useSelector<
    RootState,
    WorkspaceStateShape
  >((state) => state.workspace as unknown as WorkspaceStateShape);

  const { token } = useSelector<RootState, AuthStateShape>(
    (state) => state.auth as unknown as AuthStateShape
  );

  const outwardUi = useSelector<RootState, OutwardUiState>(
    (state) =>
      (state.workspaceUi as unknown as WorkspaceUiStateShape)
        .outward as OutwardUiState
  );

  const {
    projectId,
    issueTo,
    status,
    date,
    closeDate,
    saving,
    selectedLines,
    modalLine,
    modalValues,
  } = outwardUi;

  const availableMaterials = useMemo<AvailableMaterial[]>(() => {
    if (!projectId) return [];
    const lines = bomByProject?.[projectId] || [];
    return lines
      .filter((line) => (line.balanceQty ?? 0) > 0)
      .map((line) => ({
        ...line,
        materialId: String(line.materialId || line.id),
        inStockQty: line.balanceQty ?? line.allocatedQty ?? line.qty ?? 0,
      })) as AvailableMaterial[];
  }, [bomByProject, projectId]);

  const materialPagination = usePagination<AvailableMaterial>(
    availableMaterials,
    10
  );
  const historyPagination = usePagination<OutwardHistoryRecord>(
    outwardHistory || [],
    10
  );

  const selectedLineCount = useMemo(
    () => Object.keys(selectedLines).length,
    [selectedLines]
  );

  useEffect(() => {
    dispatch(clearOutwardSelections());
  }, [dispatch, projectId]);

  useEffect(() => {
    if (!projectId && assignedProjects.length > 0) {
      dispatch(
        setOutwardField({
          field: "projectId",
          value: String(assignedProjects[0].id),
        })
      );
    }
  }, [assignedProjects, dispatch, projectId]);

  const openModalForLine = (line: AvailableMaterial): void => {
    const materialKey = String(line.materialId);
    dispatch(setOutwardModalLine(line));
    dispatch(
      setOutwardModalValues({
        issueQty: selectedLines[materialKey]?.issueQty ?? "",
      })
    );
  };

  const saveModalLine = (): void => {
    if (!modalLine) return;
    const materialKey = String(modalLine.materialId);
    const issueQty = Number(modalValues.issueQty || 0);

    dispatch(
      setOutwardSelectedLine({
        materialId: materialKey,
        issueQty,
      })
    );
    dispatch(setOutwardModalLine(null));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (!token) return;

    const selectedLinesArray = Object.entries(selectedLines)
      .map(([lineMaterialId, values]) => ({
        materialId: lineMaterialId,
        issueQty: Number(values.issueQty || 0),
      }))
      .filter((line) => line.issueQty > 0);

    if (!projectId || !issueTo || selectedLinesArray.length === 0) {
      toast.error(
        "Project, issue to, and at least one material selection are required."
      );
      return;
    }

    dispatch(setOutwardSaving(true));
    try {
      await dispatch(
        submitOutward({
          token,
          payload: {
            code: codes.outward,
            projectId,
            issueTo,
            status,
            date,
            closeDate: closeDate || undefined,
            lines: selectedLinesArray,
          },
        })
      ).unwrap();
      toast.success("Outward saved via backend");
      dispatch(refreshInventoryCodes(token));
      dispatch(setOutwardField({ field: "issueTo", value: "" }));
      dispatch(clearOutwardSelections());
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to save outward");
      }
    } finally {
      dispatch(setOutwardSaving(false));
    }
  };

  const selectedSummary = useMemo(
    () =>
      Object.entries(selectedLines).map(([materialId, values]) => {
        const line = availableMaterials.find(
          (item) => String(item.materialId) === String(materialId)
        );
        return {
          id: materialId,
          label: line ? `${line.code} — ${line.name}` : materialId,
          issueQty: values.issueQty,
        };
      }),
    [availableMaterials, selectedLines]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Outward register
          </h1>
          <p className="text-sm text-slate-500">
            Click allocated materials below to set issue quantities.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          Next code: {codes.outward || "--"}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Project
            <select
              value={projectId}
              onChange={(e) =>
                dispatch(
                  setOutwardField({ field: "projectId", value: e.target.value })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Select project</option>
              {assignedProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Issue to
            <input
              type="text"
              value={issueTo}
              onChange={(e) =>
                dispatch(
                  setOutwardField({ field: "issueTo", value: e.target.value })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
              required
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Issue date
            <input
              type="date"
              value={date}
              onChange={(e) =>
                dispatch(
                  setOutwardField({ field: "date", value: e.target.value })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Status
            <select
              value={status}
              onChange={(e) =>
                dispatch(
                  setOutwardField({ field: "status", value: e.target.value })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
            >
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Close date
            <input
              type="date"
              value={closeDate}
              onChange={(e) =>
                dispatch(
                  setOutwardField({
                    field: "closeDate",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        {selectedSummary.length > 0 && (
          <div className="rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Selected {selectedSummary.length} material(s):{" "}
            {selectedSummary.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-[3px] text-[11px] text-slate-700 shadow"
              >
                <span>{item.label}</span>
                <span className="text-emerald-700">
                  Qty: {item.issueQty || 0}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    dispatch(
                      setOutwardSelectedLine({
                        materialId: item.id,
                        issueQty: 0,
                      })
                    )
                  }
                  className="text-slate-500 hover:text-slate-800"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {projectId && (
          <div className="table-card bg-slate-50">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-700">
              <div className="font-semibold">
                In-stock materials for this project
              </div>
              <div className="text-[11px] text-slate-500">
                Click a row to add quantities. Selected: {selectedLineCount}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Material</th>
                    <th className="cell-number">In stock</th>
                    <th className="cell-number">Issue Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {materialPagination.currentItems.map((line) => {
                    const materialKey = line.materialId;
                    const isSelected = Boolean(selectedLines[materialKey]);
                    return (
                      <tr
                        key={materialKey}
                        className={`cursor-pointer ${
                          isSelected ? "bg-emerald-50" : ""
                        }`}
                        onClick={() => openModalForLine(line)}
                      >
                        <td className="font-mono text-[11px]">
                          {line.code || "—"}
                        </td>
                        <td>{line.name || "—"}</td>
                        <td className="cell-number">{line.inStockQty ?? 0}</td>
                        <td className="cell-number">
                          {selectedLines[materialKey]?.issueQty ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                  {availableMaterials.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 text-center text-slate-500"
                      >
                        No in-stock materials available for this project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <PaginationControls
                page={materialPagination.page}
                totalPages={materialPagination.totalPages}
                pageSize={materialPagination.pageSize}
                totalItems={materialPagination.totalItems}
                onPageChange={materialPagination.setPage}
                onPageSizeChange={materialPagination.setPageSize}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Use the modal to capture issue quantities for one or more
              materials.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => token && dispatch(refreshInventoryCodes(token))}
            className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Refresh code
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save to backend"}
          </button>
        </div>
      </form>

      <div className="table-card">
        <div className="mb-2 text-sm font-semibold text-slate-700">
          Recent outwards
        </div>
        <div className="overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Project</th>
                <th>Issue to</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {historyPagination.currentItems.map((item) => (
                <tr key={item.code}>
                  <td className="font-mono text-[11px]">{item.code}</td>
                  <td>{item.projectName || "—"}</td>
                  <td>{item.issueTo || "—"}</td>
                  <td>{item.status}</td>
                  <td>{formatDate(item.date)}</td>
                </tr>
              ))}
              {outwardHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No outward records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <PaginationControls
            page={historyPagination.page}
            totalPages={historyPagination.totalPages}
            pageSize={historyPagination.pageSize}
            totalItems={historyPagination.totalItems}
            onPageChange={historyPagination.setPage}
            onPageSizeChange={historyPagination.setPageSize}
          />
        </div>
      </div>

      <IssueModal
        line={modalLine}
        values={modalValues}
        onChange={(values) => dispatch(setOutwardModalValues(values))}
        onSave={saveModalLine}
        onClose={() => dispatch(setOutwardModalLine(null))}
      />
    </div>
  );
};

export default OutwardPage;
