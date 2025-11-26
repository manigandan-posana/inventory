import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import PaginationControls from "./PaginationControls";
import {
  createProjectAllocations,
  deleteProjectAllocation,
  fetchProjectBom,
  updateProjectAllocation,
} from "../store/slices/adminAllocationsSlice";
import type { RootState, AppDispatch } from "../store/store";

/* ---------- Domain Types ---------- */

export interface Material {
  id: string | number;
  code?: string;
  name?: string;
  partNo?: string;
  unit?: string;
  category?: string;
  lineType?: string;
}

export interface Project {
  id: string | number;
  code?: string;
  name?: string;
}

export interface AllocationLine {
  projectId: string | number;
  materialId: string | number;
  qty?: number;
  code?: string;
  name?: string;
  partNo?: string;
  lineType?: string;
  unit?: string;
  category?: string;
}

export interface AllocationWithMaterial extends AllocationLine {
  materialRef?: Material;
}

export interface AllocationInputLine {
  materialId: string | number;
  quantity: number;
}

interface AdminAllocationsState {
  bomByProject: Record<string, AllocationLine[]>;
  bomStatusByProject: Record<string, string>;
  error: string;
}

/* ---------- Helpers & Small Types ---------- */

const normalizeId = (
  value: string | number | null | undefined
): string => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

type AllocationFormMode = "create" | "edit";

interface AllocationFormState {
  open: boolean;
  mode: AllocationFormMode;
  materialId: string;
  quantity: string; // stored as text in the input
  saving: boolean;
  line: AllocationWithMaterial | null;
}

interface ViewModalState {
  open: boolean;
  line: AllocationWithMaterial | null;
}

interface SelectedLine {
  quantity: number;
  material: Material;
}

type SelectedLinesMap = Record<string, SelectedLine>;

interface QuantityModalState {
  open: boolean;
  material: Material | null;
  quantity: string;
}

interface MultiFiltersState {
  category: string;
  lineType: string;
}

interface AllocationFilters {
  categories: string[];
  lineTypes: string[];
  status: "all" | "allocated" | "unallocated";
}

interface PaginationState<T> {
  currentItems: T[];
  totalItems: number;
  totalPages: number;
  page: number;
}

interface SelectedSummaryItem {
  materialId: string;
  label: string;
  quantity: number;
}

