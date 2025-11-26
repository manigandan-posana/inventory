import React, { FC, useState } from "react";
import PaginationControls from "../../components/PaginationControls";
import SectionHeader from "./SectionHeader";
import ModalShell from "./ModalShell";

export type OutwardStatus = "OPEN" | "CLOSED";

export interface OutwardMaterialRow {
  id: string | number;
  code: string;
  name: string;
  unit: string;
}

export interface OutwardHistoryLine {
  id: string | number;
  code: string;
  name: string;
  unit: string;
  issueQty: number;
}

export interface OutwardHistoryRow {
  id: string | number;
  code: string;
  date: string;
  issueTo: string;
  status: OutwardStatus;
  closeDate?: string | null;
  items: number;
  lines?: OutwardHistoryLine[];
}

export interface OutwardHistoryFilters {
  status: "ALL" | OutwardStatus;
  from: string;
  to: string;
}

export type MaterialId = string | number;
export type QuantityByMaterial = Record<MaterialId, string>;

export interface OutwardTabProps {
  isOpen: boolean;
  onToggle: () => void;

  outwardCode: string;
  issueTo: string;
  onIssueToChange?: (value: string) => void;

  status: OutwardStatus;
  onStatusChange?: (value: OutwardStatus) => void;

  closeDate: string;

  onSaveOutward?: () => void;

  materials: OutwardMaterialRow[];
  pageSize: number;

  selectedIds: MaterialId[];
  /** Kept for compatibility, no longer used inside this component */
  onToggleSelected?: (id: MaterialId) => void;

  onIssueQtyFocus?: (id: MaterialId) => void;
  issueQtyByMaterial: QuantityByMaterial;
  onIssueQtyChange?: (id: MaterialId, value: string) => void;

  // Currently unused in this UI, kept for API compatibility
  materialToAdd?: string;
  onMaterialToAddChange?: (value: string) => void;
  onAddMaterial?: () => void;

  preventNumberScroll?: (event: React.WheelEvent<HTMLInputElement>) => void;

  // History listing
  historyRows: OutwardHistoryRow[];
  historyPage: number;
  historyTotalPages: number;
  historyPageSize: number;
  historyTotalItems: number;
  onHistoryPageChange: (page: number) => void;
  onHistoryPageSizeChange: (pageSize: number) => void;
  historySearchTerm: string;
  onHistorySearchChange?: (value: string) => void;
  historyFilters: OutwardHistoryFilters;
  onHistoryFilterChange?: (next: OutwardHistoryFilters) => void;

  expandedHistoryId: OutwardHistoryRow["id"] | null;
  onToggleHistoryRow?: (id: OutwardHistoryRow["id"] | null) => void;
}

