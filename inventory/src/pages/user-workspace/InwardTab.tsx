import React, { FC, useState } from "react";
import PaginationControls from "../../components/PaginationControls";
import SectionHeader from "./SectionHeader";
import ModalShell from "./ModalShell";

export interface InwardFormState {
  invoiceNo: string;
  invoiceDate: string;
  deliveryDate: string;
  vehicleNo: string;
  supplierName: string;
  remarks: string;
}

export type InwardFormField = keyof InwardFormState;

export interface InwardMaterialRow {
  id: string | number;
  code: string;
  name: string;
  unit: string;
}

export interface InwardHistoryFilters {
  type: string; // e.g. "ALL" | "SUPPLY" | "RETURN"
  from: string;
  to: string;
}

export interface InwardHistoryRow {
  id: string | number;
  code: string;
  date: string;
  invoiceNo?: string | null;
  items: number | string;
}

export type QtyMap = Record<string | number, string | number | undefined>;

export interface InwardTabProps {
  isOpen: boolean;
  onToggle: () => void;

  inwardCode: string;
  formState: InwardFormState;
  onFormChange?: (field: InwardFormField, value: string) => void;

  isReturn: boolean;
  onReturnChange?: (value: boolean) => void;

  materials: InwardMaterialRow[];
  pageSize: number;

  preventNumberScroll?: (event: React.WheelEvent<HTMLInputElement>) => void;

  selectedIds: Array<InwardMaterialRow["id"]>;
  // kept for compatibility, not used inside this component
  onToggleSelected?: (id: InwardMaterialRow["id"]) => void;

  onQtyFocus?: (id: InwardMaterialRow["id"]) => void;
  qtyByMaterial: QtyMap;
  onQtyChange?: (id: InwardMaterialRow["id"], value: string) => void;
  receivedQtyByMaterial: QtyMap;
  onReceivedQtyChange?: (id: InwardMaterialRow["id"], value: string) => void;

  onSaveInward?: () => void;

  historyRows: InwardHistoryRow[];
  historyPage: number;
  historyTotalPages: number;
  historyPageSize: number;
  historyTotalItems: number;
  onHistoryPageChange?: (page: number) => void;
  onHistoryPageSizeChange?: (size: number) => void;

  historySearchTerm: string;
  onHistorySearchChange?: (value: string) => void;

  historyFilters: InwardHistoryFilters;
  onHistoryFilterChange?: (filters: InwardHistoryFilters) => void;

  onViewHistoryDetail?: (row: InwardHistoryRow) => void;
}

