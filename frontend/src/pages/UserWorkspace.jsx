import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/client";
import ProjectAllocationManager from "../components/ProjectAllocationManager";
import WorkspaceHeader from "./user-workspace/WorkspaceHeader";
import WorkspaceTabs from "./user-workspace/WorkspaceTabs";
import ProcurementCenter from "./user-workspace/ProcurementCenter";
import BomTab from "./user-workspace/BomTab";
import InwardTab from "./user-workspace/InwardTab";
import OutwardTab from "./user-workspace/OutwardTab";
import TransferTab from "./user-workspace/TransferTab";
import MasterPage from "./user-workspace/MasterPage";
import AllocationModal from "./user-workspace/AllocationModal";
import RequestModal from "./user-workspace/RequestModal";
import DecisionModal from "./user-workspace/DecisionModal";
import MaterialMovementModal from "./user-workspace/MaterialMovementModal";
import InwardDetailModal from "./user-workspace/InwardDetailModal";

const DEFAULT_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 5;

function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getTodayIsoDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTimeLabel(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getInStock(material) {
  if (!material) return 0;
  const received = Number(material.receivedQty || 0);
  const utilized = Number(material.utilizedQty || 0);
  const bal = received - utilized;
  return bal < 0 ? 0 : bal;
}

function recalcBalance(material) {
  const received = Number(material.receivedQty || 0);
  const utilized = Number(material.utilizedQty || 0);
  const balance = Math.max(0, received - utilized);
  return {
    ...material,
    receivedQty: received,
    utilizedQty: utilized,
    balanceQty: balance,
  };
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(dateValue, from, to) {
  if (!from && !to) return true;
  const current = parseDate(dateValue);
  if (!current) return true;
  if (from) {
    const fromDate = parseDate(from);
    if (fromDate && current < fromDate) {
      return false;
    }
  }
  if (to) {
    const toDate = parseDate(to);
    if (toDate && current > toDate) {
      return false;
    }
  }
  return true;
}

const emptyMaterial = {
  id: "",
  code: "",
  name: "",
  partNo: "",
  lineType: "",
  unit: "",
  category: "",
};

const emptyMaterialModal = {
  open: false,
  materialId: null,
  materialName: "",
  loading: false,
  inwards: [],
  outwards: [],
  error: "",
};

const emptyAllocationModal = {
  open: false,
  projectId: null,
  materialId: null,
  materialName: "",
  materialCode: "",
  quantity: "",
  saving: false,
};

const emptyRequestModal = {
  open: false,
  projectId: null,
  materialId: null,
  materialName: "",
  materialCode: "",
  increaseQty: "",
  reason: "",
  saving: false,
};

const emptyDecisionModal = { open: false, request: null, decision: "APPROVED", note: "", saving: false };

export default function UserWorkspace({
  token,
  currentUser,
  onLogout,
  onOpenAdmin,
  onUserRefetched,
  dataVersion = 0,
}) {
  const authToken = token;
  const pageSize = DEFAULT_PAGE_SIZE;

  const [inwardCode, setInwardCode] = useState("");
  const [outwardCode, setOutwardCode] = useState("");
  const [transferCode, setTransferCode] = useState("");

  const [appError, setAppError] = useState("");
  const [loadingApp, setLoadingApp] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [bomByProject, setBomByProject] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [procurementRequests, setProcurementRequests] = useState([]);
  const [inwardHistory, setInwardHistory] = useState([]);
  const [outwardHistory, setOutwardHistory] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [screen, setScreen] = useState("main");
  const [materialMovementModal, setMaterialMovementModal] = useState(emptyMaterialModal);
  const [inwardDetailModal, setInwardDetailModal] = useState({ open: false, record: null });
  const [activeTab, setActiveTab] = useState("bom");
  const [bomSectionOpen, setBomSectionOpen] = useState(true);
  const [inwardSectionOpen, setInwardSectionOpen] = useState(true);
  const [outwardSectionOpen, setOutwardSectionOpen] = useState(true);
  const [masterManageMode, setMasterManageMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyMaterial);
  const [allocationModal, setAllocationModal] = useState(emptyAllocationModal);
  const [requestModal, setRequestModal] = useState(emptyRequestModal);
  const [decisionModal, setDecisionModal] = useState(emptyDecisionModal);
  const [inwardForm, setInwardForm] = useState({
    invoiceNo: "",
    invoiceDate: "",
    deliveryDate: "",
    vehicleNo: "",
    remarks: "",
    supplierName: "",
  });
  const [inwardIsReturn, setInwardIsReturn] = useState(false);
  const [inwardSelectedIds, setInwardSelectedIds] = useState([]);
  const [inwardQty, setInwardQty] = useState({});
  const [inwardReceivedQty, setInwardReceivedQty] = useState({});
  const [outwardSelectedIds, setOutwardSelectedIds] = useState([]);
  const [outwardIssueQty, setOutwardIssueQty] = useState({});
  const [outwardMaterialToAdd, setOutwardMaterialToAdd] = useState("");
  const [issueTo, setIssueTo] = useState("");
  const [outwardStatus, setOutwardStatus] = useState("OPEN");
  const [outwardCloseDate, setOutwardCloseDate] = useState("");
  const [transferFromSite, setTransferFromSite] = useState("");
  const [transferToProjectId, setTransferToProjectId] = useState("");
  const [transferToSite, setTransferToSite] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [transferSelectedIds, setTransferSelectedIds] = useState([]);
  const [transferQty, setTransferQty] = useState({});
  const [expandedOutwardHistoryId, setExpandedOutwardHistoryId] = useState(null);
  const [masterPage, setMasterPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [masterSearchTerm, setMasterSearchTerm] = useState("");
  const [masterFilters, setMasterFilters] = useState({ category: "ALL", lineType: "ALL" });
  const [bomPage, setBomPage] = useState(1);
  const [bomPageSize, setBomPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [bomSearchTerm, setBomSearchTerm] = useState("");
  const [bomFilters, setBomFilters] = useState({ category: "ALL", unit: "ALL", status: "ALL" });
  const [inwardHistorySearch, setInwardHistorySearch] = useState("");
  const [inwardHistoryFilters, setInwardHistoryFilters] = useState({ type: "ALL", from: "", to: "" });
  const [inwardHistoryPage, setInwardHistoryPage] = useState(1);
  const [inwardHistoryPageSize, setInwardHistoryPageSize] = useState(HISTORY_PAGE_SIZE);
  const [outwardHistorySearch, setOutwardHistorySearch] = useState("");
  const [outwardHistoryFilters, setOutwardHistoryFilters] = useState({ status: "ALL", from: "", to: "" });
  const [outwardHistoryPage, setOutwardHistoryPage] = useState(1);
  const [outwardHistoryPageSize, setOutwardHistoryPageSize] = useState(HISTORY_PAGE_SIZE);

  const canAdjustAllocations = ["ADMIN", "CEO", "COO", "PROJECT_HEAD"].includes(currentUser?.role);
  const isTopLevelRole = ["ADMIN", "CEO", "COO"].includes(currentUser?.role);
  const canReviewRequests = isTopLevelRole || currentUser?.role === "PROCUREMENT_MANAGER";


  const assignedProjectOptions = assignedProjects || [];
  const selectedProject = useMemo(
    () => assignedProjectOptions.find((p) => p.id === selectedProjectId) || null,
    [assignedProjectOptions, selectedProjectId]
  );

  const materialsForProject = useMemo(() => {
    if (!selectedProjectId) return [];

    const projectBomLines = bomByProject[selectedProjectId] || [];
    if (!projectBomLines.length) return [];

    // Collect materialIds and codes from BOM for this project
    const bomMaterialIds = new Set(
      projectBomLines
        .map((line) => (line.materialId != null ? String(line.materialId) : null))
        .filter(Boolean)
    );
    const bomCodes = new Set(
      projectBomLines
        .map((line) => (line.code != null ? String(line.code) : null))
        .filter(Boolean)
    );

    // Only keep materials that exist in BOM (by id or by code)
    return materials
      .filter((m) => {
        const id = m.id != null ? String(m.id) : null;
        const code = m.code != null ? String(m.code) : null;
        return (id && bomMaterialIds.has(id)) || (code && bomCodes.has(code));
      })
      .map(recalcBalance);
  }, [materials, bomByProject, selectedProjectId]);

  // 🔹 NEW: only keep materials with current stock > 0 for Outwards
  const outwardMaterialsForProject = useMemo(
    () =>
      materialsForProject.filter((m) => {
        const balance =
          typeof m.balanceQty === "number"
            ? m.balanceQty
            : Number(m.balanceQty || 0);
        return balance > 0;
      }),
    [materialsForProject]
  );

  const bomLines = useMemo(
    () => (selectedProjectId ? bomByProject[selectedProjectId] || [] : []),
    [bomByProject, selectedProjectId]
  );

  const materialById = useMemo(() => {
    const map = new Map();
    materialsForProject.forEach((material) => {
      if (material?.id) {
        map.set(String(material.id), material);
      }
    });
    return map;
  }, [materialsForProject]);

  const orderedQtyByProjectMaterial = useMemo(() => {
    const map = {};
    inwardHistory.forEach((record) => {
      const projectKey = record?.projectId ? String(record.projectId) : null;
      if (!projectKey || !record?.lines) return;
      record.lines.forEach((line) => {
        const materialKey = line?.materialId ? String(line.materialId) : null;
        if (!materialKey) return;
        const key = `${projectKey}::${materialKey}`;
        const value = Number(line.orderedQty ?? 0);
        if (!Number.isFinite(value)) return;
        map[key] = (map[key] || 0) + value;
      });
    });
    return map;
  }, [inwardHistory]);

    const receivedQtyByProjectMaterial = useMemo(() => {
    const map = {};
    inwardHistory.forEach((record) => {
      const projectKey = record?.projectId ? String(record.projectId) : null;
      if (!projectKey || !record?.lines) return;
      record.lines.forEach((line) => {
        const materialKey = line?.materialId ? String(line.materialId) : null;
        if (!materialKey) return;
        const key = `${projectKey}::${materialKey}`;
        const value = Number(line.receivedQty ?? 0);
        if (!Number.isFinite(value)) return;
        map[key] = (map[key] || 0) + value;
      });
    });
    return map;
  }, [inwardHistory]);

  const issuedQtyByProjectMaterial = useMemo(() => {
    const map = {};
    outwardHistory.forEach((record) => {
      const projectKey = record?.projectId ? String(record.projectId) : null;
      if (!projectKey || !record?.lines) return;
      record.lines.forEach((line) => {
        const materialKey = line?.materialId ? String(line.materialId) : null;
        if (!materialKey) return;
        const key = `${projectKey}::${materialKey}`;
        const value = Number(line.issueQty ?? 0);
        if (!Number.isFinite(value)) return;
        map[key] = (map[key] || 0) + value;
      });
    });
    return map;
  }, [outwardHistory]);

  const getProjectReceivedQty = useCallback(
    (projectId, materialId, fallback = 0) => {
      if (!projectId || !materialId) return fallback;
      const projectKey = String(projectId);
      const materialKey = String(materialId);
      const mapKey = `${projectKey}::${materialKey}`;

      if (Object.prototype.hasOwnProperty.call(receivedQtyByProjectMaterial, mapKey)) {
        const direct = Number(receivedQtyByProjectMaterial[mapKey]);
        if (Number.isFinite(direct)) {
          return direct;
        }
      }

      const materialRef = materialById.get(materialKey);
      if (materialRef) {
        const materialReceived = Number(materialRef.receivedQty);
        if (Number.isFinite(materialReceived)) {
          return materialReceived;
        }
      }

      return fallback;
    },
    [receivedQtyByProjectMaterial, materialById]
  );

  const getProjectIssuedQty = useCallback(
    (projectId, materialId, fallback = 0) => {
      if (!projectId || !materialId) return fallback;
      const projectKey = String(projectId);
      const materialKey = String(materialId);
      const mapKey = `${projectKey}::${materialKey}`;

      if (Object.prototype.hasOwnProperty.call(issuedQtyByProjectMaterial, mapKey)) {
        const direct = Number(issuedQtyByProjectMaterial[mapKey]);
        if (Number.isFinite(direct)) {
          return direct;
        }
      }

      const materialRef = materialById.get(materialKey);
      if (materialRef) {
        const materialIssued = Number(materialRef.utilizedQty);
        if (Number.isFinite(materialIssued)) {
          return materialIssued;
        }
      }

      return fallback;
    },
    [issuedQtyByProjectMaterial, materialById]
  );


  const getProjectOrderedQty = useCallback(
    (projectId, { materialId } = {}) => {
      if (!projectId || !materialId) return 0;

      const projectKey = String(projectId);
      const materialKey = String(materialId);
      const mapKey = `${projectKey}::${materialKey}`;

      const value = orderedQtyByProjectMaterial[mapKey];
      const numeric = Number(value);

      return Number.isFinite(numeric) ? numeric : 0;
    },
    [orderedQtyByProjectMaterial]
  );


    const bomRows = useMemo(() => {
    return bomLines.map((item) => {
      const material =
        materialsForProject.find((m) => m.id === item.materialId) ||
        materialsForProject.find((m) => m.code === item.code);
      const materialId = material?.id || item.materialId || null;

      const orderedQty = materialId
      ? getProjectOrderedQty(selectedProjectId, { materialId })
      : 0;

      const requiredQty = Number(item.qty ?? 0);
      const receivedQty = getProjectReceivedQty(
        selectedProjectId,
        materialId,
        material?.receivedQty ?? 0
      );
      const utilizedQty = getProjectIssuedQty(
        selectedProjectId,
        materialId,
        material?.utilizedQty ?? 0
      );
      const balanceQty = Math.max(0, Number(receivedQty) - Number(utilizedQty));
      const stockStatus = balanceQty <= 0 ? "OUT" : balanceQty < requiredQty ? "LOW" : "HEALTHY";

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit || material?.unit || "",
        category: material?.category || "",
        requiredQty,
        orderedQty,
        receivedQty,
        utilizedQty,
        balanceQty,
        stockStatus,
        materialRef: material || null,
        projectId: selectedProjectId,
      };
    });
  }, [
    bomLines,
    materialsForProject,
    getProjectOrderedQty,
    getProjectReceivedQty,
    getProjectIssuedQty,
    selectedProjectId,
  ]);


  const bomFilterOptions = useMemo(() => {
    const categories = new Set();
    const units = new Set();
    bomRows.forEach((row) => {
      if (row.category) categories.add(row.category);
      if (row.unit) units.add(row.unit);
    });
    return {
      categories: Array.from(categories).sort(),
      units: Array.from(units).sort(),
    };
  }, [bomRows]);

  const filteredBomRows = useMemo(() => {
    const term = bomSearchTerm.trim().toLowerCase();
    return bomRows.filter((row) => {
      const matchesTerm = term
        ? `${row.code} ${row.name} ${row.category} ${row.unit}`.toLowerCase().includes(term)
        : true;
      const matchesCategory = bomFilters.category === "ALL" || row.category === bomFilters.category;
      const matchesUnit = bomFilters.unit === "ALL" || row.unit === bomFilters.unit;
      const matchesStatus = bomFilters.status === "ALL" || row.stockStatus === bomFilters.status;
      return matchesTerm && matchesCategory && matchesUnit && matchesStatus;
    });
  }, [bomRows, bomSearchTerm, bomFilters]);

  const bomTotalPages = Math.max(1, Math.ceil(filteredBomRows.length / bomPageSize) || 1);
  const bomPageItems = useMemo(
    () => paginate(filteredBomRows, Math.min(bomPage, bomTotalPages), bomPageSize),
    [filteredBomRows, bomPage, bomTotalPages, bomPageSize]
  );

  const masterFilterOptions = useMemo(() => {
    const categories = new Set();
    const lineTypes = new Set();
    materials.forEach((material) => {
      if (material.category) categories.add(material.category);
      if (material.lineType) lineTypes.add(material.lineType);
    });
    return {
      categories: Array.from(categories).sort(),
      lineTypes: Array.from(lineTypes).sort(),
    };
  }, [materials]);

  const masterFilteredMaterials = useMemo(() => {
    const term = masterSearchTerm.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesTerm = term
        ? `${material.code} ${material.name} ${material.partNo} ${material.category}`.toLowerCase().includes(term)
        : true;
      const matchesCategory = masterFilters.category === "ALL" || material.category === masterFilters.category;
      const matchesLineType = masterFilters.lineType === "ALL" || material.lineType === masterFilters.lineType;
      return matchesTerm && matchesCategory && matchesLineType;
    });
  }, [materials, masterSearchTerm, masterFilters]);

  const masterTotalPages = Math.max(1, Math.ceil(masterFilteredMaterials.length / masterPageSize) || 1);
  const masterPageItems = useMemo(
    () => paginate(masterFilteredMaterials, Math.min(masterPage, masterTotalPages), masterPageSize),
    [masterFilteredMaterials, masterPage, masterTotalPages, masterPageSize]
  );

  const filteredInwardHistory = useMemo(() => {
    const term = inwardHistorySearch.trim().toLowerCase();
    return inwardHistory
      .filter((row) => !row.projectId || row.projectId === selectedProjectId)
      .filter((row) => {
        const matchesTerm = term
          ? `${row.code} ${row.invoiceNo || ""} ${row.supplierName || ""}`.toLowerCase().includes(term)
          : true;
        const type = row.type || row.inwardType || "SUPPLY";
        const matchesType = inwardHistoryFilters.type === "ALL" || type === inwardHistoryFilters.type;
        const matchesDate = isWithinRange(row.date, inwardHistoryFilters.from, inwardHistoryFilters.to);
        return matchesTerm && matchesType && matchesDate;
      });
  }, [inwardHistory, selectedProjectId, inwardHistorySearch, inwardHistoryFilters]);

  const inwardHistoryTotalPages = Math.max(1, Math.ceil(filteredInwardHistory.length / inwardHistoryPageSize) || 1);
  const inwardHistoryPageItems = useMemo(
    () => paginate(filteredInwardHistory, Math.min(inwardHistoryPage, inwardHistoryTotalPages), inwardHistoryPageSize),
    [filteredInwardHistory, inwardHistoryPage, inwardHistoryTotalPages, inwardHistoryPageSize]
  );

  const filteredOutwardHistory = useMemo(() => {
    const term = outwardHistorySearch.trim().toLowerCase();
    return outwardHistory
      .filter((row) => !row.projectId || row.projectId === selectedProjectId)
      .filter((row) => {
        const matchesTerm = term
          ? `${row.code} ${row.issueTo || ""} ${row.status || ""}`.toLowerCase().includes(term)
          : true;
        const matchesStatus = outwardHistoryFilters.status === "ALL" || row.status === outwardHistoryFilters.status;
        const matchesDate = isWithinRange(row.date, outwardHistoryFilters.from, outwardHistoryFilters.to);
        return matchesTerm && matchesStatus && matchesDate;
      });
  }, [outwardHistory, selectedProjectId, outwardHistorySearch, outwardHistoryFilters]);

  const outwardHistoryTotalPages = Math.max(1, Math.ceil(filteredOutwardHistory.length / outwardHistoryPageSize) || 1);
  const outwardHistoryPageItems = useMemo(
    () => paginate(filteredOutwardHistory, Math.min(outwardHistoryPage, outwardHistoryTotalPages), outwardHistoryPageSize),
    [filteredOutwardHistory, outwardHistoryPage, outwardHistoryTotalPages, outwardHistoryPageSize]
  );

  useEffect(() => {
    setBomPage(1);
  }, [selectedProjectId, bomSearchTerm, bomFilters, bomPageSize, bomRows.length]);

  useEffect(() => {
    setMasterPage(1);
  }, [materials, masterSearchTerm, masterFilters, masterPageSize]);

  useEffect(() => {
    setInwardHistoryPage(1);
  }, [selectedProjectId, inwardHistorySearch, inwardHistoryFilters, inwardHistoryPageSize, inwardHistory.length]);

  useEffect(() => {
    setOutwardHistoryPage(1);
  }, [selectedProjectId, outwardHistorySearch, outwardHistoryFilters, outwardHistoryPageSize, outwardHistory.length]);

  const pendingRequestCount = useMemo(
    () => procurementRequests.filter((req) => req.status === "PENDING").length,
    [procurementRequests]
  );
  const shouldShowProcurementCenter = canReviewRequests || procurementRequests.length > 0;

  const preventNumberScroll = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const refreshCodes = useCallback(async () => {
    if (!authToken) return;
    try {
      const codes = await api.inventoryCodes(authToken);
      setInwardCode(codes?.inwardCode || "");
      setOutwardCode(codes?.outwardCode || "");
      setTransferCode(codes?.transferCode || "");
    } catch (err) {
      toast.error(err.message);
    }
  }, [authToken]);

  const loadAppData = useCallback(async () => {
    if (!authToken) return;
    setLoadingApp(true);
    setAppError("");
    try {
      const data = await api.bootstrap(authToken);
      onUserRefetched?.(data.user);
      setAllProjects(data.projects || []);
      setAssignedProjects(data.assignedProjects || []);
      setMaterials(data.materials || []);
      setBomByProject(data.bom || {});
      setInwardHistory(data.inwardHistory || []);
      setOutwardHistory(data.outwardHistory || []);
      setTransferHistory(data.transferHistory || []);
      setProcurementRequests(data.procurementRequests || []);
      if (data.inventoryCodes) {
        setInwardCode(data.inventoryCodes.inwardCode || "");
        setOutwardCode(data.inventoryCodes.outwardCode || "");
        setTransferCode(data.inventoryCodes.transferCode || "");
      } else {
        await refreshCodes();
      }
      setSelectedProjectId((prev) => {
        if (prev && (data.assignedProjects || []).some((p) => p.id === prev)) {
          return prev;
        }
        return data.assignedProjects?.[0]?.id || null;
      });
    } catch (err) {
      setAppError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingApp(false);
    }
  }, [authToken, onUserRefetched, refreshCodes]);

  useEffect(() => {
    loadAppData();
  }, [loadAppData, dataVersion]);

  const closeMaterialMovementModal = () => setMaterialMovementModal(emptyMaterialModal);

  const handleMaterialMovementRequest = async (material) => {
    if (!authToken || !material?.id) {
      return;
    }
    setMaterialMovementModal({
      open: true,
      materialId: material.id,
      materialName: material.name || material.code || "",
      loading: true,
      inwards: [],
      outwards: [],
      error: "",
    });
    try {
      const data = await api.materialMovements(authToken, material.id);
      setMaterialMovementModal((prev) => ({
        ...prev,
        loading: false,
        inwards: data?.inwards || [],
        outwards: data?.outwards || [],
      }));
    } catch (err) {
      setMaterialMovementModal((prev) => ({ ...prev, loading: false, error: err.message }));
      toast.error(err.message);
    }
  };

  const openInwardDetailModal = (record) => {
    setInwardDetailModal({ open: true, record });
  };
  const closeInwardDetailModal = () => setInwardDetailModal({ open: false, record: null });

  const closeAllocationModal = () => {
    if (allocationModal.saving) return;
    setAllocationModal(emptyAllocationModal);
  };

  const handleOpenAllocationModal = (row) => {
    if (!canAdjustAllocations) {
      toast.error("Only authorized roles can adjust allocations");
      return;
    }
    if (!row?.materialRef?.id || !row.projectId) {
      toast.error("Select a project and material to adjust allocation");
      return;
    }
    setAllocationModal({
      open: true,
      projectId: row.projectId,
      materialId: row.materialRef.id,
      materialName: row.name,
      materialCode: row.code,
      quantity: row.requiredQty ?? "",
      saving: false,
    });
  };

  const handleAllocationQuantityChange = (value) => {
    setAllocationModal((prev) => ({ ...prev, quantity: value }));
  };

  const handleSubmitAllocation = async () => {
    if (!authToken) return;
    if (!allocationModal.projectId || !allocationModal.materialId) {
      toast.error("Missing project or material reference");
      return;
    }
    const quantity = Number(allocationModal.quantity ?? 0);
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error("Allocation must be zero or greater");
      return;
    }
    setAllocationModal((prev) => ({ ...prev, saving: true }));
    try {
      await api.updateBomAllocation(authToken, allocationModal.projectId, allocationModal.materialId, {
        projectId: allocationModal.projectId,
        materialId: allocationModal.materialId,
        quantity,
      });
      toast.success("Allocation updated");
      setAllocationModal(emptyAllocationModal);
      await loadAppData();
    } catch (err) {
      setAllocationModal((prev) => ({ ...prev, saving: false }));
      toast.error(err.message);
    }
  };

  const closeRequestModal = () => {
    if (requestModal.saving) return;
    setRequestModal(emptyRequestModal);
  };

  const handleOpenRequestModal = (row) => {
    if (!row?.materialRef?.id || !row.projectId) {
      toast.error("Select a project and material to request more quantity");
      return;
    }
    setRequestModal({
      open: true,
      projectId: row.projectId,
      materialId: row.materialRef.id,
      materialName: row.name,
      materialCode: row.code,
      increaseQty: "",
      reason: "",
      saving: false,
    });
  };

  const handleRequestFieldChange = (field, value) => {
    setRequestModal((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRequest = async () => {
    if (!authToken) return;
    const increaseQty = Number(requestModal.increaseQty || 0);
    if (Number.isNaN(increaseQty) || increaseQty <= 0) {
      toast.error("Requested increase must be greater than zero");
      return;
    }
    if (!requestModal.reason.trim()) {
      toast.error("Please describe why the increase is needed");
      return;
    }
    setRequestModal((prev) => ({ ...prev, saving: true }));
    try {
      await api.createProcurementRequest(authToken, {
        projectId: requestModal.projectId,
        materialId: requestModal.materialId,
        increaseQty,
        reason: requestModal.reason.trim(),
      });
      toast.success("Procurement request submitted");
      setRequestModal(emptyRequestModal);
      await loadAppData();
    } catch (err) {
      setRequestModal((prev) => ({ ...prev, saving: false }));
      toast.error(err.message);
    }
  };

  const closeDecisionModal = () => {
    if (decisionModal.saving) return;
    setDecisionModal(emptyDecisionModal);
  };

  const handleOpenDecisionModal = (request, decision) => {
    setDecisionModal({ open: true, request, decision, note: "", saving: false });
  };

  const handleDecisionFieldChange = (patch) => {
    setDecisionModal((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmitDecision = async () => {
    if (!authToken || !decisionModal.request) return;
    setDecisionModal((prev) => ({ ...prev, saving: true }));
    try {
      await api.resolveProcurementRequest(authToken, decisionModal.request.id, {
        decision: decisionModal.decision,
        note: decisionModal.note,
      });
      toast.success(
        decisionModal.decision === "APPROVED" ? "Request approved" : "Request rejected"
      );
      setDecisionModal(emptyDecisionModal);
      await loadAppData();
    } catch (err) {
      setDecisionModal((prev) => ({ ...prev, saving: false }));
      toast.error(err.message);
    }
  };

  const handleStartCreate = () => {
    setMasterManageMode(true);
    setEditingId("new");
    setDraft({ ...emptyMaterial, id: "new" });
  };

  const handleStartEdit = (material) => {
    setMasterManageMode(true);
    setEditingId(material.id);
    setDraft({
      id: material.id,
      code: material.code || "",
      name: material.name || "",
      partNo: material.partNo || "",
      lineType: material.lineType || "",
      unit: material.unit || "",
      category: material.category || "",
    });
  };

  const handleDraftChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraft(emptyMaterial);
  };

  const handleSaveDraft = async () => {
    if (!authToken) {
      const message = "Please sign in to save materials";
      setAppError(message);
      toast.error(message);
      return;
    }
    setAppError("");
    if (!draft.code.trim() || !draft.name.trim()) {
      const message = "Code and Material are required";
      setAppError(message);
      toast.error(message);
      return;
    }

    const payload = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      partNo: draft.partNo.trim(),
      lineType: draft.lineType.trim(),
      unit: draft.unit.trim(),
      category: draft.category.trim(),
    };

    try {
      if (editingId === "new") {
        await api.createMaterial(authToken, payload);
      } else if (editingId) {
        await api.updateMaterial(authToken, editingId, payload);
      }
      await loadAppData();
      toast.success("Material saved");
    } catch (err) {
      setAppError(err.message);
      toast.error(err.message);
    }

    setEditingId(null);
    setDraft(emptyMaterial);
  };

  const handleDeleteMaterial = async (id) => {
    if (!authToken) return;
    try {
      await api.deleteMaterial(authToken, id);
      await loadAppData();
      toast.success("Material removed");
    } catch (err) {
      setAppError(err.message);
      toast.error(err.message);
    }
    if (editingId === id) {
      setEditingId(null);
      setDraft(emptyMaterial);
    }
  };

  const handleOpenMaster = () => {
    setScreen("master");
    setMasterManageMode(true);
    setEditingId("new");
    setDraft({ ...emptyMaterial, id: "new" });
  };

  const handleBackFromMaster = () => {
    setScreen("main");
    setEditingId(null);
    setDraft(emptyMaterial);
    setMasterManageMode(false);
  };

  const handleOpenAllocations = () => {
    if (!canAdjustAllocations) {
      toast.error("Only Admin, CEO, COO or Project Head can manage allocations");
      return;
    }
    setScreen("allocations");
  };

  const handleBackFromAllocations = () => {
    setScreen("main");
  };

  const syncProjectBom = useCallback((projectId, lines) => {
    setBomByProject((prev) => ({
      ...prev,
      [projectId]: Array.isArray(lines) ? lines : [],
    }));
  }, []);

  const handleInwardFormChange = (field, value) => {
    setInwardForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleInwardSelected = (id) => {
    setInwardSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleInwardQtyFocus = (id) => {
    setInwardSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleInwardQtyChange = (id, value) => {
    setInwardQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleInwardReceivedQtyChange = (id, value) => {
    setInwardReceivedQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveInward = async () => {
    if (!selectedProjectId || !authToken) return;
    setAppError("");

    const lines = inwardSelectedIds
      .map((id) => {
        const material = materialsForProject.find((m) => m.id === id); // <- changed
        if (!material) return null;
        const orderedQtyVal = Number(inwardQty[id] || 0) || 0;
        const receivedQtyVal = Number(inwardReceivedQty[id] || 0) || 0;
        if (orderedQtyVal === 0 && receivedQtyVal === 0) return null;
        return {
          materialId: id,
          orderedQty: orderedQtyVal,
          receivedQty: receivedQtyVal,
        };
      })
      .filter(Boolean);


    if (lines.length === 0) {
      const message = "Enter ordered or received quantity";
      setAppError(message);
      toast.error(message);
      return;
    }

    const payload = {
      code: inwardCode,
      projectId: selectedProjectId,
      type: inwardIsReturn ? "RETURN" : "SUPPLY",
      ...inwardForm,
      lines,
    };

    try {
      await api.createInward(authToken, payload);
      await loadAppData();
      toast.success("Inward saved");
    } catch (err) {
      setAppError(err.message);
      toast.error(err.message);
    }

    setInwardSelectedIds([]);
    setInwardQty({});
    setInwardReceivedQty({});
    setInwardForm({ invoiceNo: "", invoiceDate: "", deliveryDate: "", vehicleNo: "", remarks: "", supplierName: "" });
    setInwardIsReturn(false);
  };

  const handleToggleOutwardSelected = (id) => {
    setOutwardSelectedIds((prev) => {
      if (prev.includes(id)) {
        setOutwardIssueQty((prevQty) => {
          const next = { ...prevQty };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const handleOutwardIssueQtyFocus = (id) => {
    setOutwardSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleOutwardIssueQtyChange = (id, value) => {
    setOutwardIssueQty((prev) => ({ ...prev, [id]: value }));
    const numeric = Number(value || 0);
    setOutwardSelectedIds((prev) => {
      if (numeric > 0) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  };

  const handleAddOutwardMaterial = () => {
    if (!outwardMaterialToAdd) return;
    setOutwardSelectedIds((prev) =>
      prev.includes(outwardMaterialToAdd) ? prev : [...prev, outwardMaterialToAdd]
    );
    setOutwardMaterialToAdd("");
  };

  const handleSaveOutward = async () => {
    if (!selectedProjectId || !authToken) return;
    setAppError("");

    const todayStr = getTodayIsoDate();

    const lines = outwardSelectedIds
      .map((id) => {
        const material = materialsForProject.find((m) => m.id === id); // <- changed
        if (!material) return null;
        const issueQtyVal = Number(outwardIssueQty[id] || 0) || 0;
        if (issueQtyVal <= 0) return null;
        return {
          materialId: id,
          issueQty: issueQtyVal,
        };
      })
      .filter(Boolean);


    if (lines.length === 0) {
      const message = "Enter issue quantities";
      setAppError(message);
      toast.error(message);
      return;
    }

    const statusForSave = outwardStatus;
    const closeDateFinal = statusForSave === "CLOSED" ? todayStr : outwardCloseDate;

    const payload = {
      code: outwardCode,
      projectId: selectedProjectId,
      issueTo,
      status: statusForSave,
      closeDate: closeDateFinal,
      date: todayStr,
      lines,
    };

    try {
      await api.createOutward(authToken, payload);
      await loadAppData();
      toast.success("Outward saved");
    } catch (err) {
      setAppError(err.message);
      toast.error(err.message);
    }

    setOutwardSelectedIds([]);
    setOutwardIssueQty({});
    setIssueTo("");
    setOutwardStatus("OPEN");
    setOutwardCloseDate("");
    setOutwardMaterialToAdd("");
  };

  const handleToggleTransferSelected = (id) => {
    setTransferSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleTransferQtyChange = (id, value) => {
    setTransferQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveTransfer = async () => {
    if (!transferToProjectId || !authToken) {
      const message = "Select a target project";
      setAppError(message);
      toast.error(message);
      return;
    }
    setAppError("");

    if (transferToProjectId === selectedProjectId) {
      const fromSite = transferFromSite.trim();
      const toSite = transferToSite.trim();
      if (!fromSite || !toSite) {
        const message = "Enter from and to site names for intra-project transfers";
        setAppError(message);
        toast.error(message);
        return;
      }
      if (fromSite.toLowerCase() === toSite.toLowerCase()) {
        const message = "Source and destination sites must be different";
        setAppError(message);
        toast.error(message);
        return;
      }
    }

    const lines = transferSelectedIds
      .map((id) => ({ materialId: id, transferQty: Number(transferQty[id] || 0) }))
      .filter((line) => line.transferQty > 0);

    if (lines.length === 0) {
      const message = "Select materials and quantities for transfer";
      setAppError(message);
      toast.error(message);
      return;
    }

    const payload = {
      code: transferCode,
      fromProjectId: selectedProjectId,
      toProjectId: transferToProjectId,
      fromSite: transferFromSite.trim() || undefined,
      toSite: transferToSite.trim() || undefined,
      remarks: transferRemarks,
      lines,
    };

    try {
      await api.createTransfer(authToken, payload);
      await loadAppData();
      toast.success("Transfer submitted");
    } catch (err) {
      setAppError(err.message);
      toast.error(err.message);
    }
    setTransferSelectedIds([]);
    setTransferQty({});
    setTransferRemarks("");
    setTransferFromSite("");
    setTransferToSite("");
    setTransferToProjectId("");
  };

  const showProjectDropdown = assignedProjects.length > 1;
  const canOpenAdmin = typeof onOpenAdmin === "function";
  const isAdminRole = isTopLevelRole;

  if (!authToken) {
    return null;
  }

  const headerTitle =
    screen === "master" ? "Material Master" : screen === "allocations" ? "Material Allocations" : "Project Inventory";

  let mainBody = null;
  if (screen === "master") {
    mainBody = (
      <MasterPage
        materials={masterPageItems}
        totalItems={masterFilteredMaterials.length}
        page={masterPage}
        totalPages={masterTotalPages}
        pageSize={masterPageSize}
        onPageChange={setMasterPage}
        onPageSizeChange={(size) => {
          setMasterPageSize(size);
          setMasterPage(1);
        }}
        manageMode={masterManageMode}
        editingId={editingId}
        draft={draft}
        onDraftChange={handleDraftChange}
        onStartCreate={handleStartCreate}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveDraft={handleSaveDraft}
        onDelete={handleDeleteMaterial}
        onBack={handleBackFromMaster}
        searchTerm={masterSearchTerm}
        onSearchChange={setMasterSearchTerm}
        filters={masterFilters}
        onFilterChange={setMasterFilters}
        filterOptions={masterFilterOptions}
      />
    );
  } else if (screen === "allocations") {
    if (!canAdjustAllocations) {
      mainBody = <div className="text-[11px] text-slate-500">Only Admin, CEO, COO or Project Head can access allocations.</div>;
    } else {
      const allocationProjects = allProjects.length ? allProjects : assignedProjects;
      mainBody = (
        <ProjectAllocationManager
          token={authToken}
          projects={allocationProjects}
          materials={materials}
          defaultProjectId={selectedProjectId}
          onBack={handleBackFromAllocations}
          onProjectBomUpdate={syncProjectBom}
        />
      );
    }
  } else if (!selectedProject) {
    mainBody = <div className="text-[11px] text-slate-500">No project assigned.</div>;
  } else {
    mainBody = (
      <>
        <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} onOpenMaster={handleOpenMaster} />
        <div className="pt-2">
          {activeTab === "bom" && (
            <BomTab
              isOpen={bomSectionOpen}
              onToggle={() => setBomSectionOpen((prev) => !prev)}
              rows={bomPageItems}
              page={bomPage}
              totalPages={bomTotalPages}
              pageSize={bomPageSize}
              totalItems={filteredBomRows.length}
              onPageChange={setBomPage}
              onPageSizeChange={(size) => {
                setBomPageSize(size);
                setBomPage(1);
              }}
              searchTerm={bomSearchTerm}
              onSearchChange={setBomSearchTerm}
              filters={bomFilters}
              onFilterChange={setBomFilters}
              filterOptions={bomFilterOptions}
              onOpenMaster={handleOpenMaster}
              onMaterialMovement={handleMaterialMovementRequest}
              canAdjustAllocations={canAdjustAllocations}
              onOpenAllocation={handleOpenAllocationModal}
              onOpenRequest={handleOpenRequestModal}
            />
          )}
          {activeTab === "inward" && (
            <InwardTab
              isOpen={inwardSectionOpen}
              onToggle={() => setInwardSectionOpen((prev) => !prev)}
              inwardCode={inwardCode}
              formState={inwardForm}
              onFormChange={handleInwardFormChange}
              isReturn={inwardIsReturn}
              onReturnChange={setInwardIsReturn}
              materials={materialsForProject}
              pageSize={pageSize}
              preventNumberScroll={preventNumberScroll}
              selectedIds={inwardSelectedIds}
              onToggleSelected={handleToggleInwardSelected}
              onQtyFocus={handleInwardQtyFocus}
              qtyByMaterial={inwardQty}
              onQtyChange={handleInwardQtyChange}
              receivedQtyByMaterial={inwardReceivedQty}
              onReceivedQtyChange={handleInwardReceivedQtyChange}
              onSaveInward={handleSaveInward}
              historyRows={inwardHistoryPageItems}
              historyPage={inwardHistoryPage}
              historyTotalPages={inwardHistoryTotalPages}
              historyPageSize={inwardHistoryPageSize}
              historyTotalItems={filteredInwardHistory.length}
              onHistoryPageChange={setInwardHistoryPage}
              onHistoryPageSizeChange={(size) => {
                setInwardHistoryPageSize(size);
                setInwardHistoryPage(1);
              }}
              historySearchTerm={inwardHistorySearch}
              onHistorySearchChange={setInwardHistorySearch}
              historyFilters={inwardHistoryFilters}
              onHistoryFilterChange={setInwardHistoryFilters}
              onViewHistoryDetail={openInwardDetailModal}
            />
          )}
          {activeTab === "outward" && (
            <OutwardTab
              isOpen={outwardSectionOpen}
              onToggle={() => setOutwardSectionOpen((prev) => !prev)}
              outwardCode={outwardCode}
              issueTo={issueTo}
              onIssueToChange={setIssueTo}
              status={outwardStatus}
              onStatusChange={(value) => {
                setOutwardStatus(value);
                if (value === "CLOSED") {
                  setOutwardCloseDate(getTodayIsoDate());
                } else {
                  setOutwardCloseDate("");
                }
              }}
              closeDate={outwardCloseDate}
              onSaveOutward={handleSaveOutward}
              materials={outwardMaterialsForProject}
              pageSize={pageSize}
              selectedIds={outwardSelectedIds}
              onToggleSelected={handleToggleOutwardSelected}
              onIssueQtyFocus={handleOutwardIssueQtyFocus}
              issueQtyByMaterial={outwardIssueQty}
              onIssueQtyChange={handleOutwardIssueQtyChange}
              materialToAdd={outwardMaterialToAdd}
              onMaterialToAddChange={setOutwardMaterialToAdd}
              onAddMaterial={handleAddOutwardMaterial}
              preventNumberScroll={preventNumberScroll}
              historyRows={outwardHistoryPageItems}
              historyPage={outwardHistoryPage}
              historyTotalPages={outwardHistoryTotalPages}
              historyPageSize={outwardHistoryPageSize}
              historyTotalItems={filteredOutwardHistory.length}
              onHistoryPageChange={setOutwardHistoryPage}
              onHistoryPageSizeChange={(size) => {
                setOutwardHistoryPageSize(size);
                setOutwardHistoryPage(1);
              }}
              historySearchTerm={outwardHistorySearch}
              onHistorySearchChange={setOutwardHistorySearch}
              historyFilters={outwardHistoryFilters}
              onHistoryFilterChange={setOutwardHistoryFilters}
              expandedHistoryId={expandedOutwardHistoryId}
              onToggleHistoryRow={setExpandedOutwardHistoryId}
            />
          )}
          {activeTab === "transfer" && (
            <TransferTab
              selectedProject={selectedProject}
              transferCode={transferCode}
              projects={allProjects}
              fromSite={transferFromSite}
              onFromSiteChange={setTransferFromSite}
              transferToProjectId={transferToProjectId}
              onTransferToProjectChange={setTransferToProjectId}
              toSite={transferToSite}
              onToSiteChange={setTransferToSite}
              transferRemarks={transferRemarks}
              onTransferRemarksChange={setTransferRemarks}
              materials={materialsForProject}
              pageSize={pageSize}
              selectedIds={transferSelectedIds}
              onToggleSelected={handleToggleTransferSelected}
              transferQty={transferQty}
              onTransferQtyChange={handleTransferQtyChange}
              onSaveTransfer={handleSaveTransfer}
              preventNumberScroll={preventNumberScroll}
              getProjectOrderedQty={getProjectOrderedQty}
              currentProjectId={selectedProjectId}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-2 text-[11px] text-slate-800 sm:p-4">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop-blur">
        <WorkspaceHeader
          title={headerTitle}
          screen={screen}
          showProjectDropdown={showProjectDropdown}
          selectedProjectId={selectedProjectId}
          selectedProject={selectedProject}
          assignedProjects={assignedProjects}
          onSelectProject={setSelectedProjectId}
          currentUser={currentUser}
          canReviewRequests={canReviewRequests}
          pendingRequestCount={pendingRequestCount}
          canAdjustAllocations={canAdjustAllocations}
          onOpenAllocations={handleOpenAllocations}
          canOpenAdmin={canOpenAdmin}
          isAdminRole={isAdminRole}
          onOpenAdmin={onOpenAdmin}
          onLogout={onLogout}
        />

        {loadingApp && (
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Syncing latest data…
          </div>
        )}
        {appError && (
          <div className="mt-3 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600">{appError}</div>
        )}

        <div className="pt-3 space-y-3">
          {screen === "main" && shouldShowProcurementCenter && (
            <ProcurementCenter
              requests={procurementRequests}
              canReviewRequests={canReviewRequests}
              pendingRequestCount={pendingRequestCount}
              formatDateTimeLabel={formatDateTimeLabel}
              onOpenDecision={handleOpenDecisionModal}
            />
          )}
          {mainBody}
        </div>
      </div>
      <MaterialMovementModal modal={materialMovementModal} onClose={closeMaterialMovementModal} />
      <InwardDetailModal modal={inwardDetailModal} onClose={closeInwardDetailModal} />
      <AllocationModal
        modal={allocationModal}
        onClose={closeAllocationModal}
        onChangeQuantity={handleAllocationQuantityChange}
        onSubmit={handleSubmitAllocation}
      />
      <RequestModal
        modal={requestModal}
        onClose={closeRequestModal}
        onChangeField={handleRequestFieldChange}
        onSubmit={handleSubmitRequest}
      />
      <DecisionModal
        modal={decisionModal}
        onClose={closeDecisionModal}
        onChange={handleDecisionFieldChange}
        onSubmit={handleSubmitDecision}
      />
    </div>
  );
}
