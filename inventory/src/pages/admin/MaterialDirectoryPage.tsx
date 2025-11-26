import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PaginationControls from "../../components/PaginationControls";
import {
  createMaterial,
  deleteMaterial,
  fetchMaterials,
  exportMaterials,
  importMaterials,
  // If you have types exported from materialSlice, you can import them too
} from "../../store/slices/materialSlice";
import type { RootState, AppDispatch } from "../../store/store";

// ---- Types ----

type LoadingStatus = "idle" | "loading" | "succeeded" | "failed";

export interface Material {
  id: number | string;
  code: string;
  name: string;
  partNo?: string | null;
  lineType?: string | null;
  unit?: string | null;
  category?: string | null;
}

interface MaterialFormFields {
  code: string;
  name: string;
  partNo: string;
  lineType: string;
  unit: string;
  category: string;
}

type ModalMode = "create" | "edit";

interface ModalState {
  open: boolean;
  mode: ModalMode;
  materialId: number | string | null;
  saving: boolean;
  fields: MaterialFormFields;
}

interface FiltersState {
  categories: string[];
  units: string[];
  lineTypes: string[];
}

interface MaterialsSliceState {
  items: Material[];
  totalItems: number;
  totalPages: number;
  status: LoadingStatus;
  availableFilters: {
    lineTypes: string[];
    categories: string[];
    units: string[];
  };
  error: string | null;
}

