import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { path: "materials", label: "Material Directory" },
  { path: "allocations", label: "Material Allocations" },
  { path: "projects", label: "Project Management" },
  { path: "users", label: "User Management" },
];

export default function AdminDashboard({ currentUser, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50 p-3 text-[11px] text-slate-700 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold text-slate-900">Admin Control Center</div>
              <p className="text-[11px] text-slate-500">Maintain users, projects and material catalogs.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <div className="rounded-full border border-slate-200 px-3 py-1 text-slate-500">
                {currentUser?.name} · {currentUser?.role}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full bg-slate-900 px-4 py-1 text-white hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-[11px] ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
          <div className="py-4">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
