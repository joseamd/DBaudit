// ─── DBaudit API Client ───────────────────────────────────────────────────────
// Connects to Django REST Framework backend at /api/
// All services fall back gracefully if backend is unreachable.

export const API_URL = import.meta?.env?.VITE_API_URL ?? "http://localhost:8000/api";

const getAuthToken = () => localStorage.getItem("auth_token") || "";

const API_CLIENT = {
  baseURL: API_URL,

  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAuthToken();
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers["Authorization"] = `Bearer ${token}`;
    if (data)  options.body = JSON.stringify(data);

    const response = await fetch(url, options);

    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/"; // fuerza login
      return;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response.json();
  },

  get:    (ep)       => API_CLIENT.request("GET",    ep),
  post:   (ep, data) => API_CLIENT.request("POST",   ep, data),
  put:    (ep, data) => API_CLIENT.request("PUT",    ep, data),
  patch:  (ep, data) => API_CLIENT.request("PATCH",  ep, data),
  delete: (ep)       => API_CLIENT.request("DELETE", ep),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** DRF returns either an array or { results: [] } depending on pagination. */
const unwrap = (data, fallback = []) =>
  Array.isArray(data) ? data : (data?.results ?? fallback);

const buildQS = (filters = {}) => {
  const p = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return p ? `?${p}` : "";
};

// ─── Event Service ────────────────────────────────────────────────────────────

export const EventService = {
  getEvents:        (f = {}) => API_CLIENT.get(`/events/${buildQS(f)}`),
  getEventById:     (id)     => API_CLIENT.get(`/events/${id}/`),
  getEventsByDb:    (dbId)   => API_CLIENT.get(`/events/?database=${dbId}`),
};

// ─── Agent Service ────────────────────────────────────────────────────────────

export const AgentService = {
  getAgents:    ()         => API_CLIENT.get("/agents/"),
  getAgentById: (id)       => API_CLIENT.get(`/agents/${id}/`),
  createAgent:  (data)     => API_CLIENT.post("/agents/", data),
  updateAgent:  (id, data) => API_CLIENT.patch(`/agents/${id}/`, data),
  deleteAgent:  (id)       => API_CLIENT.delete(`/agents/${id}/`),
  /** Toggle active ↔ disabled */
  toggleAgent:  (agent)    => API_CLIENT.patch(`/agents/${agent.id}/`, {
    status: agent.status === "disabled" ? "active" : "disabled",
  }),
};

// ─── Database Service ─────────────────────────────────────────────────────────

export const DatabaseService = {
  getDatabases:    ()         => API_CLIENT.get("/databases/"),
  getDatabaseById: (id)       => API_CLIENT.get(`/databases/${id}/`),
  createDatabase:  (data)     => API_CLIENT.post("/databases/", data),
  updateDatabase:  (id, data) => API_CLIENT.put(`/databases/${id}/`, data),
  patchDatabase:   (id, data) => API_CLIENT.patch(`/databases/${id}/`, data),
  deleteDatabase:  (id)       => API_CLIENT.delete(`/databases/${id}/`),
};

// ─── Alert Service ────────────────────────────────────────────────────────────

export const AlertService = {
  getAlerts:       (f = {}) => API_CLIENT.get(`/alerts/${buildQS(f)}`),
  getAlertById:    (id)     => API_CLIENT.get(`/alerts/${id}/`),
  acknowledgeAlert:(id)     => API_CLIENT.patch(`/alerts/${id}/`, { status: "acknowledged" }),
  resolveAlert:    (id)     => API_CLIENT.patch(`/alerts/${id}/`, { status: "resolved" }),
  markFalsePos:    (id)     => API_CLIENT.patch(`/alerts/${id}/`, { status: "false_positive" }),
};

// ─── Alert Rule Service ───────────────────────────────────────────────────────

export const AlertRuleService = {
  getRules:       ()         => API_CLIENT.get("/alert-rules/"),
  createRule:     (data)     => API_CLIENT.post("/alert-rules/", data),
  updateRule:     (id, data) => API_CLIENT.patch(`/alert-rules/${id}/`, data),
  deleteRule:     (id)       => API_CLIENT.delete(`/alert-rules/${id}/`),
};

export { unwrap };
export default API_CLIENT;
