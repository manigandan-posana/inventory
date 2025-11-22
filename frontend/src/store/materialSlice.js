import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  items: [],
  totalItems: 0,
  totalPages: 1,
  page: 1,
  availableFilters: {
    categories: [],
    units: [],
    lineTypes: [],
  },
  status: "idle",
  error: "",
};

export const fetchMaterials = createAsyncThunk(
  "materials/fetch",
  async ({ token, query }, { rejectWithValue }) => {
    try {
      const response = await api.searchMaterials(token, query);
      const items = response?.items || [];
      return {
        items,
        totalItems: response?.totalItems ?? items.length,
        totalPages: Math.max(1, response?.totalPages ?? 1),
        page: response?.page ?? query?.page ?? 1,
        filters: {
          categories: response?.filters?.categories ?? [],
          units: response?.filters?.units ?? [],
          lineTypes: response?.filters?.lineTypes ?? [],
        },
      };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to fetch materials");
    }
  }
);

export const createMaterial = createAsyncThunk(
  "materials/create",
  async ({ token, payload }, { rejectWithValue }) => {
    try {
      return await api.createMaterial(token, payload);
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create material");
    }
  }
);

export const updateMaterial = createAsyncThunk(
  "materials/update",
  async ({ token, materialId, payload }, { rejectWithValue }) => {
    try {
      return await api.updateMaterial(token, materialId, payload);
    } catch (err) {
      return rejectWithValue(err.message || "Unable to update material");
    }
  }
);

export const deleteMaterial = createAsyncThunk(
  "materials/delete",
  async ({ token, materialId }, { rejectWithValue }) => {
    try {
      await api.deleteMaterial(token, materialId);
      return materialId;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to delete material");
    }
  }
);

const materialSlice = createSlice({
  name: "materials",
  initialState,
  reducers: {
    clearMaterialError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.totalItems = action.payload.totalItems;
        state.totalPages = action.payload.totalPages;
        state.page = action.payload.page;
        state.availableFilters = {
          categories: action.payload.filters.categories.map((value) => (value ?? "").trim()).filter(Boolean).sort(),
          units: action.payload.filters.units.map((value) => (value ?? "").trim()).filter(Boolean).sort(),
          lineTypes: action.payload.filters.lineTypes.map((value) => (value ?? "").trim()).filter(Boolean).sort(),
        };
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
        state.items = [];
      })
      .addCase(deleteMaterial.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(createMaterial.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(updateMaterial.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearMaterialError } = materialSlice.actions;
export default materialSlice.reducer;
