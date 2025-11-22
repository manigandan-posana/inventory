import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  status: "idle",
  error: "",
  projects: [],
  assignedProjects: [],
  materials: [],
  bomByProject: {},
  procurementRequests: [],
  inwardHistory: [],
  outwardHistory: [],
  transferHistory: [],
  codes: {
    inward: "",
    outward: "",
    transfer: "",
  },
  selectedProjectId: null,
};

export const bootstrapWorkspace = createAsyncThunk(
  "workspace/bootstrap",
  async (token, { rejectWithValue }) => {
    try {
      const data = await api.bootstrap(token);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to load workspace");
    }
  }
);

export const refreshInventoryCodes = createAsyncThunk(
  "workspace/refreshCodes",
  async (token, { rejectWithValue }) => {
    try {
      return await api.inventoryCodes(token);
    } catch (err) {
      return rejectWithValue(err.message || "Unable to refresh codes");
    }
  }
);

export const submitInward = createAsyncThunk(
  "workspace/submitInward",
  async ({ token, payload }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.createInward(token, payload);
      dispatch(bootstrapWorkspace(token));
      return response;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create inward record");
    }
  }
);

export const submitOutward = createAsyncThunk(
  "workspace/submitOutward",
  async ({ token, payload }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.createOutward(token, payload);
      dispatch(bootstrapWorkspace(token));
      return response;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create outward record");
    }
  }
);

export const submitTransfer = createAsyncThunk(
  "workspace/submitTransfer",
  async ({ token, payload }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.createTransfer(token, payload);
      dispatch(bootstrapWorkspace(token));
      return response;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create transfer record");
    }
  }
);

export const submitProcurementRequest = createAsyncThunk(
  "workspace/submitProcurementRequest",
  async ({ token, payload }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.createProcurementRequest(token, payload);
      dispatch(bootstrapWorkspace(token));
      return response;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to submit procurement request");
    }
  }
);

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setSelectedProject(state, action) {
      state.selectedProjectId = action.payload || null;
    },
    clearWorkspaceError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapWorkspace.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(bootstrapWorkspace.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = "";
        state.materials = action.payload?.materials || [];
        state.procurementRequests = action.payload?.procurementRequests || [];
        state.projects = action.payload?.projects || [];
        state.assignedProjects = action.payload?.assignedProjects || [];
        state.inwardHistory = action.payload?.inwardHistory || [];
        state.outwardHistory = action.payload?.outwardHistory || [];
        state.transferHistory = action.payload?.transferHistory || [];
        state.bomByProject = action.payload?.bom || {};
        state.codes = {
          inward: action.payload?.inventoryCodes?.inwardCode || "",
          outward: action.payload?.inventoryCodes?.outwardCode || "",
          transfer: action.payload?.inventoryCodes?.transferCode || "",
        };
        if (!state.selectedProjectId && state.assignedProjects.length > 0) {
          state.selectedProjectId = state.assignedProjects[0].id;
        }
      })
      .addCase(bootstrapWorkspace.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(refreshInventoryCodes.fulfilled, (state, action) => {
        state.codes = {
          inward: action.payload?.inwardCode || state.codes.inward,
          outward: action.payload?.outwardCode || state.codes.outward,
          transfer: action.payload?.transferCode || state.codes.transfer,
        };
      })
      .addCase(refreshInventoryCodes.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(submitInward.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(submitOutward.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(submitTransfer.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(submitProcurementRequest.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { setSelectedProject, clearWorkspaceError } = workspaceSlice.actions;
export default workspaceSlice.reducer;
