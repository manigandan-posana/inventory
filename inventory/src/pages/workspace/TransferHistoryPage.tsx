import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import { api } from "../../api/client";
import type { RootState } from "../../store/store";

// Types for transfer history lines returned by the backend
export interface TransferHistoryLine {
  id: string | number;
  materialName?: string | null;
  name?: string | null;
  materialCode?: string | null;
  code?: string | null;
  unit?: string | null;
  transferQty?: number | null;
  // allow any extra fields from backend
  [key: string]: unknown;
}

export interface TransferHistoryRecord {
  id?: string | number;
  code: string;
  fromProjectName?: string | null;
  fromSite?: string | null;
  toProjectName?: string | null;
  toSite?: string | null;
  date?: string | number | Date | null;
  remarks?: string | null;
  lines?: TransferHistoryLine[];
  // allow any extra fields from backend
  [key: string]: unknown;
}

function formatDate(value?: string | number | Date | null): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatMaterial(line: TransferHistoryLine): string {
  const name = line.materialName || line.name || "Unknown material";
  const code = line.materialCode || line.code;
  return code ? `${name} (${code})` : name;
}

function formatLocation(
  projectName?: string | null,
  site?: string | null
): string {
  if (!projectName) return site || "--";
  return site ? `${projectName} · ${site}` : projectName;
}

const TransferHistoryPage: React.FC = () => {
  // Grab token from auth state; axios interceptor will attach it automatically.
  const token = useSelector((state: RootState) => state.auth.token);
  const navigate = useNavigate();

  // Local pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [rows, setRows] = useState<TransferHistoryRecord[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Fetch paginated transfer history from the backend when page or pageSize changes
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }
      try {
        const response = await api.searchTransferHistory(token, {
          page,
          size: pageSize,
        });
        const items = (response?.items ?? []) as TransferHistoryRecord[];
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

  const openDetails = (record: TransferHistoryRecord): void => {
    const recordKey = record.id ?? record.code;
    if (!recordKey) return;
    navigate(`/workspace/transfer/history/${encodeURIComponent(String(recordKey))}`, {
      state: { recordId: record.id, recordCode: record.code, record },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Transfer history
          </h1>
          <p className="text-sm text-slate-500">
            Source and destination site transfers with line-level details.
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="table-card text-center text-sm text-slate-500">
          No transfer records yet.
        </div>
      )}

      {rows.map((record) => (
        <div
          key={record.id ?? record.code}
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
                {record.code}
              </div>
              <div className="text-xs text-slate-500">
                {formatLocation(record.fromProjectName, record.fromSite)} → {""}
                {formatLocation(record.toProjectName, record.toSite)}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(record.date)}
            </div>
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
                {(record.lines || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-slate-500">
                      No material lines recorded for this transfer.
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

export default TransferHistoryPage;
