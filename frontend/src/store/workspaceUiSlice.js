import { createSlice } from "@reduxjs/toolkit";

const today = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const createEmptyInward = () => ({
  projectId: "",
  invoiceNo: "",
  supplierName: "",
  remarks: "",
  selectedLines: {},
  modalLine: null,
  modalValues: { orderedQty: "", receivedQty: "" },
  saving: false,
});

const createEmptyOutward = () => ({
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

const createEmptyTransfer = () => ({
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

const createEmptyProcurement = () => ({
  projectId: "",
  materialId: "",
  increaseQty: "",
  reason: "",
  saving: false,
});

const workspaceUiSlice = createSlice({
  name: "workspaceUi",
  initialState: {
    inward: createEmptyInward(),
    outward: createEmptyOutward(),
    transfer: createEmptyTransfer(),
    procurement: createEmptyProcurement(),
  },
  reducers: {
    setInwardField(state, action) {
      const { field, value } = action.payload;
      state.inward[field] = value;
      if (field === "projectId") {
        state.inward.selectedLines = {};
      }
    },
    setInwardSaving(state, action) {
      state.inward.saving = action.payload;
    },
    setInwardModalLine(state, action) {
      state.inward.modalLine = action.payload;
    },
    setInwardModalValues(state, action) {
      state.inward.modalValues = action.payload;
    },
    setInwardSelectedLine(state, action) {
      const { materialId, orderedQty, receivedQty } = action.payload;
      const ordered = Number(orderedQty || 0);
      const received = Number(receivedQty || 0);
      if (ordered <= 0 && received <= 0) {
        delete state.inward.selectedLines[materialId];
      } else {
        state.inward.selectedLines[materialId] = { orderedQty: ordered, receivedQty: received };
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

    setOutwardField(state, action) {
      const { field, value } = action.payload;
      state.outward[field] = value;
      if (field === "projectId") {
        state.outward.selectedLines = {};
      }
    },
    setOutwardSaving(state, action) {
      state.outward.saving = action.payload;
    },
    setOutwardModalLine(state, action) {
      state.outward.modalLine = action.payload;
    },
    setOutwardModalValues(state, action) {
      state.outward.modalValues = action.payload;
    },
    setOutwardSelectedLine(state, action) {
      const { materialId, issueQty } = action.payload;
      const parsedQty = Number(issueQty || 0);
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

    setTransferField(state, action) {
      const { field, value } = action.payload;
      state.transfer[field] = value;
      if (field === "fromProject") {
        state.transfer.selectedLines = {};
      }
    },
    setTransferSaving(state, action) {
      state.transfer.saving = action.payload;
    },
    setTransferModalLine(state, action) {
      state.transfer.modalLine = action.payload;
    },
    setTransferModalValues(state, action) {
      state.transfer.modalValues = action.payload;
    },
    setTransferSelectedLine(state, action) {
      const { materialId, transferQty } = action.payload;
      const parsedQty = Number(transferQty || 0);
      if (parsedQty <= 0) {
        delete state.transfer.selectedLines[materialId];
      } else {
        state.transfer.selectedLines[materialId] = { transferQty: parsedQty };
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

    setProcurementField(state, action) {
      const { field, value } = action.payload;
      state.procurement[field] = value;
    },
    setProcurementSaving(state, action) {
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
