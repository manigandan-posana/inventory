import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatMaterial(line) {
  const name = line.materialName || line.name || "Unknown material";
  const code = line.materialCode || line.code;
  return code ? `${name} (${code})` : name;
}

export default function InwardHistoryDetailPage() {
  const { recordId = "" } = useParams();
  const location = useLocation();
  const { inwardHistory } = useSelector((state) => state.workspace);

  const decodedId = decodeURIComponent(recordId);
  const recordFromState = location.state?.record;

  const record = useMemo(() => {
    if (recordFromState) return recordFromState;
    return inwardHistory.find(
      (entry) => `${entry.id}` === decodedId || entry.code === decodedId,
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
          We could not locate this inward record. Try returning to the register and selecting a row again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{record.code}</h1>
          <p className="text-sm text-slate-500">Inward register details with full material lines.</p>
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
          <div className="text-sm text-slate-800">{formatDate(record.deliveryDate || record.date)}</div>
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
          <div className="text-sm text-slate-800">{(record.lines || []).length || record.items || 0}</div>
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
              {(record.lines || []).map((line) => (
                <tr key={line.id}>
                  <td>{formatMaterial(line)}</td>
                  <td>{line.unit}</td>
                  <td className="cell-number">{line.orderedQty ?? 0}</td>
                  <td className="cell-number">{line.receivedQty ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
