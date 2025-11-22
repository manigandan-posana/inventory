import React from "react";
import ModalShell from "./ModalShell";

export default function MaterialMovementModal({ modal, onClose }) {
  return (
    <ModalShell
      open={modal.open}
      title={`Material Movement · ${modal.materialName || ""}`}
      onClose={onClose}
    >
      {modal.loading && <div className="text-slate-500">Fetching movement history…</div>}
      {!modal.loading && modal.error && (
        <div className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-600">{modal.error}</div>
      )}
      {!modal.loading && !modal.error && (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Inwards</div>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full border-collapse text-[11px] text-slate-800">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border border-slate-200 px-2 py-1 text-left">Code</th>
                    <th className="border border-slate-200 px-2 py-1 text-left">Date</th>
                    <th className="border border-slate-200 px-2 py-1 text-left">Invoice</th>
                    <th className="border border-slate-200 px-2 py-1 text-right">Ordered</th>
                    <th className="border border-slate-200 px-2 py-1 text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {modal.inwards.map((record) => {
                    const line = record.lines?.[0];
                    return (
                      <tr key={`mov-in-${record.id}`} className="bg-white">
                        <td className="border border-slate-200 px-2 py-1">{record.code}</td>
                        <td className="border border-slate-200 px-2 py-1">{record.date}</td>
                        <td className="border border-slate-200 px-2 py-1">{record.invoiceNo}</td>
                        <td className="border border-slate-200 px-2 py-1 text-right">{line?.orderedQty ?? 0}</td>
                        <td className="border border-slate-200 px-2 py-1 text-right">{line?.receivedQty ?? 0}</td>
                      </tr>
                    );
                  })}
                  {modal.inwards.length === 0 && (
                    <tr>
                      <td className="border border-slate-200 px-2 py-2 text-center text-slate-500" colSpan={5}>
                        No inward activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Outwards</div>
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full border-collapse text-[11px] text-slate-800">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border border-slate-200 px-2 py-1 text-left">Code</th>
                    <th className="border border-slate-200 px-2 py-1 text-left">Date</th>
                    <th className="border border-slate-200 px-2 py-1 text-left">Issue to</th>
                    <th className="border border-slate-200 px-2 py-1 text-right">Qty.</th>
                  </tr>
                </thead>
                <tbody>
                  {modal.outwards.map((record) => {
                    const line = record.lines?.[0];
                    return (
                      <tr key={`mov-out-${record.id}`} className="bg-white">
                        <td className="border border-slate-200 px-2 py-1">{record.code}</td>
                        <td className="border border-slate-200 px-2 py-1">{record.date}</td>
                        <td className="border border-slate-200 px-2 py-1">{record.issueTo}</td>
                        <td className="border border-slate-200 px-2 py-1 text-right">{line?.issueQty ?? 0}</td>
                      </tr>
                    );
                  })}
                  {modal.outwards.length === 0 && (
                    <tr>
                      <td className="border border-slate-200 px-2 py-2 text-center text-slate-500" colSpan={4}>
                        No outward activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
