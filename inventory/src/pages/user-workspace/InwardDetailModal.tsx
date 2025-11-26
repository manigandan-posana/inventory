import React, { FC } from "react";
import ModalShell from "./ModalShell";

export interface InwardLine {
  id: string | number;
  code: string;
  name: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
}

export interface InwardRecord {
  code: string;
  date: string;
  invoiceNo?: string | null;
  items: number | string;
  lines?: InwardLine[];
}

export interface InwardDetailModalState {
  open: boolean;
  record: InwardRecord | null;
}

export interface InwardDetailModalProps {
  modal: InwardDetailModalState;
  onClose: () => void;
}

const InwardDetailModal: FC<InwardDetailModalProps> = ({ modal, onClose }) => {
  return (
    <ModalShell
      open={modal.open}
      title={modal.record ? `Inward · ${modal.record.code}` : "Inward"}
      onClose={onClose}
    >
      {modal.record ? (
        <div className="space-y-3 text-slate-600">
          <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
            <div>
              <div className="text-[10px] text-slate-500">Code</div>
              <div className="font-mono">{modal.record.code}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Date</div>
              <div>{modal.record.date}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Invoice</div>
              <div>{modal.record.invoiceNo}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Items</div>
              <div>{modal.record.items}</div>
            </div>
          </div>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full border-collapse text-[11px] text-slate-800">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border border-slate-200 px-2 py-1 text-left">Code</th>
                  <th className="border border-slate-200 px-2 py-1 text-left">Material</th>
                  <th className="border border-slate-200 px-2 py-1 text-left">Unit</th>
                  <th className="border border-slate-200 px-2 py-1 text-right">Ordered</th>
                  <th className="border border-slate-200 px-2 py-1 text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {(modal.record.lines ?? []).map((line) => (
                  <tr key={line.id} className="bg-white">
                    <td className="border border-slate-200 px-2 py-1 font-mono">{line.code}</td>
                    <td className="border border-slate-200 px-2 py-1">{line.name}</td>
                    <td className="border border-slate-200 px-2 py-1">{line.unit}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {line.orderedQty}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-right">
                      {line.receivedQty}
                    </td>
                  </tr>
                ))}
                {(modal.record.lines ?? []).length === 0 && (
                  <tr>
                    <td
                      className="border border-slate-200 px-2 py-2 text-center text-slate-500"
                      colSpan={5}
                    >
                      No material lines available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-slate-500">Select a record to view details.</div>
      )}
    </ModalShell>
  );
};

export default InwardDetailModal;
