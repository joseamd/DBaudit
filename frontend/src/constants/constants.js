// ─── Design Tokens & Constants ────────────────────────────────────────────────

export const SEVERITY_COLOR = {
  critical: "#f43f5e", high: "#f97316", medium: "#eab308", low: "#22c55e",
};
export const SEVERITY_BG = {
  critical: "#fff1f2", high: "#fff7ed", medium: "#fefce8", low: "#f0fdf4",
};
export const OP_COLOR = {
  SELECT: "#3b82f6", INSERT: "#22c55e", UPDATE: "#f59e0b", DELETE: "#ef4444",
  DROP: "#8b5cf6", ALTER: "#ec4899", CREATE: "#06b6d4",
  GRANT: "#f97316", REVOKE: "#dc2626", TRUNCATE: "#ef4444",
  LOGIN: "#6366f1", LOGOUT: "#6366f1", CONNECT: "#0ea5e9", DISCONNECT: "#94a3b8",
  OTHER: "#9ca3af",
};
export const ENGINE_COLOR = {
  postgresql: "#336791", mysql: "#f97316", sqlite: "#0ea5e9",
  mssql: "#cc2200", oracle: "#f00",
};
export const STATUS_AGENT = {
  active:   { color: "#22c55e", bg: "#f0fdf4", label: "Activo",      dotColor: "#16a34a" },
  warning:  { color: "#f59e0b", bg: "#fffbeb", label: "Advertencia", dotColor: "#d97706" },
  offline:  { color: "#ef4444", bg: "#fef2f2", label: "Offline",     dotColor: "#dc2626" },
  pending:  { color: "#6366f1", bg: "#eef2ff", label: "Pendiente",   dotColor: "#4f46e5" },
  disabled: { color: "#94a3b8", bg: "#f8fafc", label: "Desactivado", dotColor: "#64748b" },
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

export function relTime(iso) {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return `hace ${Math.floor(diff / 1_000)}s`;
  if (diff < 3_600_000)  return `hace ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)}h`;
  return `hace ${Math.floor(diff / 86_400_000)}d`;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es", {
    month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function fmtNum(n) {
  return (n ?? 0).toLocaleString("es");
}

/** Safely unwrap DRF paginated or plain-array responses */
export function unwrap(data, fallback = []) {
  return Array.isArray(data) ? data : (data?.results ?? fallback);
}
