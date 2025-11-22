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

export default function InwardHistoryPage() {
  const { inwardHistory } = useSelector((state) => state.workspace);
  const navigate = useNavigate();

  const rows = useMemo(() => inwardHistory || [], [inwardHistory]);
  const pagination = usePagination(rows, 10);

  const openDetails = (record) => {
    const recordKey = record.id ?? record.code;
    if (!recordKey) return;
    navigate(`/workspace/inward/history/${encodeURIComponent(recordKey)}`, {
      state: { recordId: record.id, recordCode: record.code, record },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Inward history</h1>
          <p className="text-sm text-slate-500">Full inward register with line details for your assigned sites.</p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="table-card text-center text-sm text-slate-500">No inward records yet.</div>
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
              <div className="text-xs text-slate-500">{record.projectName}</div>
            </div>
            <div className="text-xs text-slate-500">{formatDate(record.deliveryDate || record.date)}</div>
          </div>
          <div className="mt-2 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-3">
            <div>Invoice: {record.invoiceNo || "—"}</div>
            <div>Supplier: {record.supplierName || "—"}</div>
            <div>Lines: {record.items}</div>
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
