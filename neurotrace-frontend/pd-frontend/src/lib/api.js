const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function getTokens() {
  return {
    access: localStorage.getItem("pd_access_token"),
    refresh: localStorage.getItem("pd_refresh_token"),
  };
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem("pd_access_token", access);
  if (refresh) localStorage.setItem("pd_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("pd_access_token");
  localStorage.removeItem("pd_refresh_token");
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) throw new ApiError("No refresh token", 401);

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    throw new ApiError("Session expired", 401);
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

/**
 * Core request helper. Automatically attaches the access token, retries once
 * with a refreshed token on 401, and throws ApiError with the backend's
 * `detail` message on failure so UI can show it directly.
 */
async function request(path, { method = "GET", body, isForm = false, retry = true } = {}) {
  const { access } = getTokens();
  const headers = {};
  if (access) headers["Authorization"] = `Bearer ${access}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && retry && access) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, isForm, retry: false });
    } catch {
      clearTokens();
      window.location.href = "/login";
      throw new ApiError("Session expired. Please log in again.", 401);
    }
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      detail = data?.detail
        ? typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail)
        : detail;
      throw new ApiError(detail, res.status, data);
    }
    throw new ApiError(detail, res.status);
  }

  if (contentType.includes("application/json")) return res.json();
  if (contentType.includes("application/pdf")) return res.blob();
  return res.text();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
  downloadPdf: (path) => request(path),
};

export { ApiError, getTokens };
