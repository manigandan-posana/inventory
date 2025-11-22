import React from "react";

export default function WorkspaceHeader({
  title,
  screen,
  showProjectDropdown,
  selectedProjectId,
  selectedProject,
  assignedProjects,
  onSelectProject,
  currentUser,
  canReviewRequests,
  pendingRequestCount,
  canAdjustAllocations,
  onOpenAllocations,
  canOpenAdmin,
  isAdminRole,
  onOpenAdmin,
  onLogout,
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-lg font-semibold text-black">{title}</div>
        {screen === "main" && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span>Project</span>
            {showProjectDropdown ? (
              <select
                value={selectedProjectId || ""}
                onChange={(e) => onSelectProject?.(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-weak)] px-2 py-[5px] text-[11px]"
              >
                {assignedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} – {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface-weak)] px-2 py-[5px] text-slate-800">
                {selectedProject?.code || "--"}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-weak)] px-3 py-[6px]">
          {currentUser?.name} ({currentUser?.role})
        </span>
        {canReviewRequests && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-[6px] text-amber-700">
            {pendingRequestCount} pending
          </span>
        )}
        {canAdjustAllocations && screen !== "allocations" && (
          <button
            type="button"
            onClick={onOpenAllocations}
            className="rounded-full border border-[var(--border)] px-3 py-[6px] text-slate-800 transition hover:bg-[var(--surface-weak)]"
          >
            Allocations
          </button>
        )}
        {canOpenAdmin && isAdminRole && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="rounded-full border border-[var(--border)] px-3 py-[6px] text-slate-800 transition hover:bg-[var(--surface-weak)]"
          >
            Admin Dashboard
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-full border border-[#fb5607] px-3 py-[6px] text-[11px] font-semibold text-[#fb5607] transition hover:bg-[#fb5607]/10"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
