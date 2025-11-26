import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PaginationControls from "../../components/PaginationControls";
import usePagination from "../../hooks/usePagination";
import { refreshInventoryCodes, submitTransfer } from "../../store/slices/workspaceSlice";
import {
  clearTransferSelections,
  setTransferField,
  setTransferModalLine,
  setTransferModalValues,
  setTransferSaving,
  setTransferSelectedLine,
} from "../../store/slices/workspaceUiSlice";
import type { RootState } from "../../store/store";

// ---- Domain types ---------------------------------------------------------

export interface Project {
  id: string | number;
  code: string;
  name: string;
  [key: string]: unknown;
}

export interface BomLine {
  id?: string | number;
  materialId?: string | number;
  code?: string;
  name?: string;
  unit?: string;
  balanceQty?: number;
  allocatedQty?: number;
  qty?: number;
  [key: string]: unknown;
}

export interface TransferMaterialLine extends BomLine {
  materialId: string;
  availableQty: number;
}

export interface TransferHistoryRecord {
  code: string;
  fromProjectName?: string | null;
  fromSite?: string | null;
  toProjectName?: string | null;
  toSite?: string | null;
  remarks?: string | null;
  date?: string | number | Date | null;
  [key: string]: unknown;
}

export interface CodesState {
  transfer?: string;
  [key: string]: unknown;
}

export interface WorkspaceStateShape {
  codes: CodesState;
  transferHistory: TransferHistoryRecord[];
  assignedProjects: Project[];
  // Allow both string/number keys; fall back to any to avoid over-strictness
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bomByProject?: Record<string, BomLine[]> | Record<number, BomLine[]> | any;
  projects?: Project[];
  [key: string]: unknown;
}

export interface AuthStateShape {
  token?: string;
  [key: string]: unknown;
}

export interface TransferModalValues {
  transferQty: string | number;
}

export interface TransferSelectedLineValues {
  transferQty: number;
}

export type TransferSelectedLinesMap = Record<string, TransferSelectedLineValues>;

export interface TransferUiState {
  fromProject: string;
  toProject: string;
  fromSite: string;
  toSite: string;
  remarks: string;
  saving: boolean;
  selectedLines: TransferSelectedLinesMap;
  modalLine: TransferMaterialLine | null;
  modalValues: TransferModalValues;
}

// ---- Helpers --------------------------------------------------------------

