import React, { FC } from "react";

export type ProcurementStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProcurementRequest {
  id: string | number;
  status?: ProcurementStatus | null;

  materialCode: string;
  materialName: string;

  projectCode: string;
  projectName: string;

  capturedRequiredQty?: number | null;
  requestedIncrease?: number | null;
  proposedRequiredQty?: number | null;

  reason?: string | null;

  requestedBy?: string | null;
  requestedAt?: string | Date | null;

  resolvedBy?: string | null;
  resolvedAt?: string | Date | null;
  resolutionNote?: string | null;
}

export interface ProcurementCenterProps {
  requests: ProcurementRequest[];
  canReviewRequests: boolean;
  pendingRequestCount: number;
  formatDateTimeLabel: (value: string | Date | null | undefined) => string;
  onOpenDecision?: (
    request: ProcurementRequest,
    decision: Exclude<ProcurementStatus, "PENDING">
  ) => void;
}

const ProcurementCenter: FC<ProcurementCenterProps> = ({
  requests,
  canReviewRequests,
  pendingRequestCount,
  formatDateTimeLabel,
  onOpenDecision,
}) => {
  if (!requests.length && !canReviewRequests) {
    return null;
  }

  const statusStyles: Record<ProcurementStatus, string> = {
    PENDING: "border-amber-300 bg-amber-50 text-amber-700",
    APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
    REJECTED: "border-rose-300 bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-3 text-[11px] text-slate-800 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
        <div>
          <div className="font-semibold text-amber-800">Procurement Requests</div>
          <div className="text-[10px] text-slate-500">
            {canReviewRequests
              ? "Review increase requests from site teams"
              : "Track the status of your quantity increase requests"}
          </div>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-[2px] text-[10px] font-semibold text-amber-700">
          {pendingRequestCount} pending
        </span>
      </div>
      <div className="mt-2 max-h-60 space-y-2 overflow-y-auto text-[10px]">
        {requests.map((req) => {
          const status: ProcurementStatus = req.status ?? "PENDING";
          const badgeClass =
            statusStyles[status] ||
            "border-slate-200 bg-slate-50 text-slate-600";

          return (
            <div key={req.id} className="rounded border border-slate-200 bg-slate-50 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-800">
                  {req.materialCode} – {req.materialName}
                </div>
                <span
                  className={`rounded-full border px-2 py-px text-[9px] uppercase tracking-wide ${badgeClass}`}
                >
                  {status}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {req.projectCode} – {req.projectName}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-slate-600">
                <div>Reqd: {req.capturedRequiredQty ?? 0}</div>
                <div>+ {req.requestedIncrease ?? 0}</div>
                <div>→ {req.proposedRequiredQty ?? 0}</div>
              </div>
              <div className="mt-1 text-slate-600">Reason: {req.reason || "-"}</div>
              <div className="mt-1 text-slate-500">
                Requested by {req.requestedBy || "-"} on{" "}
                {formatDateTimeLabel(req.requestedAt)}
              </div>
              {req.resolvedBy && status !== "PENDING" && (
                <div className="text-slate-500">
                  {status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                  {req.resolvedBy} on {formatDateTimeLabel(req.resolvedAt)}
                  {req.resolutionNote ? ` · ${req.resolutionNote}` : ""}
                </div>
              )}
              {canReviewRequests && status === "PENDING" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDecision?.(req, "APPROVED")}
                    className="rounded border border-emerald-400 px-2 py-[2px] text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDecision?.(req, "REJECTED")}
                    className="rounded border border-rose-400 px-2 py-[2px] text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {requests.length === 0 && (
          <div className="rounded border border-dashed border-amber-200 bg-white/50 p-3 text-center text-slate-500">
            No procurement requests yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcurementCenter;
