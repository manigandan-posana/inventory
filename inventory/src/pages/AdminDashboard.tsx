import React from "react";
import { NavLink, Outlet } from "react-router-dom";

type AdminTab = {
  path: string;
  label: string;
};

const tabs: AdminTab[] = [
  { path: "materials", label: "Material Directory" },
  { path: "allocations", label: "Material Allocations" },
  { path: "allocated", label: "Allocated Materials" },
  { path: "projects", label: "Project Management" },
  { path: "users", label: "User Management" },
];

export interface AdminUser {
  name?: string;
  role?: string;
  // add more fields if your currentUser has them (id, email, etc.)
  id?: string | number;
  email?: string;
}

interface AdminDashboardProps {
  currentUser?: AdminUser | null;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-white px-4 py-5 text-[12px] text-slate-800">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-black">Admin console</div>
            {/*
             * Remove the instructional subtitle. The UI is now clean and
             * self‑explanatory, so the redundant description has been
             * removed to declutter the header.
             */}
            {/*
            <p className="text-[11px] text-slate-600">
              Users, projects, and materials in one view.
            </p>
            */}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="rounded-full border border-[var(--border)] px-3 py-[6px] text-slate-700">
              {currentUser?.name} · {currentUser?.role}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-slate-300 px-4 py-[6px] text-[11px] font-semibold text-slate-800 hover:border-slate-400"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white/90 shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-[var(--border)] bg-[var(--surface-weak)] px-3 py-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-[11px] font-semibold ${
                    isActive
                      ? "bg-white text-[var(--primary)] shadow-sm"
                      : "text-slate-700 hover:bg-white"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
          <div className="px-3 py-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
