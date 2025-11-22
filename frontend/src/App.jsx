import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "./api/client";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";
import AdminLogin from "./components/AdminLogin";
import UserLogin from "./components/UserLogin";
import AdminDashboard from "./pages/AdminDashboard";
import MaterialDirectoryPage from "./pages/admin/MaterialDirectoryPage";
import MaterialAllocationsPage from "./pages/admin/MaterialAllocationsPage";
import AllocatedMaterialsPage from "./pages/admin/AllocatedMaterialsPage";
import ProjectManagementPage from "./pages/admin/ProjectManagementPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import WorkspaceLayout from "./pages/workspace/WorkspaceLayout";
import BomPage from "./pages/workspace/BomPage";
import InwardPage from "./pages/workspace/InwardPage";
import OutwardPage from "./pages/workspace/OutwardPage";
import TransferPage from "./pages/workspace/TransferPage";
import InwardHistoryPage from "./pages/workspace/InwardHistoryPage";
import InwardHistoryDetailPage from "./pages/workspace/InwardHistoryDetailPage";
import OutwardHistoryPage from "./pages/workspace/OutwardHistoryPage";
import OutwardHistoryDetailPage from "./pages/workspace/OutwardHistoryDetailPage";
import TransferHistoryPage from "./pages/workspace/TransferHistoryPage";
import TransferHistoryDetailPage from "./pages/workspace/TransferHistoryDetailPage";
import ProcurementPage from "./pages/workspace/ProcurementPage";
import MasterPage from "./pages/workspace/MasterPage";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  incrementDataVersion,
  resetAuthState,
  setAdminLoginError,
  setAdminLoginLoading,
  setCheckingSession,
  setCurrentUser,
  setToken,
  setUserLoginError,
  setUserLoginLoading,
} from "./store/authSlice";

const ADMIN_PORTAL_ROLES = ["ADMIN", "CEO", "COO"];

