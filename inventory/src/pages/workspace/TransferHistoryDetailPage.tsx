import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";

interface TransferLine {
  id: string | number;
  materialName?: string | null;
  name?: string | null;
  materialCode?: string | null;
  code?: string | null;
  unit?: string | null;
  transferQty?: number | null;
  [key: string]: unknown;
}

interface TransferRecord {
  id: string | number;
  code: string;
  fromProjectName?: string | null;
  fromSite?: string | null;
  toProjectName?: string | null;
  toSite?: string | null;
  date?: string | null;
  remarks?: string | null;
  lines?: TransferLine[];
  [key: string]: unknown;
}

interface WorkspaceStateShape {
  transferHistory: TransferRecord[];
  [key: string]: unknown;
}

interface LocationState {
  record?: TransferRecord;
  recordId?: string | number;
  recordCode?: string;
}

function formatDate(value?: string | number | Date | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatMaterial(line: TransferLine): string {
  const name = line.materialName || line.name || "Unknown material";
  const code = line.materialCode || line.code;
  return code ? `${name} (${code})` : name;
}

function formatLocation(projectName?: string | null, site?: string | null): string {
  if (!projectName) return site || "—";
  return site ? `${projectName} · ${site}` : projectName;
}

const TransferHistoryDetailPage: React.FC = () => {
  const { recordId = "" } = useParams<{ recordId: string }>();
  const location = useLocation<LocationState>();
  const { transferHistory } = useSelector<RootState, WorkspaceStateShape>(
    (state) => state.workspace as unknown as WorkspaceStateShape
  );

  const decodedId = decodeURIComponent(recordId);
  const recordFromState = location.state?.record;

  const record = useMemo<TransferRecord | undefined>(() => {
    if (recordFromState) return recordFromState;
    return transferHistory.find(
      (entry) => `${entry.id}` === decodedId || entry.code === decodedId
    );
  }, [decodedId, recordFromState, transferHistory]);

  if (!record) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Transfer details
            </h1>
            <p className="text-sm text-slate-500">Record not found.</p>
          </div>
          <Link className="btn-secondary" to="/workspace/transfer/history">
            Back to transfer history
          </Link>
        </div>
        <div className="table-card text-sm text-slate-600">
          We could not locate this transfer record. Try returning to the
          register and selecting a row again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            {record.code}
          </h1>
          <p className="text-sm text-slate-500">
            Site transfer details with full material lines.
          </p>
        </div>
        <Link className="btn-secondary" to="/workspace/transfer/history">
          Back to transfer history
        </Link>
      </div>

      <div className="table-card grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            From
          </div>
          <div className="text-sm text-slate-800">
            {formatLocation(record.fromProjectName, record.fromSite)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            To
          </div>
          <div className="text-sm text-slate-800">
            {formatLocation(record.toProjectName, record.toSite)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Transfer date
          </div>
          <div className="text-sm text-slate-800">
            {formatDate(record.date)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Line items
          </div>
          <div className="text-sm text-slate-800">
            {(record.lines || []).length}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Remarks
          </div>
          <div className="text-sm text-slate-800">
            {record.remarks || "—"}
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Materials transferred
          </h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Unit</th>
                <th className="cell-number">Transfer Qty</th>
              </tr>
            </thead>
            <tbody>
              {(record.lines || []).map((line) => (
                <tr key={line.id}>
                  <td>{formatMaterial(line)}</td>
                  <td>{line.unit}</td>
                  <td className="cell-number">{line.transferQty ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransferHistoryDetailPage;
