// src/hooks/usePagination.ts
import { useEffect, useMemo, useState } from "react";

export interface UsePaginationResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  currentItems: T[];
  setPage: (nextPage: number) => void;
  setPageSize: (nextPageSize: number) => void;
}

/**
 * Generic pagination hook.
 *
 * @param items            Array of items to paginate.
 * @param initialPageSize  Items per page (default 10).
 * @param initialPage      Initial page number (default 1).
 */
export default function usePagination<T>(
  items: T[],
  initialPageSize = 10,
  initialPage = 1
): UsePaginationResult<T> {
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const totalItems = items.length;

  const totalPages = useMemo<number>(() => {
    const nextTotal = Math.ceil(totalItems / pageSize);
    return Math.max(1, Number.isFinite(nextTotal) ? nextTotal : 1);
  }, [pageSize, totalItems]);

  // Clamp page when totalPages shrinks
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Reset to page 1 when pageSize or items change
  useEffect(() => {
    setPage(1);
  }, [pageSize, totalItems]);

  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const currentItems = useMemo<T[]>(
    () => items.slice(startIndex, startIndex + pageSize),
    [items, pageSize, startIndex]
  );

  const changePage = (next: number): void => {
    const clamped = Math.max(1, Math.min(next, totalPages));
    setPage(clamped);
  };

  const changePageSize = (next: number): void => {
    const sanitized =
      Number.isFinite(next) && next > 0 ? next : pageSize;
    setPageSize(sanitized);
    setPage(1);
  };

  return {
    page: currentPage,
    pageSize,
    totalPages,
    totalItems,
    currentItems,
    setPage: changePage,
    setPageSize: changePageSize,
  };
}
