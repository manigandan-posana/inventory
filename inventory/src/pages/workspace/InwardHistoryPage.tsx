import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import { api } from "../../api/client";
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
  id?: string | number | null;
  code?: string | null;
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

const InwardHistoryPage: React.FC = () => {
  // Grab token from auth state. Axios interceptors will include it automatically in requests.
  const token = useSelector((state: RootState) => state.auth.token);
  const navigate = useNavigate();

  // Local pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [rows, setRows] = useState<InwardHistoryRecord[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Fetch paginated data when page or pageSize changes
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }
      try {
        const response = await api.searchInwardHistory(token, {
          page,
          size: pageSize,
        });
        const items = (response?.items ?? []) as InwardHistoryRecord[];
        setRows(items);
        setTotalItems(response?.totalItems ?? items.length);
        setTotalPages(response?.totalPages ?? 1);
      } catch (error) {
        // In case of error, reset state
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    };
    void fetchData();
  }, [page, pageSize, token]);

  const openDetails = (record: InwardHistoryRecord): void => {
    const recordKey = record.id ?? record.code;
    if (!recordKey) return;
    navigate(`/workspace/inward/history/${encodeURIComponent(String(recordKey))}`, {
      state: {
        recordId: record.id,
        recordCode: record.code,
        record,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Inward history</h1>
          <p className="text-sm text-slate-500">
            Full inward register with line details for your assigned sites.
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="table-card text-center text-sm text-slate-500">
          No inward records yet.
        </div>
      )}

      {rows.map((record) => (
        <div
          key={record.id ?? record.code ?? Math.random()}
          role="button"
          tabIndex={0}
          className="table-card cursor-pointer transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          onClick={() => openDetails(record)}
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openDetails(record);
            }
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {record.code || "—"}
              </div>
              <div className="text-xs text-slate-500">{record.projectName || "—"}</div>
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(record.deliveryDate || record.date)}
            </div>
          </div>
          <div className="mt-2 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-3">
            <div>Invoice: {record.invoiceNo || "—"}</div>
            <div>Supplier: {record.supplierName || "—"}</div>
            <div>Lines: {record.items ?? (record.lines?.length ?? 0)}</div>
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
                {(record.lines || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-500">
                      No material lines recorded for this inward.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="table-card">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(next) => setPage(next)}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};

export default InwardHistoryPage;
