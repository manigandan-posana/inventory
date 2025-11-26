import React, { FC, useState } from "react";
import PaginationControls from "../../components/PaginationControls";
import ModalShell from "./ModalShell";

export interface MasterMaterial {
  id: string | number;
  code: string;
  name: string;
  partNo?: string;
  lineType?: string;
  unit?: string;
  category?: string;
}

export interface MasterDraft {
  code: string;
  name: string;
  partNo: string;
  lineType: string;
  unit: string;
  category: string;
}

export interface MasterFilters {
  category: string; // e.g. "ALL" or actual category
  lineType: string; // e.g. "ALL" or actual line type
}

export interface MasterFilterOptions {
  categories: string[];
  lineTypes: string[];
}

export interface MasterPageProps {
  materials: MasterMaterial[];
  totalItems: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  manageMode: boolean;
  editingId: string | number | null;

  draft: MasterDraft;
  onDraftChange?: (field: keyof MasterDraft, value: string) => void;
  onStartCreate?: () => void;
  onStartEdit?: (material: MasterMaterial) => void;
  onCancelEdit?: () => void;
  onSaveDraft?: () => void;
  onDelete?: (id: MasterMaterial["id"]) => void;
  onBack?: () => void;

  searchTerm: string;
  onSearchChange?: (value: string) => void;

  filters: MasterFilters;
  onFilterChange?: (filters: MasterFilters) => void;
  filterOptions: MasterFilterOptions;
}

const MasterPage: FC<MasterPageProps> = ({
  materials,
  totalItems,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  manageMode,
  editingId,
  draft,
  onDraftChange,
  onStartCreate,
  onStartEdit,
  onCancelEdit,
  onSaveDraft,
  onDelete,
  onBack,
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  filterOptions,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isCreating = manageMode && editingId === "new";
  const emptyRowCount = Math.max(0, pageSize - materials.length);

  const handleFilterChange = <K extends keyof MasterFilters>(
    field: K,
    value: MasterFilters[K]
  ) => {
    onFilterChange?.({ ...filters, [field]: value });
  };

  const openCreateModal = () => {
    onStartCreate?.();
    setIsEditModalOpen(true);
  };

  const openEditModal = (m: MasterMaterial) => {
    onStartEdit?.(m);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    onCancelEdit?.();
  };

  const handleSaveFromModal = () => {
    onSaveDraft?.();
    setIsEditModalOpen(false);
  };

  return (
    <div className="pt-2">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <div className="text-slate-500">
          Create / edit / delete materials in master.
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-slate-200 px-2 py-[3px] text-[10px] text-slate-800 hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px]"
          placeholder="Search code, name, part no. or category"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            {showFilters ? "Hide" : "Show"} filters
          </button>
          {manageMode && (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              New material
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-600 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wide text-slate-500">
              Category
            </span>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            >
              <option value="ALL">All</option>
              {filterOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wide text-slate-500">
              Line type
            </span>
            <select
              value={filters.lineType}
              onChange={(e) => handleFilterChange("lineType", e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            >
              <option value="ALL">All</option>
              {filterOptions.lineTypes.map((lineType) => (
                <option key={lineType} value={lineType}>
                  {lineType}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* TABLE – always read-only cells, click row to edit in modal */}
      <div className="overflow-x-auto rounded border border-slate-200 bg-slate-50">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                Code
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                Material
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                Part No.
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                Line Type
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                Unit
              </th>
              <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                Category
              </th>
              {manageMode && (
                <th className="border border-slate-200 px-2 py-1 text-center font-semibold">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr
                key={m.id}
                onClick={() => manageMode && openEditModal(m)}
                className={
                  manageMode ? "cursor-pointer hover:bg-slate-50" : ""
                }
              >
                <td className="border border-slate-200 px-2 py-1 font-mono">
                  {m.code}
                </td>
                <td className="border border-slate-200 px-2 py-1">
                  {m.name}
                </td>
                <td className="border border-slate-200 px-2 py-1">
                  {m.partNo}
                </td>
                <td className="border border-slate-200 px-2 py-1">
                  {m.lineType}
                </td>
                <td className="border border-slate-200 px-2 py-1">
                  {m.unit}
                </td>
                <td className="border border-slate-200 px-2 py-1">
                  {m.category}
                </td>
                {manageMode && (
                  <td className="border border-slate-200 px-2 py-1 text-center text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(m);
                      }}
                      className="mr-1 rounded border border-slate-200 px-2 py-[2px] text-slate-800 hover:bg-slate-50"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(m.id);
                      }}
                      className="rounded border border-red-400 px-2 py-[2px] text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {Array.from({ length: emptyRowCount }).map((_, idx) => (
              <tr key={`master-empty-${idx}`}>
                <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                {manageMode && (
                  <td className="border border-slate-200 px-2 py-1">
                    &nbsp;
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>

      {/* CREATE / EDIT MODAL */}
      <ModalShell
        open={isEditModalOpen && manageMode && !!editingId}
        title={isCreating ? "New material" : "Edit material"}
        onClose={handleCloseModal}
        footer={
          <div className="flex items-center justify-end gap-2 text-[11px]">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveFromModal}
              className="rounded border border-emerald-500 px-3 py-1 text-emerald-600 hover:bg-emerald-500/10"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid gap-2 text-[11px] text-slate-600 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Code</span>
            <input
              type="text"
              value={draft.code}
              onChange={(e) => onDraftChange?.("code", e.target.value)}
              className="w-full rounded border border-slate-200 px-1 py-[2px] text-[11px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Material</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onDraftChange?.("name", e.target.value)}
              className="w-full rounded border border-slate-200 px-1 py-[2px] text-[11px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Part No.</span>
            <input
              type="text"
              value={draft.partNo}
              onChange={(e) => onDraftChange?.("partNo", e.target.value)}
              className="w-full rounded border border-slate-200 px-1 py-[2px] text-[11px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Line Type</span>
            <input
              type="text"
              value={draft.lineType}
              onChange={(e) => onDraftChange?.("lineType", e.target.value)}
              className="w-full rounded border border-slate-200 px-1 py-[2px] text-[11px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Unit</span>
            <input
              type="text"
              value={draft.unit}
              onChange={(e) => onDraftChange?.("unit", e.target.value)}
              className="w-full rounded border border-slate-200 px-1 py-[2px] text-[11px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Category</span>
            <input
              type="text"
              value={draft.category}
              onChange={(e) => onDraftChange?.("category", e.target.value)}
              className="w-full rounded border border-slate-200 px-1 py-[2px] text-[11px]"
            />
          </label>
        </div>
      </ModalShell>
    </div>
  );
};

export default MasterPage;
