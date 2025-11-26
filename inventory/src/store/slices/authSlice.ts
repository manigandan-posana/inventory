import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/client";

// ---- Types ---- //

export type LoginMode = "admin" | "user";

export interface LoginCredentials {
  // adjust these fields to match your real backend contract
  username: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  // add any extra user fields you actually use
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RestoreSessionResult {
  token: string | null;
  user: User | null;
}

export interface AuthState {
  token: string | null;
  currentUser: User | null;
  adminLoginError: string;
  userLoginError: string;
  adminLoginLoading: boolean;
  userLoginLoading: boolean;
  dataVersion: number;
  checkingSession: boolean;
}

// ---- Initial State ---- //

const initialState: AuthState = {
  token: null,
  currentUser: null,
  adminLoginError: "",
  userLoginError: "",
  adminLoginLoading: false,
  userLoginLoading: false,
  dataVersion: 0,
  checkingSession: true,
};

// Roles that are permitted to access the dedicated admin portal.
// Previously this list included CEO and COO, but the application
// requirements specify that only the "ADMIN" role should have access to
// the admin console.  All other roles – including CEO, COO,
// PROCUREMENT_MANAGER, PROJECT_HEAD, PROJECT_MANAGER and USER – should
// authenticate via the workspace (user) login and not through the admin
// portal.
const ADMIN_PORTAL_ROLES: string[] = ["ADMIN"];

// ---- Thunks ---- //

export const restoreSession = createAsyncThunk<
  RestoreSessionResult,
  void,
  { rejectValue: string }
>("auth/restoreSession", async (_, { rejectWithValue }) => {
  const storedToken = localStorage.getItem("inventory_token");
  if (!storedToken) {
    return { token: null, user: null };
  }

  try {
    const user = (await api.session(storedToken)) as User;
    return { token: storedToken, user };
  } catch (err: unknown) {
    localStorage.removeItem("inventory_token");
    const message =
      (err as { message?: string })?.message ??
      "Session expired. Please sign in again.";
    return rejectWithValue(message);
  }
});

export const login = createAsyncThunk<
  LoginResponse & { mode: LoginMode },
  { mode: LoginMode; credentials: LoginCredentials },
  { rejectValue: string }
>("auth/login", async ({ mode, credentials }, { rejectWithValue }) => {
  try {
    const response = (await api.login(credentials)) as LoginResponse;

    if (mode === "admin" && !ADMIN_PORTAL_ROLES.includes(response.user?.role)) {
      // When a non-admin role attempts to authenticate via the admin login,
      // reject with a clear message.  The previous text mentioned CEO and COO,
      // but the admin portal is now reserved exclusively for the Admin role.
      throw new Error("Only the Admin role can use the admin portal");
    }

    return { ...response, mode };
  } catch (err: unknown) {
    const message =
      (err as { message?: string })?.message ?? "Unable to sign in";
    return rejectWithValue(message);
  }
});

export const logout = createAsyncThunk<
  boolean,
  string | null,
  { rejectValue: string }
>("auth/logout", async (token, { rejectWithValue }) => {
  try {
    if (token) {
      await api.logout(token);
    }
    return true;
  } catch (err: unknown) {
    const message =
      (err as { message?: string })?.message ?? "Unable to sign out";
    return rejectWithValue(message);
  }
});

// ---- Slice ---- //

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
    },
    setCurrentUser(state, action: PayloadAction<User | null>) {
      state.currentUser = action.payload;
    },
    setAdminLoginError(state, action: PayloadAction<string | undefined>) {
      state.adminLoginError = action.payload ?? "";
    },
    setUserLoginError(state, action: PayloadAction<string | undefined>) {
      state.userLoginError = action.payload ?? "";
    },
    setAdminLoginLoading(state, action: PayloadAction<boolean>) {
      state.adminLoginLoading = Boolean(action.payload);
    },
    setUserLoginLoading(state, action: PayloadAction<boolean>) {
      state.userLoginLoading = Boolean(action.payload);
    },
    incrementDataVersion(state) {
      state.dataVersion += 1;
    },
    setCheckingSession(state, action: PayloadAction<boolean>) {
      state.checkingSession = Boolean(action.payload);
    },
    resetAuthState(): AuthState {
      return { ...initialState, checkingSession: false };
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreSession
      .addCase(restoreSession.pending, (state) => {
        state.checkingSession = true;
        state.adminLoginError = "";
        state.userLoginError = "";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.checkingSession = false;
        state.token = action.payload.token;
        state.currentUser = action.payload.user;
        if (action.payload.token && action.payload.user) {
          state.dataVersion += 1;
        }
      })
      .addCase(restoreSession.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Session expired. Please sign in again.";
        state.checkingSession = false;
        state.token = null;
        state.currentUser = null;
        state.adminLoginError = message;
        state.userLoginError = message;
      })

      // login
      .addCase(login.pending, (state, action) => {
        const mode = action.meta?.arg?.mode;
        if (mode === "admin") {
          state.adminLoginLoading = true;
          state.adminLoginError = "";
        } else {
          state.userLoginLoading = true;
          state.userLoginError = "";
        }
      })
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.currentUser = action.payload.user;
        state.dataVersion += 1;

        localStorage.setItem("inventory_token", action.payload.token);

        state.adminLoginLoading = false;
        state.userLoginLoading = false;
        state.adminLoginError = "";
        state.userLoginError = "";
      })
      .addCase(login.rejected, (state, action) => {
        const mode = action.meta?.arg?.mode as LoginMode | undefined;
        const message =
          action.payload ?? action.error.message ?? "Unable to sign in";

        if (mode === "admin") {
          state.adminLoginError = message;
          state.adminLoginLoading = false;
        } else {
          state.userLoginError = message;
          state.userLoginLoading = false;
        }
      })

      // logout
      .addCase(logout.fulfilled, () => ({
        ...initialState,
        checkingSession: false,
      }))
      .addCase(logout.rejected, () => ({
        ...initialState,
        checkingSession: false,
      }));
  },
});

// ---- Exports ---- //

export const {
  setToken,
  setCurrentUser,
  setAdminLoginError,
  setUserLoginError,
  setAdminLoginLoading,
  setUserLoginLoading,
  incrementDataVersion,
  setCheckingSession,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
