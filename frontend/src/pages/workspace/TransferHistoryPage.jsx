import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import usePagination from "../../hooks/usePagination";

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

function formatLocation(projectName, site) {
  if (!projectName) return site || "--";
  return site ? `${projectName} · ${site}` : projectName;
}

export default function TransferHistoryPage() {
  const { transferHistory } = useSelector((state) => state.workspace);
  const navigate = useNavigate();
  const rows = useMemo(() => transferHistory || [], [transferHistory]);
  const pagination = usePagination(rows, 10);

  const openDetails = (record) => {
    const recordKey = record.id ?? record.code;
    if (!recordKey) return;
    navigate(`/workspace/transfer/history/${encodeURIComponent(recordKey)}`, {
      state: { recordId: record.id, recordCode: record.code, record },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Transfer history</h1>
          <p className="text-sm text-slate-500">Source and destination site transfers with line-level details.</p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="table-card text-center text-sm text-slate-500">No transfer records yet.</div>
      )}

          {pagination.currentItems.map((record) => (
            <div
              key={record.id || record.code}
              role="button"
              tabIndex={0}
              className="table-card cursor-pointer transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              onClick={() => openDetails(record)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDetails(record);
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{record.code}</div>
                  <div className="text-xs text-slate-500">
                    {formatLocation(record.fromProjectName, record.fromSite)} → {formatLocation(record.toProjectName, record.toSite)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDate(record.date)}</div>
              </div>
          <div className="mt-2 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-2">
            <div>Remarks: {record.remarks || "—"}</div>
            <div>Lines: {(record.lines || []).length}</div>
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
      ))}
      <div className="table-card">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    </div>
  );
}
