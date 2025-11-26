import React, { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import WorkspaceHeader from "../user-workspace/WorkspaceHeader";
import { bootstrapWorkspace, clearWorkspaceError } from "../../store/slices/workspaceSlice";
import type { RootState, AppDispatch } from "../../store/store";

interface NavLinkConfig {
  to: string;
  label: string;
}

const NAV_LINKS: NavLinkConfig[] = [
  { to: "bom", label: "BOM" },
  { to: "inward", label: "Inwards" },
  { to: "inward/history", label: "Inward History" },
  { to: "outward", label: "Outwards" },
  { to: "outward/history", label: "Outward History" },
  { to: "transfer", label: "Transfers" },
  { to: "transfer/history", label: "Transfer History" },
  { to: "procurement", label: "Procurement" },
  { to: "master", label: "Master" },
];

export interface WorkspaceUser {
  id?: string | number;
  name?: string;
  role?: string;
  // allow extra fields coming from backend
  [key: string]: unknown;
}

interface WorkspaceStateShape {
  status: string;
  error?: string | null;
  [key: string]: unknown;
}

export interface WorkspaceLayoutProps {
  token?: string | null;
  currentUser: WorkspaceUser | null;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  token,
  currentUser,
  onLogout,
  onOpenAdmin,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const { status, error } = useSelector<RootState, WorkspaceStateShape>(
    (state) => state.workspace as unknown as WorkspaceStateShape
  );

  useEffect(() => {
    if (!token) return;
    dispatch(bootstrapWorkspace(token));
  }, [dispatch, token]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearWorkspaceError());
    }
  }, [dispatch, error]);

  useEffect(() => {
    if (location.pathname === "/workspace") {
      navigate("/workspace/bom", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <WorkspaceHeader
        currentUser={currentUser ?? undefined}
        onLogout={onLogout}
        onOpenAdmin={onOpenAdmin}
      />
      <div className="mx-auto w-full max-w-screen-2xl px-4 pb-10">
        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-[var(--border)] bg-white/95 px-4 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Workspace
            </div>
            <div className="flex flex-wrap gap-1 text-[12px] font-semibold">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={`/workspace/${link.to}`}
                  className={({ isActive }) =>
                    `px-3 py-[7px] transition ${
                      isActive
                        ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                        : "text-slate-700 hover:text-[var(--primary)]"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            {status === "loading" && (
              <div className="text-[11px] text-slate-500">Refreshing…</div>
            )}
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default WorkspaceLayout;
