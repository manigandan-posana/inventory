import React, { FC, useState, ChangeEvent } from "react";
import ModalShell from "./ModalShell";

export interface TransferProject {
  id: string;
  code: string;
  name: string;
}

export interface TransferMaterialRow {
  id: string;
  code: string;
  name: string;
  requiredQty: number;
  orderedQty?: number | null;
  receivedQty?: number | null;
  utilizedQty?: number | null;
  balanceQty?: number | null;
}

export interface ProjectOrderedQtyArgs {
  materialId: string;
  materialCode: string;
  fallback: number;
}

export interface TransferTabProps {
  selectedProject: TransferProject | null;
  transferCode: string;
  projects: TransferProject[];
  fromSite: string;
  onFromSiteChange?: (value: string) => void;

  transferToProjectId: string;
  onTransferToProjectChange?: (projectId: string) => void;

  toSite: string;
  onToSiteChange?: (value: string) => void;

  transferRemarks: string;
  onTransferRemarksChange?: (value: string) => void;

  materials: TransferMaterialRow[];
  pageSize: number;

  selectedIds: string[];
  onToggleSelected?: (materialId: string) => void;

  transferQty: Record<string, string>;
  onTransferQtyChange?: (materialId: string, value: string) => void;

  onSaveTransfer?: () => void;

  preventNumberScroll?: (event: React.WheelEvent<HTMLInputElement>) => void;

  getProjectOrderedQty?: (
    projectId: string | null,
    args: ProjectOrderedQtyArgs
  ) => number;

  currentProjectId: string | null;
}

