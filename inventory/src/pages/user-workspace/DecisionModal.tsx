import React, { FC, ChangeEvent } from "react";
import ModalShell from "./ModalShell";

export type ProcurementDecision = "APPROVED" | "REJECTED";

export interface ProcurementRequestSummary {
  materialCode: string;
  materialName: string;
  projectCode: string;
  projectName: string;
  capturedRequiredQty?: number | null;
  requestedIncrease?: number | null;
  proposedRequiredQty?: number | null;
  reason?: string | null;
}

export interface DecisionModalState {
  open: boolean;
  saving: boolean;
  decision: ProcurementDecision;
  note: string;
  request: ProcurementRequestSummary | null;
}

export interface DecisionModalChangePatch {
  decision?: ProcurementDecision;
  note?: string;
}

export interface DecisionModalProps {
  modal: DecisionModalState;
  onClose: () => void;
  onChange?: (patch: DecisionModalChangePatch) => void;
  onSubmit?: () => void;
}

const DecisionModal: FC<DecisionModalProps> = ({
  modal,
  onClose,
  onChange,
  onSubmit,
}) => {
  const handleDecisionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange?.({ decision: e.target.value as ProcurementDecision });
  };

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.({ note: e.target.value });
  };

  return (
    <ModalShell
      open={modal.open}
      title="Review procurement request"
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
            onClick={() => onSubmit?.()}
            disabled={modal.saving}
            className="rounded border border-emerald-500 px-3 py-1 text-emerald-600 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modal.saving
              ? "Updating…"
              : modal.decision === "APPROVED"
              ? "Approve"
              : "Reject"}
          </button>
        </div>
      }
    >
      {modal.request ? (
        <div className="space-y-3 text-[11px] text-slate-600">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-slate-500">Material</div>
              <div className="font-semibold">
                {modal.request.materialCode} – {modal.request.materialName}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Project</div>
              <div className="font-semibold">
                {modal.request.projectCode} – {modal.request.projectName}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-slate-600">
            <div>Reqd: {modal.request.capturedRequiredQty ?? 0}</div>
            <div>+ {modal.request.requestedIncrease ?? 0}</div>
            <div>→ {modal.request.proposedRequiredQty ?? 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Reason</div>
            <div>{modal.request.reason || "-"}</div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Decision</span>
            <select
              value={modal.decision}
              onChange={handleDecisionChange}
              className="rounded border border-slate-200 px-2 py-[4px] text-[11px]"
            >
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Note</span>
            <textarea
              rows={3}
              value={modal.note}
              onChange={handleNoteChange}
              className="w-full rounded border border-slate-200 px-2 py-[4px] text-[11px]"
            />
          </label>
        </div>
      ) : (
        <div className="text-slate-500">Select a request to review.</div>
      )}
    </ModalShell>
  );
};

export default DecisionModal;
