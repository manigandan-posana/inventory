import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/client";

const normalizeId = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

const emptyFormState = { open: false, mode: "create", materialId: "", quantity: "", saving: false, line: null };
const emptyViewState = { open: false, line: null };

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 text-[11px] text-slate-800">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-semibold">
          <span>{title}</span>
          <button type="button" onClick={onClose} className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto py-3 text-slate-600">{children}</div>
        {footer && <div className="border-t border-slate-200 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

function MultiAllocationPanel({ token, projectId, materials, allocatedMaterialIds, onAllocationsSaved }) {
  const [search, setSearch] = useState("");
  const [selectedLines, setSelectedLines] = useState({});
  const [modalState, setModalState] = useState({ open: false, material: null, quantity: "" });
  const [saving, setSaving] = useState(false);

  // Materials which are NOT yet allocated to this project
  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials
      .filter((m) => !allocatedMaterialIds.has(String(m.id)))
      .filter((m) => {
        if (!q) return true;
        return (
          (m.code || "").toLowerCase().includes(q) ||
          (m.name || "").toLowerCase().includes(q) ||
          (m.partNo || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [materials, allocatedMaterialIds, search]);

  const openModalForMaterial = (material) => {
    const key = String(material.id);
    const existing = selectedLines[key];
    setModalState({
      open: true,
      material,
      quantity: existing ? String(existing.quantity) : "",
    });
  };

  const closeModal = () => {
    setModalState({ open: false, material: null, quantity: "" });
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
      [key]: { quantity, material: modalState.material },
    }));
    closeModal();
  };

  const handleSubmitAll = async () => {
    if (!token) {
      toast.error("Missing auth token");
      return;
    }
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }
    const entries = Object.entries(selectedLines);
    if (entries.length === 0) {
      toast.error("Select at least one material to allocate");
      return;
    }
    setSaving(true);
    try {
      const hasInvalid = entries.some(([, data]) => !data.quantity || Number(data.quantity) <= 0);
      if (hasInvalid) {
        toast.error("Enter a required quantity greater than zero for each material");
        setSaving(false);
        return;
      }

      for (const [materialId, data] of entries) {
        await api.createProjectAllocation(token, projectId, {
          projectId,
          materialId,
          quantity: data.quantity,
        });
      }
      toast.success("Materials allocated to project");
      setSelectedLines({});
      if (onAllocationsSaved) {
        await onAllocationsSaved();
      }
    } catch (err) {
      toast.error(err.message || "Failed to allocate materials");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.keys(selectedLines).length;
  const selectedSummary = useMemo(
    () =>
      Object.entries(selectedLines).map(([materialId, { quantity, material }]) => ({
        materialId,
        label: material ? `${material.code || materialId} – ${material.name || ""}` : materialId,
        quantity,
      })),
    [selectedLines]
  );

  const updateSelectedQuantity = (materialId, quantity) => {
    setSelectedLines((prev) => {
      if (!prev[materialId]) return prev;
      return { ...prev, [materialId]: { ...prev[materialId], quantity } };
    });
  };

  const removeSelectedLine = (materialId) => {
    setSelectedLines((prev) => {
      const next = { ...prev };
      delete next[materialId];
      return next;
    });
  };

  if (!projectId) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
        Select a project first to see materials available for allocation.
      </div>
    );
  }

  return (
    <>
      {/* LEFT: all materials not yet allocated */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
            <div className="font-semibold text-slate-800">All materials (not yet allocated)</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Code, name or part no."
                className="w-40 rounded border border-slate-200 px-2 py-[3px] text-[11px] text-slate-700"
              />
            </div>
          </div>
          <div className="max-h-[320px] overflow-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-200 px-2 py-1 text-left">Code</th>
                  <th className="border border-slate-200 px-2 py-1 text-left">Material</th>
                  <th className="border border-slate-200 px-2 py-1 text-left">Part No</th>
                  <th className="border border-slate-200 px-2 py-1 text-left">UOM</th>
                  <th className="border border-slate-200 px-2 py-1 text-left">Category</th>
                  <th className="border border-slate-200 px-2 py-1 text-right">Required qty</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => {
                  const key = String(material.id);
                  const existing = selectedLines[key];
                  return (
                    <tr
                      key={key}
                      className={`cursor-pointer ${
                        existing ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => openModalForMaterial(material)}
                    >
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
                        {material.unit || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {material.category || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {existing ? existing.quantity : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td
                      className="border border-slate-200 px-2 py-3 text-center text-slate-500"
                      colSpan={6}
                    >
                      All materials are already allocated for this project, or nothing matches your
                      search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-700">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <div className="text-[12px] font-semibold text-slate-900">Selected materials</div>
              <div className="text-[10px] text-slate-500">Tap rows on the left to add quantities</div>
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
                    <div className="truncate text-[11px] font-semibold text-slate-900">{item.label}</div>
                    <div className="text-[10px] text-slate-500">Required qty</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateSelectedQuantity(item.materialId, Number(e.target.value))}
                    className="w-24 rounded border border-slate-200 px-2 py-[3px] text-right text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelectedLine(item.materialId)}
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={saving || selectedSummary.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Allocating…" : "Allocate selected"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLines({})}
              disabled={selectedSummary.length === 0 || saving}
              className="rounded border border-slate-200 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear selection
            </button>
          </div>
        </div>
      </div>

      {/* quantity modal for single material (like inward/outward) */}
      <Modal
        open={modalState.open}
        title={
          modalState.material
            ? `Required quantity · ${modalState.material.code || ""} – ${
                modalState.material.name || ""
              }`
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
                {modalState.material.code} – {modalState.material.name}
              </div>
              <div className="text-slate-500">
                {modalState.material.partNo && (
                  <span className="mr-2">Part: {modalState.material.partNo}</span>
                )}
                {modalState.material.unit && <span>UOM: {modalState.material.unit}</span>}
              </div>
            </div>
            <label className="block text-slate-700">
              Required quantity
              <input
                type="number"
                value={modalState.quantity}
                onChange={(e) =>
                  setModalState((prev) => ({ ...prev, quantity: e.target.value }))
                }
                min="0"
                step="0.01"
                className="mt-1 w-full rounded border border-slate-200 px-2 py-[3px] text-slate-700"
              />
            </label>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">No material selected.</div>
        )}
      </Modal>
    </>
  );
}


export default function ProjectAllocationManager({
  token,
  projects = [],
  materials = [],
  defaultProjectId,
  onBack,
  onProjectBomUpdate,
  onCreateMaterial,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    normalizeId(defaultProjectId ?? projects[0]?.id)
  );
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [allocationFilters, setAllocationFilters] = useState({
    categories: [],
    lineTypes: [],
    status: "all",
  });
  const [formModal, setFormModal] = useState(emptyFormState);
  const [viewModal, setViewModal] = useState(emptyViewState);
  const [selectedLineIds, setSelectedLineIds] = useState(new Set());
  const preventNumberScroll = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => (a.code || "").localeCompare(b.code || "")), [projects]);

  useEffect(() => {
    if (sortedProjects.length === 0) {
      setAllocations([]);
      setSelectedProjectId((prev) => (prev === "" ? prev : ""));
      return;
    }
    const normalizedSelected = normalizeId(selectedProjectId);
    const hasMatch = sortedProjects.some((project) => normalizeId(project.id) === normalizedSelected);
    if (!normalizedSelected || !hasMatch) {
      const fallback = normalizeId(sortedProjects[0].id);
      setSelectedProjectId((prev) => (prev === fallback ? prev : fallback));
    }
  }, [selectedProjectId, sortedProjects]);

  useEffect(() => {
    if (defaultProjectId === undefined || defaultProjectId === null) {
      return;
    }
    const normalizedDefault = normalizeId(defaultProjectId);
    setSelectedProjectId((prev) => (prev === normalizedDefault ? prev : normalizedDefault));
  }, [defaultProjectId]);

  const materialsMap = useMemo(() => {
    const map = new Map();
    materials.forEach((material) => {
      if (material?.id) {
        map.set(String(material.id), material);
      }
    });
    return map;
  }, [materials]);

  const allocatedMaterialIds = useMemo(() => new Set(allocations.map((line) => String(line.materialId))), [allocations]);

  const filterOptions = useMemo(() => {
    const categories = new Set();
    const lineTypes = new Set();
    materials.forEach((material) => {
      if (material?.category) {
        categories.add(material.category);
      }
      if (material?.lineType) {
        lineTypes.add(material.lineType);
      }
    });
    return {
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
      lineTypes: Array.from(lineTypes).sort((a, b) => a.localeCompare(b)),
    };
  }, [materials]);

  const filteredAllocations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const categorySet = new Set((allocationFilters.categories || []).map((value) => value.trim()));
    const lineTypeSet = new Set((allocationFilters.lineTypes || []).map((value) => value.trim()));
    return allocations
      .map((line) => {
        const material = materialsMap.get(String(line.materialId)) || {};
        const code = line.code || material.code || "";
        const name = line.name || material.name || "";
        return { ...line, code, name, materialRef: material };
      })
      .filter((line) => {
        if (!query) return true;
        return line.code.toLowerCase().includes(query) || line.name.toLowerCase().includes(query);
      })
      .filter((line) => {
        if (categorySet.size === 0) return true;
        const category = (line.category || line.materialRef?.category || "").trim();
        return categorySet.has(category);
      })
      .filter((line) => {
        if (lineTypeSet.size === 0) return true;
        const lineType = (line.lineType || line.materialRef?.lineType || "").trim();
        return lineTypeSet.has(lineType);
      })
      .filter((line) => {
        if (allocationFilters.status === "allocated") {
          return Number(line.qty || 0) > 0;
        }
        if (allocationFilters.status === "unallocated") {
          return Number(line.qty || 0) === 0;
        }
        return true;
      })
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [allocationFilters, allocations, materialsMap, search]);

  const loadAllocations = useCallback(
    async (projectId) => {
      if (!token || !projectId) {
        setAllocations([]);
        setError("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await api.projectAllocations(token, projectId);
        setAllocations(data || []);
        onProjectBomUpdate?.(String(projectId), data || []);
      } catch (err) {
        setAllocations([]);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token, onProjectBomUpdate]
  );

  useEffect(() => {
    loadAllocations(selectedProjectId);
  }, [selectedProjectId, loadAllocations]);

  useEffect(() => {
    setSelectedLineIds(new Set());
  }, [selectedProjectId, allocations]);

  const handleOpenCreate = () => {
    if (!selectedProjectId) {
      toast.error("Select a project to manage allocations");
      return;
    }
    setFormModal({ ...emptyFormState, open: true });
  };

  const handleOpenEdit = (line) => {
    setFormModal({ open: true, mode: "edit", line, materialId: String(line.materialId), quantity: line.qty, saving: false });
  };

  const handleSubmitForm = async () => {
    if (!token || !selectedProjectId) return;
    const quantity = Number(formModal.quantity ?? 0);
    if (!formModal.materialId) {
      toast.error("Select a material");
      return;
    }
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error("Required quantity must be zero or greater");
      return;
    }
    setFormModal((prev) => ({ ...prev, saving: true }));
    const payload = { projectId: selectedProjectId, materialId: formModal.materialId, quantity };
    try {
      if (formModal.mode === "edit") {
        await api.updateBomAllocation(token, selectedProjectId, formModal.materialId, payload);
        toast.success("Allocation updated");
      } else {
        await api.createProjectAllocation(token, selectedProjectId, payload);
        toast.success("Allocation added");
      }
      setFormModal(emptyFormState);
      await loadAllocations(selectedProjectId);
    } catch (err) {
      setFormModal((prev) => ({ ...prev, saving: false }));
      toast.error(err.message);
    }
  };

  const handleDelete = async (line) => {
    if (!token || !selectedProjectId || !line?.materialId) return;
    const confirmDelete = typeof window === "undefined" ? true : window.confirm("Remove this allocation?");
    if (!confirmDelete) return;
    try {
      await api.deleteProjectAllocation(token, selectedProjectId, String(line.materialId));
      toast.success("Allocation removed");
      await loadAllocations(selectedProjectId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleSelectLine = (materialId) => {
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
    const allIds = filteredAllocations.map((line) => String(line.materialId));
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      const allSelected = allIds.every((id) => next.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(allIds);
    });
  };

  const handleBulkDelete = async () => {
    if (!token || !selectedProjectId) return;
    if (selectedLineIds.size === 0) {
      toast.error("Select at least one allocation to delete");
      return;
    }
    const confirmDelete = typeof window === "undefined" ? true : window.confirm("Remove selected allocations?");
    if (!confirmDelete) return;
    try {
      for (const materialId of Array.from(selectedLineIds)) {
        await api.deleteProjectAllocation(token, selectedProjectId, String(materialId));
      }
      toast.success("Selected allocations removed");
      setSelectedLineIds(new Set());
      await loadAllocations(selectedProjectId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenView = (line) => {
    setViewModal({ open: true, line });
  };

  const availableMaterials = useMemo(() => {
    return materials
      .filter((material) => {
        if (formModal.mode === "edit") {
          return true;
        }
        return !allocatedMaterialIds.has(String(material.id));
      })
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [materials, allocatedMaterialIds, formModal.mode]);

  const currentProject = sortedProjects.find((p) => normalizeId(p.id) === selectedProjectId) || null;
  const viewProject = viewModal.line
    ? sortedProjects.find((p) => normalizeId(p.id) === normalizeId(viewModal.line.projectId)) || currentProject
    : null;

  const selectedCount = selectedLineIds.size;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Material Allocations</div>
          <div className="text-[11px] text-slate-500">Allocate total required quantities per project.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {onBack && (
            <button
              type="button"
              onClick={() => onBack?.()}
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

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Project</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2 py-[3px] text-slate-700"
          >
            {sortedProjects.length === 0 && <option value="">No projects</option>}
            {sortedProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} – {project.name}
              </option>
            ))}
          </select>
        </label>
        <input
          type="text"
          placeholder="Search code or material"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border border-slate-200 px-2 py-[3px] text-slate-700"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="rounded border border-slate-200 px-3 py-[3px] text-slate-600 hover:bg-slate-50"
        >
          {filtersOpen ? "Hide filters" : "Advanced filters"}
        </button>
        {loading && <span className="text-[10px] text-slate-500">Loading…</span>}
      </div>

      {filtersOpen && (
        <div className="mt-2 grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-[11px] text-slate-600 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Line Type</span>
            <select
              multiple
              value={allocationFilters.lineTypes}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setAllocationFilters((prev) => ({ ...prev, lineTypes: values }));
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {filterOptions.lineTypes.map((lineType) => (
                <option key={lineType} value={lineType}>
                  {lineType}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Category</span>
            <select
              multiple
              value={allocationFilters.categories}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setAllocationFilters((prev) => ({ ...prev, categories: values }));
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {filterOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Allocation Status</span>
            <select
              value={allocationFilters.status}
              onChange={(event) =>
                setAllocationFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="all">All materials</option>
              <option value="allocated">With quantities</option>
              <option value="unallocated">Awaiting allocation</option>
            </select>
          </label>
          <div className="sm:col-span-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              onClick={() =>
                setAllocationFilters({ categories: [], lineTypes: [], status: "all" })
              }
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">{error}</div>
      )}

      <MultiAllocationPanel
        token={token}
        projectId={selectedProjectId}
        materials={materials}
        allocatedMaterialIds={allocatedMaterialIds}
        onAllocationsSaved={() => loadAllocations(selectedProjectId)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        <span className="text-slate-700">Selected: {selectedCount}</span>
        <button
          type="button"
          onClick={toggleSelectAll}
          className="rounded border border-slate-200 px-3 py-[3px] hover:bg-slate-50"
          disabled={filteredAllocations.length === 0}
        >
          {filteredAllocations.length > 0 && filteredAllocations.every((line) => selectedLineIds.has(String(line.materialId)))
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
                  checked={filteredAllocations.length > 0 && filteredAllocations.every((line) => selectedLineIds.has(String(line.materialId)))}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left">Code</th>
              <th className="border border-slate-200 px-2 py-1 text-left">Material</th>
              <th className="border border-slate-200 px-2 py-1 text-left">Part No</th>
              <th className="border border-slate-200 px-2 py-1 text-left">Line Type</th>
              <th className="border border-slate-200 px-2 py-1 text-left">UOM</th>
              <th className="border border-slate-200 px-2 py-1 text-left">Category</th>
              <th className="border border-slate-200 px-2 py-1 text-right">Total Required Qty</th>
              <th className="border border-slate-200 px-2 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllocations.map((line) => (
              <tr
                key={`${line.projectId}-${line.materialId}`}
                className={`cursor-pointer ${selectedLineIds.has(String(line.materialId)) ? "bg-emerald-50" : "bg-white"}`}
                onClick={() => toggleSelectLine(line.materialId)}
              >
                <td className="border border-slate-200 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={selectedLineIds.has(String(line.materialId))}
                    onChange={() => toggleSelectLine(line.materialId)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td className="border border-slate-200 px-2 py-1 font-mono">{line.code || line.materialRef?.code}</td>
                <td className="border border-slate-200 px-2 py-1">{line.name || line.materialRef?.name}</td>
                <td className="border border-slate-200 px-2 py-1">{line.partNo || line.materialRef?.partNo || "-"}</td>
                <td className="border border-slate-200 px-2 py-1">{line.lineType || line.materialRef?.lineType || "-"}</td>
                <td className="border border-slate-200 px-2 py-1">{line.unit || line.materialRef?.unit || "-"}</td>
                <td className="border border-slate-200 px-2 py-1">{line.category || line.materialRef?.category || "-"}</td>
                <td className="border border-slate-200 px-2 py-1 text-right">{Number(line.qty || 0).toLocaleString()}</td>
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
                      handleDelete(line);
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
                <td className="border border-slate-200 px-2 py-3 text-center text-slate-500" colSpan={9}>
                  {selectedProjectId ? "No allocations defined for this project." : "Select a project to view allocations."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={formModal.open}
        title={`${formModal.mode === "edit" ? "Edit" : "New"} Allocation${currentProject ? ` · ${currentProject.code}` : ""}`}
        onClose={() => (formModal.saving ? null : setFormModal(emptyFormState))}
        footer={
          <div className="flex justify-end gap-2 text-[11px]">
            <button
              type="button"
              className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-100"
              onClick={() => (formModal.saving ? null : setFormModal(emptyFormState))}
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
              onChange={(e) => setFormModal((prev) => ({ ...prev, materialId: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-[3px] text-slate-700"
              disabled={formModal.mode === "edit"}
            >
              <option value="">Select material</option>
              {availableMaterials.map((material) => (
                <option key={material.id} value={material.id}>
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
              onChange={(e) => setFormModal((prev) => ({ ...prev, quantity: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-[3px] text-slate-700"
              min="0"
              step="0.01"
              onWheel={preventNumberScroll}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={viewModal.open}
        title="Allocation details"
        onClose={() => setViewModal(emptyViewState)}
      >
        {viewModal.line ? (
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
            <div>
              <div className="text-[10px] uppercase text-slate-400">Project</div>
              <div>{viewProject ? `${viewProject.code} – ${viewProject.name}` : "--"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Material</div>
              <div>{viewModal.line.name || viewModal.line.code}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Part No</div>
              <div>{viewModal.line.partNo || viewModal.line.materialRef?.partNo || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Line Type</div>
              <div>{viewModal.line.lineType || viewModal.line.materialRef?.lineType || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">UOM</div>
              <div>{viewModal.line.unit || viewModal.line.materialRef?.unit || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Category</div>
              <div>{viewModal.line.category || viewModal.line.materialRef?.category || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400">Total Required Quantity</div>
              <div>{Number(viewModal.line.qty || 0).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500">Select a line to view details.</div>
        )}
      </Modal>
    </div>
  );
}
