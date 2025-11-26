import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PaginationControls from "../../components/PaginationControls";
import usePagination from "../../hooks/usePagination";
import { refreshInventoryCodes, submitInward } from "../../store/slices/workspaceSlice";
import {
  clearInwardSelections,
  setInwardField,
  setInwardModalLine,
  setInwardModalValues,
  setInwardSaving,
  setInwardSelectedLine,
} from "../../store/slices/workspaceUiSlice";
import type { RootState, AppDispatch } from "../../store/store";

// -------- Types -------- //

interface WorkspaceCodesState {
  inward?: string | null;
  // other codes can exist
  [key: string]: string | null | undefined;
}

export interface WorkspaceProject {
  id: string | number;
  code: string;
  name: string;
}

export interface InwardHistoryLine {
  id: string | number;
  code?: string | null;
  name?: string | null;
  materialCode?: string | null;
  materialName?: string | null;
  unit?: string | null;
  orderedQty?: number | null;
  receivedQty?: number | null;
}

export interface InwardHistoryRecord {
  id?: string | number | null;
  code?: string | null;
  projectName?: string | null;
  deliveryDate?: string | null;
  date?: string | null;
  invoiceNo?: string | null;
  supplierName?: string | null;
  vehicleNo?: string | null;
  items?: number | null;
  lines?: InwardHistoryLine[];
}

export interface ProjectBomLine {
  id?: string | number | null;
  materialId?: string | number | null;
  code?: string | null;
  name?: string | null;
  unit?: string | null;
  allocatedQty?: number | null;
  qty?: number | null;
  [key: string]: unknown;
}

export type AllocatedMaterial = ProjectBomLine & {
  materialId: string;
};

interface WorkspaceStateSlice {
  codes: WorkspaceCodesState;
  inwardHistory: InwardHistoryRecord[];
  assignedProjects: WorkspaceProject[];
  bomByProject: Record<string, ProjectBomLine[] | undefined>;
}

export interface InwardSelectedLineValues {
  orderedQty: number | string;
  receivedQty: number | string;
}

export interface InwardModalValues {
  orderedQty: string;
  receivedQty: string;
}

export interface InwardUiState {
  projectId: string;
  invoiceNo: string;
  supplierName: string;
  remarks: string;
  saving: boolean;
  selectedLines: Record<string, InwardSelectedLineValues>;
  modalLine: AllocatedMaterial | null;
  modalValues: InwardModalValues;
}

interface AuthStateSlice {
  token: string | null;
}

// -------- Helpers -------- //

function formatDate(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

// -------- Quantity Modal -------- //

interface QuantityModalProps {
  line: AllocatedMaterial | null;
  values: InwardModalValues;
  onChange: (values: InwardModalValues) => void;
  onSave: () => void;
  onClose: () => void;
}

const QuantityModal: React.FC<QuantityModalProps> = ({
  line,
  values,
  onChange,
  onSave,
  onClose,
}) => {
  if (!line) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-3">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {line.code} — {line.name}
            </div>
            <div className="text-xs text-slate-500">
              {line.unit} · Allocated: {line.allocatedQty ?? line.qty ?? "-"}
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

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Ordered quantity
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.orderedQty}
              onChange={(e) =>
                onChange({
                  ...values,
                  orderedQty: e.target.value,
                })
              }
              className="rounded border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Received quantity
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.receivedQty}
              onChange={(e) =>
                onChange({
                  ...values,
                  receivedQty: e.target.value,
                })
              }
              className="rounded border border-slate-200 px-3 py-2"
              required
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Save to include this material in the inward submission. Leave both values
          empty or zero to deselect.
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

// -------- Page Component -------- //

const InwardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { codes, inwardHistory, assignedProjects, bomByProject } = useSelector<
    RootState,
    WorkspaceStateSlice
  >((state) => state.workspace as unknown as WorkspaceStateSlice);

  const { token } = useSelector<RootState, AuthStateSlice>((state) => state.auth as AuthStateSlice);

  const inwardUi = useSelector<RootState, InwardUiState>(
    (state) => state.workspaceUi.inward as unknown as InwardUiState
  );

  const {
    projectId,
    invoiceNo,
    supplierName,
    remarks,
    saving,
    selectedLines,
    modalLine,
    modalValues,
  } = inwardUi;

  const allocatedMaterials: AllocatedMaterial[] = useMemo(() => {
    if (!projectId) return [];
    const bomLines = bomByProject?.[projectId] ?? [];
    return bomLines.map((line) => ({
      ...line,
      materialId: String(line.materialId ?? line.id ?? ""),
    })) as AllocatedMaterial[];
  }, [bomByProject, projectId]);

  const materialPagination = usePagination<AllocatedMaterial>(allocatedMaterials, 10);
  const historyPagination = usePagination<InwardHistoryRecord>(inwardHistory || [], 10);

  const selectedLineCount = useMemo(
    () => Object.keys(selectedLines).length,
    [selectedLines]
  );

  // Clear selections when project changes
  useEffect(() => {
    dispatch(clearInwardSelections());
  }, [dispatch, projectId]);

  // Default project selection
  useEffect(() => {
    if (!projectId && assignedProjects.length > 0) {
      dispatch(
        setInwardField({
          field: "projectId",
          value: String(assignedProjects[0].id),
        })
      );
    }
  }, [assignedProjects, dispatch, projectId]);

  const openModalForLine = (line: AllocatedMaterial): void => {
    const materialKey = String(line.materialId);
    const existing = selectedLines[materialKey];

    dispatch(setInwardModalLine(line));
    dispatch(
      setInwardModalValues({
        orderedQty: existing ? String(existing.orderedQty ?? "") : "",
        receivedQty: existing ? String(existing.receivedQty ?? "") : "",
      })
    );
  };

  const saveModalLine = (): void => {
    if (!modalLine) return;

    const materialKey = String(modalLine.materialId);
    const ordered = Number(modalValues.orderedQty || 0);
    const received = Number(modalValues.receivedQty || 0);

    dispatch(
      setInwardSelectedLine({
        materialId: materialKey,
        orderedQty: ordered,
        receivedQty: received,
      })
    );
    dispatch(setInwardModalLine(null));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (!token) return;

    const selectedLinesArray = Object.entries(selectedLines)
      .map(([lineMaterialId, values]) => ({
        materialId: lineMaterialId,
        orderedQty: Number(values.orderedQty || values.receivedQty || 0),
        receivedQty: Number(values.receivedQty || 0),
      }))
      .filter((line) => line.receivedQty > 0 || line.orderedQty > 0);

    if (!projectId || selectedLinesArray.length === 0) {
      toast.error(
        "Select a project and choose at least one material from the table below."
      );
      return;
    }

    dispatch(setInwardSaving(true));
    try {
      await dispatch(
        submitInward({
          token,
          payload: {
            code: codes.inward,
            projectId,
            type: "SUPPLY",
            invoiceNo: invoiceNo || undefined,
            invoiceDate: undefined,
            deliveryDate: undefined,
            vehicleNo: undefined,
            remarks: remarks || undefined,
            supplierName: supplierName || undefined,
            lines: selectedLinesArray,
          },
        })
      ).unwrap();

      toast.success("Inward saved via backend");
      dispatch(refreshInventoryCodes(token));

      dispatch(setInwardField({ field: "invoiceNo", value: "" }));
      dispatch(setInwardField({ field: "supplierName", value: "" }));
      dispatch(setInwardField({ field: "remarks", value: "" }));
      dispatch(clearInwardSelections());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save inward";
      toast.error(message);
    } finally {
      dispatch(setInwardSaving(false));
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
          label: line
            ? `${line.code ?? ""} — ${line.name ?? ""}`
            : materialId,
          orderedQty: values.orderedQty,
          receivedQty: values.receivedQty,
        };
      }),
    [allocatedMaterials, selectedLines]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Inward register</h1>
          <p className="text-sm text-slate-500">
            Click a material row to enter ordered and received quantities.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          Next code: {codes.inward || "--"}
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
                  setInwardField({ field: "projectId", value: e.target.value })
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
            Invoice number
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) =>
                dispatch(
                  setInwardField({ field: "invoiceNo", value: e.target.value })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Supplier name
            <input
              type="text"
              value={supplierName}
              onChange={(e) =>
                dispatch(
                  setInwardField({
                    field: "supplierName",
                    value: e.target.value,
                  })
                )
              }
              className="rounded border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Remarks
            <input
              type="text"
              value={remarks}
              onChange={(e) =>
                dispatch(
                  setInwardField({ field: "remarks", value: e.target.value })
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
                  O:{item.orderedQty || 0} / R:{item.receivedQty || 0}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    dispatch(
                      setInwardSelectedLine({
                        materialId: item.id,
                        orderedQty: 0,
                        receivedQty: 0,
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
                Allocated materials for this project
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
                    <th className="cell-number">Allocated</th>
                    <th className="cell-number">Ordered</th>
                    <th className="cell-number">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {materialPagination.currentItems.map((line) => {
                    const materialKey = line.materialId;
                    const selected = selectedLines[materialKey];
                    const isSelected = Boolean(selected);

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
                          {line.allocatedQty ?? line.qty ?? 0}
                        </td>
                        <td className="cell-number">
                          {selected?.orderedQty ?? 0}
                        </td>
                        <td className="cell-number">
                          {selected?.receivedQty ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                  {allocatedMaterials.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
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
              Materials are sourced from the project allocation. Use the modal to
              capture ordered and received quantities.
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
          Recent inwards
        </div>
        <div className="overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Project</th>
                <th>Supplier</th>
                <th>Invoice</th>
                <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {historyPagination.currentItems.map((item) => (
                <tr key={item.code ?? item.id ?? Math.random()}>
                  <td className="font-mono text-[11px]">{item.code}</td>
                  <td>{item.projectName || "—"}</td>
                  <td>{item.supplierName || "—"}</td>
                  <td>{item.invoiceNo || "—"}</td>
                  <td>{formatDate(item.deliveryDate || item.date)}</td>
                </tr>
              ))}
              {inwardHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-slate-500"
                  >
                    No inward records yet.
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

      <QuantityModal
        line={modalLine}
        values={modalValues}
        onChange={(values) => dispatch(setInwardModalValues(values))}
        onSave={saveModalLine}
        onClose={() => dispatch(setInwardModalLine(null))}
      />
    </div>
  );
};

export default InwardPage;
