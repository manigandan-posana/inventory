import { useEffect, useMemo, useState } from "react";

export default function usePagination(items = [], initialPageSize = 10, initialPage = 1) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = useMemo(() => {
    const nextTotal = Math.ceil(totalItems / pageSize);
    return Math.max(1, Number.isFinite(nextTotal) ? nextTotal : 1);
  }, [pageSize, totalItems]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, totalItems]);

  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = useMemo(
    () => items.slice(startIndex, startIndex + pageSize),
    [items, pageSize, startIndex]
  );

  const changePage = (next) => setPage(Math.max(1, Math.min(next, totalPages)));
  const changePageSize = (next) => {
    const sanitized = Number.isFinite(next) && next > 0 ? next : pageSize;
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
