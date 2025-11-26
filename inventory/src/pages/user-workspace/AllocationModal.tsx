import React, { ChangeEvent } from "react";
import ModalShell from "./ModalShell";

export interface AllocationModalState {
  open: boolean;
  saving: boolean;
  projectId?: string | number | null;
  materialCode?: string | null;
  materialName?: string | null;
  quantity?: number | null;
}

export interface AllocationModalProps {
  modal: AllocationModalState;
  onClose: () => void;
  onChangeQuantity?: (value: string) => void;
  onSubmit: () => void;
}

const AllocationModal: React.FC<AllocationModalProps> = ({
  modal,
  onClose,
  onChangeQuantity,
  onSubmit,
}) => {
  const handleQuantityChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChangeQuantity?.(e.target.value);
  };

  return (
    <ModalShell
      open={modal.open}
      title={`Adjust Allocation · ${modal.materialCode || ""}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2 text-[11px]">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
            disabled={modal.saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={modal.saving}
            className="rounded border border-emerald-500 px-3 py-1 text-emerald-600 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modal.saving ? "Saving…" : "Update allocation"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-[11px] text-slate-600">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-slate-500">Project</div>
            <div className="font-semibold">{modal.projectId ?? "--"}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Material</div>
            <div className="font-semibold">
              {modal.materialName || modal.materialCode || "--"}
            </div>
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500">Allocated quantity</span>
          <input
            type="number"
            min={0}
            value={modal.quantity ?? ""}
            onChange={handleQuantityChange}
            className="w-full rounded border border-slate-200 px-2 py-[4px] text-[11px]"
          />
        </label>
      </div>
    </ModalShell>
  );
};

export default AllocationModal;
