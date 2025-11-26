import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/client";

// ---- Types ---- //

export type WorkspaceStatus = "idle" | "loading" | "succeeded" | "failed";

export interface Project {
  id: string;
  [key: string]: any;
}

export interface Material {
  id?: string;
  [key: string]: any;
}

export interface ProcurementRequest {
  id?: string;
  [key: string]: any;
}

export interface InwardRecord {
  id?: string;
  [key: string]: any;
}

export interface OutwardRecord {
  id?: string;
  [key: string]: any;
}

export interface TransferRecord {
  id?: string;
  [key: string]: any;
}

export interface InventoryCodes {
  inward: string;
  outward: string;
  transfer: string;
}

export type BomByProject = Record<string, any>;

export interface WorkspaceBootstrapResponse {
  materials?: Material[];
  procurementRequests?: ProcurementRequest[];
  projects?: Project[];
  assignedProjects?: Project[];
  inwardHistory?: InwardRecord[];
  outwardHistory?: OutwardRecord[];
  transferHistory?: TransferRecord[];
  bom?: BomByProject;
  inventoryCodes?: {
    inwardCode?: string;
    outwardCode?: string;
    transferCode?: string;
  };
}

export interface InventoryCodesResponse {
  inwardCode?: string;
  outwardCode?: string;
  transferCode?: string;
  [key: string]: any;
}

export interface WorkspaceState {
  status: WorkspaceStatus;
  error: string;
  projects: Project[];
  assignedProjects: Project[];
  materials: Material[];
  bomByProject: BomByProject;
  procurementRequests: ProcurementRequest[];
  inwardHistory: InwardRecord[];
  outwardHistory: OutwardRecord[];
  transferHistory: TransferRecord[];
  codes: InventoryCodes;
  selectedProjectId: string | null;
}

// ---- Initial State ---- //

const initialState: WorkspaceState = {
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

// ---- Thunks ---- //

export const bootstrapWorkspace = createAsyncThunk<
  WorkspaceBootstrapResponse,
  string,
  { rejectValue: string }
>("workspace/bootstrap", async (token, { rejectWithValue }) => {
  try {
    const data = (await api.bootstrap(token)) as WorkspaceBootstrapResponse;
    return data;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to load workspace";
    return rejectWithValue(message);
  }
});

export const refreshInventoryCodes = createAsyncThunk<
  InventoryCodesResponse,
  string,
  { rejectValue: string }
>("workspace/refreshCodes", async (token, { rejectWithValue }) => {
  try {
    const result = (await api.inventoryCodes(token)) as InventoryCodesResponse;
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to refresh codes";
    return rejectWithValue(message);
  }
});

export const submitInward = createAsyncThunk<
  unknown,
  { token: string; payload: any },
  { rejectValue: string }
>("workspace/submitInward", async ({ token, payload }, { rejectWithValue, dispatch }) => {
  try {
    const response = await api.createInward(token, payload);
    dispatch(bootstrapWorkspace(token));
    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to create inward record";
    return rejectWithValue(message);
  }
});

export const submitOutward = createAsyncThunk<
  unknown,
  { token: string; payload: any },
  { rejectValue: string }
>("workspace/submitOutward", async ({ token, payload }, { rejectWithValue, dispatch }) => {
  try {
    const response = await api.createOutward(token, payload);
    dispatch(bootstrapWorkspace(token));
    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to create outward record";
    return rejectWithValue(message);
  }
});

export const submitTransfer = createAsyncThunk<
  unknown,
  { token: string; payload: any },
  { rejectValue: string }
>("workspace/submitTransfer", async ({ token, payload }, { rejectWithValue, dispatch }) => {
  try {
    const response = await api.createTransfer(token, payload);
    dispatch(bootstrapWorkspace(token));
    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to create transfer record";
    return rejectWithValue(message);
  }
});

export const submitProcurementRequest = createAsyncThunk<
  unknown,
  { token: string; payload: any },
  { rejectValue: string }
>(
  "workspace/submitProcurementRequest",
  async ({ token, payload }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.createProcurementRequest(token, payload);
      dispatch(bootstrapWorkspace(token));
      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to submit procurement request";
      return rejectWithValue(message);
    }
  }
);

// ---- Slice ---- //

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setSelectedProject(
      state,
      action: PayloadAction<string | null | undefined>
    ) {
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

        const payload = action.payload;

        state.materials = payload.materials ?? [];
        state.procurementRequests = payload.procurementRequests ?? [];
        state.projects = payload.projects ?? [];
        state.assignedProjects =
          (payload.assignedProjects && payload.assignedProjects.length > 0
            ? payload.assignedProjects
            : state.projects) ?? [];

        state.inwardHistory = payload.inwardHistory ?? [];
        state.outwardHistory = payload.outwardHistory ?? [];
        state.transferHistory = payload.transferHistory ?? [];
        state.bomByProject = payload.bom ?? {};

        state.codes = {
          inward: payload.inventoryCodes?.inwardCode ?? state.codes.inward ?? "",
          outward:
            payload.inventoryCodes?.outwardCode ?? state.codes.outward ?? "",
          transfer:
            payload.inventoryCodes?.transferCode ?? state.codes.transfer ?? "",
        };

        if (!state.selectedProjectId && state.assignedProjects.length > 0) {
          state.selectedProjectId = state.assignedProjects[0].id;
        }
      })
      .addCase(bootstrapWorkspace.rejected, (state, action) => {
        const message =
          action.payload ?? action.error.message ?? "Unable to load workspace";
        state.status = "failed";
        state.error = message;
      })
      .addCase(refreshInventoryCodes.fulfilled, (state, action) => {
        state.codes = {
          inward: action.payload?.inwardCode ?? state.codes.inward,
          outward: action.payload?.outwardCode ?? state.codes.outward,
          transfer: action.payload?.transferCode ?? state.codes.transfer,
        };
      })
      .addCase(refreshInventoryCodes.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to refresh codes";
        state.error = message;
      })
      .addCase(submitInward.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to create inward record";
        state.error = message;
      })
      .addCase(submitOutward.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to create outward record";
        state.error = message;
      })
      .addCase(submitTransfer.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to create transfer record";
        state.error = message;
      })
      .addCase(submitProcurementRequest.rejected, (state, action) => {
        const message =
          action.payload ??
          action.error.message ??
          "Unable to submit procurement request";
        state.error = message;
      });
  },
});

// ---- Exports ---- //

export const { setSelectedProject, clearWorkspaceError } =
  workspaceSlice.actions;

export default workspaceSlice.reducer;
