import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import PaginationControls from "../../components/PaginationControls";
import usePagination from "../../hooks/usePagination";
import type { RootState } from "../../store/store";

// ---- Types ---- //

export interface WorkspaceMaterial {
  id: string | number;
  code?: string | null;
  name?: string | null;
  category?: string | null;
  unit?: string | null;
  // allow any additional backend fields without breaking the UI
  [key: string]: unknown;
}

interface WorkspaceStateSlice {
  materials: WorkspaceMaterial[];
}

// ---- Component ---- //

const MasterPage: React.FC = () => {
  const { materials } = useSelector<RootState, WorkspaceStateSlice>(
    (state) => state.workspace as unknown as WorkspaceStateSlice
  );

  const [search, setSearch] = useState<string>("");

  const rows = useMemo<WorkspaceMaterial[]>(() => {
    if (!search.trim()) return materials;
    const term = search.toLowerCase();
    return materials.filter(
      (m) =>
        m.code?.toLowerCase().includes(term) ||
        m.name?.toLowerCase().includes(term) ||
        m.category?.toLowerCase().includes(term)
    );
  }, [materials, search]);

  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    currentItems,
    setPage,
    setPageSize,
  } = usePagination<WorkspaceMaterial>(rows, 10);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Material master</h1>
        <p className="text-sm text-slate-500">
          Read-only view of backend controlled materials.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <input
            type="search"
            className="w-full max-w-sm rounded-full border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search code, name or category"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
          />
          <div className="text-sm text-slate-500">{rows.length} items</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="border border-slate-200 px-3 py-2">Code</th>
                <th className="border border-slate-200 px-3 py-2">Name</th>
                <th className="border border-slate-200 px-3 py-2">Category</th>
                <th className="border border-slate-200 px-3 py-2">Unit</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((m) => (
                <tr key={m.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 font-mono text-xs">
                    {m.code}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {m.name}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {m.category}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {m.unit}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-200 px-3 py-6 text-center text-slate-500"
                  >
                    No materials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
};

export default MasterPage;
