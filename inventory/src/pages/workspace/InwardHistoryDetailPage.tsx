import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";

// --- Types --- //

export interface InwardHistoryLine {
  id: string | number;
  code?: string | null;
  name?: string | null;
  materialCode?: string | null;
  materialName?: string | null;
  unit?: string | null;
  orderedQty?: number | null;
  receivedQty?: number | null;
}

export interface InwardHistoryRecord {
  id: string | number;
  code: string;
  projectName?: string | null;
  deliveryDate?: string | null;
  date?: string | null;
  invoiceNo?: string | null;
  supplierName?: string | null;
  vehicleNo?: string | null;
  items?: number | null;
  lines?: InwardHistoryLine[];
}

interface WorkspaceStateWithInwardHistory {
  inwardHistory: InwardHistoryRecord[];
}

interface InwardHistoryDetailLocationState {
  record?: InwardHistoryRecord;
}

// --- Helpers --- //

function formatDate(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatMaterial(line: InwardHistoryLine): string {
  const name = line.materialName || line.name || "Unknown material";
  const code = line.materialCode || line.code;
  return code ? `${name} (${code})` : name;
}

// --- Component --- //

const InwardHistoryDetailPage: React.FC = () => {
  const { recordId = "" } = useParams<{ recordId?: string }>();

  const location = useLocation();
  const locationState = (location.state || null) as InwardHistoryDetailLocationState | null;

  const inwardHistory = useSelector<RootState, InwardHistoryRecord[]>((state) => {
    const workspace = state.workspace as WorkspaceStateWithInwardHistory;
    return workspace.inwardHistory || [];
  });

  const decodedId = decodeURIComponent(recordId);
  const recordFromState = locationState?.record;

  const record = useMemo<InwardHistoryRecord | undefined>(() => {
    if (recordFromState) return recordFromState;
    return inwardHistory.find(
      (entry) => `${entry.id}` === decodedId || entry.code === decodedId
    );
  }, [decodedId, inwardHistory, recordFromState]);

  if (!record) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Inward details</h1>
            <p className="text-sm text-slate-500">Record not found.</p>
          </div>
          <Link className="btn-secondary" to="/workspace/inward/history">
            Back to inward history
          </Link>
        </div>
        <div className="table-card text-sm text-slate-600">
          We could not locate this inward record. Try returning to the register and selecting a row
          again.
        </div>
      </div>
    );
  }

  const lines = record.lines ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{record.code}</h1>
          <p className="text-sm text-slate-500">
            Inward register details with full material lines.
          </p>
        </div>
        <Link className="btn-secondary" to="/workspace/inward/history">
          Back to inward history
        </Link>
      </div>

      <div className="table-card grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Project</div>
          <div className="text-sm text-slate-800">{record.projectName || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Delivery date</div>
          <div className="text-sm text-slate-800">
            {formatDate(record.deliveryDate || record.date)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Invoice</div>
          <div className="text-sm text-slate-800">{record.invoiceNo || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Supplier</div>
          <div className="text-sm text-slate-800">{record.supplierName || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Vehicle</div>
          <div className="text-sm text-slate-800">{record.vehicleNo || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Line items</div>
          <div className="text-sm text-slate-800">{lines.length || record.items || 0}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Materials received</h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Unit</th>
                <th className="cell-number">Ordered</th>
                <th className="cell-number">Received</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>{formatMaterial(line)}</td>
                  <td>{line.unit}</td>
                  <td className="cell-number">{line.orderedQty ?? 0}</td>
                  <td className="cell-number">{line.receivedQty ?? 0}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-slate-500">
                    No material lines available for this record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InwardHistoryDetailPage;
