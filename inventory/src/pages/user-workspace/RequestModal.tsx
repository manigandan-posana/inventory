import React, { FC } from "react";
import ModalShell from "./ModalShell";

export interface RequestModalState {
  open: boolean;
  saving: boolean;
  projectId?: string | number | null;
  materialCode?: string | null;
  materialName?: string | null;
  increaseQty?: number | string | null;
  reason: string;
}

export type RequestModalField = "increaseQty" | "reason";

export interface RequestModalProps {
  modal: RequestModalState;
  onClose: () => void;
  onChangeField?: (field: RequestModalField, value: string) => void;
  onSubmit?: () => void;
}

const RequestModal: FC<RequestModalProps> = ({
  modal,
  onClose,
  onChangeField,
  onSubmit,
}) => {
  return (
    <ModalShell
      open={modal.open}
      title={`Request Quantity Increase · ${modal.materialCode || ""}`}
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
            className="rounded border border-sky-500 px-3 py-1 text-sky-600 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modal.saving ? "Submitting…" : "Submit request"}
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
              {modal.materialName || modal.materialCode}
            </div>
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500">Increase quantity</span>
          <input
            type="number"
            min="0"
            value={modal.increaseQty ?? ""}
            onChange={(e) => onChangeField?.("increaseQty", e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-[4px] text-[11px]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500">Reason</span>
          <textarea
            rows={3}
            value={modal.reason}
            onChange={(e) => onChangeField?.("reason", e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-[4px] text-[11px]"
          />
        </label>
      </div>
    </ModalShell>
  );
};

export default RequestModal;
