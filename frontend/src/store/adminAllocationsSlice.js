import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  projects: [],
  materials: [],
  status: "idle",
  error: "",
};

export const loadAllocationData = createAsyncThunk(
  "adminAllocations/load",
  async (token, { rejectWithValue }) => {
    try {
      const [projects, materials] = await Promise.all([
        api.adminProjects(token),
        api.listMaterials(token),
      ]);
      return { projects: projects || [], materials: materials || [] };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to load allocation data");
    }
  }
);

const adminAllocationsSlice = createSlice({
  name: "adminAllocations",
  initialState,
  reducers: {
    clearAllocationError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAllocationData.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(loadAllocationData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.projects = action.payload.projects || [];
        state.materials = action.payload.materials || [];
      })
      .addCase(loadAllocationData.rejected, (state, action) => {
        state.status = "failed";
        state.projects = [];
        state.materials = [];
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearAllocationError } = adminAllocationsSlice.actions;
export default adminAllocationsSlice.reducer;