const TransferTab: FC<TransferTabProps> = ({
  selectedProject,
  transferCode,
  projects,
  fromSite,
  onFromSiteChange,
  transferToProjectId,
  onTransferToProjectChange,
  toSite,
  onToSiteChange,
  transferRemarks,
  onTransferRemarksChange,
  materials,
  pageSize,
  selectedIds,
  onToggleSelected,
  transferQty,
  onTransferQtyChange,
  onSaveTransfer,
  preventNumberScroll,
  getProjectOrderedQty,
  currentProjectId,
}) => {
  const emptyRowCount = Math.max(0, pageSize - materials.length);

  const [editRow, setEditRow] = useState<TransferMaterialRow | null>(null);
  const [editTransferQty, setEditTransferQty] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  if (!selectedProject || !projects || projects.length === 0) {
    return (
      <div className="mt-2 text-[11px] text-slate-500">
        Site-to-site transfer requires at least one project selection.
      </div>
    );
  }

  const transferProjects: TransferProject[] = projects || [];

  const openEditModal = (m: TransferMaterialRow) => {
    setEditRow(m);
    setEditTransferQty(transferQty[m.id] ?? "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditRow(null);
    setEditTransferQty("");
  };

  const handleSaveEditRow = () => {
    if (!editRow) return;
    const id = editRow.id;
    const value = editTransferQty;
    const numeric = Number(value || 0);

    // update quantity map
    onTransferQtyChange?.(id, value);

    const alreadySelected = selectedIds.includes(id);

    // use existing toggle logic carefully
    if (numeric > 0 && !alreadySelected) {
      onToggleSelected?.(id);
    } else if (numeric <= 0 && alreadySelected) {
      onToggleSelected?.(id);
    }

    closeEditModal();
  };

  const handleFromSiteChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFromSiteChange?.(event.target.value);
  };

  const handleToSiteChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToSiteChange?.(event.target.value);
  };

  const handleTransferRemarksChange = (event: ChangeEvent<HTMLInputElement>) => {
    onTransferRemarksChange?.(event.target.value);
  };

  const handleTransferToProjectChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    onTransferToProjectChange?.(event.target.value);
  };

  const handleEditTransferQtyChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setEditTransferQty(event.target.value);
  };

  return (
    <div className="mt-2 space-y-2">
      {/* top form unchanged */}
      <div className="grid grid-cols-2 gap-1 text-[11px] md:grid-cols-3 lg:grid-cols-6">
        <div>
          <div className="mb-[2px] text-[10px] text-slate-500">Code</div>
          <input
            type="text"
            value={transferCode}
            disabled
            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-[3px] font-mono text-[11px]"
          />
        </div>
        <div>
          <div className="mb-[2px] text-[10px] text-slate-500">From Project</div>
          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-[3px] text-[11px]">
            {selectedProject
              ? `${selectedProject.code} – ${selectedProject.name}`
              : "Select project"}
          </div>
        </div>
        <div>
          <div className="mb-[2px] text-[10px] text-slate-500">From Site</div>
          <input
            type="text"
            value={fromSite}
            onChange={handleFromSiteChange}
            className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
            placeholder="Site name / area"
          />
        </div>
        <div>
          <div className="mb-[2px] text-[10px] text-slate-500">To Project</div>
          <select
            value={transferToProjectId}
            onChange={handleTransferToProjectChange}
            className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
          >
            <option value="">Select project</option>
            {transferProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} – {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-[2px] text-[10px] text-slate-500">To Site</div>
          <input
            type="text"
            value={toSite}
            onChange={handleToSiteChange}
            className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
            placeholder="Destination site"
          />
        </div>
        <div className="md:col-span-1 lg:col-span-2">
          <div className="mb-[2px] text-[10px] text-slate-500">Remarks</div>
          <input
            type="text"
            value={transferRemarks}
            onChange={handleTransferRemarksChange}
            className="w-full rounded border border-slate-200 px-2 py-[3px] text-[11px]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <div className="text-slate-500">
          Sel: <span className="font-semibold text-slate-900">{selectedIds.length}</span>
        </div>
        <button
          type="button"
          onClick={onSaveTransfer}
          disabled={!transferToProjectId || selectedIds.length === 0}
          className={
            "inline-flex items-center gap-1 rounded border px-2 py-[3px] text-[10px] font-semibold " +
            (!transferToProjectId || selectedIds.length === 0
              ? "cursor-not-allowed border-slate-200 text-slate-500"
              : "border-indigo-500 text-indigo-700 hover:bg-indigo-50")
          }
        >
          <span>🔁</span>
          <span>Transfer</span>
        </button>
      </div>

      {/* MATERIALS TABLE – row-click + modal */}
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
              <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                Transfer Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const orderedQty =
                getProjectOrderedQty?.(currentProjectId, {
                  materialId: m.id,
                  materialCode: m.code,
                  fallback: Number(m.orderedQty ?? 0),
                }) ?? m.orderedQty ?? 0;

              const balanceQty =
                typeof m.balanceQty === "number"
                  ? m.balanceQty
                  : Math.max(
                      0,
                      Number(m.receivedQty || 0) - Number(m.utilizedQty || 0)
                    );

              const isSelected = selectedIds.includes(m.id);

              return (
                <tr
                  key={m.id}
                  onClick={() => openEditModal(m)}
                  className={
                    "cursor-pointer " +
                    (isSelected ? "bg-sky-50 hover:bg-sky-100" : "bg-white hover:bg-slate-50")
                  }
                >
                  <td className="border border-slate-200 px-2 py-1 font-mono">
                    {m.code}
                  </td>
                  <td className="border border-slate-200 px-2 py-1">{m.name}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    {m.requiredQty}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    {orderedQty}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    {m.receivedQty}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    {m.utilizedQty}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    {balanceQty}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    {transferQty[m.id] ?? ""}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: emptyRowCount }).map((_, idx) => (
              <tr key={`transfer-empty-${idx}`}>
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

      {/* EDIT TRANSFER QTY MODAL */}
      <ModalShell
        open={isEditModalOpen}
        title={
          editRow
            ? `Transfer · ${editRow.code} – ${editRow.name}`
            : "Transfer Quantity"
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
              className="rounded border border-indigo-500 px-3 py-1 text-indigo-700 hover:bg-indigo-50"
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
              <span className="text-[10px] text-slate-500">Transfer quantity</span>
              <input
                type="number"
                min="0"
                value={editTransferQty}
                onChange={handleEditTransferQtyChange}
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

export default TransferTab;
