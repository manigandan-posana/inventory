import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  items: [],
  totalItems: 0,
  totalPages: 1,
  status: "idle",
  error: "",
  availableFilters: { prefixes: [] },
};

export const searchProjects = createAsyncThunk(
  "adminProjects/search",
  async ({ token, query }, { rejectWithValue }) => {
    try {
      return await api.adminSearchProjects(token, query);
    } catch (err) {
      return rejectWithValue(err.message || "Unable to load projects");
    }
  }
);

export const createProject = createAsyncThunk(
  "adminProjects/create",
  async ({ token, payload }, { rejectWithValue }) => {
    try {
      await api.adminCreateProject(token, payload);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create project");
    }
  }
);

export const updateProject = createAsyncThunk(
  "adminProjects/update",
  async ({ token, projectId, payload }, { rejectWithValue }) => {
    try {
      await api.adminUpdateProject(token, projectId, payload);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to update project");
    }
  }
);

export const deleteProject = createAsyncThunk(
  "adminProjects/delete",
  async ({ token, projectId }, { rejectWithValue }) => {
    try {
      await api.adminDeleteProject(token, projectId);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to delete project");
    }
  }
);

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
        const response = action.payload || {};
        state.items = response.items || [];
        state.totalItems = response.totalItems ?? state.items.length;
        state.totalPages = Math.max(1, response.totalPages ?? 1);
        state.availableFilters = {
          prefixes: Array.from(new Set((response.filters?.prefixes || []).map((value) => (value ?? "").trim())))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
        };
      })
      .addCase(searchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.items = [];
        state.totalItems = 0;
        state.totalPages = 1;
        state.error = action.payload || action.error.message;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearProjectError } = adminProjectsSlice.actions;
export default adminProjectsSlice.reducer;
