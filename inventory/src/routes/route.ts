// src/routes/route.ts
import type { ElementType } from "react";

// Workspace pages
import BomPage from "../pages/workspace/BomPage";
import InwardPage from "../pages/workspace/InwardPage";
import OutwardPage from "../pages/workspace/OutwardPage";
import TransferPage from "../pages/workspace/TransferPage";
import InwardHistoryPage from "../pages/workspace/InwardHistoryPage";
import InwardHistoryDetailPage from "../pages/workspace/InwardHistoryDetailPage";
import OutwardHistoryPage from "../pages/workspace/OutwardHistoryPage";
import OutwardHistoryDetailPage from "../pages/workspace/OutwardHistoryDetailPage";
import TransferHistoryPage from "../pages/workspace/TransferHistoryPage";
import TransferHistoryDetailPage from "../pages/workspace/TransferHistoryDetailPage";
import ProcurementPage from "../pages/workspace/ProcurementPage";
import MasterPage from "../pages/workspace/MasterPage";

// Admin pages
import MaterialDirectoryPage from "../pages/admin/MaterialDirectoryPage";
import MaterialAllocationsPage from "../pages/admin/MaterialAllocationsPage";
import AllocatedMaterialsPage from "../pages/admin/AllocatedMaterialsPage";
import ProjectManagementPage from "../pages/admin/ProjectManagementPage";
import UserManagementPage from "../pages/admin/UserManagementPage";

// ----- Route types -----

export interface IRouteConfig {
  path: string;              // path relative to parent (for nested routes)
  component: ElementType;
  layout?: ElementType;      // optional layout wrapper, if you want to use it later
}

// ----- Path constants -----

export const loginPath = "/";
export const workspacePath = "/workspace";
export const adminBasePath = "/admin";
export const adminMaterialsPath = "/admin/materials";

// ----- Workspace nested routes (/workspace/...) -----

export const workspaceRoutes: IRouteConfig[] = [
  { path: "bom", component: BomPage },
  { path: "inward", component: InwardPage },
  { path: "inward/history", component: InwardHistoryPage },
  { path: "inward/history/:recordId", component: InwardHistoryDetailPage },
  { path: "outward", component: OutwardPage },
  { path: "outward/history", component: OutwardHistoryPage },
  { path: "outward/history/:recordId", component: OutwardHistoryDetailPage },
  { path: "transfer", component: TransferPage },
  { path: "transfer/history", component: TransferHistoryPage },
  { path: "transfer/history/:recordId", component: TransferHistoryDetailPage },
  { path: "procurement", component: ProcurementPage },
  { path: "master", component: MasterPage },
];

// ----- Admin nested routes (/admin/...) -----

export const adminRoutes: IRouteConfig[] = [
  { path: "materials", component: MaterialDirectoryPage },
  { path: "allocations", component: MaterialAllocationsPage },
  { path: "allocated", component: AllocatedMaterialsPage },
  { path: "projects", component: ProjectManagementPage },
  { path: "users", component: UserManagementPage },
];
