const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const toQueryString = (params = {}) => {
  const parts = [];
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
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        }
      });
      return;
    }
    if (value === "") {
      return;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return parts.length ? `?${parts.join("&")}` : "";
};

async function request(path, { method = "GET", body, token, responseType = "json" } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["X-Auth-Token"] = token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error || error.message || "Request failed";
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }
  if (response.headers.get("content-length") === "0") {
    return null;
  }

  if (responseType === "blob") {
    return response.blob();
  }

  return response.json();
}


export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  session: (token) => request("/auth/session", { token }),
  logout: (token) => request("/auth/logout", { method: "POST", token }),
  bootstrap: (token) => request("/app/bootstrap", { token }),
  listMaterials: (token) => request("/materials", { token }),
  searchMaterials: (token, params) =>
    request(`/materials/search${toQueryString(params)}`, { token }),
  createMaterial: (token, payload) => request("/materials", { method: "POST", token, body: payload }),
  updateMaterial: (token, id, payload) => request(`/materials/${id}`, { method: "PUT", token, body: payload }),
  deleteMaterial: (token, id) => request(`/materials/${id}`, { method: "DELETE", token }),
  importMaterials: (token, file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/materials/import", { method: "POST", token, body: form });
  },
  exportMaterials: (token) =>
    request("/materials/export", { token, responseType: "blob" }),
  createInward: (token, payload) => request("/inwards", { method: "POST", token, body: payload }),
  createOutward: (token, payload) => request("/outwards", { method: "POST", token, body: payload }),
  updateOutward: (token, id, payload) => request(`/outwards/${id}`, { method: "PUT", token, body: payload }),
  createTransfer: (token, payload) => request("/transfers", { method: "POST", token, body: payload }),
  inventoryCodes: (token) => request("/inventory/codes", { token }),
  adminProjects: (token) => request("/admin/projects", { token }),
  adminSearchProjects: (token, params) =>
    request(`/admin/projects/search${toQueryString(params)}`, { token }),
  adminCreateProject: (token, payload) => request("/admin/projects", { method: "POST", token, body: payload }),
  adminUpdateProject: (token, id, payload) => request(`/admin/projects/${id}`, { method: "PUT", token, body: payload }),
  adminDeleteProject: (token, id) => request(`/admin/projects/${id}`, { method: "DELETE", token }),
  adminUsers: (token) => request("/admin/users", { token }),
  adminSearchUsers: (token, params) =>
    request(`/admin/users/search${toQueryString(params)}`, { token }),
  adminCreateUser: (token, payload) => request("/admin/users", { method: "POST", token, body: payload }),
  adminUpdateUser: (token, id, payload) => request(`/admin/users/${id}`, { method: "PUT", token, body: payload }),
  adminDeleteUser: (token, id) => request(`/admin/users/${id}`, { method: "DELETE", token }),
  adminAnalytics: (token) => request("/admin/analytics", { token }),
  materialInwardHistory: (token, materialId) => request(`/app/materials/${materialId}/inwards`, { token }),
  materialMovements: (token, materialId) => request(`/app/materials/${materialId}/movements`, { token }),
  projectAllocations: (token, projectId) => request(`/bom/projects/${projectId}`, { token }),
  createProjectAllocation: (token, projectId, payload) =>
    request(`/bom/projects/${projectId}/materials`, { method: "POST", token, body: payload }),
  updateBomAllocation: (token, projectId, materialId, payload) =>
    request(`/bom/projects/${projectId}/materials/${materialId}`, {
      method: "PUT",
      token,
      body: payload,
    }),
  deleteProjectAllocation: (token, projectId, materialId) =>
    request(`/bom/projects/${projectId}/materials/${materialId}`, { method: "DELETE", token }),
  listProcurementRequests: (token) => request("/procurement/requests", { token }),
  createProcurementRequest: (token, payload) =>
    request("/procurement/requests", { method: "POST", token, body: payload }),
  resolveProcurementRequest: (token, id, payload) =>
    request(`/procurement/requests/${id}/decision`, { method: "POST", token, body: payload }),
};
