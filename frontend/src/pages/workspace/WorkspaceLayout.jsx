import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import WorkspaceHeader from "../user-workspace/WorkspaceHeader";
import { bootstrapWorkspace, clearWorkspaceError } from "../../store/workspaceSlice";

const NAV_LINKS = [
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

export default function WorkspaceLayout({ token, currentUser, onLogout, onOpenAdmin }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((state) => state.workspace);

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <WorkspaceHeader currentUser={currentUser} onLogout={onLogout} onOpenAdmin={onOpenAdmin} />
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-slate-50 px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</div>
            <div className="flex flex-wrap gap-1 text-sm">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={`/workspace/${link.to}`}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1 text-[12px] font-semibold ${
                      isActive ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            {status === "loading" && (
              <div className="text-[12px] text-slate-500">Refreshing data…</div>
            )}
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
