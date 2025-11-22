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
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {screen === "main" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Project</span>
            {showProjectDropdown ? (
              <select
                value={selectedProjectId || ""}
                onChange={(e) => onSelectProject?.(e.target.value)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-[3px]"
              >
                {assignedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} – {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-[3px] text-slate-800">
                {selectedProject?.code || "--"}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1">
          {currentUser?.name} ({currentUser?.role})
        </span>
        {canReviewRequests && (
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
            {pendingRequestCount} pending
          </span>
        )}
        {canAdjustAllocations && screen !== "allocations" && (
          <button
            type="button"
            onClick={onOpenAllocations}
            className="rounded border border-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-100"
          >
            Allocations
          </button>
        )}
        {canOpenAdmin && isAdminRole && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="rounded border border-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-100"
          >
            Admin Dashboard
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded border border-rose-500 px-2 py-1 text-rose-600 hover:bg-rose-500/10"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
