import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";

// ---- Types ---- //

export interface OutwardHistoryLine {
  id: string | number;
  materialName?: string | null;
  name?: string | null;
  materialCode?: string | null;
  code?: string | null;
  unit?: string | null;
  issueQty?: number | null;
  // allow extra backend fields
  [key: string]: unknown;
}

export interface OutwardHistoryRecord {
  id: string | number;
  code: string;
  projectName?: string | null;
  date?: string | null;
  issueTo?: string | null;
  status?: string | null;
  items?: number | null;
  lines?: OutwardHistoryLine[];
  // allow extra backend fields
  [key: string]: unknown;
}

interface WorkspaceStateSlice {
  outwardHistory: OutwardHistoryRecord[];
}

interface OutwardHistoryLocationState {
  recordId?: string | number;
  recordCode?: string;
  record?: OutwardHistoryRecord;
}

// ---- Helpers ---- //

function formatDate(value?: string | Date | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatMaterial(line: OutwardHistoryLine): string {
  const name = (line.materialName || line.name || "Unknown material") as string;
  const code = (line.materialCode || line.code) as string | undefined;
  return code ? `${name} (${code})` : name;
}

// ---- Component ---- //

const OutwardHistoryDetailPage: React.FC = () => {
  const params = useParams<{ recordId: string }>();
  const recordId = params.recordId ?? "";
  const location = useLocation() as { state?: OutwardHistoryLocationState };

  const { outwardHistory } = useSelector<RootState, WorkspaceStateSlice>(
    (state) => state.workspace as unknown as WorkspaceStateSlice
  );

  const decodedId = decodeURIComponent(recordId);
  const recordFromState = location.state?.record;

  const record = useMemo<OutwardHistoryRecord | undefined>(() => {
    if (recordFromState) return recordFromState;
    return outwardHistory.find(
      (entry) => `${entry.id}` === decodedId || entry.code === decodedId
    );
  }, [decodedId, outwardHistory, recordFromState]);

  if (!record) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Outward details</h1>
            <p className="text-sm text-slate-500">Record not found.</p>
          </div>
          <Link className="btn-secondary" to="/workspace/outward/history">
            Back to outward history
          </Link>
        </div>
        <div className="table-card text-sm text-slate-600">
          We could not locate this outward record. Try returning to the register and selecting a
          row again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{record.code}</h1>
          <p className="text-sm text-slate-500">
            Outward register details with full material lines.
          </p>
        </div>
        <Link className="btn-secondary" to="/workspace/outward/history">
          Back to outward history
        </Link>
      </div>

      <div className="table-card grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Project</div>
          <div className="text-sm text-slate-800">{record.projectName || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Issue date</div>
          <div className="text-sm text-slate-800">{formatDate(record.date)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Issued to</div>
          <div className="text-sm text-slate-800">{record.issueTo || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
          <div className="text-sm text-slate-800">{record.status || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Line items</div>
          <div className="text-sm text-slate-800">
            {(record.lines || []).length || record.items || 0}
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Materials issued</h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Unit</th>
                <th className="cell-number">Issue Qty</th>
              </tr>
            </thead>
            <tbody>
              {(record.lines || []).map((line) => (
                <tr key={line.id}>
                  <td>{formatMaterial(line)}</td>
                  <td>{line.unit}</td>
                  <td className="cell-number">{line.issueQty ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OutwardHistoryDetailPage;
