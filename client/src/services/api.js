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

function normalizeUser(user = {}) {
  return {
    ...user,
    id: user.id ?? user.userID ?? user.user_id ?? null,
    userID: user.userID ?? user.id ?? user.user_id ?? null,
    name: user.name || "",
    username: user.username || "",
    email: user.email || "",
    role: user.role || "user"
  };
}

function normalizeActivity(activity = {}) {
  return {
    ...activity,
    id: activity.id ?? activity.activityID ?? activity.activity_id ?? null,
    user_id: activity.user_id ?? activity.userID ?? activity.userId ?? null,
    userID: activity.userID ?? activity.user_id ?? activity.userId ?? null,
    name: activity.name || "",
    username: activity.username || "",
    email: activity.email || "",
    action: activity.action || "",
    details: activity.details || "",
    created_at: activity.created_at || activity.createdAt || ""
  };
}

export function normalizeExpense(expense = {}) {
  const rawAmount =
    expense.amount ??
    expense.expense_amount ??
    expense.expenseAmount ??
    0;

  const rawDate =
    expense.date ??
    expense.expense_date ??
    expense.expenseDate ??
    "";

  const amount = Number(rawAmount);

  return {
    ...expense,
    id:
      expense.id ??
      expense.expense_id ??
      expense.expenseId ??
      null,
    expenseName:
      expense.expenseName ??
      expense.expense_name ??
      expense.expenseTitle ??
      expense.title ??
      expense.name ??
      "",
    title:
      expense.title ??
      expense.expenseName ??
      expense.expense_name ??
      expense.name ??
      "",
    category:
      expense.category ??
      expense.expense_category ??
      expense.expenseCategory ??
      "Uncategorized",
    amount: Number.isFinite(amount) ? amount : 0,
    date: rawDate ? String(rawDate).slice(0, 10) : "",
    expense_date: rawDate ? String(rawDate).slice(0, 10) : "",
    description:
      expense.description ??
      expense.expense_description ??
      expense.expenseDescription ??
      expense.notes ??
      ""
  };
}

function getArrayFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.expenses)) return data.expenses;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.activity)) return data.activity;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function getObjectFromResponse(data, keys = []) {
  for (const key of keys) {
    if (data?.[key] && typeof data[key] === "object") return data[key];
  }

  if (data?.data && typeof data.data === "object" && !Array.isArray(data.data)) return data.data;
  if (data && typeof data === "object") return data;

  return {};
}

function buildExpensePayload(expense) {
  const expenseName = String(expense.expenseName || expense.title || "").trim();
  const date = String(expense.date || expense.expense_date || "").trim();

  return {
    expenseName,
    title: expenseName,
    category: String(expense.category || "").trim(),
    amount: Number(expense.amount),
    date,
    expense_date: date,
    description: String(expense.description || "").trim()
  };
}

function normalizeAuthResponse(data = {}) {
  return {
    ...data,
    token: data.token || "",
    user: normalizeUser(data.user || data.currentUser || data)
  };
}

// ---------- Auth ----------
export async function login(credentials) {
  const data = await request("/auth/login", {
    method: "POST",
    body: credentials
  });

  return normalizeAuthResponse(data);
}

export async function register(payload) {
  const data = await request("/auth/register", {
    method: "POST",
    body: payload
  });

  return normalizeAuthResponse(data);
}

export async function getCurrentUser() {
  const data = await request("/auth/me");
  return normalizeUser(data.user || data.currentUser || data);
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

// ---------- Expenses ----------
export async function getExpenses() {
  const data = await request("/expenses");

  return getArrayFromResponse(data)
    .map(normalizeExpense)
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}

export async function createExpense(expense) {
  const data = await request("/expenses", {
    method: "POST",
    body: buildExpensePayload(expense)
  });

  return normalizeExpense(getObjectFromResponse(data, ["expense", "createdExpense"]));
}

export async function updateExpense(id, expense) {
  const data = await request(`/expenses/${id}`, {
    method: "PUT",
    body: buildExpensePayload(expense)
  });

  return normalizeExpense(getObjectFromResponse(data, ["expense", "updatedExpense"]));
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, {
    method: "DELETE"
  });
}

// ---------- Account ----------
export async function updateAccount(profile) {
  const data = await request("/users/me", {
    method: "PUT",
    body: profile
  });

  return normalizeUser(data.user || data.currentUser || data);
}

export function updatePassword(payload) {
  return request("/users/me/password", {
    method: "PUT",
    body: payload
  });
}

// ---------- Admin ----------
export async function getAdminUsers() {
  const data = await request("/admin/users");
  return getArrayFromResponse(data).map(normalizeUser);
}

export async function createAdminUser(payload) {
  const data = await request("/admin/users", {
    method: "POST",
    body: payload
  });

  return normalizeUser(data.user || data.createdUser || data);
}

export async function updateAdminUser(id, payload) {
  const data = await request(`/admin/users/${id}`, {
    method: "PUT",
    body: payload
  });

  return normalizeUser(data.user || data.updatedUser || data);
}

export function deleteAdminUser(id) {
  return request(`/admin/users/${id}`, {
    method: "DELETE"
  });
}

export async function getAdminActivity() {
  const data = await request("/admin/activity");
  return getArrayFromResponse(data).map(normalizeActivity);
}

export async function getAdminUserActivity(id) {
  const data = await request(`/admin/users/${id}/activity`);
  return getArrayFromResponse(data).map(normalizeActivity);
}
