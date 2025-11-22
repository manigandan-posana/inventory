import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

/* ================= Helpers ================= */

function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function generateCode(prefix) {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `${prefix}-${datePart}-001`;
}

// yyyy-MM-dd (local)
function getTodayIsoDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// derive instock from received - utilized, clamped at 0
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

/* ================= Main Component ================= */

export default function UsersPage() {
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [appError, setAppError] = useState("");
  const [loadingApp, setLoadingApp] = useState(false);
  const [activeView, setActiveView] = useState("user");
  const [analytics, setAnalytics] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminProjects, setAdminProjects] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [newProjectForm, setNewProjectForm] = useState({ code: "", name: "" });
  const emptyUserForm = {
    name: "",
    email: "",
    password: "",
    role: "USER",
    accessType: "PROJECTS",
    projectIds: [],
  };
  const [userFormMode, setUserFormMode] = useState("create");
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);

  const [assignedProjects, setAssignedProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [bomByProject, setBomByProject] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // screen: "main" | "master"
  const [screen, setScreen] = useState("main");

  // History state
  const [inwardHistory, setInwardHistory] = useState([]);
  const [outwardHistory, setOutwardHistory] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [actionMessage, setActionMessage] = useState("");

  // main tabs: bom | inward | outward | transfer
  const [activeTab, setActiveTab] = useState("bom");
  const [masterPage, setMasterPage] = useState(1);
  const pageSize = 10;

  // Collapse sections
  const [bomSectionOpen, setBomSectionOpen] = useState("current"); // current | history
  const [inwardSectionOpen, setInwardSectionOpen] = useState(true);
  const [outwardSectionOpen, setOutwardSectionOpen] = useState("current");

  // Expanded history lines (details collapse)
  const [expandedInwardHistoryId, setExpandedInwardHistoryId] = useState(null);
  const [expandedOutwardHistoryId, setExpandedOutwardHistoryId] = useState(null);

  // Outward history edit state
  const [editingOutwardId, setEditingOutwardId] = useState(null);
  const [outwardHistoryDraft, setOutwardHistoryDraft] = useState({});
  const [outwardMetaDraft, setOutwardMetaDraft] = useState({ status: "OPEN", closeDate: "" });

  // NEW: pending new lines while editing an outward record
  const [pendingOutwardNewLines, setPendingOutwardNewLines] = useState({}); // { [recordId]: Array<line> }
  const [outwardHistoryAddMaterialId, setOutwardHistoryAddMaterialId] = useState("");

  // Master manage mode + CRUD
  const [masterManageMode, setMasterManageMode] = useState(false);
  const [editingId, setEditingId] = useState(null); // material id or "new" or null
  const emptyMaterial = {
    id: "",
    code: "",
    name: "",
    partNo: "",
    lineType: "",
    unit: "",
    category: "",
  };
  const [draft, setDraft] = useState(emptyMaterial);

  // Inwards
  const [inwardCode] = useState(() => generateCode("INW"));
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
  const [inwardDeliveredQty, setInwardDeliveredQty] = useState({});

  // Outwards (current-create)
  const [outwardCode] = useState(() => generateCode("OUT"));
  const [issueTo, setIssueTo] = useState("");
  const [outwardStatus, setOutwardStatus] = useState("OPEN");
  const [outwardCloseDate, setOutwardCloseDate] = useState("");
  const [outwardSelectedIds, setOutwardSelectedIds] = useState([]);
  const [outwardIssueQty, setOutwardIssueQty] = useState({});
  const [outwardMaterialToAdd, setOutwardMaterialToAdd] = useState("");

  // Site-to-site transfer
  const [transferCode] = useState(() => generateCode("TRF"));
  const [transferFromSite, setTransferFromSite] = useState("");
  const [transferToProjectId, setTransferToProjectId] = useState("");
  const [transferToSite, setTransferToSite] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [transferSelectedIds, setTransferSelectedIds] = useState([]);
  const [transferQty, setTransferQty] = useState({});

  const selectedProject = useMemo(
    () => assignedProjects.find((p) => p.id === selectedProjectId) || null,
    [assignedProjects, selectedProjectId]
  );

  const materialsForProject = useMemo(() => materials, [materials, selectedProjectId]);

  const masterTotalPages = Math.max(1, Math.ceil(materialsForProject.length / pageSize) || 1);
  const masterPageItems = useMemo(
    () => paginate(materialsForProject, masterPage, pageSize),
    [materialsForProject, masterPage, pageSize]
  );

  const bomItems = useMemo(
    () => (selectedProjectId ? bomByProject[selectedProjectId] || [] : []),
    [bomByProject, selectedProjectId]
  );

  const showProjectDropdown = assignedProjects.length > 1;

  const canSeeAdmin = currentUser?.role === "ADMIN";

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError("");
    setAppError("");
    try {
      const response = await api.login(loginForm);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      setAssignedProjects(response.user.projects || []);
      setSelectedProjectId(response.user.projects?.[0]?.id || null);
      setActiveView("user");
      setScreen("main");
      setActiveTab("bom");
      setActionMessage("Signed in successfully");
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLoginFormChange = (field, value) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await api.logout(authToken);
      } catch (err) {
        console.warn(err);
      }
    }
    setAuthToken(null);
    setCurrentUser(null);
    setAssignedProjects([]);
    setAllProjects([]);
    setMaterials([]);
    setBomByProject({});
    setSelectedProjectId(null);
    setInwardHistory([]);
    setOutwardHistory([]);
    setTransferHistory([]);
    setActiveView("user");
    setActionMessage("Logged out");
  };

  const loadAppData = useCallback(async () => {
    if (!authToken) return;
    setLoadingApp(true);
    setAppError("");
    try {
      const data = await api.bootstrap(authToken);
      setCurrentUser(data.user);
      setAllProjects(data.projects || []);
      setAssignedProjects(data.assignedProjects || []);
      setAdminProjects(data.projects || []);
      setMaterials(data.materials || []);
      setBomByProject(data.bom || {});
      setInwardHistory(data.inwardHistory || []);
      setOutwardHistory(data.outwardHistory || []);
      setTransferHistory(data.transferHistory || []);
      setSelectedProjectId((prev) => {
        if (prev && (data.assignedProjects || []).some((p) => p.id === prev)) {
          return prev;
        }
        return data.assignedProjects?.[0]?.id || null;
      });
    } catch (err) {
      setAppError(err.message);
    } finally {
      setLoadingApp(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  const loadAdminData = useCallback(async () => {
    if (!authToken || !canSeeAdmin) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      const [projects, users, stats] = await Promise.all([
        api.adminProjects(authToken),
        api.adminUsers(authToken),
        api.adminAnalytics(authToken),
      ]);
      setAdminProjects(projects || []);
      setAdminUsers(users || []);
      setAnalytics(stats || null);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  }, [authToken, canSeeAdmin]);

  useEffect(() => {
    if (activeView === "admin" && canSeeAdmin) {
      loadAdminData();
    }
  }, [activeView, canSeeAdmin, loadAdminData]);

  useEffect(() => {
    if (!canSeeAdmin && activeView === "admin") {
      setActiveView("user");
    }
  }, [activeView, canSeeAdmin]);

  useEffect(() => {
    setAppError("");
  }, [activeView, screen]);

  useEffect(() => {
    if (!actionMessage) return undefined;
    const timer = setTimeout(() => setActionMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  const resetUserForm = () => {
    setUserFormMode("create");
    setEditingUserId(null);
    setUserForm(emptyUserForm);
  };

  const startEditUser = (user) => {
    setUserFormMode("edit");
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      accessType: user.accessType,
      projectIds: (user.projects || []).map((p) => p.id),
    });
  };

  const handleUserFormChange = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleUserFormProject = (projectId) => {
    setUserForm((prev) => {
      const exists = prev.projectIds.includes(projectId);
      return {
        ...prev,
        projectIds: exists ? prev.projectIds.filter((id) => id !== projectId) : [...prev.projectIds, projectId],
      };
    });
  };

  const handleSubmitUserForm = async (event) => {
    event.preventDefault();
    if (!authToken) return;
    setAdminError("");
    try {
      if (userFormMode === "create") {
        await api.adminCreateUser(authToken, {
          ...userForm,
          projectIds: userForm.accessType === "PROJECTS" ? userForm.projectIds : [],
        });
      } else if (editingUserId) {
        const payload = {
          name: userForm.name,
          password: userForm.password,
          role: userForm.role,
          accessType: userForm.accessType,
          projectIds: userForm.accessType === "PROJECTS" ? userForm.projectIds : [],
        };
        await api.adminUpdateUser(authToken, editingUserId, payload);
      }
      await loadAdminData();
      await loadAppData();
      resetUserForm();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!authToken) return;
    try {
      await api.adminDeleteUser(authToken, userId);
      await loadAdminData();
      await loadAppData();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!authToken) return;
    setAdminError("");
    try {
      await api.adminCreateProject(authToken, newProjectForm);
      setNewProjectForm({ code: "", name: "" });
      await loadAdminData();
      await loadAppData();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  /* ================= Handlers ================= */

  // Master CRUD
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
      setAppError("Please sign in to save materials");
      return;
    }
    setAppError("");
    if (!draft.code.trim() || !draft.name.trim()) {
      setAppError("Code and Material are required");
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
      setActionMessage("Material saved");
    } catch (err) {
      setAppError(err.message);
    }

    setEditingId(null);
    setDraft(emptyMaterial);
  };

  const handleDeleteMaterial = async (id) => {
    if (!authToken) return;
    try {
      await api.deleteMaterial(authToken, id);
      await loadAppData();
    } catch (err) {
      setAppError(err.message);
    }
    if (editingId === id) {
      setEditingId(null);
      setDraft(emptyMaterial);
    }
  };

  // Open / close master "page"
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

  // Inwards handlers
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

  const handleInwardDeliveredQtyChange = (id, value) => {
    setInwardDeliveredQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveInward = async () => {
    if (!selectedProjectId || !authToken) return;
    setAppError("");

    const lines = inwardSelectedIds
      .map((id) => {
        const material = materials.find((m) => m.id === id);
        if (!material) return null;
        const orderedQtyVal = Number(inwardQty[id] || 0) || 0;
        const deliveredQtyVal = Number(inwardDeliveredQty[id] || 0) || 0;
        if (orderedQtyVal === 0 && deliveredQtyVal === 0) return null;
        return {
          materialId: id,
          orderedQty: orderedQtyVal,
          deliveredQty: deliveredQtyVal,
        };
      })
      .filter(Boolean);

    if (lines.length === 0) {
      setAppError("Enter ordered or delivered quantity");
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
      setActionMessage("Inward saved");
    } catch (err) {
      setAppError(err.message);
    }

    setInwardSelectedIds([]);
    setInwardQty({});
    setInwardDeliveredQty({});
    setInwardForm({ invoiceNo: "", invoiceDate: "", deliveryDate: "", vehicleNo: "", remarks: "", supplierName: "" });
    setInwardIsReturn(false);
  };

  // Outwards handlers (create)

  const handleToggleOutwardSelected = (id) => {
    setOutwardSelectedIds((prev) => {
      if (prev.includes(id)) {
        // Unselect -> clear Issue Qty
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

  // When Issue Qty input gets focus, auto-check the row
  const handleOutwardIssueQtyFocus = (id) => {
    setOutwardSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // When Issue Qty changes, auto-select if > 0, unselect if 0/empty
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
        const material = materials.find((m) => m.id === id);
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
      setAppError("Enter issue quantities");
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
      setActionMessage("Outward saved");
    } catch (err) {
      setAppError(err.message);
    }

    setOutwardSelectedIds([]);
    setOutwardIssueQty({});
    setIssueTo("");
    setOutwardStatus("OPEN");
    setOutwardCloseDate("");
    setOutwardMaterialToAdd("");
  };

  // Transfer handlers
  const handleToggleTransferSelected = (id) => {
    setTransferSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleTransferQtyChange = (id, value) => {
    setTransferQty((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveTransfer = async () => {
    if (!transferToProjectId || !authToken) {
      setAppError("Select a target project");
      return;
    }
    setAppError("");

    if (transferToProjectId === selectedProjectId) {
      const fromSite = transferFromSite.trim();
      const toSite = transferToSite.trim();
      if (!fromSite || !toSite) {
        setAppError("Enter from and to sites for same-project transfers");
        return;
      }
      if (fromSite.toLowerCase() === toSite.toLowerCase()) {
        setAppError("Source and destination sites must be different");
        return;
      }
    }

    const lines = transferSelectedIds
      .map((id) => ({ materialId: id, transferQty: Number(transferQty[id] || 0) }))
      .filter((line) => line.transferQty > 0);

    if (lines.length === 0) {
      setAppError("Select materials and quantities for transfer");
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
      setActionMessage("Transfer submitted");
    } catch (err) {
      setAppError(err.message);
    }
    setTransferSelectedIds([]);
    setTransferQty({});
    setTransferRemarks("");
    setTransferFromSite("");
    setTransferToSite("");
    setTransferToProjectId("");
  };

  // Outward history inline edit handlers
  const handleToggleOutwardHistory = (id) => {
    setExpandedOutwardHistoryId((prev) => (prev === id ? null : id));
    setEditingOutwardId(null);
    setOutwardHistoryDraft({});
    setOutwardMetaDraft({ status: "OPEN", closeDate: "" });
    setOutwardHistoryAddMaterialId("");
    setPendingOutwardNewLines((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleStartEditOutwardHistory = (record) => {
    if (record.status === "CLOSED") return; // editing disabled for closed records
    setEditingOutwardId(record.id);
    const draftLines = {};
    (record.lines || []).forEach((line) => {
      draftLines[line.id] =
        line.issueQty !== undefined && line.issueQty !== null ? String(line.issueQty) : "";
    });
    setOutwardHistoryDraft(draftLines);
    setOutwardMetaDraft({
      status: record.status || "OPEN", // default OPEN in select
      closeDate: record.closeDate || "",
    });
    setOutwardHistoryAddMaterialId("");
    setPendingOutwardNewLines((prev) => {
      const next = { ...prev };
      delete next[record.id];
      return next;
    });
  };

  const handleChangeOutwardHistoryLineQty = (lineId, value) => {
    setOutwardHistoryDraft((prev) => ({ ...prev, [lineId]: value }));
  };

  const handleChangeOutwardHistoryMeta = (field, value) => {
    setOutwardMetaDraft((prev) => {
      if (field === "status") {
        if (value === "CLOSED") {
          // snap to today's date and keep uneditable
          return { ...prev, status: "CLOSED", closeDate: getTodayIsoDate() };
        }
        if (value === "OPEN") {
          return { ...prev, status: "OPEN", closeDate: "" };
        }
      }
      return { ...prev, [field]: value };
    });
  };

  const handleCancelOutwardHistoryEdit = () => {
    setEditingOutwardId(null);
    setOutwardHistoryDraft({});
    setOutwardMetaDraft({ status: "OPEN", closeDate: "" });
    setOutwardHistoryAddMaterialId("");
    setPendingOutwardNewLines((prev) => {
      const next = { ...prev };
      if (expandedOutwardHistoryId) delete next[expandedOutwardHistoryId];
      return next;
    });
  };

  // NEW: Add material into the currently edited Outward record (history)
  const handleAddMaterialToOutwardHistory = () => {
    const recId = editingOutwardId;
    if (!recId || !outwardHistoryAddMaterialId) return;

    // If status marked CLOSED, block adding more materials
    if (outwardMetaDraft.status === "CLOSED") return;

    const rec = outwardHistory.find((r) => r.id === recId);
    if (!rec) return;
    const alreadyIds = new Set([
      ...(rec.lines || []).map((l) => l.materialId),
      ...((pendingOutwardNewLines[recId] || []).map((l) => l.materialId)),
    ]);

    if (alreadyIds.has(outwardHistoryAddMaterialId)) {
      setOutwardHistoryAddMaterialId("");
      return;
    }

    const mat = materials.find((m) => m.id === outwardHistoryAddMaterialId);
    if (!mat) return;

    const tmpId = `oh-tmp-${Date.now()}-${mat.id}`;
    const newLine = {
      id: tmpId,
      materialId: mat.id,
      code: mat.code,
      name: mat.name,
      unit: mat.unit,
      issueQty: 0,
    };

    setPendingOutwardNewLines((prev) => {
      const list = prev[recId] || [];
      return { ...prev, [recId]: [...list, newLine] };
    });
    setOutwardHistoryDraft((prev) => ({ ...prev, [tmpId]: "0" }));
    setOutwardHistoryAddMaterialId("");
  };

  const handleSaveOutwardHistoryEdit = async () => {
    if (!editingOutwardId || !authToken) return;
    setAppError("");

    const record = outwardHistory.find((rec) => rec.id === editingOutwardId);
    if (!record) return;

    const todayStr = getTodayIsoDate();
    const nextStatus = outwardMetaDraft.status || record.status;
    if (nextStatus === "OPEN") {
      const hasOtherOpen = outwardHistory.some(
        (rec) => rec.id !== record.id && rec.projectId === record.projectId && rec.date === record.date && rec.status === "OPEN"
      );
      if (hasOtherOpen) {
        setAppError("Close the other open register for this project/date before reopening.");
        return;
      }
    }
    const nextCloseDate = nextStatus === "CLOSED" ? outwardMetaDraft.closeDate || todayStr : "";

    const editedExisting = (record.lines || []).map((line) => ({
      lineId: line.id,
      materialId: line.materialId,
      issueQty:
        outwardHistoryDraft[line.id] !== undefined && outwardHistoryDraft[line.id] !== ""
          ? Number(outwardHistoryDraft[line.id])
          : Number(line.issueQty || 0),
    }));

    const pending = pendingOutwardNewLines[editingOutwardId] || [];
    const editedPending = pending
      .map((line) => ({
        lineId: null,
        materialId: line.materialId,
        issueQty:
          outwardHistoryDraft[line.id] !== undefined && outwardHistoryDraft[line.id] !== ""
            ? Number(outwardHistoryDraft[line.id])
            : Number(line.issueQty || 0),
      }))
      .filter((line) => line.issueQty > 0);

    const payloadLines = [...editedExisting, ...editedPending].filter((line) => line.issueQty > 0);
    if (payloadLines.length === 0) {
      setAppError("Enter issue quantities to save");
      return;
    }

    let updated = false;
    try {
      await api.updateOutward(authToken, editingOutwardId, {
        status: nextStatus,
        closeDate: nextCloseDate,
        issueTo: record.issueTo,
        lines: payloadLines,
      });
      await loadAppData();
      updated = true;
    } catch (err) {
      setAppError(err.message);
    }

    if (!updated) {
      return;
    }

    const wasClosed = outwardMetaDraft.status === "CLOSED";
    setEditingOutwardId(null);
    setOutwardHistoryDraft({});
    setOutwardMetaDraft({ status: "OPEN", closeDate: "" });
    setPendingOutwardNewLines((prev) => {
      const next = { ...prev };
      delete next[editingOutwardId];
      return next;
    });

    if (wasClosed) {
      setExpandedOutwardHistoryId(null);
    }
  };

  /* ================= Small UI helpers ================= */

  const SectionHeader = ({ title, isOpen, onToggle, rightContent }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px]">{isOpen ? "▾" : "▸"}</span>
        <span className="font-semibold text-slate-700">{title}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500">{rightContent}</div>
    </button>
  );

  /* ================= Render blocks ================= */

  const renderTabs = () => {
    const tabs = [
      { id: "bom", label: "BOM" },
      { id: "inward", label: "Inwards" },
      { id: "outward", label: "Outwards" },
      { id: "transfer", label: "Site Transfer" },
    ];

    return (
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex text-[11px] font-medium">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                "px-3 py-1 -mb-px border-b-[2px]" +
                (activeTab === tab.id
                  ? " border-sky-500 text-slate-900"
                  : " border-transparent text-slate-500 hover:text-slate-700")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* + icon goes to Master page */}
        <button
          type="button"
          onClick={handleOpenMaster}
          className="ml-2 flex items-center justify-center rounded border border-slate-300 px-2 py-[3px] text-[12px] text-slate-700 hover:bg-slate-50"
          title="Add / Manage materials (Master)"
        >
          ＋
        </button>
      </div>
    );
  };

  const renderLogin = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleLoginSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow"
      >
        <h1 className="mb-3 text-center text-lg font-semibold text-slate-800">Inventory Login</h1>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Email
          <input
            type="email"
            value={loginForm.email}
            onChange={(e) => handleLoginFormChange("email", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="mb-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Password
          <input
            type="password"
            value={loginForm.password}
            onChange={(e) => handleLoginFormChange("password", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        {loginError && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{loginError}</div>}
        <button
          type="submit"
          className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="mt-3 space-y-4 text-[12px]">
      {adminError && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{adminError}</div>}
      <div className="rounded border border-slate-200 p-3">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>Analytics</span>
          {adminLoading && <span className="text-[11px] text-slate-500">Refreshing…</span>}
        </div>
        <div className="mt-2 grid gap-3 text-center sm:grid-cols-5">
          {[
            { label: "Projects", value: analytics?.totalProjects ?? 0 },
            { label: "Materials", value: analytics?.totalMaterials ?? 0 },
            { label: "Users", value: analytics?.totalUsers ?? 0 },
            { label: "Received Qty", value: analytics?.totalReceivedQty ?? 0 },
            { label: "Utilized Qty", value: analytics?.totalUtilizedQty ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded border border-slate-100 bg-slate-50 p-2">
              <div className="text-xs uppercase text-slate-500">{item.label}</div>
              <div className="text-base font-semibold text-slate-800">{Number(item.value).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={handleCreateProject} className="rounded border border-slate-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Create project</h3>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Code
            <input
              type="text"
              value={newProjectForm.code}
              onChange={(e) => setNewProjectForm((prev) => ({ ...prev, code: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              required
            />
          </label>
          <label className="mb-3 block text-xs font-semibold text-slate-500">
            Name
            <input
              type="text"
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save Project
          </button>
        </form>

        <form onSubmit={handleSubmitUserForm} className="rounded border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>{userFormMode === "edit" ? "Edit user" : "Create user"}</span>
            {userFormMode === "edit" && (
              <button type="button" onClick={resetUserForm} className="text-xs text-sky-600">
                Reset
              </button>
            )}
          </div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Name
            <input
              type="text"
              value={userForm.name}
              onChange={(e) => handleUserFormChange("name", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              required
            />
          </label>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Email
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => handleUserFormChange("email", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              required
              disabled={userFormMode === "edit"}
            />
          </label>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            {userFormMode === "edit" ? "New Password" : "Password"}
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => handleUserFormChange("password", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              required={userFormMode === "create"}
            />
          </label>
          <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
            <label className="block font-semibold text-slate-500">
              Role
              <select
                value={userForm.role}
                onChange={(e) => handleUserFormChange("role", e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label className="block font-semibold text-slate-500">
              Access
              <select
                value={userForm.accessType}
                onChange={(e) => handleUserFormChange("accessType", e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              >
                <option value="PROJECTS">Specific Projects</option>
                <option value="ALL">All Projects</option>
              </select>
            </label>
          </div>
          {userForm.accessType === "PROJECTS" && (
            <div className="mb-3 rounded border border-slate-200 p-2">
              <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Project Access</div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {adminProjects.map((proj) => (
                  <label key={proj.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={userForm.projectIds.includes(proj.id)}
                      onChange={() => toggleUserFormProject(proj.id)}
                    />
                    <span>
                      {proj.code} – {proj.name}
                    </span>
                  </label>
                ))}
                {adminProjects.length === 0 && (
                  <span className="text-slate-400">No projects</span>
                )}
              </div>
            </div>
          )}
          <button
            type="submit"
            className="rounded bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700"
          >
            {userFormMode === "edit" ? "Update" : "Create"} User
          </button>
        </form>
      </div>

      <div className="rounded border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>Existing users</span>
          <span className="text-[11px] text-slate-500">{adminUsers.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1 text-left">Name</th>
                <th className="border border-slate-200 px-2 py-1 text-left">Email</th>
                <th className="border border-slate-200 px-2 py-1 text-left">Role</th>
                <th className="border border-slate-200 px-2 py-1 text-left">Access</th>
                <th className="border border-slate-200 px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => (
                <tr key={user.id}>
                  <td className="border border-slate-200 px-2 py-1">{user.name}</td>
                  <td className="border border-slate-200 px-2 py-1">{user.email}</td>
                  <td className="border border-slate-200 px-2 py-1">{user.role}</td>
                  <td className="border border-slate-200 px-2 py-1">
                    {user.accessType === "ALL"
                      ? "All Projects"
                      : (user.projects || []).map((p) => p.code).join(", ") || "-"}
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => startEditUser(user)}
                      className="mr-1 text-xs text-sky-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-xs text-red-600"
                      disabled={user.email === currentUser?.email}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {adminUsers.length === 0 && (
                <tr>
                  <td className="border border-slate-200 px-2 py-3 text-center text-slate-400" colSpan={5}>
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMasterTable = () => {
    const emptyRowCount = Math.max(0, pageSize - masterPageItems.length);

    return (
      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Master materials</span>
          {masterManageMode && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-[2px] text-[10px] text-slate-700 hover:bg-slate-50"
            >
              <span>＋</span>
              <span>New</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Material</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Part No.</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Line Type</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Unit</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Category</th>
                {masterManageMode && (
                  <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* New row (when adding) */}
              {masterManageMode && editingId === "new" && (
                <tr>
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="text"
                      value={draft.code}
                      onChange={(e) => handleDraftChange("code", e.target.value)}
                      className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => handleDraftChange("name", e.target.value)}
                      className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="text"
                      value={draft.partNo}
                      onChange={(e) => handleDraftChange("partNo", e.target.value)}
                      className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="text"
                      value={draft.lineType}
                      onChange={(e) => handleDraftChange("lineType", e.target.value)}
                      className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="text"
                      value={draft.unit}
                      onChange={(e) => handleDraftChange("unit", e.target.value)}
                      className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="text"
                      value={draft.category}
                      onChange={(e) => handleDraftChange("category", e.target.value)}
                      className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-center text-[10px]">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="mr-1 rounded border border-emerald-500 px-2 py-[2px] text-emerald-700 hover:bg-emerald-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded border border-slate-300 px-2 py-[2px] text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}

              {masterPageItems.map((m) => {
                const isEditing = masterManageMode && editingId === m.id;
                return (
                  <tr key={m.id}>
                    <td className="border border-slate-200 px-2 py-1 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.code}
                          onChange={(e) => handleDraftChange("code", e.target.value)}
                          className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                        />
                      ) : (
                        m.code
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => handleDraftChange("name", e.target.value)}
                          className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                        />
                      ) : (
                        m.name
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.partNo}
                          onChange={(e) => handleDraftChange("partNo", e.target.value)}
                          className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                        />
                      ) : (
                        m.partNo
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.lineType}
                          onChange={(e) => handleDraftChange("lineType", e.target.value)}
                          className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                        />
                      ) : (
                        m.lineType
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.unit}
                          onChange={(e) => handleDraftChange("unit", e.target.value)}
                          className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                        />
                      ) : (
                        m.unit
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.category}
                          onChange={(e) => handleDraftChange("category", e.target.value)}
                          className="w-full rounded border border-slate-300 px-1 py-[2px] text-[11px]"
                        />
                      ) : (
                        m.category
                      )}
                    </td>
                    {masterManageMode && (
                      <td className="border border-slate-200 px-2 py-1 text-center text-[10px]">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveDraft}
                              className="mr-1 rounded border border-emerald-500 px-2 py-[2px] text-emerald-700 hover:bg-emerald-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="rounded border border-slate-300 px-2 py-[2px] text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(m)}
                              className="mr-1 rounded border border-slate-300 px-2 py-[2px] text-slate-700 hover:bg-slate-50"
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="rounded border border-red-400 px-2 py-[2px] text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`master-empty-${idx}`}>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  {masterManageMode && <td className="border border-slate-200 px-2 py-1">&nbsp;</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px]">
          <button
            type="button"
            disabled={masterPage === 1}
            onClick={() => setMasterPage((p) => Math.max(1, p - 1))}
            className={
              "rounded border px-2 py-[2px]" +
              (masterPage === 1
                ? " cursor-not-allowed border-slate-200 text-slate-300"
                : " border-slate-300 text-slate-700 hover:bg-slate-50")
            }
          >
            Prev
          </button>
          <span className="px-1 text-slate-500">
            {masterPage} / {masterTotalPages}
          </span>
          <button
            type="button"
            disabled={masterPage === masterTotalPages}
            onClick={() => setMasterPage((p) => Math.min(masterTotalPages, p + 1))}
            className={
              "rounded border px-2 py-[2px]" +
              (masterPage === masterTotalPages
                ? " cursor-not-allowed border-slate-200 text-slate-300"
                : " border-slate-300 text-slate-700 hover:bg-slate-50")
            }
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  /* ---------- BOM tab (current + Inwards history collapse) ---------- */

  const renderBomCurrent = () => {
    const rows = bomItems.map((item) => {
      const material = materials.find((m) => m.code === item.code);
      const orderedQty = material?.orderedQty ?? 0;
      const receivedQty = material?.receivedQty ?? 0;
      const utilizedQty = material?.utilizedQty ?? 0;
      const balanceQty = getInStock(material);

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit || material?.unit || "",
        category: material?.category || "",
        requiredQty: item.qty,
        orderedQty,
        receivedQty,
        utilizedQty,
        balanceQty,
      };
    });

    const emptyRowCount = Math.max(0, 10 - rows.length);

    return (
      <div className="mt-1">
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Material</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Unit</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Category</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Required</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Ordered</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Received</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Issued</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-200 px-2 py-1 font-mono">{row.code}</td>
                  <td className="border border-slate-200 px-2 py-1">{row.name}</td>
                  <td className="border border-slate-200 px-2 py-1">{row.unit}</td>
                  <td className="border border-slate-200 px-2 py-1">{row.category}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{row.requiredQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{row.orderedQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{row.receivedQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{row.utilizedQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{row.balanceQty}</td>
                </tr>
              ))}

              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`bom-empty-${idx}`}>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Inwards history under BOM tab — Action column removed; click Code toggles
  const renderBomHistory = () => {
    const rows = inwardHistory.filter((row) => !row.projectId || row.projectId === selectedProjectId);

    return (
      <div className="mt-1">
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Inw. Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Date</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Invoice No</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Items</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpanded = expandedInwardHistoryId === row.id;
                const lines = row.lines || [];
                return (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td className="border border-slate-200 px-2 py-1 font-mono">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedInwardHistoryId((prev) => (prev === row.id ? null : row.id))
                          }
                          className="underline decoration-dotted text-sky-700 hover:text-sky-900"
                          title="View details"
                        >
                          {row.code}
                        </button>
                      </td>
                      <td className="border border-slate-200 px-2 py-1">{row.date}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.invoiceNo}</td>
                      <td className="border border-slate-200 px-2 py-1 text-right">{row.items}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="border border-slate-200 bg-slate-50 px-2 py-2">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1 text-[10px] md:grid-cols-4">
                              <div>
                                <div className="text-[10px] text-slate-500">Inw. Code</div>
                                <div className="font-mono">{row.code}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">Date</div>
                                <div>{row.date}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">Invoice No</div>
                                <div>{row.invoiceNo}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">Items</div>
                                <div>{row.items}</div>
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white">
                              <table className="min-w-full border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Code</th>
                                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Material</th>
                                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Unit</th>
                                    <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                                      Ordered
                                    </th>
                                    <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                                      Del. Qty.
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((line) => (
                                    <tr key={line.id}>
                                      <td className="border border-slate-200 px-2 py-1 font-mono">{line.code}</td>
                                      <td className="border border-slate-200 px-2 py-1">{line.name}</td>
                                      <td className="border border-slate-200 px-2 py-1">{line.unit}</td>
                                      <td className="border border-slate-200 px-2 py-1 text-right">
                                        {line.orderedQty}
                                      </td>
                                      <td className="border border-slate-200 px-2 py-1 text-right">
                                        {line.deliveredQty}
                                      </td>
                                    </tr>
                                  ))}
                                  {lines.length === 0 && (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="border border-slate-200 px-2 py-1 text-center text-[10px] text-slate-400"
                                      >
                                        No line details
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-200 px-2 py-1 text-center text-[10px] text-slate-400"
                  >
                    No Inward history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBomTab = () => (
    <div className="mt-2 space-y-1">
      <SectionHeader
        title="BOM"
        isOpen={bomSectionOpen === "current"}
        onToggle={() => setBomSectionOpen("current")}
        rightContent={
          <button
            type="button"
            onClick={handleOpenMaster}
            className="flex items-center gap-1 rounded border border-slate-300 px-2 py-[2px]"
          >
            <span className="text-[11px]">＋</span>
            <span>Master</span>
          </button>
        }
      />
      {bomSectionOpen === "current" && renderBomCurrent()}

      <SectionHeader
        title="Inwards History"
        isOpen={bomSectionOpen === "history"}
        onToggle={() => setBomSectionOpen("history")}
      />
      {bomSectionOpen === "history" && renderBomHistory()}
    </div>
  );

  /* ---------- Inward tab ---------- */

  const renderInwardCurrent = () => {
    const emptyRowCount = Math.max(0, pageSize - materialsForProject.length);

    return (
      <div className="mt-1 space-y-2">
        {/* Meta form */}
        <div className="grid grid-cols-2 gap-1 text-[11px] md:grid-cols-4 lg:grid-cols-8">
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Code</div>
            <input
              type="text"
              value={inwardCode}
              disabled
              className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-[3px] font-mono text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Invoice No</div>
            <input
              type="text"
              value={inwardForm.invoiceNo}
              onChange={(e) => handleInwardFormChange("invoiceNo", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Invoice Date</div>
            <input
              type="date"
              value={inwardForm.invoiceDate}
              onChange={(e) => handleInwardFormChange("invoiceDate", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Received Date</div>
            <input
              type="date"
              value={inwardForm.deliveryDate}
              onChange={(e) => handleInwardFormChange("deliveryDate", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Veh. No.</div>
            <input
              type="text"
              value={inwardForm.vehicleNo}
              onChange={(e) => handleInwardFormChange("vehicleNo", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Supplier</div>
            <input
              type="text"
              value={inwardForm.supplierName}
              onChange={(e) => handleInwardFormChange("supplierName", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Remarks</div>
            <input
              type="text"
              value={inwardForm.remarks}
              onChange={(e) => handleInwardFormChange("remarks", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Type</div>
            <select
              value={inwardIsReturn ? "RETURN" : "SUPPLY"}
              onChange={(e) => setInwardIsReturn(e.target.value === "RETURN")}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            >
              <option value="SUPPLY">Supply</option>
              <option value="RETURN">Return</option>
            </select>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-slate-500">
            Sel: <span className="font-semibold text-slate-800">{inwardSelectedIds.length}</span>
          </div>
          <button
            type="button"
            onClick={handleSaveInward}
            className="inline-flex items-center gap-1 rounded border border-emerald-500 px-2 py-[3px] text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <span>➕</span>
            <span>Inward</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1">
                  <input type="checkbox" disabled />
                </th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Material</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Unit</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Ordered</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Del. Qty.</th>
              </tr>
            </thead>
            <tbody>
              {materialsForProject.map((m) => (
                <tr key={m.id}>
                  <td className="border border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={inwardSelectedIds.includes(m.id)}
                      onChange={() => handleToggleInwardSelected(m.id)}
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1 font-mono">{m.code}</td>
                  <td className="border border-slate-200 px-2 py-1">{m.name}</td>
                  <td className="border border-slate-200 px-2 py-1">{m.unit}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    <input
                      type="number"
                      min="0"
                      value={inwardQty[m.id] ?? ""}
                      onFocus={() => handleInwardQtyFocus(m.id)}
                      onChange={(e) => handleInwardQtyChange(m.id, e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-[3px] text-right text-[11px]"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    <input
                      type="number"
                      min="0"
                      value={inwardDeliveredQty[m.id] ?? ""}
                      onFocus={() => handleInwardQtyFocus(m.id)}
                      onChange={(e) => handleInwardDeliveredQtyChange(m.id, e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-[3px] text-right text-[11px]"
                    />
                  </td>
                </tr>
              ))}
              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`inward-empty-${idx}`}>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInwardTab = () => (
    <div className="mt-2 space-y-1">
      <SectionHeader
        title="Inwards"
        isOpen={inwardSectionOpen}
        onToggle={() => setInwardSectionOpen((prev) => !prev)}
      />
      {inwardSectionOpen && renderInwardCurrent()}
    </div>
  );

  /* ---------- Outward tab (current + history) ---------- */

  const renderOutwardCurrent = () => {
    const emptyRowCount = Math.max(0, pageSize - materialsForProject.length);

    return (
      <div className="mt-1 space-y-2">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-1 text-[11px] md:grid-cols-4 lg:grid-cols-6">
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Code</div>
            <input
              type="text"
              value={outwardCode}
              disabled
              className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-[3px] font-mono text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Issue to</div>
            <input
              type="text"
              value={issueTo}
              onChange={(e) => setIssueTo(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Status</div>
            <select
              value={outwardStatus}
              onChange={(e) => {
                const value = e.target.value;
                setOutwardStatus(value);
                // Snap close date to today when closing, and keep it uneditable
                if (value === "CLOSED") {
                  setOutwardCloseDate(getTodayIsoDate());
                } else {
                  setOutwardCloseDate("");
                }
              }}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            >
              <option value="OPEN">Open</option>
              <option value="CLOSED">Close</option>
            </select>
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Close Date</div>
            {/* Always disabled; auto-filled when status becomes CLOSED */}
            <input
              type="date"
              value={outwardCloseDate}
              disabled
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-slate-500">
            Sel: <span className="font-semibold text-slate-800">{outwardSelectedIds.length}</span>
          </div>
          <button
            type="button"
            onClick={handleSaveOutward}
            className="inline-flex items-center gap-1 rounded border border-sky-500 px-2 py-[3px] text-[10px] font-semibold text-sky-700 hover:bg-sky-50"
          >
            <span>➕</span>
            <span>Outward</span>
          </button>
        </div>

        {/* Add material via dropdown */}
        <div className="flex items-center justify-end gap-1 text-[10px]">
          <span className="text-slate-500">Add material</span>
          <select
            value={outwardMaterialToAdd}
            onChange={(e) => setOutwardMaterialToAdd(e.target.value)}
            className="w-auto rounded border border-slate-300 px-2 py-[3px] text-[11px]"
          >
            <option value="">Select material</option>
            {materialsForProject.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} – {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddOutwardMaterial}
            className="inline-flex items-center rounded border border-slate-300 px-2 py-[3px] text-[10px] text-slate-700 hover:bg-slate-50"
          >
            Add
          </button>
        </div>

        {/* Table: only In-stock + Issue Qty (no Reqd / Ord / Rec / Util columns) */}
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1">
                  <input type="checkbox" disabled />
                </th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Material</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Unit</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">In Stk. Qty.</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Issued</th>
              </tr>
            </thead>
            <tbody>
              {materialsForProject.map((m) => (
                <tr key={m.id}>
                  <td className="border border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={outwardSelectedIds.includes(m.id)}
                      onChange={() => handleToggleOutwardSelected(m.id)}
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1 font-mono">{m.code}</td>
                  <td className="border border-slate-200 px-2 py-1">{m.name}</td>
                  <td className="border border-slate-200 px-2 py-1">{m.unit}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{getInStock(m)}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    <input
                      type="number"
                      min="0"
                      value={outwardIssueQty[m.id] ?? ""}
                      onFocus={() => handleOutwardIssueQtyFocus(m.id)}
                      onChange={(e) => handleOutwardIssueQtyChange(m.id, e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-[3px] text-right text-[11px]"
                    />
                  </td>
                </tr>
              ))}
              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`outward-empty-${idx}`}>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOutwardHistory = () => {
    const rows = outwardHistory.filter((row) => !row.projectId || row.projectId === selectedProjectId);

    return (
      <div className="mt-1">
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Out. Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Date</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Issue to</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Status</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Close Date</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Items</th>
                <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpanded = expandedOutwardHistoryId === row.id;
                const isEditing = editingOutwardId === row.id;
                const lines = row.lines || [];

                const effectiveStatus = isEditing ? outwardMetaDraft.status : row.status;
                const effectiveCloseDate = isEditing ? outwardMetaDraft.closeDate : row.closeDate;

                // lines to render: existing + pending new (when editing)
                const pending = isEditing ? pendingOutwardNewLines[row.id] || [] : [];
                const linesToRender = isEditing ? [...lines, ...pending] : lines;

                return (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td className="border border-slate-200 px-2 py-1 font-mono">
                        <button
                          type="button"
                          onClick={() => handleToggleOutwardHistory(row.id)}
                          className="underline decoration-dotted text-sky-700 hover:text-sky-900"
                          title="Toggle details"
                        >
                          {row.code}
                        </button>
                      </td>
                      <td className="border border-slate-200 px-2 py-1">{row.date}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.issueTo}</td>
                      <td className="border border-slate-200 px-2 py-1">
                        {row.status === "CLOSED" ? "Closed" : "Open"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">{row.closeDate || "-"}</td>
                      <td className="border border-slate-200 px-2 py-1 text-right">{row.items}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        <button
                          type="button"
                          disabled={row.status === "CLOSED"}
                          onClick={() => handleStartEditOutwardHistory(row)}
                          className={
                            "rounded border px-2 py-[2px] text-[10px] " +
                            (row.status === "CLOSED"
                              ? "cursor-not-allowed border-slate-200 text-slate-300"
                              : "border-slate-300 text-slate-700 hover:bg-slate-50")
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="border border-slate-200 bg-slate-50 px-2 py-2">
                          <div className="space-y-2">
                            <div className="mb-1 flex items-center justify-between text-[10px]">
                              <div className="font-semibold text-slate-700">Outward Details – {row.code}</div>
                              <div className="flex items-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleSaveOutwardHistoryEdit}
                                      className="rounded border border-emerald-500 px-2 py-[2px] text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelOutwardHistoryEdit}
                                      className="rounded border border-slate-300 px-2 py-[2px] text-slate-600 hover:bg-slate-50"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={row.status === "CLOSED"}
                                    onClick={() => handleStartEditOutwardHistory(row)}
                                    className={
                                      "rounded border px-2 py-[2px] " +
                                      (row.status === "CLOSED"
                                        ? "cursor-not-allowed border-slate-200 text-slate-300"
                                        : "border-slate-300 text-slate-700 hover:bg-slate-50")
                                    }
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[10px] md:grid-cols-4">
                              <div>
                                <div className="text-[10px] text-slate-500">Out. Code</div>
                                <div className="font-mono">{row.code}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">Date</div>
                                <div>{row.date}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">Issue to</div>
                                <div>{row.issueTo}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-500">Status / Close Date</div>
                                {isEditing ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <select
                                      value={outwardMetaDraft.status}
                                      onChange={(e) =>
                                        handleChangeOutwardHistoryMeta("status", e.target.value)
                                      }
                                      className="rounded border border-slate-300 px-2 py-[2px] text-[10px]"
                                    >
                                      <option value="OPEN">Open</option>
                                      <option value="CLOSED">Close</option>
                                    </select>
                                    <input
                                      type="date"
                                      value={
                                        outwardMetaDraft.status === "CLOSED"
                                          ? outwardMetaDraft.closeDate || getTodayIsoDate()
                                          : ""
                                      }
                                      disabled
                                      className="rounded border border-slate-300 px-2 py-[2px] text-[10px]"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    {effectiveStatus === "CLOSED" ? "Closed" : "Open"}
                                    {effectiveStatus === "CLOSED" && effectiveCloseDate
                                      ? ` – ${effectiveCloseDate}`
                                      : ""}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* NEW: Add material control in edit mode (only if OPEN) */}
                            {isEditing && outwardMetaDraft.status === "OPEN" && (
                              <div className="flex items-center justify-end gap-1 text-[10px]">
                                <span className="text-slate-500">Add material</span>
                                <select
                                  value={outwardHistoryAddMaterialId}
                                  onChange={(e) => setOutwardHistoryAddMaterialId(e.target.value)}
                                  className="w-auto rounded border border-slate-300 px-2 py-[2px] text-[10px]"
                                >
                                  <option value="">Select material</option>
                                  {materialsForProject.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.code} – {m.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={handleAddMaterialToOutwardHistory}
                                  className="inline-flex items-center rounded border border-slate-300 px-2 py-[2px] text-[10px] text-slate-700 hover:bg-slate-50"
                                >
                                  Add
                                </button>
                              </div>
                            )}

                            <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white">
                              <table className="min-w-full border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                                      Code
                                    </th>
                                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                                      Material
                                    </th>
                                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold">
                                      Unit
                                    </th>
                                    <th className="border border-slate-200 px-2 py-1 text-right font-semibold">
                                      Issued
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {linesToRender.map((line) => (
                                    <tr key={line.id}>
                                      <td className="border border-slate-200 px-2 py-1 font-mono">{line.code}</td>
                                      <td className="border border-slate-200 px-2 py-1">{line.name}</td>
                                      <td className="border border-slate-200 px-2 py-1">{line.unit}</td>
                                      <td className="border border-slate-200 px-2 py-1 text-right">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            min="0"
                                            value={
                                              outwardHistoryDraft[line.id] ??
                                              (typeof line.issueQty === "number"
                                                ? String(line.issueQty)
                                                : "")
                                            }
                                            onChange={(e) =>
                                              handleChangeOutwardHistoryLineQty(line.id, e.target.value)
                                            }
                                            className="w-full rounded border border-slate-300 px-2 py-[2px] text-right text-[11px]"
                                          />
                                        ) : (
                                          line.issueQty
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {linesToRender.length === 0 && (
                                    <tr>
                                      <td
                                        colSpan={4}
                                        className="border border-slate-200 px-2 py-1 text-center text-[10px] text-slate-400"
                                      >
                                        No line details
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="border border-slate-200 px-2 py-1 text-center text-[10px] text-slate-400"
                  >
                    No Outward history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOutwardTab = () => (
    <div className="mt-2 space-y-1">
      <SectionHeader
        title="Outwards"
        isOpen={outwardSectionOpen === "current"}
        onToggle={() => setOutwardSectionOpen("current")}
      />
      {outwardSectionOpen === "current" && renderOutwardCurrent()}

      <SectionHeader
        title="Outwards History"
        isOpen={outwardSectionOpen === "history"}
        onToggle={() => setOutwardSectionOpen("history")}
      />
      {outwardSectionOpen === "history" && renderOutwardHistory()}
    </div>
  );

  /* ---------- Site transfer tab ---------- */

  const renderTransferTab = () => {
    const availableProjects = allProjects || [];
    const emptyRowCount = Math.max(0, pageSize - materialsForProject.length);

    if (!selectedProject || availableProjects.length === 0) {
      return (
        <div className="mt-2 text-[11px] text-slate-500">
          Site-to-site transfer requires at least one project selection.
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-2">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-1 text-[11px] md:grid-cols-3 lg:grid-cols-6">
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">Code</div>
            <input
              type="text"
              value={transferCode}
              disabled
              className="w-full rounded border border-slate-300 bg-slate-50 px-2 py-[3px] font-mono text-[11px]"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">From Project</div>
            <div className="rounded border border-slate-200 bg-slate-50 px-2 py-[3px] text-[11px]">
              {selectedProject ? `${selectedProject.code} – ${selectedProject.name}` : "Select project"}
            </div>
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">From Site</div>
            <input
              type="text"
              value={transferFromSite}
              onChange={(e) => setTransferFromSite(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
              placeholder="Site name / area"
            />
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">To Project</div>
            <select
              value={transferToProjectId}
              onChange={(e) => setTransferToProjectId(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            >
              <option value="">Select project</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} – {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-[2px] text-[10px] text-slate-500">To Site</div>
            <input
              type="text"
              value={transferToSite}
              onChange={(e) => setTransferToSite(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
              placeholder="Destination site"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-2">
            <div className="mb-[2px] text-[10px] text-slate-500">Remarks</div>
            <input
              type="text"
              value={transferRemarks}
              onChange={(e) => setTransferRemarks(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-[3px] text-[11px]"
            />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-slate-500">
            Sel: <span className="font-semibold text-slate-800">{transferSelectedIds.length}</span>
          </div>
          <button
            type="button"
            onClick={handleSaveTransfer}
            disabled={!transferToProjectId || transferSelectedIds.length === 0}
            className={
              "inline-flex items-center gap-1 rounded border px-2 py-[3px] text-[10px] font-semibold " +
              (!transferToProjectId || transferSelectedIds.length === 0
                ? "cursor-not-allowed border-slate-200 text-slate-300"
                : "border-indigo-500 text-indigo-700 hover:bg-indigo-50")
            }
          >
            <span>🔁</span>
            <span>Transfer</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-sm border border-slate-200">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1">
                  <input type="checkbox" disabled />
                </th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Code</th>
                <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Material</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Required</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Ordered</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Received</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Issued</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Stock</th>
                <th className="border border-slate-200 px-2 py-1 text-right font-semibold">Transfer Quantity</th>
              </tr>
            </thead>
            <tbody>
              {materialsForProject.map((m) => (
                <tr key={m.id}>
                  <td className="border border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={transferSelectedIds.includes(m.id)}
                      onChange={() => handleToggleTransferSelected(m.id)}
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1 font-mono">{m.code}</td>
                  <td className="border border-slate-200 px-2 py-1">{m.name}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{m.requiredQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{m.orderedQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{m.receivedQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{m.utilizedQty}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">{getInStock(m)}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right">
                    <input
                      type="number"
                      min="0"
                      value={transferQty[m.id] ?? ""}
                      onChange={(e) => handleTransferQtyChange(m.id, e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-[3px] text-right text-[11px]"
                    />
                  </td>
                </tr>
              ))}
              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`transfer-empty-${idx}`}>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ---------- Master page ---------- */

  const renderMasterPage = () => (
    <div className="pt-2">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <div className="text-slate-500">Create / edit / delete materials in master.</div>
        <button
          type="button"
          onClick={handleBackFromMaster}
          className="rounded border border-slate-300 px-2 py-[3px] text-[10px] text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>
      {renderMasterTable()}
    </div>
  );

  /* ================= Main render ================= */

  if (!authToken) {
    return renderLogin();
  }

  const headerTitle = activeView === "admin" ? "Admin Dashboard" : screen === "master" ? "Material Master" : "Project Inventory";

  const renderUserWorkspace = () => {
    if (screen === "master") {
      return renderMasterPage();
    }
    if (!selectedProject) {
      return <div className="text-[11px] text-slate-500">No project assigned.</div>;
    }
    return (
      <>
        {renderTabs()}
        <div className="pt-2">
          {activeTab === "bom" && renderBomTab()}
          {activeTab === "inward" && renderInwardTab()}
          {activeTab === "outward" && renderOutwardTab()}
          {activeTab === "transfer" && renderTransferTab()}
        </div>
      </>
    );
  };

  const bodyContent = activeView === "admin" ? renderAdminDashboard() : renderUserWorkspace();

  return (
    <div className="min-h-screen bg-slate-100 p-2 text-[11px] text-slate-800 sm:p-4">
      <div className="mx-auto max-w-6xl rounded border border-slate-200 bg-white p-3 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-800">{headerTitle}</div>
            {activeView !== "admin" && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span>Project</span>
                {showProjectDropdown ? (
                  <select
                    value={selectedProjectId || ""}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-[3px]"
                  >
                    {assignedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} – {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded border border-slate-200 bg-slate-50 px-2 py-[3px]">
                    {selectedProject ? `${selectedProject.code} – ${selectedProject.name}` : "Select project"}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
              {currentUser?.name} ({currentUser?.role})
            </span>
            {canSeeAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("user");
                  }}
                  className={`rounded px-2 py-1 ${
                    activeView === "user" ? "bg-sky-600 text-white" : "border border-slate-300"
                  }`}
                >
                  User Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScreen("main");
                    setActiveView("admin");
                  }}
                  className={`rounded px-2 py-1 ${
                    activeView === "admin" ? "bg-sky-600 text-white" : "border border-slate-300"
                  }`}
                >
                  Admin Dashboard
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>

        {loadingApp && (
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Syncing latest data…
          </div>
        )}
        {appError && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{appError}</div>
        )}
        {actionMessage && (
          <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
            {actionMessage}
          </div>
        )}

        <div className="pt-3">{bodyContent}</div>
      </div>
    </div>
  );
}
