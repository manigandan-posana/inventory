import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import { api } from "../../api/client";
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

const OutwardHistoryPage: React.FC = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const navigate = useNavigate();

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [rows, setRows] = useState<OutwardHistoryRecord[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }
      try {
        const response = await api.searchOutwardHistory(token, {
          page,
          size: pageSize,
        });
        const items = (response?.items ?? []) as OutwardHistoryRecord[];
        setRows(items);
        setTotalItems(response?.totalItems ?? items.length);
        setTotalPages(response?.totalPages ?? 1);
      } catch (error) {
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    };
    void fetchData();
  }, [page, pageSize, token]);

  const openDetails = (record: OutwardHistoryRecord): void => {
    const recordKey = record.id ?? record.code;
    if (!recordKey) return;
    navigate(`/workspace/outward/history/${encodeURIComponent(String(recordKey))}`, {
      state: { recordId: record.id, recordCode: record.code, record },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Outward history</h1>
          <p className="text-sm text-slate-500">
            All outward registers with line items for your assigned sites.
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="table-card text-center text-sm text-slate-500">
          No outward records yet.
        </div>
      )}

      {rows.map((record) => (
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
            <div className="text-xs text-slate-500">{formatDate(record.date)}</div>
          </div>
          <div className="mt-2 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-3">
            <div>Issue to: {record.issueTo || "—"}</div>
            <div>Status: {record.status || "—"}</div>
            <div>Lines: {record.items ?? (record.lines || []).length}</div>
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

export default OutwardHistoryPage;
