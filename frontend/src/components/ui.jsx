import { SEVERITY_COLOR, SEVERITY_BG, OP_COLOR, ENGINE_COLOR } from "../constants/constants";

// ─── Card ─────────────────────────────────────────────────────────────────────

export const Card = ({ children, style = {}, onClick, hover = false }) => (
  <div
    onClick={onClick}
    style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #e8ecf0",
      boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
      padding: 24, ...style,
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.18s, transform 0.18s",
    }}
    onMouseEnter={e => {
      if (onClick || hover) {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,23,42,0.12)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)";
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    {children}
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────

export const StatCard = ({ icon: Icon, label, value, sub, color = "#3b82f6", onClick, trend }) => (
  <Card onClick={onClick} hover={!!onClick} style={{ padding: "20px 22px" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ background: `${color}12`, borderRadius: 10, padding: 10, display: "flex" }}>
        <Icon size={20} color={color} />
      </div>
      {trend !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 600, color: trend >= 0 ? "#22c55e" : "#ef4444",
          background: trend >= 0 ? "#f0fdf4" : "#fef2f2",
          borderRadius: 20, padding: "2px 8px",
        }}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
  </Card>
);

// ─── Badge ────────────────────────────────────────────────────────────────────

export const SeverityBadge = ({ severity }) => (
  <span style={{
    background: SEVERITY_BG[severity] || "#f1f5f9",
    color: SEVERITY_COLOR[severity] || "#475569",
    border: `1px solid ${SEVERITY_COLOR[severity] || "#cbd5e1"}40`,
    borderRadius: 6, padding: "2px 9px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  }}>
    {severity}
  </span>
);

export const OpBadge = ({ op }) => (
  <span style={{
    background: OP_COLOR[op] ? `${OP_COLOR[op]}12` : "#f1f5f9",
    color: OP_COLOR[op] || "#475569",
    border: `1px solid ${OP_COLOR[op] || "#cbd5e1"}30`,
    borderRadius: 5, padding: "2px 8px",
    fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace",
  }}>
    {op}
  </span>
);

export const EngineTag = ({ engine }) => (
  <span style={{
    background: `${ENGINE_COLOR[engine] || "#64748b"}10`,
    color: ENGINE_COLOR[engine] || "#64748b",
    border: `1px solid ${ENGINE_COLOR[engine] || "#64748b"}25`,
    borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.04em", textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  }}>
    {engine}
  </span>
);

export const StatusDot = ({ status }) => {
  const colors = {
    active: "#22c55e", inactive: "#94a3b8", error: "#ef4444",
    open: "#ef4444", acknowledged: "#f59e0b", resolved: "#22c55e", false_positive: "#94a3b8",
  };
  const c = colors[status] || "#94a3b8";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: c,
        boxShadow: `0 0 0 2px ${c}30`, display: "inline-block",
      }} />
    </span>
  );
};

// ─── NavItem ──────────────────────────────────────────────────────────────────

export const NavItem = ({ icon: Icon, label, active, onClick, badge, collapsed }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", 
      alignItems: "center", 
      gap: collapsed ? 0 : 9,
      width: "100%",
      padding: "9px 14px", 
      borderRadius: 10, 
      border: "none", 
      cursor: "pointer",
      background: active ? "rgba(99,102,241,0.15)" : "transparent",
      color: active ? "#818cf8" : "#64748b",
      fontSize: 13, 
      fontWeight: active ? 600 : 400,
      transition: "all 0.15s", 
      textAlign: "left",
      fontFamily: "'DM Sans', sans-serif",
      justifyContent: collapsed ? "center" : "flex-start", // centrar iconos
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
  >
    {/* Icono siempre visible */}
    <Icon size={16} />

    {/* Texto solo si no está colapsado */}
    {!collapsed && (
      <span style={{ flex: 1 }}>{label}</span>
    )}

    {/* Badge */}
    {badge != null && badge > 0 && !collapsed && (
      <span style={{
        background: "#ef4444", color: "#fff", borderRadius: 20,
        fontSize: 10, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center",
      }}>
        {badge}
      </span>
    )}
  </button>
);

// ─── Input / Select ───────────────────────────────────────────────────────────

export const Input = ({ style = {}, ...props }) => (
  <input
    style={{
      width: "100%", padding: "9px 12px", borderRadius: 9,
      border: "1px solid #e2e8f0", fontSize: 13, outline: "none",
      color: "#0f172a", background: "#fff", boxSizing: "border-box",
      transition: "border-color 0.15s",
      fontFamily: "'DM Sans', sans-serif",
      ...style,
    }}
    onFocus={e => e.target.style.borderColor = "#6366f1"}
    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
    {...props}
  />
);

export const Select = ({ style = {}, children, ...props }) => (
  <select
    style={{
      padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0",
      fontSize: 13, color: "#0f172a", background: "#fff",
      outline: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      ...style,
    }}
    {...props}
  >
    {children}
  </select>
);

// ─── Button ───────────────────────────────────────────────────────────────────

export const Btn = ({ children, variant = "primary", size = "md", style = {}, ...props }) => {
  const variants = {
    primary:   { background: "#4f46e5", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#374151", border: "1px solid #e2e8f0" },
    danger:    { background: "#fff", color: "#ef4444", border: "1px solid #fecaca" },
    ghost:     { background: "transparent", color: "#64748b", border: "1px solid transparent" },
  };
  const sizes = {
    sm: { padding: "5px 12px", fontSize: 12, borderRadius: 7 },
    md: { padding: "8px 16px", fontSize: 13, borderRadius: 9 },
    lg: { padding: "11px 22px", fontSize: 14, borderRadius: 10 },
  };
  return (
    <button
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontWeight: 600, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        transition: "all 0.15s",
        ...variants[variant], ...sizes[size], ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

export const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
      {subtitle && <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Loading spinner ──────────────────────────────────────────────────────────

export const Spinner = ({ size = 24 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    border: `2px solid #e2e8f0`,
    borderTopColor: "#6366f1",
    animation: "spin 0.7s linear infinite",
  }} />
);

// ─── Empty state ──────────────────────────────────────────────────────────────

export const EmptyState = ({ icon: Icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
    {Icon && <Icon size={40} style={{ marginBottom: 12, opacity: 0.4 }} />}
    <div style={{ fontSize: 15, fontWeight: 600, color: "#64748b" }}>{title}</div>
    {sub && <div style={{ fontSize: 13, marginTop: 4 }}>{sub}</div>}
  </div>
);