/* ---------- Modal Component ---------- */

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 text-[11px] text-slate-800">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-semibold">
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto py-3 text-slate-600">
          {children}
        </div>
        {footer && (
          <div className="border-t border-slate-200 pt-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- MultiAllocationPanel ---------- */

interface MultiAllocationPanelProps {
  projectId: string;
  materials: Material[];
  allocatedMaterialIds: Set<string>;
  onSaveLines?: (lines: AllocationInputLine[]) => Promise<void> | void;
}

function MultiAllocationPanel({
  projectId,
  materials,
  allocatedMaterialIds,
  onSaveLines,
}: MultiAllocationPanelProps) {
  const [search, setSearch] = useState<string>("");
  const [filters, setFilters] = useState<MultiFiltersState>({
    category: "",
    lineType: "",
  });
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedLines, setSelectedLines] = useState<SelectedLinesMap>({});
  const [modalState, setModalState] = useState<QuantityModalState>({
    open: false,
    material: null,
    quantity: "",
  });
  const [saving, setSaving] = useState<boolean>(false);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          materials
            .map((m) => m.category)
            .filter((cat): cat is string => Boolean(cat))
        )
      ).sort(),
    [materials]
  );

  const lineTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          materials
            .map((m) => m.lineType)
            .filter((lt): lt is string => Boolean(lt))
        )
      ).sort(),
    [materials]
  );

  // Materials not yet allocated
  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials
      .filter((m) => !allocatedMaterialIds.has(String(m.id)))
      .filter((m) => {
        if (filters.category && m.category !== filters.category)
          return false;
        if (filters.lineType && m.lineType !== filters.lineType)
          return false;
        if (!q) return true;
        return (
          (m.code || "").toLowerCase().includes(q) ||
          (m.name || "").toLowerCase().includes(q) ||
          (m.partNo || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [materials, allocatedMaterialIds, search, filters]);

  const pagination = useMemo<PaginationState<Material>>(() => {
    const totalItems = filteredMaterials.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageSize)
    );
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const currentItems = filteredMaterials.slice(
      start,
      start + pageSize
    );
    return {
      currentItems,
      totalItems,
      totalPages,
      page: currentPage,
    };
  }, [filteredMaterials, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const openModalForMaterial = (material: Material) => {
    const key = String(material.id);
    const existing = selectedLines[key];
    setModalState({
      open: true,
      material,
      quantity: existing ? String(existing.quantity) : "",
    });
  };

  const closeModal = () => {
    setModalState({
      open: false,
      material: null,
      quantity: "",
    });
  };

  const handleSaveModal = () => {
    if (!modalState.material) return;
    const quantity = Number(modalState.quantity || 0);
    if (!quantity || quantity <= 0) {
      toast.error("Enter required quantity greater than zero");
      return;
    }
    const key = String(modalState.material.id);
    setSelectedLines((prev) => ({
      ...prev,
      [key]: { quantity, material: modalState.material as Material },
    }));
    closeModal();
  };

  const handleSubmitAll = async () => {
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }
    if (!onSaveLines) {
      toast.error("Unable to save selections");
      return;
    }
    const entries = Object.entries(selectedLines);
    if (entries.length === 0) {
      toast.error("Select at least one material to allocate");
      return;
    }
    setSaving(true);
    try {
      const hasInvalid = entries.some(
        ([, data]) =>
          !data.quantity || Number(data.quantity) <= 0
      );
      if (hasInvalid) {
        toast.error(
          "Enter a required quantity greater than zero for each material"
        );
        setSaving(false);
        return;
      }

      await onSaveLines(
        entries.map(([materialId, data]) => ({
          materialId,
          quantity: data.quantity,
        }))
      );
      setSelectedLines({});
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to allocate materials"
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.keys(selectedLines).length;

  const selectedSummary = useMemo<SelectedSummaryItem[]>(
    () =>
      Object.entries(selectedLines).map(
        ([materialId, { quantity, material }]) => ({
          materialId,
          label: material
            ? `${material.code || materialId} – ${
                material.name || ""
              }`
            : materialId,
          quantity,
        })
      ),
    [selectedLines]
  );

  const toggleSelected = (
    material: Material,
    value?: boolean
  ) => {
    const key = String(material.id);
    setSelectedLines((prev) => {
      const next: SelectedLinesMap = { ...prev };
      if (value === false || (value === undefined && prev[key])) {
        delete next[key];
        return next;
      }
      next[key] = prev[key] || { quantity: 0, material };
      return next;
    });
  };

  const updateSelectedQuantity = (
    materialId: string,
    quantity: number
  ) => {
    setSelectedLines((prev) => {
      const key = String(materialId);
      const existing = prev[key];
      const next: SelectedLinesMap = { ...prev };
      if (!existing) {
        const material = materials.find(
          (m) => String(m.id) === key
        );
        if (material) {
          next[key] = { material, quantity };
        }
        return next;
      }
      next[key] = { ...existing, quantity };
      return next;
    });
  };

  const removeSelectedLine = (materialId: string) => {
    setSelectedLines((prev) => {
      const next: SelectedLinesMap = { ...prev };
      delete next[materialId];
      return next;
    });
  };

  if (!projectId) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
        Select a project first to see materials available for
        allocation.
      </div>
    );
  }

  return (
    <>
      {/* LEFT: all materials not yet allocated */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="font-semibold text-slate-800">
              All materials (not yet allocated)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-slate-500">
                <span className="whitespace-nowrap">
                  Line
                </span>
                <select
                  value={filters.lineType}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      lineType: e.target.value,
                    }))
                  }
                  className="rounded border border-slate-200 bg-white px-2 py-[3px] text-[11px] text-slate-700"
                >
                  <option value="">All</option>
                  {lineTypeOptions.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-slate-500">
                <span className="whitespace-nowrap">
                  Category
                </span>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="rounded border border-slate-200 bg-white px-2 py-[3px] text-[11px] text-slate-700"
                >
                  <option value="">All</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1 text-slate-500">
                <span>Search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Code, name or part no."
                  className="w-44 rounded border border-slate-200 px-2 py-[3px] text-[11px] text-slate-700"
                />
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-[11px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all materials"
                      checked={
                        pagination.currentItems.length > 0 &&
                        pagination.currentItems.every((m) =>
                          selectedLines[String(m.id)]
                        )
                      }
                      onChange={(e) =>
                        pagination.currentItems.forEach(
                          (m) =>
                            toggleSelected(
                              m,
                              e.target.checked
                            )
                        )
                      }
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    />
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Code
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Material
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Part No
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Line
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    UOM
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Category
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Required qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.currentItems.map((material) => {
                  const key = String(material.id);
                  const existing = selectedLines[key];
                  return (
                    <tr
                      key={key}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        existing ? "bg-emerald-50" : ""
                      }`}
                      onClick={() =>
                        openModalForMaterial(material)
                      }
                    >
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(existing)}
                          onChange={(e) =>
                            toggleSelected(
                              material,
                              e.target.checked
                            )
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        />
                      </td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">
                        {material.code || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {material.name || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {material.partNo || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {material.lineType || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {material.unit || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {material.category || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {existing
                          ? Number(
                              existing.quantity || 0
                            ).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
                {pagination.currentItems.length === 0 && (
                  <tr>
                    <td
                      className="border border-slate-200 px-2 py-3 text-center text-slate-500"
                      colSpan={8}
                    >
                      All materials are already allocated for
                      this project, or nothing matches your
                      filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2">
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pageSize}
              totalItems={pagination.totalItems}
              onPageChange={(value) => setPage(value)}
              onPageSizeChange={(value) =>
                setPageSize(value)
              }
            />
          </div>
        </div>

        {/* RIGHT: selected materials summary */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-700">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <div className="text-[12px] font-semibold text-slate-900">
                Selected materials
              </div>
              <div className="text-[10px] text-slate-500">
                Tap rows on the left to add quantities
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-semibold text-slate-600">
              {selectedCount}
            </span>
          </div>
          {selectedSummary.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-6 text-slate-500">
              No materials selected yet.
            </div>
          )}
          {selectedSummary.length > 0 && (
            <div className="mt-3 space-y-3 overflow-y-auto">
              {selectedSummary.map((item) => (
                <div
                  key={item.materialId}
                  className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-slate-900">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Required qty
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.quantity}
                    onChange={(e) =>
                      updateSelectedQuantity(
                        item.materialId,
                        Number(e.target.value)
                      )
                    }
                    className="w-24 rounded border border-slate-200 px-2 py-[3px] text-right text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeSelectedLine(item.materialId)
                    }
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between rounded border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                <span>Total required quantity</span>
                <span>
                  {selectedSummary
                    .reduce(
                      (sum, item) =>
                        sum + Number(item.quantity || 0),
                      0
                    )
                    .toLocaleString()}
                </span>
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={
                saving || selectedSummary.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Allocating…" : "Allocate selected"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLines({})}
              disabled={
                selectedSummary.length === 0 || saving
              }
              className="rounded border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear selection
            </button>
          </div>
        </div>
      </div>

      {/* quantity modal */}
      <Modal
        open={modalState.open}
        title={
          modalState.material
            ? `Required quantity · ${
                modalState.material.code || ""
              } – ${modalState.material.name || ""}`
            : "Required quantity"
        }
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded border border-slate-200 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModal}
              className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              Save line
            </button>
          </div>
        }
      >
        {modalState.material ? (
          <div className="space-y-3 text-[11px]">
            <div>
              <div className="font-semibold text-slate-800">
                {modalState.material.code} –{" "}
                {modalState.material.name}
              </div>
              <div className="text-slate-500">
                {modalState.material.partNo && (
                  <span className="mr-2">
                    Part: {modalState.material.partNo}
                  </span>
                )}
                {modalState.material.unit && (
                  <span>UOM: {modalState.material.unit}</span>
                )}
              </div>
            </div>
            <label className="block text-slate-700">
              Required quantity
              <input
                type="number"
                value={modalState.quantity}
                onChange={(e) =>
                  setModalState((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                min={0}
                step={0.01}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-[3px] text-slate-700"
              />
            </label>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">
            No material selected.
          </div>
        )}
      </Modal>
    </>
  );
}

/* ---------- Main ProjectAllocationManager ---------- */

interface ProjectAllocationManagerProps {
  token?: string | null;
  projects?: Project[];
  materials?: Material[];
  defaultProjectId?: string | number | null;
  onBack?: () => void;
  onProjectBomUpdate?: (projectId: string) => void;
  onCreateMaterial?: () => void;
  showMultiAllocator?: boolean;
  showAllocationTable?: boolean;
}

const emptyFormState: AllocationFormState = {
  open: false,
  mode: "create",
  materialId: "",
  quantity: "",
  saving: false,
  line: null,
};

const emptyViewState: ViewModalState = {
  open: false,
  line: null,
};

const ProjectAllocationManager: React.FC<
  ProjectAllocationManagerProps
> = ({
  token,
  projects = [],
  materials = [],
  defaultProjectId,
  onBack,
  onProjectBomUpdate,
  onCreateMaterial,
  showMultiAllocator = true,
  showAllocationTable = true,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const storeToken = useSelector(
    (state: RootState) => state.auth.token
  );
  const dataVersion = useSelector(
    (state: RootState) => state.auth.dataVersion
  );
  const { bomByProject, bomStatusByProject, error } =
    useSelector(
      (state: RootState) =>
        state.adminAllocations as AdminAllocationsState
    );

  const resolvedToken = token || storeToken || undefined;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => normalizeId(defaultProjectId ?? projects[0]?.id)
  );
  const [search, setSearch] = useState<string>("");
  const [filtersOpen, setFiltersOpen] =
    useState<boolean>(false);
  const [allocationFilters, setAllocationFilters] =
    useState<AllocationFilters>({
      categories: [],
      lineTypes: [],
      status: "all",
    });
  const [formModal, setFormModal] =
    useState<AllocationFormState>(emptyFormState);
  const [viewModal, setViewModal] =
    useState<ViewModalState>(emptyViewState);
  const [selectedLineIds, setSelectedLineIds] =
    useState<Set<string>>(new Set());

  const preventNumberScroll = useCallback(
    (event: React.WheelEvent<HTMLInputElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const sortedProjects = useMemo<Project[]>(
    () =>
      [...projects].sort((a, b) =>
        (a.code || "").localeCompare(b.code || "")
      ),
    [projects]
  );

  useEffect(() => {
    if (sortedProjects.length === 0) {
      setSelectedProjectId((prev) =>
        prev === "" ? prev : ""
      );
      return;
    }
    const normalizedSelected = normalizeId(
      selectedProjectId
    );
    const hasMatch = sortedProjects.some(
      (project) =>
        normalizeId(project.id) === normalizedSelected
    );
    if (!normalizedSelected || !hasMatch) {
      const fallback = normalizeId(sortedProjects[0].id);
      setSelectedProjectId((prev) =>
        prev === fallback ? prev : fallback
      );
    }
  }, [selectedProjectId, sortedProjects]);

  useEffect(() => {
    if (
      defaultProjectId === undefined ||
      defaultProjectId === null
    ) {
      return;
    }
    const normalizedDefault = normalizeId(defaultProjectId);
    setSelectedProjectId((prev) =>
      prev === normalizedDefault ? prev : normalizedDefault
    );
  }, [defaultProjectId]);

  const allocations: AllocationLine[] =
    selectedProjectId
      ? bomByProject[selectedProjectId] || []
      : [];

  const materialsMap = useMemo(
    () => {
      const map = new Map<string, Material>();
      materials.forEach((material) => {
        if (material?.id !== undefined) {
          map.set(String(material.id), material);
        }
      });
      return map;
    },
    [materials]
  );

  const allocatedMaterialIds = useMemo(
    () =>
      new Set(
        allocations.map((line) =>
          String(line.materialId)
        )
      ),
    [allocations]
  );

  const filterOptions = useMemo(
    () => {
      const categories = new Set<string>();
      const lineTypes = new Set<string>();
      materials.forEach((material) => {
        if (material?.category) {
          categories.add(material.category);
        }
        if (material?.lineType) {
          lineTypes.add(material.lineType);
        }
      });
      return {
        categories: Array.from(categories).sort((a, b) =>
          a.localeCompare(b)
        ),
        lineTypes: Array.from(lineTypes).sort((a, b) =>
          a.localeCompare(b)
        ),
      };
    },
    [materials]
  );

  const loading =
    bomStatusByProject[selectedProjectId] === "loading";
  const allocationError = error;

  const refreshBom = useCallback(
    async (projectId: string) => {
      if (!resolvedToken || !projectId) return;
      try {
        await dispatch(
          fetchProjectBom({
            token: resolvedToken,
            projectId,
          })
        ).unwrap();
      } catch (err: any) {
        toast.error(
          err?.message ||
            err ||
            "Unable to load allocations"
        );
      }
    },
    [dispatch, resolvedToken]
  );

  useEffect(() => {
    if (selectedProjectId) {
      void refreshBom(selectedProjectId);
    }
  }, [dataVersion, refreshBom, selectedProjectId]);

  const filteredAllocations = useMemo<
    AllocationWithMaterial[]
  >(() => {
    const query = search.trim().toLowerCase();
    const categorySet = new Set(
      (allocationFilters.categories || []).map((value) =>
        value.trim()
      )
    );
    const lineTypeSet = new Set(
      (allocationFilters.lineTypes || []).map((value) =>
        value.trim()
      )
    );

    return allocations
      .map((line) => {
        const material =
          materialsMap.get(
            String(line.materialId)
          ) || {};
        const code =
          line.code || material.code || "";
        const name =
          line.name || material.name || "";
        return {
          ...line,
          code,
          name,
          materialRef: material,
        } as AllocationWithMaterial;
      })
      .filter((line) => {
        if (!query) return true;
        return (
          (line.code || "")
            .toLowerCase()
            .includes(query) ||
          (line.name || "")
            .toLowerCase()
            .includes(query)
        );
      })
      .filter((line) => {
        if (categorySet.size === 0) return true;
        const category = (
          line.category ||
          line.materialRef?.category ||
          ""
        ).trim();
        return categorySet.has(category);
      })
      .filter((line) => {
        if (lineTypeSet.size === 0) return true;
        const lineType = (
          line.lineType ||
          line.materialRef?.lineType ||
          ""
        ).trim();
        return lineTypeSet.has(lineType);
      })
      .filter((line) => {
        if (allocationFilters.status === "allocated") {
          return Number(line.qty || 0) > 0;
        }
        if (
          allocationFilters.status === "unallocated"
        ) {
          return Number(line.qty || 0) === 0;
        }
        return true;
      })
      .sort((a, b) =>
        (a.code || "").localeCompare(b.code || "")
      );
  }, [
    allocationFilters,
    allocations,
    materialsMap,
    search,
  ]);

  const handleSaveLines = useCallback(
    async (lines: AllocationInputLine[]) => {
      if (!resolvedToken || !selectedProjectId) {
        toast.error(
          "Select a project before allocating materials"
        );
        return;
      }
      await dispatch(
        createProjectAllocations({
          token: resolvedToken,
          projectId: selectedProjectId,
          lines: lines.map((line) => ({
            materialId: Number.isNaN(
              Number(line.materialId)
            )
              ? line.materialId
              : Number(line.materialId),
            quantity: line.quantity,
          })),
        })
      ).unwrap();
      toast.success("Materials allocated to project");
      await refreshBom(selectedProjectId);
      onProjectBomUpdate?.(String(selectedProjectId));
    },
    [
      dispatch,
      onProjectBomUpdate,
      refreshBom,
      resolvedToken,
      selectedProjectId,
    ]
  );

  useEffect(() => {
    setSelectedLineIds(new Set());
  }, [selectedProjectId]);

  const handleOpenCreate = () => {
    if (!selectedProjectId) {
      toast.error(
        "Select a project to manage allocations"
      );
      return;
    }
    setFormModal({ ...emptyFormState, open: true });
  };

  const handleOpenEdit = (line: AllocationWithMaterial) => {
    setFormModal({
      open: true,
      mode: "edit",
      line,
      materialId: String(line.materialId),
      quantity: String(line.qty ?? ""),
      saving: false,
    });
  };

  const handleSubmitForm = async () => {
    if (!resolvedToken || !selectedProjectId) {
      toast.error("Sign in again to manage allocations");
      return;
    }
    const quantity = Number(formModal.quantity ?? 0);
    if (!formModal.materialId) {
      toast.error("Select a material");
      return;
    }
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error(
        "Required quantity must be zero or greater"
      );
      return;
    }
    setFormModal((prev) => ({
      ...prev,
      saving: true,
    }));
    const payload = {
      projectId: selectedProjectId,
      materialId: formModal.materialId,
      quantity,
    };

    try {
      if (formModal.mode === "edit") {
        await dispatch(
          updateProjectAllocation({
            token: resolvedToken,
            projectId: selectedProjectId,
            materialId: formModal.materialId,
            payload,
          })
        ).unwrap();
        toast.success("Allocation updated");
      } else {
        await dispatch(
          createProjectAllocations({
            token: resolvedToken,
            projectId: selectedProjectId,
            lines: [payload],
          })
        ).unwrap();
        toast.success("Allocation added");
      }
      setFormModal(emptyFormState);
      await refreshBom(selectedProjectId);
      onProjectBomUpdate?.(String(selectedProjectId));
    } catch (err: any) {
      setFormModal((prev) => ({
        ...prev,
        saving: false,
      }));
      toast.error(
        err?.message ||
          err ||
          "Unable to save allocation"
      );
    }
  };

  const handleDelete = async (
    line: AllocationWithMaterial
  ) => {
    if (
      !resolvedToken ||
      !selectedProjectId ||
      !line?.materialId
    )
      return;
    const confirmDelete =
      typeof window === "undefined"
        ? true
        : window.confirm("Remove this allocation?");
    if (!confirmDelete) return;
    try {
      await dispatch(
        deleteProjectAllocation({
          token: resolvedToken,
          projectId: selectedProjectId,
          materialId: line.materialId,
        })
      ).unwrap();
      toast.success("Allocation removed");
      await refreshBom(selectedProjectId);
      onProjectBomUpdate?.(String(selectedProjectId));
    } catch (err: any) {
      toast.error(
        err?.message ||
          err ||
          "Unable to delete allocation"
      );
    }
  };

  const toggleSelectLine = (materialId: string | number) => {
    const key = String(materialId);
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredAllocations.length === 0) return;
    const allIds = filteredAllocations.map((line) =>
      String(line.materialId)
    );
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      const allSelected = allIds.every((id) =>
        next.has(id)
      );
      if (allSelected) {
        return new Set<string>();
      }
      return new Set<string>(allIds);
    });
  };

  const handleBulkDelete = async () => {
    if (!resolvedToken || !selectedProjectId) return;
    if (selectedLineIds.size === 0) {
      toast.error(
        "Select at least one allocation to delete"
      );
      return;
    }
    const confirmDelete =
      typeof window === "undefined"
        ? true
        : window.confirm("Remove selected allocations?");
    if (!confirmDelete) return;
    try {
      const ids = Array.from(selectedLineIds);
      await Promise.all(
        ids.map((materialId) =>
          dispatch(
            deleteProjectAllocation({
              token: resolvedToken,
              projectId: selectedProjectId,
              materialId,
            })
          ).unwrap()
        )
      );
      toast.success("Selected allocations removed");
      setSelectedLineIds(new Set());
      await refreshBom(selectedProjectId);
      onProjectBomUpdate?.(String(selectedProjectId));
    } catch (err: any) {
      toast.error(
        err?.message ||
          err ||
          "Unable to delete allocations"
      );
    }
  };

  const handleOpenView = (line: AllocationWithMaterial) => {
    setViewModal({ open: true, line });
  };

  const availableMaterials = useMemo<Material[]>(
    () =>
      materials
        .filter((material) => {
          if (formModal.mode === "edit") {
            return true;
          }
          return !allocatedMaterialIds.has(
            String(material.id)
          );
        })
        .sort((a, b) =>
          (a.code || "").localeCompare(b.code || "")
        ),
    [
      materials,
      allocatedMaterialIds,
      formModal.mode,
    ]
  );

  const currentProject =
    sortedProjects.find(
      (p) =>
        normalizeId(p.id) === selectedProjectId
    ) || null;

  const viewProject = viewModal.line
    ? sortedProjects.find(
        (p) =>
          normalizeId(p.id) ===
          normalizeId(viewModal.line?.projectId)
      ) || currentProject
    : null;

  const selectedCount = selectedLineIds.size;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="text-base font-semibold text-slate-900">
            Material Allocations
          </div>
          <div className="text-[11px] text-slate-500">
            Allocate total required quantities per project.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {onBack && (
            <button
              type="button"
              onClick={() => onBack()}
              className="rounded border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-100"
            >
              Back to Inventory
            </button>
          )}
          {onCreateMaterial && (
            <button
              type="button"
              onClick={onCreateMaterial}
              className="rounded border border-sky-200 px-3 py-1 text-sky-700 hover:bg-sky-50"
            >
              New material
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded border border-emerald-300 px-3 py-1 text-emerald-700 hover:bg-emerald-50"
          >
            New allocation
          </button>
        </div>
      </div>

      {/* Project selector + search */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <label className="flex items-center gap-2">
          <span className="text-slate-500">
            Project
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) =>
              setSelectedProjectId(e.target.value)
            }
            className="rounded border border-slate-200 bg-white px-2 py-[3px] text-slate-700"
          >
            {sortedProjects.length === 0 && (
              <option value="">No projects</option>
            )}
            {sortedProjects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.code} – {project.name}
              </option>
            ))}
          </select>
        </label>
        {showAllocationTable && (
          <>
            <input
              type="text"
              placeholder="Search code or material"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full max-w-xs rounded border border-slate-200 px-2 py-[3px] text-slate-700"
            />
            <button
              type="button"
              onClick={() =>
                setFiltersOpen((prev) => !prev)
              }
              className="rounded border border-slate-200 px-3 py-[3px] text-slate-600 hover:bg-slate-50"
            >
              {filtersOpen
                ? "Hide filters"
                : "Advanced filters"}
            </button>
          </>
        )}
        {loading && (
          <span className="text-[10px] text-slate-500">
            Loading…
          </span>
        )}
      </div>

      {/* Filters */}
      {filtersOpen && showAllocationTable && (
        <div className="mt-2 grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-[11px] text-slate-600 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Line Type
            </span>
            <select
              multiple
              value={allocationFilters.lineTypes}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
                setAllocationFilters((prev) => ({
                  ...prev,
                  lineTypes: values,
                }));
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {filterOptions.lineTypes.map((lineType) => (
                <option
                  key={lineType}
                  value={lineType}
                >
                  {lineType}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Category
            </span>
            <select
              multiple
              value={allocationFilters.categories}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
                setAllocationFilters((prev) => ({
                  ...prev,
                  categories: values,
                }));
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {filterOptions.categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Allocation Status
            </span>
            <select
              value={allocationFilters.status}
              onChange={(event) =>
                setAllocationFilters((prev) => ({
                  ...prev,
                  status: event.target.value as AllocationFilters["status"],
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="all">
                All materials
              </option>
              <option value="allocated">
                With quantities
              </option>
              <option value="unallocated">
                Awaiting allocation
              </option>
            </select>
          </label>
          <div className="sm:col-span-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              onClick={() =>
                setAllocationFilters({
                  categories: [],
                  lineTypes: [],
                  status: "all",
                })
              }
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {allocationError && (
        <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
          {allocationError}
        </div>
      )}

      {/* Multi allocator */}
      {showMultiAllocator && (
        <MultiAllocationPanel
          projectId={selectedProjectId}
          materials={materials}
          allocatedMaterialIds={allocatedMaterialIds}
          onSaveLines={handleSaveLines}
        />
      )}

      {/* Allocation table */}
      {showAllocationTable && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="text-slate-700">
              Selected: {selectedCount}
            </span>
            <button
              type="button"
              onClick={() => toggleSelectAll()}
              className="rounded border border-slate-200 px-3 py-[3px] hover:bg-slate-50"
              disabled={filteredAllocations.length === 0}
            >
              {filteredAllocations.length > 0 &&
              filteredAllocations.every((line) =>
                selectedLineIds.has(
                  String(line.materialId)
                )
              )
                ? "Clear selection"
                : "Select all"}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="rounded border border-rose-200 px-3 py-[3px] text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              disabled={selectedCount === 0}
            >
              Delete selected
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full border-collapse text-[11px] text-slate-800">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={
                        filteredAllocations.length > 0 &&
                        filteredAllocations.every((line) =>
                          selectedLineIds.has(
                            String(line.materialId)
                          )
                        )
                      }
                      onChange={() =>
                        toggleSelectAll()
                      }
                    />
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Code
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Material
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Part No
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Line Type
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    UOM
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left">
                    Category
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-right">
                    Total Required Qty
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((line) => (
                  <tr
                    key={`${line.projectId}-${line.materialId}`}
                    className={`cursor-pointer ${
                      selectedLineIds.has(
                        String(line.materialId)
                      )
                        ? "bg-emerald-50"
                        : "bg-white"
                    }`}
                    onClick={() =>
                      toggleSelectLine(line.materialId)
                    }
                  >
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLineIds.has(
                          String(line.materialId)
                        )}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleSelectLine(
                            line.materialId
                          );
                        }}
                      />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 font-mono">
                      {line.code ||
                        line.materialRef?.code}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {line.name ||
                        line.materialRef?.name}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {line.partNo ||
                        line.materialRef?.partNo ||
                        "-"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {line.lineType ||
                        line.materialRef?.lineType ||
                        "-"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {line.unit ||
                        line.materialRef?.unit ||
                        "-"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {line.category ||
                        line.materialRef?.category ||
                        "-"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {Number(
                        line.qty || 0
                      ).toLocaleString()}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenView(line);
                        }}
                        className="mr-2 text-xs text-slate-500"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenEdit(line);
                        }}
                        className="mr-2 text-xs text-sky-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(line);
                        }}
                        className="text-xs text-rose-500"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAllocations.length === 0 && (
                  <tr>
                    <td
                      className="border border-slate-200 px-2 py-3 text-center text-slate-500"
                      colSpan={9}
                    >
                      {selectedProjectId
                        ? "No allocations defined for this project."
                        : "Select a project to view allocations."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* New/Edit allocation modal */}
      <Modal
        open={formModal.open}
        title={`${formModal.mode === "edit" ? "Edit" : "New"} Allocation${
          currentProject
            ? ` · ${currentProject.code}`
            : ""
        }`}
        onClose={() =>
          formModal.saving
            ? undefined
            : setFormModal(emptyFormState)
        }
        footer={
          <div className="flex justify-end gap-2 text-[11px]">
            <button
              type="button"
              className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-100"
              onClick={() =>
                formModal.saving
                  ? undefined
                  : setFormModal(emptyFormState)
              }
              disabled={formModal.saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded border border-emerald-400 px-3 py-1 text-emerald-700 hover:bg-emerald-50"
              onClick={handleSubmitForm}
              disabled={formModal.saving}
            >
              {formModal.saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-[11px]">
          <label className="block text-slate-500">
            Material
            <select
              value={formModal.materialId}
              onChange={(e) =>
                setFormModal((prev) => ({
                  ...prev,
                  materialId: e.target.value,
                }))
              }
              className="mt-1 w-full rounded border border-slate-200 px-2 py-[3px] text-slate-700"
              disabled={formModal.mode === "edit"}
            >
              <option value="">Select material</option>
              {availableMaterials.map((material) => (
                <option
                  key={material.id}
                  value={material.id}
                >
                  {material.code} – {material.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-slate-500">
            Total required quantity
            <input
              type="number"
              value={formModal.quantity}
              onChange={(e) =>
                setFormModal((prev) => ({
                  ...prev,
                  quantity: e.target.value,
                }))
              }
              className="mt-1 w-full rounded border border-slate-200 px-2 py-[3px] text-slate-700"
              min={0}
              step={0.01}
              onWheel={preventNumberScroll}
            />
          </label>
        </div>
      </Modal>

      {/* View allocation modal */}
      <Modal
        open={viewModal.open}
        title="Allocation details"
        onClose={() => setViewModal(emptyViewState)}
      >
        {viewModal.line ? (
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                Project
              </div>
              <div>
                {viewProject
                  ? `${viewProject.code} – ${viewProject.name}`
                  : "--"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                Material
              </div>
              <div>
                {viewModal.line.name ||
                  viewModal.line.code}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                Part No
              </div>
              <div>
                {viewModal.line.partNo ||
                  viewModal.line.materialRef?.partNo ||
                  "-"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                Line Type
              </div>
              <div>
                {viewModal.line.lineType ||
                  viewModal.line.materialRef
                    ?.lineType ||
                  "-"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                UOM
              </div>
              <div>
                {viewModal.line.unit ||
                  viewModal.line.materialRef?.unit ||
                  "-"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                Category
              </div>
              <div>
                {viewModal.line.category ||
                  viewModal.line.materialRef
                    ?.category ||
                  "-"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">
                Total Required Quantity
              </div>
              <div>
                {Number(
                  viewModal.line.qty || 0
                ).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500">
            Select a line to view details.
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectAllocationManager;
