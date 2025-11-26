/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosBasicCredentials,
  type ResponseType,
  type AxiosProgressEvent,
} from "axios";
import { loginPath } from "../routes/route";

// Instead of importing the Redux store and logout action directly, we accept
// them via setter functions to avoid circular dependency issues. When this
// module is loaded, the store has not yet been created. The consuming code
// (store.ts) will set these variables after the store is configured.
let storeInstance: any;
let logoutAction: any;

/**
 * Inject the Redux store instance used by the API service. This should be
 * called once after the store has been created (see src/store/store.ts).
 *
 * @param store The configured Redux store
 */
export function setApiStore(store: any): void {
  storeInstance = store;
}

/**
 * Inject the logout action creator used when a 401 response is received.
 * This is injected separately to avoid importing the auth slice here and
 * creating a circular dependency with the store and reducers.
 *
 * @param action The logout thunk action creator
 */
export function setLogoutAction(action: any): void {
  logoutAction = action;
}

export interface IRequestOptions {
  headers?: any;
  basicAuth?: AxiosBasicCredentials;
  responseType?: ResponseType;
  onProgressUpdate?: (progressEvent: AxiosProgressEvent) => void;
}

// Use either VITE_API_URL (from old client.js) or VITE_API_BASE_URL or fallback to /api
const baseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api";

const onRequest = (
  config: InternalAxiosRequestConfig<any>
): InternalAxiosRequestConfig<any> => {
  // Ensure headers object exists
  config.headers = config.headers ?? {};

  // If caller already set X-Auth-Token, don't override it
  const existingToken =
    (config.headers as any)["X-Auth-Token"] ??
    (config.headers as any)["x-auth-token"];

  if (!existingToken && storeInstance?.getState) {
    const state = storeInstance.getState();
    // from your converted authSlice (token from backend)
    const token = state?.auth?.token as string | null | undefined;

    if (token) {
      // Match old fetch client header name
      (config.headers as any)["X-Auth-Token"] = token;
    }
  }

  return config;
};

const onResponseSuccess = (
  response: AxiosResponse<any, any>
): AxiosResponse<any, any> | Promise<AxiosResponse<any, any>> => {
  endRequest();
  return response;
};

const onResponseError = async (err: any): Promise<never> => {
  endRequest();
  if (err.response?.status === 401) {
    // Dispatch the logout action if provided to reset auth state. We
    // dynamically call the injected logoutAction to avoid importing it
    // directly (see setLogoutAction). If either the store or action
    // hasn't been injected yet, this is a no-op.
    if (logoutAction && storeInstance?.dispatch) {
      storeInstance.dispatch(logoutAction());
    }
    window.location.href = loginPath;
  }
  return await Promise.reject(err);
};

export const axiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 1000 * 60 * 60, // 1 hour
  withCredentials: true,   // similar to fetch(..., { credentials: "include" })
  validateStatus: function (status) {
    return status === 200 || status === 201 || status === 204;
  },
});

axiosInstance.interceptors.request.use(onRequest);
axiosInstance.interceptors.response.use(onResponseSuccess, onResponseError);

// ---- Loader handling ----

let onRequestStart: (() => void) | undefined;
let onRequestEnd: (() => void) | undefined;
let totalRequests = 0;
let completedRequests = 0;

const startRequest = (displayLoader: boolean): void => {
  totalRequests += 1;
  if (displayLoader) {
    onRequestStart?.();
  }
};

const endRequest = (): void => {
  completedRequests += 1;
  if (completedRequests >= totalRequests) {
    completedRequests = 0;
    totalRequests = 0;
    onRequestEnd?.();
  }
};

export function addRequestStartListener(callback: () => void): void {
  onRequestStart = callback;
}

export function addRequestEndListener(callback: () => void): void {
  onRequestEnd = callback;
}

// ---- HTTP helpers ----

export async function Get<T, D = any>(
  endPoint: string,
  params?: D,
  requestOptions: IRequestOptions = {},
  displayLoader = true
): Promise<T> {
  startRequest(displayLoader);
  const res = await axiosInstance.get<T, AxiosResponse<T>, D>(endPoint, {
    params,
    headers: requestOptions.headers,
    responseType: requestOptions.responseType,
  });
  return res.data;
}

export async function Post<T, D = any>(
  endPoint: string,
  data?: D,
  requestOptions: IRequestOptions = {},
  displayLoader = true
): Promise<AxiosResponse<T>> {
  startRequest(displayLoader);
  const res = await axiosInstance.post<T, AxiosResponse<T>, D>(endPoint, data, {
    headers: requestOptions.headers ?? {},
    auth: requestOptions.basicAuth,
    onUploadProgress: requestOptions.onProgressUpdate,
  });
  return res;
}

export async function Put<T, D = any>(
  endPoint: string,
  data: D,
  requestOptions: IRequestOptions = {},
  displayLoader = true
): Promise<T> {
  startRequest(displayLoader);
  const res = await axiosInstance.put<T, AxiosResponse<T>, D>(endPoint, data, {
    headers: requestOptions.headers,
  });
  return res.data;
}

export async function Delete<T>(
  endPoint: string,
  requestOptions: IRequestOptions = {},
  displayLoader = true
): Promise<T> {
  startRequest(displayLoader);
  const res = await axiosInstance.delete<T>(endPoint, {
    headers: requestOptions.headers,
  });
  return res.data;
}
