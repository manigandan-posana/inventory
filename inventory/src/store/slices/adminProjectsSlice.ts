import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/client";

// ---- Types ---- //

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AdminProject {
  id?: string;
  name?: string;
  prefix?: string;
  // extend with whatever fields your backend returns
  [key: string]: any;
}

export interface AdminProjectsFilters {
  prefixes: string[];
}

export interface RawAdminProjectsFilters {
  prefixes?: Array<string | null | undefined>;
}

export interface SearchProjectsResponse {
  items?: AdminProject[];
  totalItems?: number;
  totalPages?: number;
  filters?: RawAdminProjectsFilters;
}

export interface AdminProjectsState {
  items: AdminProject[];
  totalItems: number;
  totalPages: number;
  status: RequestStatus;
  error: string;
  availableFilters: AdminProjectsFilters;
}

// ---- Initial State ---- //

const initialState: AdminProjectsState = {
  items: [],
  totalItems: 0,
  totalPages: 1,
  status: "idle",
  error: "",
  availableFilters: { prefixes: [] },
};

// ---- Thunks ---- //

export const searchProjects = createAsyncThunk<
  SearchProjectsResponse,
  { token: string; query: any },
  { rejectValue: string }
>("adminProjects/search", async ({ token, query }, { rejectWithValue }) => {
  try {
    const res = (await api.adminSearchProjects(
      token,
      query
    )) as SearchProjectsResponse;
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to load projects";
    return rejectWithValue(message);
  }
});

export const createProject = createAsyncThunk<
  boolean,
  { token: string; payload: any },
  { rejectValue: string }
>("adminProjects/create", async ({ token, payload }, { rejectWithValue }) => {
  try {
    await api.adminCreateProject(token, payload);
    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to create project";
    return rejectWithValue(message);
  }
});

export const updateProject = createAsyncThunk<
  boolean,
  { token: string; projectId: string; payload: any },
  { rejectValue: string }
>(
  "adminProjects/update",
  async ({ token, projectId, payload }, { rejectWithValue }) => {
    try {
      await api.adminUpdateProject(token, projectId, payload);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to update project";
      return rejectWithValue(message);
    }
  }
);

export const deleteProject = createAsyncThunk<
  boolean,
  { token: string; projectId: string },
  { rejectValue: string }
>("adminProjects/delete", async ({ token, projectId }, { rejectWithValue }) => {
  try {
    await api.adminDeleteProject(token, projectId);
    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to delete project";
    return rejectWithValue(message);
  }
});

// ---- Helpers ---- //

const normalizePrefixes = (
  prefixes?: Array<string | null | undefined>
): string[] =>
  Array.from(new Set((prefixes ?? []).map((v) => (v ?? "").trim())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

// ---- Slice ---- //

const adminProjectsSlice = createSlice({
  name: "adminProjects",
  initialState,
  reducers: {
    clearProjectError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchProjects.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(searchProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        const response = action.payload;
        state.items = response.items ?? [];
        state.totalItems = response.totalItems ?? state.items.length;
        state.totalPages = Math.max(1, response.totalPages ?? 1);
        state.availableFilters = {
          prefixes: normalizePrefixes(response.filters?.prefixes),
        };
      })
      .addCase(searchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.items = [];
        state.totalItems = 0;
        state.totalPages = 1;
        const message =
          action.payload ??
          action.error.message ??
          "Unable to load projects";
        state.error = message;
      })
      .addCase(createProject.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to create project";
        state.error = message;
      })
      .addCase(updateProject.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to update project";
        state.error = message;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to delete project";
        state.error = message;
      });
  },
});

// ---- Exports ---- //

export const { clearProjectError } = adminProjectsSlice.actions;
export default adminProjectsSlice.reducer;