interface MaterialDirectoryPageProps {
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

const createEmptyMaterial = (): MaterialFormFields => ({
  code: "",
  name: "",
  partNo: "",
  lineType: "",
  unit: "",
  category: "",
});

const createEmptyModal = (): ModalState => ({
  open: false,
  mode: "create",
  materialId: null,
  saving: false,
  fields: createEmptyMaterial(),
});

// ---- Modal Component ----

function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 text-[11px] text-slate-700">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
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

const MaterialDirectoryPage: React.FC<MaterialDirectoryPageProps> = ({
  onRequestReload,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const token = useSelector((state: RootState) => state.auth.token);

  const {
    items: materials,
    totalItems,
    totalPages,
    status,
    availableFilters,
    error: materialError,
  } = useSelector<RootState, MaterialsSliceState>(
    (state) => state.materials as MaterialsSliceState
  );

  const loading = status === "loading";

  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FiltersState>({
    categories: [],
    units: [],
    lineTypes: [],
  });
  const [modalState, setModalState] = useState<ModalState>(createEmptyModal);
  const [importing, setImporting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshMaterials = useCallback(async () => {
    if (!token) return;
    await dispatch(
      fetchMaterials({
        token,
        query: {
          page,
          size: pageSize,
          search,
          category: filters.categories,
          unit: filters.units,
          lineType: filters.lineTypes,
        },
      })
    );
  }, [dispatch, filters.categories, filters.lineTypes, filters.units, page, pageSize, search, token]);

  useEffect(() => {
    void refreshMaterials();
  }, [refreshMaterials]);

  useEffect(() => {
    if (materialError) {
      toast.error(materialError);
    }
  }, [materialError]);

  const closeModal = () => setModalState(createEmptyModal());

  const openCreateMaterial = () => {
    setModalState({ ...createEmptyModal(), open: true });
  };

  const openEditMaterial = (material: Material) => {
    setModalState({
      open: true,
      mode: "edit",
      materialId: material.id,
      saving: false,
      fields: {
        code: material.code || "",
        name: material.name || "",
        partNo: material.partNo || "",
        lineType: material.lineType || "",
        unit: material.unit || "",
        category: material.category || "",
      },
    });
  };

  const handleFieldChange = (field: keyof MaterialFormFields, value: string) => {
    setModalState((prev) => ({
      ...prev,
      fields: { ...prev.fields, [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    const payload = {
      name: modalState.fields.name?.trim() || "",
      partNo: modalState.fields.partNo?.trim() || "",
      lineType: modalState.fields.lineType?.trim() || "",
      unit: modalState.fields.unit?.trim() || "",
      category: modalState.fields.category?.trim() || "",
    };
    if (!payload.name) {
      setFormError("Material name is required");
      return;
    }
    setFormError("");
    setModalState((prev) => ({ ...prev, saving: true }));
    try {
      if (modalState.mode === "edit" && modalState.materialId != null) {
        await dispatch(
          updateMaterial({
            token,
            materialId: modalState.materialId,
            payload,
          })
        ).unwrap();
        toast.success("Material updated");
      } else {
        await dispatch(createMaterial({ token, payload })).unwrap();
        toast.success("Material created");
      }
      closeModal();
      await refreshMaterials();
      onRequestReload?.();
    } catch (err) {
      setModalState((prev) => ({ ...prev, saving: false }));
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to save material";
      toast.error(message);
    }
  };

  const handleDelete = async (materialId: number | string | null | undefined) => {
    if (!token || materialId == null) return;
    const confirmDelete =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this material?");
    if (!confirmDelete) return;
    try {
      await dispatch(deleteMaterial({ token, materialId })).unwrap();
      toast.success("Material removed");
      await refreshMaterials();
      onRequestReload?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to delete material";
      toast.error(message);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleExportClick = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const blob = await dispatch(exportMaterials(token)).unwrap();
      if (!blob) {
        toast.error("Nothing to export");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "materials.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to export materials";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (!token) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await dispatch(importMaterials({ token, file })).unwrap();
      toast.success("Materials imported");
      await refreshMaterials();
      onRequestReload?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unable to import materials";
      toast.error(message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportChange}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">
            Material Directory
          </div>
          <p className="text-[11px] text-slate-500">
            Manage master materials, codes and metadata.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleExportClick}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
            disabled={exporting}
          >
            {exporting ? "Preparing…" : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
            disabled={importing}
          >
            {importing ? "Importing…" : "Import Excel"}
          </button>
          <button
            type="button"
            onClick={openCreateMaterial}
            className="rounded-full bg-slate-900 px-4 py-1 text-white hover:bg-slate-800"
          >
            Add Material
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search by code, name or part no."
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
        {materialError && (
          <span className="text-[11px] text-rose-500">{materialError}</span>
        )}
      </div>

      {filtersOpen && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 text-[11px] text-slate-600 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Line Type
            </span>
            <select
              multiple
              value={filters.lineTypes}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
                setFilters((prev) => ({ ...prev, lineTypes: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {availableFilters.lineTypes.map((lineType) => (
                <option key={lineType} value={lineType}>
                  {lineType || "Unspecified"}
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
              value={filters.categories}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
                setFilters((prev) => ({ ...prev, categories: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {availableFilters.categories.map((category) => (
                <option key={category} value={category}>
                  {category || "Uncategorized"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              UOM
            </span>
            <select
              multiple
              value={filters.units}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions
                ).map((option) => option.value);
                setFilters((prev) => ({ ...prev, units: values }));
                setPage(1);
              }}
              className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2"
            >
              {availableFilters.units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit || "Not Set"}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              onClick={() => {
                setFilters({ categories: [], units: [], lineTypes: [] });
                setPage(1);
              }}
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="cell-tight">Code</th>
              <th>Material</th>
              <th className="cell-tight">Part No</th>
              <th className="cell-tight">Line Type</th>
              <th className="cell-tight">UOM</th>
              <th>Category</th>
              <th className="cell-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  Loading materials…
                </td>
              </tr>
            )}
            {!loading && materials.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  No materials found.
                </td>
              </tr>
            )}
            {!loading &&
              materials.map((material) => (
                <tr key={material.id}>
                  <td className="font-semibold text-slate-900">
                    {material.code}
                  </td>
                  <td>{material.name}</td>
                  <td className="cell-tight">{material.partNo || "—"}</td>
                  <td className="cell-tight">{material.lineType || "—"}</td>
                  <td className="cell-tight">{material.unit || "—"}</td>
                  <td>{material.category || "—"}</td>
                  <td className="cell-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] text-slate-600 hover:border-[var(--primary)] hover:bg-blue-50"
                        onClick={() => openEditMaterial(material)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 px-3 py-1 text-[10px] text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(material.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(value) => setPage(value)}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
        disabled={loading}
      />

      <Modal
        open={modalState.open}
        title={
          modalState.mode === "edit" ? "Edit Material" : "Create Material"
        }
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-500"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-1 text-white"
              onClick={handleSubmit}
              disabled={modalState.saving}
            >
              {modalState.saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 text-[11px]">
          {formError && (
            <div className="text-[11px] text-rose-500">{formError}</div>
          )}
          {modalState.mode === "edit" && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Code
              </span>
              <input
                value={modalState.fields.code}
                readOnly
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]"
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Material
            </span>
            <input
              value={modalState.fields.name}
              onChange={(event) =>
                handleFieldChange("name", event.target.value)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Part No.
            </span>
            <input
              value={modalState.fields.partNo}
              onChange={(event) =>
                handleFieldChange("partNo", event.target.value)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Line Type
              </span>
              <input
                value={modalState.fields.lineType}
                onChange={(event) =>
                  handleFieldChange("lineType", event.target.value)
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                UOM
              </span>
              <input
                value={modalState.fields.unit}
                onChange={(event) =>
                  handleFieldChange("unit", event.target.value)
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Category
              </span>
              <input
                value={modalState.fields.category}
                onChange={(event) =>
                  handleFieldChange("category", event.target.value)
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MaterialDirectoryPage;
