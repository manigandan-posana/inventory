/* eslint-disable @typescript-eslint/no-explicit-any */
// src/App.tsx
import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";

import AdminLogin from "./components/AdminLogin";
import UserLogin from "./components/UserLogin";
import AdminDashboard from "./pages/AdminDashboard";
import WorkspaceLayout from "./pages/workspace/WorkspaceLayout";

import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  incrementDataVersion,
  login,
  logout,
  resetAuthState,
  restoreSession,
} from "./store/slices/authSlice";

import RouteComponent from "./RouteComponent";
import {
  loginPath,
  workspacePath,
  adminBasePath,
  adminMaterialsPath,
  workspaceRoutes,
  adminRoutes,
} from "./routes/route";

// Define which roles are considered administrators for the purposes of the
// portal.  Only the "ADMIN" role is permitted to access the admin
// console.  Other roles (CEO, COO, PROCUREMENT_MANAGER, PROJECT_HEAD,
// PROJECT_MANAGER, USER) will be routed into the workspace.
const ADMIN_PORTAL_ROLES = ["ADMIN"];

// ---------- Guards ----------

function RequireAuth({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function RequireAdmin({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const location = useLocation();
  if (!canAccessAdmin) {
    return <Navigate to={workspacePath} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// ---------- Auth Landing ----------

interface AuthLandingProps {
  onAdminLogin: (creds: any) => void;
  onUserLogin: (creds: any) => void;
  adminLoginError: string;
  userLoginError: string;
  adminLoginLoading: boolean;
  userLoginLoading: boolean;
}

function AuthLanding({
  onAdminLogin,
  onUserLogin,
  adminLoginError,
  userLoginError,
  adminLoginLoading,
  userLoginLoading,
}: AuthLandingProps) {
  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto grid w-full max-w-screen-lg gap-5 lg:grid-cols-2">
        <AdminLogin
          onSubmit={onAdminLogin}
          error={adminLoginError}
          loading={adminLoginLoading}
        />
        <UserLogin
          onSubmit={onUserLogin}
          error={userLoginError}
          loading={userLoginLoading}
        />
      </div>
    </div>
  );
}

// ---------- Main App ----------

type LoginMode = "admin" | "user";

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
  } = useSelector((state: any) => state.auth);

  const navigate = useNavigate();
  const location = useLocation();

  const canAccessAdmin =
    currentUser?.role && ADMIN_PORTAL_ROLES.includes(currentUser.role);

  const defaultProtectedRoute = useMemo(
    () => (canAccessAdmin ? adminMaterialsPath : workspacePath),
    [canAccessAdmin]
  );

  // Restore session on mount
  useEffect(() => {
    (dispatch as any)(restoreSession())
      .unwrap()
      .catch((err: string) => {
        if (err) {
          toast.error(err);
        }
      });
  }, [dispatch]);

  type LocationState = { from?: { pathname?: string } } | null;
  const locationState = location.state as LocationState;
  const pendingRedirect = locationState?.from?.pathname;

  const handleLogin = async (mode: LoginMode, credentials: any) => {
    try {
      const response = await (dispatch as any)(
        login({ mode, credentials })
      ).unwrap();

      const wantsAdminRoute =
        pendingRedirect && pendingRedirect.startsWith(adminBasePath);

      const canUsePendingRoute =
        Boolean(pendingRedirect) &&
        pendingRedirect !== loginPath &&
        (!wantsAdminRoute ||
          (response.user?.role &&
            ADMIN_PORTAL_ROLES.includes(response.user.role)));

      const target = canUsePendingRoute
        ? pendingRedirect
        : mode === "admin" ||
          ADMIN_PORTAL_ROLES.includes(response.user?.role)
        ? adminMaterialsPath
        : workspacePath;

      navigate(target, { replace: true, state: null });
      toast.success("Welcome back!", { duration: 2500 });
    } catch (err: any) {
      toast.error(err || "Unable to sign in");
    }
  };

  const requestDataReload = useCallback(() => {
    (dispatch as any)(incrementDataVersion());
  }, [dispatch]);

  const logoutUser = useCallback(async () => {
    try {
      await (dispatch as any)(logout(authToken)).unwrap();
    } catch (err) {
      console.error("Failed to logout", err);
    } finally {
      localStorage.removeItem("inventory_token");
      (dispatch as any)(resetAuthState());
      toast.success("Signed out successfully");
      navigate(loginPath, { replace: true, state: null });
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
        {/* Public login route */}
        <Route
          path={loginPath}
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

        {/* Protected routes */}
        <Route
          element={<RequireAuth isAuthenticated={Boolean(authToken)} />}
        >
          {/* Workspace layout and children */}
          <Route
            path={workspacePath}
            element={
              canAccessAdmin ? (
                // Do not allow admin users to access the workspace.  Redirect them to the
                // admin console instead.
                <Navigate to={adminMaterialsPath} replace />
              ) : (
                <WorkspaceLayout
                  token={authToken}
                  currentUser={currentUser}
                  onLogout={logoutUser}
                  // Provide a quick link to the admin console for roles that can access it
                  // (e.g. CEO or COO) – this will still be hidden by WorkspaceHeader
                  onOpenAdmin={
                    canAccessAdmin ? () => navigate(adminMaterialsPath) : null
                  }
                />
              )
            }
          >
            {/* Default /workspace -> /workspace/bom */}
            <Route index element={<Navigate to="bom" replace />} />

            {workspaceRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <RouteComponent
                    component={route.component}
                    layout={route.layout}
                  />
                }
              />
            ))}
          </Route>

          {/* Admin layout and children */}
          <Route
            element={<RequireAdmin canAccessAdmin={!!canAccessAdmin} />}
          >
            <Route
              path={adminBasePath}
              element={
                <AdminDashboard
                  currentUser={currentUser}
                  onLogout={logoutUser}
                />
              }
            >
              {/* Default /admin -> /admin/materials */}
              <Route index element={<Navigate to="materials" replace />} />

              {adminRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <RouteComponent
                      component={route.component}
                      layout={route.layout}
                    />
                  }
                />
              ))}

              {/* Fallback for /admin/* */}
              <Route path="*" element={<Navigate to="materials" replace />} />
            </Route>
          </Route>
        </Route>

        {/* Global fallback */}
        <Route
          path="*"
          element={
            <Navigate
              to={authToken ? defaultProtectedRoute : loginPath}
              replace
            />
          }
        />
      </Routes>

      <Toaster position="bottom-center" />
    </>
  );
}