const OutwardTab: FC<OutwardTabProps> = ({
  isOpen,
  onToggle,
  outwardCode,
  issueTo,
  onIssueToChange,
  status,
  onStatusChange,
  closeDate,
  onSaveOutward,
  materials,
  pageSize,
  selectedIds,
  // onToggleSelected, // kept for compatibility, not used
  onIssueQtyFocus,
  issueQtyByMaterial,
  onIssueQtyChange,
  materialToAdd, // eslint-disable-line @typescript-eslint/no-unused-vars
  onMaterialToAddChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAddMaterial, // eslint-disable-line @typescript-eslint/no-unused-vars
  preventNumberScroll,
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
  expandedHistoryId,
  onToggleHistoryRow,
}) => {
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const emptyRowCount = Math.max(0, pageSize - materials.length);

  const [editRow, setEditRow] = useState<OutwardMaterialRow | null>(null);
  const [editIssueQty, setEditIssueQty] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleHistoryFilterChange = <K extends keyof OutwardHistoryFilters>(
    field: K,
    value: OutwardHistoryFilters[K]
  ) => {
    onHistoryFilterChange?.({ ...historyFilters, [field]: value });
  };

  const openEditModal = (m: OutwardMaterialRow) => {
    setEditRow(m);
    setEditIssueQty(issueQtyByMaterial[m.id] ?? "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditRow(null);
    setEditIssueQty("");
  };

  const handleSaveEditRow = () => {
    if (!editRow) return;
    const id = editRow.id;

    onIssueQtyFocus?.(id);
    onIssueQtyChange?.(id, editIssueQty);

    closeEditModal();
  };

  return (
    <div className="mt-2 space-y-1">
      <SectionHeader title="Outwards" isOpen={isOpen} onToggle={onToggle} />
      {isOpen && (
        <>
          <div className="mt-1 space-y-2">
            {/* top form */}
            <div className="grid grid-cols-2 gap-1 text-[11px] md:grid-cols-4 lg:grid-cols-6">
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">Code</div>
                <input
                  type="text"
                  value={outwardCode}
                  disabled
                  className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-[3px] font-mono text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">Issue to</div>
                <input
                  type="text"
                  value={issueTo}
                  onChange={(e) => onIssueToChange?.(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">Status</div>
                <select
                  value={status}
                  onChange={(e) => onStatusChange?.(e.target.value as OutwardStatus)}
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Close</option>
                </select>
              </div>
              <div>
                <div className="mb-[2px] text-[10px] text-slate-500">Close Date</div>
                <input
                  type="date"
                  value={closeDate}
                  disabled
                  className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
                />
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
                onClick={onSaveOutward}
                className="inline-flex items-center gap-1 rounded border border-sky-500 px-2 py-[3px] text-[10px] font-semibold text-sky-600 hover:bg-sky-500/10"
              >
                <span>➕</span>
                <span>Outward</span>
              </button>
            </div>

            {/* MATERIALS TABLE – row-click to edit issued quantity in modal */}
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
                      Issued
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
                          {issueQtyByMaterial[m.id] ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: emptyRowCount }).map((_, idx) => (
                    <tr key={`outward-empty-${idx}`}>
                      <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                      <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                      <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                      <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
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
                Outward History
              </div>
              <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="search"
                  value={historySearchTerm}
                  onChange={(e) => onHistorySearchChange?.(e.target.value)}
                  className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px]"
                  placeholder="Search code, Issue to or status"
                />
                <button
                  type="button"
                  onClick={() => setShowHistoryFilters((prev) => !prev)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {showHistoryFilters ? "Hide" : "Show"} advanced filters
                </button>
              </div>
            </div>

            {showHistoryFilters && (
              <div className="mb-3 grid gap-2 rounded-2xl border border-slate-200 bg-white/60 p-3 text-[10px] text-slate-600 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <select
                    value={historyFilters.status}
                    onChange={(e) =>
                      handleHistoryFilterChange(
                        "status",
                        e.target.value as OutwardHistoryFilters["status"]
                      )
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                  >
                    <option value="ALL">All</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
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

            <div className="overflow-x-auto rounded-sm border border-slate-200">
              <table className="min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Out. Code
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Date
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Issue to
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Status
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                      Close Date
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => {
                    const isExpanded = expandedHistoryId === row.id;
                    const lines = row.lines || [];
                    return (
                      <React.Fragment key={row.id}>
                        <tr>
                          <td className="border border-slate-200 px-2 py-1 font-mono">
                            <button
                              type="button"
                              onClick={() => onToggleHistoryRow?.(row.id)}
                              className="text-sky-500 underline decoration-dotted hover:text-sky-700"
                              title="Toggle details"
                            >
                              {row.code}
                            </button>
                          </td>
                          <td className="border border-slate-200 px-2 py-1">
                            {row.date}
                          </td>
                          <td className="border border-slate-200 px-2 py-1">
                            {row.issueTo}
                          </td>
                          <td className="border border-slate-200 px-2 py-1">
                            {row.status === "CLOSED" ? "Closed" : "Open"}
                          </td>
                          <td className="border border-slate-200 px-2 py-1">
                            {row.closeDate || "-"}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right">
                            {row.items}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={6}
                              className="border border-slate-200 bg-slate-50 px-2 py-2"
                            >
                              <div className="space-y-2">
                                <div className="mb-1 flex items-center justify-between text-[10px]">
                                  <div className="font-semibold text-slate-800">
                                    Outward Details – {row.code}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onToggleHistoryRow?.(null)}
                                    className="rounded border border-slate-200 px-2 py-[2px] text-[10px] text-slate-600 hover:bg-slate-50"
                                  >
                                    Close
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] md:grid-cols-4">
                                  <div>
                                    <div className="text-[10px] text-slate-500">
                                      Out. Code
                                    </div>
                                    <div className="font-mono">{row.code}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-500">
                                      Date
                                    </div>
                                    <div>{row.date}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-500">
                                      Issue to
                                    </div>
                                    <div>{row.issueTo}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-500">
                                      Status / Close Date
                                    </div>
                                    <div>
                                      {row.status === "CLOSED"
                                        ? "Closed"
                                        : "Open"}
                                      {row.status === "CLOSED" &&
                                      row.closeDate
                                        ? ` – ${row.closeDate}`
                                        : ""}
                                    </div>
                                  </div>
                                </div>
                                <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white">
                                  <table className="min-w-full border-collapse text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-100">
                                        <th className="border border-slate-200 px-2 py-1 text-left">
                                          Code
                                        </th>
                                        <th className="border border-slate-200 px-2 py-1 text-left">
                                          Material
                                        </th>
                                        <th className="border border-slate-200 px-2 py-1 text-left">
                                          Unit
                                        </th>
                                        <th className="border border-slate-200 px-2 py-1 text-right">
                                          Issued
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((line) => (
                                        <tr key={line.id}>
                                          <td className="border border-slate-200 px-2 py-1 font-mono">
                                            {line.code}
                                          </td>
                                          <td className="border border-slate-200 px-2 py-1">
                                            {line.name}
                                          </td>
                                          <td className="border border-slate-200 px-2 py-1">
                                            {line.unit}
                                          </td>
                                          <td className="border border-slate-200 px-2 py-1 text-right">
                                            {line.issueQty}
                                          </td>
                                        </tr>
                                      ))}
                                      {lines.length === 0 && (
                                        <tr>
                                          <td
                                            colSpan={4}
                                            className="border border-slate-200 px-2 py-1 text-center text-[10px] text-slate-500"
                                          >
                                            No line details
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {historyRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="border border-slate-200 px-2 py-1 text-center text-[10px] text-slate-500"
                      >
                        No Outward history
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

      {/* EDIT MODAL FOR ISSUED QTY */}
      <ModalShell
        open={isEditModalOpen}
        title={
          editRow
            ? `Edit Outward · ${editRow.code} – ${editRow.name}`
            : "Edit Outward"
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
              className="rounded border border-sky-500 px-3 py-1 text-sky-600 hover:bg-sky-500/10"
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
              <span className="text-[10px] text-slate-500">Issued quantity</span>
              <input
                type="number"
                min={0}
                value={editIssueQty}
                onChange={(e) => setEditIssueQty(e.target.value)}
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

export default OutwardTab;
