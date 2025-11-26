/* eslint-disable @typescript-eslint/no-explicit-any */
import { Get, Post, Put, Delete } from "../utils/apiService";

// ---- Query string helper (same logic as before, but typed) ----
const toQueryString = (params: Record<string, any> = {}): string => {
  const parts: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          parts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`
          );
        }
      });
      return;
    }

    if (value === "") {
      return;
    }

    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );
  });

  return parts.length ? `?${parts.join("&")}` : "";
};

// Small helpers to get back JSON data (instead of full AxiosResponse)
async function postJson<T = any, D = any>(
  endPoint: string,
  data?: D
): Promise<T> {
  const res = await Post<T, D>(endPoint, data);
  return res.data;
}

async function putJson<T = any, D = any>(
  endPoint: string,
  data: D
): Promise<T> {
  return await Put<T, D>(endPoint, data);
}

// ---- API object (same shape as your old one) ----

export const api = {
  // Auth
  login: (payload: any): Promise<any> =>
    postJson("/auth/login", payload),

  // For session we still accept a token param because restoreSession uses it
  // We pass it explicitly as X-Auth-Token; if none, interceptor uses Redux token.
  session: (token: string | null): Promise<any> =>
    Get("/auth/session", undefined, {
      headers: token ? { "X-Auth-Token": token } : undefined,
    }),

  logout: (_token: string | null): Promise<any> =>
    postJson("/auth/logout"),

  // App bootstrap
  bootstrap: (_token: string): Promise<any> =>
    Get("/app/bootstrap"),

  // Materials
  listMaterials: (_token: string, params: any): Promise<any> =>
    Get(`/materials${toQueryString(params)}`),

  searchMaterials: (_token: string, params: any): Promise<any> =>
    Get(`/materials/search${toQueryString(params)}`),

  createMaterial: (_token: string, payload: any): Promise<any> =>
    postJson("/materials", payload),

  updateMaterial: (
    _token: string,
    id: string | number,
    payload: any
  ): Promise<any> =>
    putJson(`/materials/${id}`, payload),

  deleteMaterial: (_token: string, id: string | number): Promise<any> =>
    Delete(`/materials/${id}`),

  importMaterials: (_token: string, file: File): Promise<any> => {
    const form = new FormData();
    form.append("file", file);
    return postJson("/materials/import", form);
  },

  exportMaterials: (_token: string): Promise<Blob> =>
    Get<Blob, void>("/materials/export", undefined, {
      responseType: "blob",
    }),

  // Inward / Outward / Transfer
  createInward: (_token: string, payload: any): Promise<any> =>
    postJson("/inwards", payload),

  createOutward: (_token: string, payload: any): Promise<any> =>
    postJson("/outwards", payload),

  updateOutward: (
    _token: string,
    id: string | number,
    payload: any
  ): Promise<any> =>
    putJson(`/outwards/${id}`, payload),

  createTransfer: (_token: string, payload: any): Promise<any> =>
    postJson("/transfers", payload),

  inventoryCodes: (_token: string): Promise<any> =>
    Get("/inventory/codes"),

  // Admin Projects
  adminProjects: (_token: string, params: any): Promise<any> =>
    Get(`/admin/projects${toQueryString(params)}`),

  adminSearchProjects: (_token: string, params: any): Promise<any> =>
    Get(`/admin/projects/search${toQueryString(params)}`),

  adminCreateProject: (_token: string, payload: any): Promise<any> =>
    postJson("/admin/projects", payload),

  adminUpdateProject: (
    _token: string,
    id: string | number,
    payload: any
  ): Promise<any> =>
    putJson(`/admin/projects/${id}`, payload),

  adminDeleteProject: (_token: string, id: string | number): Promise<any> =>
    Delete(`/admin/projects/${id}`),

  // Admin Users
  adminUsers: (_token: string, params: any): Promise<any> =>
    Get(`/admin/users${toQueryString(params)}`),

  adminSearchUsers: (_token: string, params: any): Promise<any> =>
    Get(`/admin/users/search${toQueryString(params)}`),

  adminCreateUser: (_token: string, payload: any): Promise<any> =>
    postJson("/admin/users", payload),

  adminUpdateUser: (
    _token: string,
    id: string | number,
    payload: any
  ): Promise<any> =>
    putJson(`/admin/users/${id}`, payload),

  adminDeleteUser: (_token: string, id: string | number): Promise<any> =>
    Delete(`/admin/users/${id}`),

  adminAnalytics: (_token: string): Promise<any> =>
    Get("/admin/analytics"),

  // Material history / movements
  materialInwardHistory: (
    _token: string,
    materialId: string | number
  ): Promise<any> =>
    Get(`/app/materials/${materialId}/inwards`),

  materialMovements: (
    _token: string,
    materialId: string | number
  ): Promise<any> =>
    Get(`/app/materials/${materialId}/movements`),

  // BOM / allocations
  /**
   * Fetch BOM allocations for a given project. Accepts optional
   * pagination parameters (e.g. { page: 1, size: 25 }). If no
   * parameters are provided the backend defaults are applied.
   */
  projectAllocations: (
    _token: string,
    projectId: string | number,
    params: Record<string, any> = {}
  ): Promise<any> =>
    Get(`/bom/projects/${projectId}${toQueryString(params)}`),

  createProjectAllocation: (
    _token: string,
    projectId: string | number,
    payload: any
  ): Promise<any> =>
    postJson(`/bom/projects/${projectId}/materials`, payload),

  updateBomAllocation: (
    _token: string,
    projectId: string | number,
    materialId: string | number,
    payload: any
  ): Promise<any> =>
    putJson(`/bom/projects/${projectId}/materials/${materialId}`, payload),

  deleteProjectAllocation: (
    _token: string,
    projectId: string | number,
    materialId: string | number
  ): Promise<any> =>
    Delete(`/bom/projects/${projectId}/materials/${materialId}`),

  // Procurement
  listProcurementRequests: (_token: string): Promise<any> =>
    Get("/procurement/requests"),

  createProcurementRequest: (_token: string, payload: any): Promise<any> =>
    postJson("/procurement/requests", payload),

  resolveProcurementRequest: (
    _token: string,
    id: string | number,
    payload: any
  ): Promise<any> =>
    postJson(`/procurement/requests/${id}/decision`, payload),

  // History (inwards, outwards, transfers)
  /**
   * Fetch paginated inward history records. Accepts optional page/size and other query parameters.
   *
   * @param _token unused because Axios interceptor injects the token automatically
   * @param params query params, e.g. { page: 1, size: 10 }
   */
  searchInwardHistory: (_token: string, params: any): Promise<any> =>
    Get(`/history/inwards${toQueryString(params)}`),

  /**
   * Fetch paginated outward history records. Accepts optional page/size parameters.
   */
  searchOutwardHistory: (_token: string, params: any): Promise<any> =>
    Get(`/history/outwards${toQueryString(params)}`),

  /**
   * Fetch paginated transfer history records. Accepts optional page/size parameters.
   */
  searchTransferHistory: (_token: string, params: any): Promise<any> =>
    Get(`/history/transfers${toQueryString(params)}`),
};
