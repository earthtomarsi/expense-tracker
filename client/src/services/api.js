const API_BASE =
  window.SPENDFLOW_API_BASE ||
  (["5173", "5500"].includes(window.location.port) || window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin);

let authToken = "";

export function setAuthToken(token) {
  authToken = token || "";
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload
  });
}

export function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: payload
  });
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function getCurrentUser() {
  return request("/users/me");
}

export function updateAccount(payload) {
  return request("/users/me", {
    method: "PUT",
    body: payload
  });
}

export function updatePassword(payload) {
  return request("/users/me/password", {
    method: "PUT",
    body: payload
  });
}

export function getExpenses() {
  return request("/expenses");
}

export function createExpense(payload) {
  return request("/expenses", {
    method: "POST",
    body: payload
  });
}

export function updateExpense(id, payload) {
  return request(`/expenses/${id}`, {
    method: "PUT",
    body: payload
  });
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: "DELETE" });
}

export function getAdminUsers() {
  return request("/admin/users");
}

export function createAdminUser(payload) {
  return request("/admin/users", {
    method: "POST",
    body: payload
  });
}

export function getAdminUserDetails(userID) {
  return request(`/admin/users/${userID}`);
}

export function updateAdminUser(userID, payload) {
  return request(`/admin/users/${userID}`, {
    method: "PUT",
    body: payload
  });
}

export function deleteAdminUser(userID) {
  return request(`/admin/users/${userID}`, { method: "DELETE" });
}

export function getAdminActivity() {
  return request("/admin/activity");
}

export function getAdminUserActivity(userID) {
  return request(`/admin/users/${userID}/activity`);
}
