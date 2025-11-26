import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/client";

// ---- Types ---- //

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AdminUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  accessType?: string;
  projects?: string[];
  // extend with more fields as needed
  [key: string]: any;
}

export interface UserFilters {
  roles: string[];
  accessTypes: string[];
  projects: string[];
}

export interface RawUserFilters {
  roles?: Array<string | null | undefined>;
  accessTypes?: Array<string | null | undefined>;
  projects?: Array<string | null | undefined>;
}

export interface UserSearchResponse {
  items?: AdminUser[];
  totalItems?: number;
  totalPages?: number;
  filters?: RawUserFilters;
}

export interface AdminUserProject {
  id?: string;
  name?: string;
  [key: string]: any;
}

export interface AdminUsersState {
  items: AdminUser[];
  totalItems: number;
  totalPages: number;
  status: RequestStatus;
  error: string;
  projects: AdminUserProject[];
  availableFilters: UserFilters;
}

// ---- Initial State ---- //

const initialState: AdminUsersState = {
  items: [],
  totalItems: 0,
  totalPages: 1,
  status: "idle",
  error: "",
  projects: [],
  availableFilters: { roles: [], accessTypes: [], projects: [] },
};

// ---- Thunks ---- //

export const searchUsers = createAsyncThunk<
  UserSearchResponse,
  { token: string; query: any },
  { rejectValue: string }
>("adminUsers/search", async ({ token, query }, { rejectWithValue }) => {
  try {
    const res = (await api.adminSearchUsers(token, query)) as UserSearchResponse;
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to load users";
    return rejectWithValue(message);
  }
});

export const createUser = createAsyncThunk<
  boolean,
  { token: string; payload: any },
  { rejectValue: string }
>("adminUsers/create", async ({ token, payload }, { rejectWithValue }) => {
  try {
    await api.adminCreateUser(token, payload);
    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to create user";
    return rejectWithValue(message);
  }
});

export const loadUserProjects = createAsyncThunk<
  AdminUserProject[],
  string,
  { rejectValue: string }
>("adminUsers/projects", async (token, { rejectWithValue }) => {
  try {
    const projects: AdminUserProject[] = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const response = await api.adminProjects(token, { page, size: 50 });
      projects.push(...((response?.items as AdminUserProject[]) || []));
      hasNext = Boolean(response?.hasNext);
      page += 1;
    }

    return projects;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to load projects";
    return rejectWithValue(message);
  }
});

export const updateUser = createAsyncThunk<
  boolean,
  { token: string; userId: string; payload: any },
  { rejectValue: string }
>("adminUsers/update", async ({ token, userId, payload }, { rejectWithValue }) => {
  try {
    await api.adminUpdateUser(token, userId, payload);
    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to update user";
    return rejectWithValue(message);
  }
});

export const deleteUser = createAsyncThunk<
  boolean,
  { token: string; userId: string },
  { rejectValue: string }
>("adminUsers/delete", async ({ token, userId }, { rejectWithValue }) => {
  try {
    await api.adminDeleteUser(token, userId);
    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to delete user";
    return rejectWithValue(message);
  }
});

// ---- Helpers ---- //

const normalize = (
  list?: Array<string | null | undefined>
): string[] =>
  Array.from(
    new Set((list ?? []).map((value) => (value ?? "").trim()))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

// ---- Slice ---- //

const adminUsersSlice = createSlice({
  name: "adminUsers",
  initialState,
  reducers: {
    clearUserError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // searchUsers
      .addCase(searchUsers.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";

        const response = action.payload;
        state.items = response.items ?? [];
        state.totalItems = response.totalItems ?? state.items.length;
        state.totalPages = Math.max(1, response.totalPages ?? 1);
        state.availableFilters = {
          roles: normalize(response.filters?.roles),
          accessTypes: normalize(response.filters?.accessTypes),
          projects: normalize(response.filters?.projects),
        };
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.items = [];
        state.totalItems = 0;
        state.totalPages = 1;
        const message =
          action.payload ??
          action.error.message ??
          "Unable to load users";
        state.error = message;
      })

      // loadUserProjects
      .addCase(loadUserProjects.fulfilled, (state, action) => {
        state.projects = action.payload ?? [];
      })
      .addCase(loadUserProjects.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to load projects";
        state.error = message;
        state.projects = [];
      })

      // create/update/delete errors
      .addCase(createUser.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to create user";
        state.error = message;
      })
      .addCase(updateUser.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to update user";
        state.error = message;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to delete user";
        state.error = message;
      });
  },
});

// ---- Exports ---- //

export const { clearUserError } = adminUsersSlice.actions;
export default adminUsersSlice.reducer;