const InwardTab: FC<InwardTabProps> = ({
  isOpen,
  onToggle,
  inwardCode,
  formState,
  onFormChange,
  isReturn,
  onReturnChange,
  materials,
  pageSize,
  preventNumberScroll,
  selectedIds,
  onToggleSelected, // kept for compatibility, no longer used
  onQtyFocus,
  qtyByMaterial,
  onQtyChange,
  receivedQtyByMaterial,
  onReceivedQtyChange,
  onSaveInward,
  historyRows,
  historyPage,
  historyTotalPages,
  historyPageSize,
  historyTotalItems,
  onHistoryPageChange,
  onHistoryPageSizeChange,
  historySearchTerm,
  onHistorySearchChange,
  historyFilters,
  onHistoryFilterChange,
  onViewHistoryDetail,
}) => {
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const emptyRowCount = Math.max(0, pageSize - materials.length);

  // Modal state for row edit
  const [editRow, setEditRow] = useState<InwardMaterialRow | null>(null);
  const [editOrderedQty, setEditOrderedQty] = useState<string>("");
  const [editReceivedQty, setEditReceivedQty] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleHistoryFilterChange = (
    field: keyof InwardHistoryFilters,
    value: string
  ) => {
    onHistoryFilterChange?.({ ...historyFilters, [field]: value });
  };

  const openEditModal = (m: InwardMaterialRow) => {
    setEditRow(m);

    const ordered = qtyByMaterial[m.id];
    const received = receivedQtyByMaterial[m.id];

    setEditOrderedQty(
      ordered !== undefined && ordered !== null ? String(ordered) : ""
    );
    setEditReceivedQty(
      received !== undefined && received !== null ? String(received) : ""
    );
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditRow(null);
    setEditOrderedQty("");
    setEditReceivedQty("");
  };

  const handleSaveEditRow = () => {
    if (!editRow) return;
    const id = editRow.id;

    onQtyChange?.(id, editOrderedQty);
    onReceivedQtyChange?.(id, editReceivedQty);
    onQtyFocus?.(id); // ensures inwardSelectedIds contains this material

    closeEditModal();
  };

  return (
    <div className="mt-2 space-y-1">
      <SectionHeader title="Inwards" isOpen={isOpen} onToggle={onToggle} />
      {isOpen && (
        <>
          <div className="mt-1 space-y-2">
            {/* Top form */}
            <div className="grid grid-cols-2 gap-1 text-[11px] md:grid-cols-4 lg:grid-cols-8">
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">Code</div>
                <input
                  type="text"
                  value={inwardCode}
                  disabled
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-[3px] font-mono text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Invoice No
                </div>
                <input
                  type="text"
                  value={formState.invoiceNo}
                  onChange={(e) =>
                    onFormChange?.("invoiceNo", e.target.value)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Invoice Date
                </div>
                <input
                  type="date"
                  value={formState.invoiceDate}
                  onChange={(e) =>
                    onFormChange?.("invoiceDate", e.target.value)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Received Date
                </div>
                <input
                  type="date"
                  value={formState.deliveryDate}
                  onChange={(e) =>
                    onFormChange?.("deliveryDate", e.target.value)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Vehicle No.
                </div>
                <input
                  type="text"
                  value={formState.vehicleNo}
                  onChange={(e) =>
                    onFormChange?.("vehicleNo", e.target.value)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Supplier
                </div>
                <input
                  type="text"
                  value={formState.supplierName}
                  onChange={(e) =>
                    onFormChange?.("supplierName", e.target.value)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Remarks
                </div>
                <input
                  type="text"
                  value={formState.remarks}
                  onChange={(e) =>
                    onFormChange?.("remarks", e.target.value)
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">
                  Type
                </div>
                <select
                  value={isReturn ? "RETURN" : "SUPPLY"}
                  onChange={(e) =>
                    onReturnChange?.(e.target.value === "RETURN")
                  }
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                >
                  <option value="SUPPLY">Supply</option>
                  <option value="RETURN">Return</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <div className="text-slate-500">
                Sel:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedIds.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onSaveInward}
                className="inline-flex items-center gap-1 rounded border border-emerald-500 px-2 py-[3px] text-[10px] font-semibold text-emerald-600 hover:bg-emerald-500/10"
              >
                <span>➕</span>
                <span>Inward</span>
              </button>
            </div>

            {/* MATERIALS TABLE – read-only, click row to edit in modal */}
            <div className="overflow-x-auto rounded-sm border border-slate-200">
              <table className="min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Code
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Material
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Unit
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                      Ordered
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                      Received
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const isSelected = selectedIds.includes(m.id);
                    return (
                      <tr
                        key={m.id}
                        onClick={() => openEditModal(m)}
                        className={
                          "cursor-pointer " +
                          (isSelected
                            ? "bg-sky-50 hover:bg-sky-100"
                            : "bg-white hover:bg-slate-50")
                        }
                      >
                        <td className="border border-slate-200 px-2 py-1 font-mono">
                          {m.code}
                        </td>
                        <td className="border border-slate-200 px-2 py-1">
                          {m.name}
                        </td>
                        <td className="border border-slate-200 px-2 py-1">
                          {m.unit}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right">
                          {qtyByMaterial[m.id] ?? ""}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right">
                          {receivedQtyByMaterial[m.id] ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: emptyRowCount }).map((_, idx) => (
                    <tr key={`inward-empty-${idx}`}>
                      <td className="border border-slate-200 px-2 py-1">
                        &nbsp;
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        &nbsp;
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        &nbsp;
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        &nbsp;
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* HISTORY */}
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex flex-col gap-2 text-[11px] md:flex-row md:items-center md:justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Inwards History
              </div>
              <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="search"
                  value={historySearchTerm}
                  onChange={(e) =>
                    onHistorySearchChange?.(e.target.value)
                  }
                  className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px]"
                  placeholder="Search code, invoice or supplier"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowHistoryFilters((prev) => !prev)
                  }
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {showHistoryFilters ? "Hide" : "Show"} advanced
                  filters
                </button>
              </div>
            </div>

            {showHistoryFilters && (
              <div className="mb-3 grid gap-2 rounded-2xl border border-slate-200 bg-white/60 p-3 text-[10px] text-slate-600 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wide text-slate-500">
                    Type
                  </span>
                  <select
                    value={historyFilters.type}
                    onChange={(e) =>
                      handleHistoryFilterChange("type", e.target.value)
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                  >
                    <option value="ALL">All</option>
                    <option value="SUPPLY">Supply</option>
                    <option value="RETURN">Return</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wide text-slate-500">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={historyFilters.from}
                    onChange={(e) =>
                      handleHistoryFilterChange("from", e.target.value)
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wide text-slate-500">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={historyFilters.to}
                    onChange={(e) =>
                      handleHistoryFilterChange("to", e.target.value)
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                  />
                </label>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[11px] text-slate-800">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Code
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Date
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Invoice
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-right">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="border border-slate-200 px-2 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            onViewHistoryDetail?.(row)
                          }
                          className="text-sky-500 underline decoration-dotted hover:text-sky-700"
                        >
                          {row.code}
                        </button>
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {row.date}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {row.invoiceNo}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {row.items}
                      </td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && (
                    <tr>
                      <td
                        className="border border-slate-200 px-2 py-2 text-center text-slate-500"
                        colSpan={4}
                      >
                        No inwards recorded for this project yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <PaginationControls
                page={historyPage}
                totalPages={historyTotalPages}
                pageSize={historyPageSize}
                totalItems={historyTotalItems}
                onPageChange={onHistoryPageChange}
                onPageSizeChange={onHistoryPageSizeChange}
              />
            </div>
          </div>
        </>
      )}

      {/* EDIT MODAL FOR A SINGLE MATERIAL */}
      <ModalShell
        open={isEditModalOpen}
        title={
          editRow
            ? `Edit Inward · ${editRow.code} – ${editRow.name}`
            : "Edit Inward"
        }
        onClose={closeEditModal}
        footer={
          <div className="flex items-center justify-end gap-2 text-[11px]">
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEditRow}
              className="rounded border border-emerald-500 px-3 py-1 text-emerald-600 hover:bg-emerald-500/10"
            >
              Save
            </button>
          </div>
        }
      >
        {editRow && (
          <div className="space-y-3 text-[11px] text-slate-600">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-slate-500">Code</div>
                <div className="font-mono">{editRow.code}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Material</div>
                <div>{editRow.name}</div>
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">
                Ordered quantity
              </span>
              <input
                type="number"
                min={0}
                value={editOrderedQty}
                onChange={(e) => setEditOrderedQty(e.target.value)}
                onWheel={preventNumberScroll}
                className="w-full rounded border border-slate-200 px-2 py-[3px] text-right text-[11px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">
                Received quantity
              </span>
              <input
                type="number"
                min={0}
                value={editReceivedQty}
                onChange={(e) => setEditReceivedQty(e.target.value)}
                onWheel={preventNumberScroll}
                className="w-full rounded border border-slate-200 px-2 py-[3px] text-right text-[11px]"
              />
            </label>
          </div>
        )}
      </ModalShell>
    </div>
  );
};

export default InwardTab;
