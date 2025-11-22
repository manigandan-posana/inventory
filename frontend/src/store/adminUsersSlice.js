import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  items: [],
  totalItems: 0,
  totalPages: 1,
  status: "idle",
  error: "",
  projects: [],
  availableFilters: { roles: [], accessTypes: [], projects: [] },
};

export const searchUsers = createAsyncThunk(
  "adminUsers/search",
  async ({ token, query }, { rejectWithValue }) => {
    try {
      return await api.adminSearchUsers(token, query);
    } catch (err) {
      return rejectWithValue(err.message || "Unable to load users");
    }
  }
);

export const createUser = createAsyncThunk(
  "adminUsers/create",
  async ({ token, payload }, { rejectWithValue }) => {
    try {
      await api.adminCreateUser(token, payload);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create user");
    }
  }
);

export const loadUserProjects = createAsyncThunk(
  "adminUsers/projects",
  async (token, { rejectWithValue }) => {
    try {
      return await api.adminProjects(token);
    } catch (err) {
      return rejectWithValue(err.message || "Unable to load projects");
    }
  }
);

export const updateUser = createAsyncThunk(
  "adminUsers/update",
  async ({ token, userId, payload }, { rejectWithValue }) => {
    try {
      await api.adminUpdateUser(token, userId, payload);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to update user");
    }
  }
);

export const deleteUser = createAsyncThunk(
  "adminUsers/delete",
  async ({ token, userId }, { rejectWithValue }) => {
    try {
      await api.adminDeleteUser(token, userId);
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to delete user");
    }
  }
);

const normalize = (list = []) => Array.from(new Set((list || []).map((value) => (value ?? "").trim())))
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b));

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
      .addCase(searchUsers.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        const response = action.payload || {};
        state.items = response.items || [];
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
        state.error = action.payload || action.error.message;
      })
      .addCase(loadUserProjects.fulfilled, (state, action) => {
        state.projects = action.payload || [];
      })
      .addCase(loadUserProjects.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
        state.projects = [];
      })
      .addCase(createUser.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearUserError } = adminUsersSlice.actions;
export default adminUsersSlice.reducer;
