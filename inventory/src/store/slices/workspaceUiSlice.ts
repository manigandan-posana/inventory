import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

const today = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ---- Types ---- //

export interface InwardModalValues {
  orderedQty: string;
  receivedQty: string;
}

export interface InwardSelectedLine {
  orderedQty: number;
  receivedQty: number;
}

export type InwardSelectedLines = Record<string, InwardSelectedLine>;

export interface InwardFormState {
  projectId: string;
  invoiceNo: string;
  supplierName: string;
  remarks: string;
  selectedLines: InwardSelectedLines;
  modalLine: any | null;
  modalValues: InwardModalValues;
  saving: boolean;
}

export interface OutwardModalValues {
  issueQty: string;
}

export interface OutwardSelectedLine {
  issueQty: number;
}

export type OutwardSelectedLines = Record<string, OutwardSelectedLine>;

export interface OutwardFormState {
  projectId: string;
  issueTo: string;
  status: string; // "OPEN" | "CLOSED" etc.
  date: string;
  closeDate: string;
  selectedLines: OutwardSelectedLines;
  modalLine: any | null;
  modalValues: OutwardModalValues;
  saving: boolean;
}

export interface TransferModalValues {
  transferQty: string;
}

export interface TransferSelectedLine {
  transferQty: number;
}

export type TransferSelectedLines = Record<string, TransferSelectedLine>;

export interface TransferFormState {
  fromProject: string;
  toProject: string;
  fromSite: string;
  toSite: string;
  remarks: string;
  selectedLines: TransferSelectedLines;
  modalLine: any | null;
  modalValues: TransferModalValues;
  saving: boolean;
}

export interface ProcurementFormState {
  projectId: string;
  materialId: string;
  increaseQty: string;
  reason: string;
  saving: boolean;
}

export interface WorkspaceUiState {
  inward: InwardFormState;
  outward: OutwardFormState;
  transfer: TransferFormState;
  procurement: ProcurementFormState;
}

// ---- Helpers ---- //

const createEmptyInward = (): InwardFormState => ({
  projectId: "",
  invoiceNo: "",
  supplierName: "",
  remarks: "",
  selectedLines: {},
  modalLine: null,
  modalValues: { orderedQty: "", receivedQty: "" },
  saving: false,
});

const createEmptyOutward = (): OutwardFormState => ({
  projectId: "",
  issueTo: "",
  status: "OPEN",
  date: today(),
  closeDate: "",
  selectedLines: {},
  modalLine: null,
  modalValues: { issueQty: "" },
  saving: false,
});

const createEmptyTransfer = (): TransferFormState => ({
  fromProject: "",
  toProject: "",
  fromSite: "",
  toSite: "",
  remarks: "",
  selectedLines: {},
  modalLine: null,
  modalValues: { transferQty: "" },
  saving: false,
});

const createEmptyProcurement = (): ProcurementFormState => ({
  projectId: "",
  materialId: "",
  increaseQty: "",
  reason: "",
  saving: false,
});

// ---- Slice ---- //

const initialState: WorkspaceUiState = {
  inward: createEmptyInward(),
  outward: createEmptyOutward(),
  transfer: createEmptyTransfer(),
  procurement: createEmptyProcurement(),
};

