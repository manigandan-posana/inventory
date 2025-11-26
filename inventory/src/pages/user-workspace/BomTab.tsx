import React, { FC, useState, ChangeEvent } from "react";
import PaginationControls from "../../components/PaginationControls";
import SectionHeader from "./SectionHeader";

/* ---------- Types ---------- */

export type StockStatusFilter = "ALL" | "HEALTHY" | "LOW" | "OUT";

export interface BomFilters {
  category: string; // "ALL" or category name
  unit: string;     // "ALL" or unit name
  status: StockStatusFilter;
}

export interface BomFilterOptions {
  categories: string[];
  units: string[];
}

export interface MaterialRef {
  id: string | number;
  code: string;
  name: string;
  unit?: string | null;
  category?: string | null;
  // add more if you need (partNo, lineType, etc.)
}

export interface BomRow {
  id: string | number;
  code: string;
  name: string;
  unit: string;
  category: string;
  requiredQty: number;
  orderedQty: number;
  receivedQty: number;
  utilizedQty: number;
  balanceQty: number;
  materialRef?: MaterialRef | null;
}

export interface BomTabProps {
  isOpen: boolean;
  onToggle: () => void;

  rows: BomRow[];

  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  searchTerm: string;
  onSearchChange?: (value: string) => void;

  filters: BomFilters;
  onFilterChange?: (next: BomFilters) => void;
  filterOptions: BomFilterOptions;

  onOpenMaster?: () => void;
  onMaterialMovement?: (material: MaterialRef) => void;

  canAdjustAllocations: boolean;
  onOpenAllocation?: (row: BomRow) => void;
  onOpenRequest?: (row: BomRow) => void;
}

/* ---------- Component ---------- */

const BomTab: FC<BomTabProps> = ({
  isOpen,
  onToggle,
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  filterOptions,
  onOpenMaster,
  onMaterialMovement,
  canAdjustAllocations,
  onOpenAllocation,
  onOpenRequest,
}) => {
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const emptyRowCount = Math.max(0, pageSize - rows.length);

  const handleFilterChange = (field: keyof BomFilters, value: string) => {
    if (!onFilterChange) return;
    const next: BomFilters = {
      ...filters,
      [field]: value,
    } as BomFilters;
    onFilterChange(next);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  return (
    <div className="mt-2 space-y-1">
      <SectionHeader
        title="BOM"
        isOpen={isOpen}
        onToggle={onToggle}
        rightContent={
          <button
            type="button"
            onClick={onOpenMaster}
            className="flex items-center gap-1 rounded border border-slate-200 px-2 py-[2px] text-slate-600 hover:bg-slate-100"
          >
            <span className="text-[11px]">＋</span>
            <span>Master</span>
          </button>
        }
      />
      {isOpen && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700"
              placeholder="Search code, material, category or unit"
            />
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              {showFilters ? "Hide" : "Show"} advanced filters
            </button>
          </div>

          {showFilters && (
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-600 md:grid-cols-3">
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
                  Unit
                </span>
                <select
                  value={filters.unit}
                  onChange={(e) => handleFilterChange("unit", e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                >
                  <option value="ALL">All</option>
                  {filterOptions.units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wide text-slate-500">
                  Stock status
                </span>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                >
                  <option value="ALL">All</option>
                  <option value="HEALTHY">Healthy</option>
                  <option value="LOW">Low</option>
                  <option value="OUT">Out</option>
                </select>
              </label>
            </div>
          )}

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
                    Unit
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                    Category
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                    Required
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                    Ordered
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                    Received
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                    Issued
                  </th>
                  <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white text-slate-800">
                    <td className="border border-slate-200 px-2 py-1 font-mono">
                      {row.code}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      <div className="flex flex-col gap-1">
                        {row.materialRef ? (
                          <button
                            type="button"
                            onClick={() =>
                              row.materialRef &&
                              onMaterialMovement?.(row.materialRef)
                            }
                            className="text-sky-500 underline decoration-dotted hover:text-sky-700"
                          >
                            {row.name}
                          </button>
                        ) : (
                          row.name
                        )}
                        {row.materialRef && (
                          <div className="text-[10px] text-slate-500">
                            {canAdjustAllocations ? (
                              <button
                                type="button"
                                onClick={() => onOpenAllocation?.(row)}
                                className="rounded border border-slate-200 px-1 py-px text-[10px] text-slate-600 hover:bg-slate-100"
                              >
                                Adjust allocation
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenRequest?.(row)}
                                className="rounded border border-slate-200 px-1 py-px text-[10px] text-sky-600 hover:bg-slate-50"
                              >
                                Request more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {row.unit}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {row.category}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {row.requiredQty}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {row.orderedQty}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {row.receivedQty}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {row.utilizedQty}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {row.balanceQty}
                    </td>
                  </tr>
                ))}
                {Array.from({ length: emptyRowCount }).map((_, idx) => (
                  <tr key={`bom-empty-${idx}`}>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                    <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
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
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default BomTab;