function formatDate(value?: string | number | Date | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatLocation(projectName?: string | null, site?: string | null): string {
  if (!projectName) return site || "--";
  return site ? `${projectName} · ${site}` : projectName;
}

// ---- TransferModal component ----------------------------------------------

interface TransferModalProps {
  line: TransferMaterialLine | null;
  values: TransferModalValues;
  onChange: (values: TransferModalValues) => void;
  onSave: () => void;
  onClose: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({
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
              {line.availableQty ?? line.allocatedQty ?? line.qty ?? "-"}
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
          Transfer quantity
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.transferQty}
            onChange={(e) => onChange({ transferQty: e.target.value })}
            className="rounded border border-slate-200 px-3 py-2"
          />
        </label>

        <p className="mt-3 text-xs text-slate-500">
          Save to include this material in the site transfer.
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

// ---- Main page component --------------------------------------------------

const TransferPage: React.FC = () => {
  const dispatch = useDispatch();

  const {
    codes,
    transferHistory,
    assignedProjects,
    bomByProject,
    projects,
  } = useSelector<RootState, WorkspaceStateShape>(
    (state) => state.workspace as unknown as WorkspaceStateShape
  );

  const { token } = useSelector<RootState, AuthStateShape>(
    (state) => state.auth as unknown as AuthStateShape
  );

  const {
    fromProject,
    toProject,
    fromSite,
    toSite,
    remarks,
    saving,
    selectedLines,
    modalLine,
    modalValues,
  } = useSelector<RootState, TransferUiState>(
    (state) => state.workspaceUi.transfer as unknown as TransferUiState
  );

  const allocatedMaterials = useMemo<TransferMaterialLine[]>(() => {
    if (!fromProject) return [];
    const bomStore = bomByProject ?? {};
    const byString = (bomStore as Record<string, BomLine[]>)[fromProject];
    const byNumber = (bomStore as Record<number, BomLine[]>)[Number(fromProject)];
    const bom = byString ?? byNumber ?? [];

    return bom.map((line) => ({
      ...line,
      materialId: String(line.materialId ?? line.id ?? ""),
      availableQty: line.balanceQty ?? line.allocatedQty ?? line.qty ?? 0,
    }));
  }, [bomByProject, fromProject]);

  const materialPagination = usePagination<TransferMaterialLine>(allocatedMaterials, 10);
  const historyPagination = usePagination<TransferHistoryRecord>(
    transferHistory || [],
    10
  );

  const selectedLineCount = useMemo(
    () => Object.keys(selectedLines).length,
    [selectedLines]
  );

  useEffect(() => {
    dispatch(clearTransferSelections());
  }, [dispatch, fromProject]);

  const fromProjects = useMemo<Project[]>(() => {
    if (assignedProjects?.length) return assignedProjects;
    return projects || [];
  }, [assignedProjects, projects]);

  const toProjects = useMemo<Project[]>(() => projects || fromProjects, [
    fromProjects,
    projects,
  ]);

  useEffect(() => {
    if (!fromProject && fromProjects.length > 0) {
      dispatch(
        setTransferField({
          field: "fromProject",
          value: String(fromProjects[0].id),
        })
      );
    }
  }, [dispatch, fromProject, fromProjects]);

  useEffect(() => {
    if (fromProject && !toProject && toProjects.length > 0) {
      const fallback =
        toProjects.find((p) => String(p.id) !== String(fromProject)) ||
        toProjects[0];
      dispatch(
        setTransferField({
          field: "toProject",
          value: String(fallback.id),
        })
      );
    }
  }, [dispatch, fromProject, toProject, toProjects]);

  const openModalForLine = (line: TransferMaterialLine): void => {
    const materialKey = String(line.materialId);
    dispatch(setTransferModalLine(line));
    dispatch(
      setTransferModalValues({
        transferQty: selectedLines[materialKey]?.transferQty ?? "",
      })
    );
  };

  const saveModalLine = (): void => {
    if (!modalLine) return;
    const materialKey = String(modalLine.materialId);
    const transferQty = Number(modalValues.transferQty || 0);

    dispatch(
      setTransferSelectedLine({
        materialId: materialKey,
        transferQty,
      })
    );
    dispatch(setTransferModalLine(null));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!token) return;

    const selectedLinesArray = Object.entries(selectedLines)
      .map(([lineMaterialId, values]) => {
        const materialIdNumber = Number(lineMaterialId);
        return {
          materialId: Number.isNaN(materialIdNumber)
            ? lineMaterialId
            : materialIdNumber,
          transferQty: Number(values.transferQty || 0),
        };
      })
      .filter((line) => line.transferQty > 0);

    if (!fromProject || !toProject || selectedLinesArray.length === 0) {
      toast.error(
        "From site, destination, and at least one material selection are required."
      );
      return;
    }

    if (fromProject === toProject) {
      const fromLabel = fromSite.trim();
      const toLabel = toSite.trim();
      if (!fromLabel || !toLabel) {
        toast.error(
          "Provide both source and destination site names for same-project transfers."
        );
        return;
      }
      if (fromLabel.toLowerCase() === toLabel.toLowerCase()) {
        toast.error("Source and destination sites must differ for transfers.");
        return;
      }
    }

    dispatch(setTransferSaving(true));
    try {
      await dispatch(
        submitTransfer({
          token,
          payload: {
            code: codes.transfer,
            fromProjectId: Number.isNaN(Number(fromProject))
              ? fromProject
              : Number(fromProject),
            toProjectId: Number.isNaN(Number(toProject))
              ? toProject
              : Number(toProject),
            fromSite: fromSite.trim() || undefined,
            toSite: toSite.trim() || undefined,
            remarks: remarks || undefined,
            lines: selectedLinesArray,
          },
        })
      ).unwrap();
      toast.success("Transfer saved via backend");
      dispatch(refreshInventoryCodes(token));
      dispatch(setTransferField({ field: "remarks", value: "" }));
      dispatch(clearTransferSelections());
      dispatch(setTransferField({ field: "fromSite", value: "" }));
      dispatch(setTransferField({ field: "toSite", value: "" }));
    } catch (error) {
      const message =
        (error as { message?: string }).message ??
        "Failed to save transfer. Please try again.";
      toast.error(message);
    } finally {
      dispatch(setTransferSaving(false));
    }
  };

  const selectedSummary = useMemo(
    () =>
      Object.entries(selectedLines).map(([materialId, values]) => {
        const line = allocatedMaterials.find(
          (item) => String(item.materialId) === String(materialId)
        );
        return {
          id: materialId,
          label: line ? `${line.code} — ${line.name}` : materialId,
          transferQty: values.transferQty,
        };
      }),
    [allocatedMaterials, selectedLines]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Transfer register
          </h1>
          <p className="text-sm text-slate-500">
            Click a material row to enter site-to-site transfer quantities.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          Next code: {codes.transfer || "--"}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            From project
            <select
              value={fromProject}
              onChange={(e) =>
                dispatch(
                  setTransferField({
                    field: "fromProject",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Select project</option>
              {fromProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            From site
            <input
              type="text"
              value={fromSite}
              onChange={(e) =>
                dispatch(
                  setTransferField({
                    field: "fromSite",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
              placeholder="e.g., Warehouse"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            To project
            <select
              value={toProject}
              onChange={(e) =>
                dispatch(
                  setTransferField({
                    field: "toProject",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Select project</option>
              {toProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            To site
            <input
              type="text"
              value={toSite}
              onChange={(e) =>
                dispatch(
                  setTransferField({
                    field: "toSite",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
              placeholder="e.g., Block A"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Remarks
            <input
              type="text"
              value={remarks}
              onChange={(e) =>
                dispatch(
                  setTransferField({
                    field: "remarks",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="text-xs text-slate-500">
            Select materials below to set transfer quantities.
          </div>
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
                  Qty: {item.transferQty || 0}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    dispatch(
                      setTransferSelectedLine({
                        materialId: item.id,
                        transferQty: 0,
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

        {fromProject && (
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
                    <th className="cell-number">Transfer Qty</th>
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
                        <td className="cell-number">
                          {line.availableQty ?? 0}
                        </td>
                        <td className="cell-number">
                          {selectedLines[materialKey]?.transferQty ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                  {allocatedMaterials.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 text-center text-slate-500"
                      >
                        No allocations available for this project.
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
              Use the modal to capture one or more materials per transfer.
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
          Recent transfers
        </div>
        <div className="overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>From</th>
                <th>To</th>
                <th>Remarks</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {historyPagination.currentItems.map((item) => (
                <tr key={item.code}>
                  <td className="font-mono text-[11px]">{item.code}</td>
                  <td>
                    {formatLocation(item.fromProjectName, item.fromSite)}
                  </td>
                  <td>{formatLocation(item.toProjectName, item.toSite)}</td>
                  <td>{item.remarks || "—"}</td>
                  <td>{formatDate(item.date)}</td>
                </tr>
              ))}
              {transferHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No transfer records yet.
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

      <TransferModal
        line={modalLine}
        values={modalValues}
        onChange={(values) => dispatch(setTransferModalValues(values))}
        onSave={saveModalLine}
        onClose={() => dispatch(setTransferModalLine(null))}
      />
    </div>
  );
};

export default TransferPage;
