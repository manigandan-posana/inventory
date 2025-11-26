// src/components/PaginationControls.tsx
import React from "react";

export interface PaginationControlsProps {
  page?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}) => {
  const safePage = Math.max(1, page);
  const safeTotal = Math.max(1, totalPages);
  const clampedPage = Math.min(safePage, safeTotal);

  const start = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const end = Math.min(totalItems, clampedPage * pageSize);

  const canPrev = clampedPage > 1 && !disabled;
  const canNext = clampedPage < safeTotal && !disabled;

  const handlePageSizeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number(event.target.value);
    const nextSize = Number.isNaN(value) ? pageSize : value;
    onPageSizeChange?.(nextSize);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[11px] text-slate-700 shadow-sm">
      <div>
        Showing{" "}
        <span className="font-semibold text-slate-900">{start}</span>-
        <span className="font-semibold text-slate-900">{end}</span> of
        <span className="font-semibold text-slate-900"> {totalItems}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-full border border-[var(--border)] px-3 py-[6px] text-[11px] focus:border-[var(--primary)] focus:outline-none"
            disabled={disabled}
          >
            {[5, 10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-3 py-[6px] text-[11px] text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => canPrev && onPageChange?.(clampedPage - 1)}
            disabled={!canPrev}
          >
            Previous
          </button>

          <div className="min-w-[90px] text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Page {clampedPage} / {safeTotal}
          </div>

          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-3 py-[6px] text-[11px] text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => canNext && onPageChange?.(clampedPage + 1)}
            disabled={!canNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