function RequireAuth({ isAuthenticated }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function RequireAdmin({ canAccessAdmin }) {
  const location = useLocation();
  if (!canAccessAdmin) {
    return <Navigate to="/workspace" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function AuthLanding({
  onAdminLogin,
  onUserLogin,
  adminLoginError,
  userLoginError,
  adminLoginLoading,
  userLoginLoading,
}) {
  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto grid w-full max-w-screen-lg gap-5 lg:grid-cols-2">
        <AdminLogin onSubmit={onAdminLogin} error={adminLoginError} loading={adminLoginLoading} />
        <UserLogin onSubmit={onUserLogin} error={userLoginError} loading={userLoginLoading} />
      </div>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const {
    token: authToken,
    currentUser,
    adminLoginError,
    userLoginError,
    adminLoginLoading,
    userLoginLoading,
    checkingSession,
  } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const canAccessAdmin = ADMIN_PORTAL_ROLES.includes(currentUser?.role);
  const defaultProtectedRoute = useMemo(() => (canAccessAdmin ? "/admin/materials" : "/workspace"), [canAccessAdmin]);

  useEffect(() => {
    const storedToken = localStorage.getItem("inventory_token");
    if (!storedToken) {
      dispatch(setCheckingSession(false));
      return;
    }
    let cancelled = false;
    const bootstrapSession = async () => {
      try {
        const user = await api.session(storedToken);
        if (cancelled) return;
        dispatch(setToken(storedToken));
        dispatch(setCurrentUser(user));
        dispatch(incrementDataVersion());
      } catch (error) {
        console.error("Failed to restore session", error);
        localStorage.removeItem("inventory_token");
        if (!cancelled) {
          toast.error("Session expired. Please sign in again.");
        }
      } finally {
        if (!cancelled) {
          dispatch(setCheckingSession(false));
        }
      }
    };
    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const pendingRedirect = location.state?.from?.pathname;

  const handleLogin = async (mode, credentials) => {
    const setErrorAction = mode === "admin" ? setAdminLoginError : setUserLoginError;
    const setLoadingAction = mode === "admin" ? setAdminLoginLoading : setUserLoginLoading;
    dispatch(setErrorAction(""));
    dispatch(setLoadingAction(true));
    try {
      const response = await api.login(credentials);
      if (mode === "admin" && !ADMIN_PORTAL_ROLES.includes(response.user?.role)) {
        throw new Error("Only Admin, CEO or COO can use the admin portal");
      }
      dispatch(setToken(response.token));
      dispatch(setCurrentUser(response.user));
      dispatch(incrementDataVersion());
      dispatch(setAdminLoginError(""));
      dispatch(setUserLoginError(""));
      localStorage.setItem("inventory_token", response.token);
      const wantsAdminRoute = pendingRedirect && pendingRedirect.startsWith("/admin");
      const canUsePendingRoute = Boolean(pendingRedirect)
        && pendingRedirect !== "/"
        && (!wantsAdminRoute || ADMIN_PORTAL_ROLES.includes(response.user?.role));
      const target = canUsePendingRoute
        ? pendingRedirect
        : mode === "admin" || ADMIN_PORTAL_ROLES.includes(response.user?.role)
          ? "/admin/materials"
          : "/workspace";
      navigate(target, { replace: true, state: null });
      toast.success("Welcome back!", { duration: 2500 });
    } catch (err) {
      dispatch(setErrorAction(err.message));
      toast.error(err.message);
    } finally {
      dispatch(setLoadingAction(false));
    }
  };

  const requestDataReload = useCallback(() => {
    dispatch(incrementDataVersion());
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      if (authToken) {
        await api.logout(authToken);
      }
    } catch (err) {
      console.error("Failed to logout", err);
    } finally {
      localStorage.removeItem("inventory_token");
      dispatch(resetAuthState());
      toast.success("Signed out successfully");
      navigate("/", { replace: true, state: null });
    }
    }, [authToken, dispatch, navigate]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-800">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-xs shadow-md">
          Loading your workspace…
        </div>
        <Toaster position="bottom-center" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            authToken ? (
              <Navigate to={defaultProtectedRoute} replace />
            ) : (
              <AuthLanding
                onAdminLogin={(creds) => handleLogin("admin", creds)}
                onUserLogin={(creds) => handleLogin("user", creds)}
                adminLoginError={adminLoginError}
                userLoginError={userLoginError}
                adminLoginLoading={adminLoginLoading}
                userLoginLoading={userLoginLoading}
              />
            )
          }
        />
        <Route element={<RequireAuth isAuthenticated={Boolean(authToken)} />}>
          <Route
            path="/workspace"
            element={
              <WorkspaceLayout
                token={authToken}
                currentUser={currentUser}
                onLogout={logout}
                onOpenAdmin={canAccessAdmin ? () => navigate("/admin/materials") : null}
              />
            }
          >
            <Route index element={<Navigate to="bom" replace />} />
            <Route path="bom" element={<BomPage />} />
            <Route path="inward" element={<InwardPage />} />
            <Route path="inward/history" element={<InwardHistoryPage />} />
            <Route path="inward/history/:recordId" element={<InwardHistoryDetailPage />} />
            <Route path="outward" element={<OutwardPage />} />
            <Route path="outward/history" element={<OutwardHistoryPage />} />
            <Route path="outward/history/:recordId" element={<OutwardHistoryDetailPage />} />
            <Route path="transfer" element={<TransferPage />} />
            <Route path="transfer/history" element={<TransferHistoryPage />} />
            <Route path="transfer/history/:recordId" element={<TransferHistoryDetailPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="master" element={<MasterPage />} />
          </Route>
          <Route element={<RequireAdmin canAccessAdmin={canAccessAdmin} />}>
            <Route
              path="/admin"
              element={
                <AdminDashboard currentUser={currentUser} onLogout={logout} />
              }
            >
              <Route index element={<Navigate to="materials" replace />} />
              <Route
                path="materials"
                element={<MaterialDirectoryPage onRequestReload={requestDataReload} />}
              />
              <Route
                path="allocations"
                element={<MaterialAllocationsPage onRequestReload={requestDataReload} />}
              />
              <Route
                path="allocated"
                element={<AllocatedMaterialsPage onRequestReload={requestDataReload} />}
              />
              <Route
                path="projects"
                element={<ProjectManagementPage onRequestReload={requestDataReload} />}
              />
              <Route
                path="users"
                element={<UserManagementPage onRequestReload={requestDataReload} />}
              />
              <Route path="*" element={<Navigate to="materials" replace />} />
            </Route>
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <Navigate
              to={authToken ? defaultProtectedRoute : "/"}
              replace
            />
          }
        />
      </Routes>
      <Toaster position="bottom-center" />
    </>
  );
}