const workspaceUiSlice = createSlice({
  name: "workspaceUi",
  initialState,
  reducers: {
    setInwardField(
      state,
      action: PayloadAction<{ field: keyof InwardFormState; value: any }>
    ) {
      const { field, value } = action.payload;
      (state.inward as any)[field] = value;
      if (field === "projectId") {
        state.inward.selectedLines = {};
      }
    },
    setInwardSaving(state, action: PayloadAction<boolean>) {
      state.inward.saving = action.payload;
    },
    setInwardModalLine(state, action: PayloadAction<any | null>) {
      state.inward.modalLine = action.payload;
    },
    setInwardModalValues(state, action: PayloadAction<InwardModalValues>) {
      state.inward.modalValues = action.payload;
    },
    setInwardSelectedLine(
      state,
      action: PayloadAction<{
        materialId: string;
        orderedQty?: string | number;
        receivedQty?: string | number;
      }>
    ) {
      const { materialId, orderedQty, receivedQty } = action.payload;
      const ordered = Number(orderedQty ?? 0);
      const received = Number(receivedQty ?? 0);

      if (ordered <= 0 && received <= 0) {
        delete state.inward.selectedLines[materialId];
      } else {
        state.inward.selectedLines[materialId] = {
          orderedQty: ordered,
          receivedQty: received,
        };
      }
    },
    clearInwardSelections(state) {
      state.inward.selectedLines = {};
      state.inward.modalLine = null;
      state.inward.modalValues = { orderedQty: "", receivedQty: "" };
    },
    resetInwardForm(state) {
      state.inward = createEmptyInward();
    },

    setOutwardField(
      state,
      action: PayloadAction<{ field: keyof OutwardFormState; value: any }>
    ) {
      const { field, value } = action.payload;
      (state.outward as any)[field] = value;
      if (field === "projectId") {
        state.outward.selectedLines = {};
      }
    },
    setOutwardSaving(state, action: PayloadAction<boolean>) {
      state.outward.saving = action.payload;
    },
    setOutwardModalLine(state, action: PayloadAction<any | null>) {
      state.outward.modalLine = action.payload;
    },
    setOutwardModalValues(state, action: PayloadAction<OutwardModalValues>) {
      state.outward.modalValues = action.payload;
    },
    setOutwardSelectedLine(
      state,
      action: PayloadAction<{
        materialId: string;
        issueQty?: string | number;
      }>
    ) {
      const { materialId, issueQty } = action.payload;
      const parsedQty = Number(issueQty ?? 0);
      if (parsedQty <= 0) {
        delete state.outward.selectedLines[materialId];
      } else {
        state.outward.selectedLines[materialId] = { issueQty: parsedQty };
      }
    },
    clearOutwardSelections(state) {
      state.outward.selectedLines = {};
      state.outward.modalLine = null;
      state.outward.modalValues = { issueQty: "" };
    },
    resetOutwardForm(state) {
      state.outward = createEmptyOutward();
    },

    setTransferField(
      state,
      action: PayloadAction<{ field: keyof TransferFormState; value: any }>
    ) {
      const { field, value } = action.payload;
      (state.transfer as any)[field] = value;
      if (field === "fromProject") {
        state.transfer.selectedLines = {};
      }
    },
    setTransferSaving(state, action: PayloadAction<boolean>) {
      state.transfer.saving = action.payload;
    },
    setTransferModalLine(state, action: PayloadAction<any | null>) {
      state.transfer.modalLine = action.payload;
    },
    setTransferModalValues(
      state,
      action: PayloadAction<TransferModalValues>
    ) {
      state.transfer.modalValues = action.payload;
    },
    setTransferSelectedLine(
      state,
      action: PayloadAction<{
        materialId: string;
        transferQty?: string | number;
      }>
    ) {
      const { materialId, transferQty } = action.payload;
      const parsedQty = Number(transferQty ?? 0);
      if (parsedQty <= 0) {
        delete state.transfer.selectedLines[materialId];
      } else {
        state.transfer.selectedLines[materialId] = {
          transferQty: parsedQty,
        };
      }
    },
    clearTransferSelections(state) {
      state.transfer.selectedLines = {};
      state.transfer.modalLine = null;
      state.transfer.modalValues = { transferQty: "" };
    },
    resetTransferForm(state) {
      state.transfer = createEmptyTransfer();
    },

    setProcurementField(
      state,
      action: PayloadAction<{
        field: keyof ProcurementFormState;
        value: any;
      }>
    ) {
      const { field, value } = action.payload;
      (state.procurement as any)[field] = value;
    },
    setProcurementSaving(state, action: PayloadAction<boolean>) {
      state.procurement.saving = action.payload;
    },
    resetProcurementForm(state) {
      state.procurement = createEmptyProcurement();
    },
  },
});

export const {
  setInwardField,
  setInwardSaving,
  setInwardModalLine,
  setInwardModalValues,
  setInwardSelectedLine,
  clearInwardSelections,
  resetInwardForm,
  setOutwardField,
  setOutwardSaving,
  setOutwardModalLine,
  setOutwardModalValues,
  setOutwardSelectedLine,
  clearOutwardSelections,
  resetOutwardForm,
  setTransferField,
  setTransferSaving,
  setTransferModalLine,
  setTransferModalValues,
  setTransferSelectedLine,
  clearTransferSelections,
  resetTransferForm,
  setProcurementField,
  setProcurementSaving,
  resetProcurementForm,
} = workspaceUiSlice.actions;

export default workspaceUiSlice.reducer;
