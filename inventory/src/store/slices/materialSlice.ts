import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/client";

// ---- Types ---- //

export interface Material {
  // TODO: adjust these fields to match your backend shape
  id?: string;
  [key: string]: any;
}

export interface MaterialFilters {
  categories: string[];
  units: string[];
  lineTypes: string[];
}

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export interface MaterialsState {
  items: Material[];
  totalItems: number;
  totalPages: number;
  page: number;
  availableFilters: MaterialFilters;
  status: RequestStatus;
  error: string;
}

export interface FetchMaterialsArgs {
  token: string;
  query?: {
    page?: number;
    [key: string]: any;
  };
}

export interface FetchMaterialsResult {
  items: Material[];
  totalItems: number;
  totalPages: number;
  page: number;
  filters: MaterialFilters;
}

// ---- Initial State ---- //

const initialState: MaterialsState = {
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

// ---- Thunks ---- //

export const fetchMaterials = createAsyncThunk<
  FetchMaterialsResult,
  FetchMaterialsArgs,
  { rejectValue: string }
>("materials/fetch", async ({ token, query }, { rejectWithValue }) => {
  try {
    const response = await api.searchMaterials(token, query);
    const items = (response?.items ?? []) as Material[];

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
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch materials";
    return rejectWithValue(message);
  }
});

export const createMaterial = createAsyncThunk<
  // adjust the return type if your API returns something specific
  Material,
  { token: string; payload: any },
  { rejectValue: string }
>("materials/create", async ({ token, payload }, { rejectWithValue }) => {
  try {
    const result = (await api.createMaterial(token, payload)) as Material;
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to create material";
    return rejectWithValue(message);
  }
});

export const updateMaterial = createAsyncThunk<
  Material,
  { token: string; materialId: string; payload: any },
  { rejectValue: string }
>("materials/update", async ({ token, materialId, payload }, { rejectWithValue }) => {
  try {
    const result = (await api.updateMaterial(
      token,
      materialId,
      payload
    )) as Material;
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to update material";
    return rejectWithValue(message);
  }
});

export const deleteMaterial = createAsyncThunk<
  string,
  { token: string; materialId: string },
  { rejectValue: string }
>("materials/delete", async ({ token, materialId }, { rejectWithValue }) => {
  try {
    await api.deleteMaterial(token, materialId);
    return materialId;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to delete material";
    return rejectWithValue(message);
  }
});

export const exportMaterials = createAsyncThunk<
  // type according to your backend (Blob, ArrayBuffer, etc.)
  unknown,
  string,
  { rejectValue: string }
>("materials/export", async (token, { rejectWithValue }) => {
  try {
    const result = await api.exportMaterials(token);
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to export materials";
    return rejectWithValue(message);
  }
});

export const importMaterials = createAsyncThunk<
  unknown,
  { token: string; file: File },
  { rejectValue: string }
>("materials/import", async ({ token, file }, { rejectWithValue }) => {
  try {
    const result = await api.importMaterials(token, file);
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to import materials";
    return rejectWithValue(message);
  }
});

// ---- Slice ---- //

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
      // fetchMaterials
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
          categories: action.payload.filters.categories
            .map((value) => (value ?? "").trim())
            .filter(Boolean)
            .sort(),
          units: action.payload.filters.units
            .map((value) => (value ?? "").trim())
            .filter(Boolean)
            .sort(),
          lineTypes: action.payload.filters.lineTypes
            .map((value) => (value ?? "").trim())
            .filter(Boolean)
            .sort(),
        };
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to fetch materials";
        state.status = "failed";
        state.error = message;
        state.items = [];
      })

      // deleteMaterial
      .addCase(deleteMaterial.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to delete material";
        state.error = message;
      })

      // createMaterial
      .addCase(createMaterial.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to create material";
        state.error = message;
      })

      // updateMaterial
      .addCase(updateMaterial.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to update material";
        state.error = message;
      })

      // exportMaterials
      .addCase(exportMaterials.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to export materials";
        state.error = message;
      })

      // importMaterials
      .addCase(importMaterials.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to import materials";
        state.error = message;
      });
  },
});

// ---- Exports ---- //

export const { clearMaterialError } = materialSlice.actions;
export default materialSlice.reducer;
