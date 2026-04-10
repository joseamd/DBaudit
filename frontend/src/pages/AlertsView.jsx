import { useState, useEffect } from "react";
import { AlertTriangle, Bell, CheckCircle, Clock, RefreshCw, X, WifiOff } from "lucide-react";

import { AlertService } from "../services/api";;
import { SEVERITY_COLOR, relTime, unwrap } from "../constants/constants";
// import { fakeAlerts } from "../mocks/mockData";
import { Card, StatCard, SeverityBadge, SectionHeader, Btn, Spinner, EmptyState } from "../components/ui";

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, onAcknowledge, onResolve, onFalsePositive }) {
  const statusStyle = {
    open:          { bg: "#fef2f2", color: "#dc2626", label: "ABIERTA"        },
    acknowledged:  { bg: "#fffbeb", color: "#d97706", label: "CONFIRMADA"     },
    resolved:      { bg: "#f0fdf4", color: "#16a34a", label: "RESUELTA"       },
    false_positive:{ bg: "#f8fafc", color: "#64748b", label: "FALSO POSITIVO" },
  };
  const ss = statusStyle[alert.status] || statusStyle.open;

  return (
    <Card style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Icon */}
        <div style={{ background: `${SEVERITY_COLOR[alert.severity]}12`, borderRadius: 10, padding: 10, flexShrink: 0, marginTop: 1 }}>
          <AlertTriangle size={18} color={SEVERITY_COLOR[alert.severity]} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{alert.title}</span>
            <SeverityBadge severity={alert.severity} />
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px", lineHeight: 1.5 }}>{alert.description}</p>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#94a3b8", flexWrap: "wrap" }}>
            {(alert.database_name || alert.database) && (
              <span>🗄 {alert.database_name || alert.database}</span>
            )}
            <span>🕐 {relTime(alert.triggered_at)}</span>
            {alert.acknowledged_at && <span>✓ Confirmada {relTime(alert.acknowledged_at)}</span>}
            {alert.resolved_at    && <span>✅ Resuelta {relTime(alert.resolved_at)}</span>}
          </div>
          {alert.notes && (
            <div style={{ marginTop: 8, background: "#f8fafc", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#374151" }}>
              📝 {alert.notes}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, background: ss.bg, color: ss.color, padding: "3px 10px", borderRadius: 20 }}>
            {ss.label}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {alert.status === "open" && (
              <>
                <Btn variant="secondary" size="sm" onClick={() => onAcknowledge(alert.id)}>Confirmar</Btn>
                <Btn variant="ghost" size="sm" style={{ fontSize: 11, color: "#94a3b8" }} onClick={() => onFalsePositive(alert.id)}>
                  <X size={11} /> Falso positivo
                </Btn>
              </>
            )}
            {alert.status === "acknowledged" && (
              <Btn variant="primary" size="sm" style={{ background: "#22c55e" }} onClick={() => onResolve(alert.id)}>
                <CheckCircle size={12} /> Resolver
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Alerts View ──────────────────────────────────────────────────────────────

export default function AlertsView() {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("");
  const [error, setError]       = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await AlertService.getAlerts();
      setAlerts(Array.isArray(data) ? data : data?.results || []);
    } catch (e) {
      console.error("Error alerts:", e);
      setError("No se pudo conectar con el servidor");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAck = async (id) => {
    try { const u = await AlertService.acknowledgeAlert(id); setAlerts(p => p.map(a => a.id === id ? { ...a, ...u } : a)); }
    catch { setAlerts(p => p.map(a => a.id === id ? { ...a, status: "acknowledged" } : a)); }
  };
  const handleRes = async (id) => {
    try { const u = await AlertService.resolveAlert(id); setAlerts(p => p.map(a => a.id === id ? { ...a, ...u } : a)); }
    catch { setAlerts(p => p.map(a => a.id === id ? { ...a, status: "resolved" } : a)); }
  };
  const handleFP = async (id) => {
    try { const u = await AlertService.markFalsePos(id); setAlerts(p => p.map(a => a.id === id ? { ...a, ...u } : a)); }
    catch { setAlerts(p => p.map(a => a.id === id ? { ...a, status: "false_positive" } : a)); }
  };

  const counts = {
    open:          alerts.filter(a => a.status === "open").length,
    acknowledged:  alerts.filter(a => a.status === "acknowledged").length,
    resolved:      alerts.filter(a => a.status === "resolved").length,
    false_positive:alerts.filter(a => a.status === "false_positive").length,
  };

  const filtered = filter ? alerts.filter(a => a.status === filter) : alerts;

  const TABS = [
    { value: "",               label: "Todas",          count: alerts.length },
    { value: "open",           label: "Abiertas",       count: counts.open },
    { value: "acknowledged",   label: "Confirmadas",    count: counts.acknowledged },
    { value: "resolved",       label: "Resueltas",      count: counts.resolved },
    { value: "false_positive", label: "Falso positivo", count: counts.false_positive },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        title="Alertas de Seguridad"
        subtitle="Anomalías y violaciones de reglas detectadas"
        action={<Btn variant="secondary" onClick={load}><RefreshCw size={13} /></Btn>}
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon={AlertTriangle} label="Alertas Abiertas"    value={counts.open}         color="#ef4444" />
        <StatCard icon={Clock}         label="Confirmadas"          value={counts.acknowledged} color="#f97316" />
        <StatCard icon={CheckCircle}   label="Resueltas"            value={counts.resolved}     color="#22c55e" />
        <StatCard icon={Bell}          label="Falso Positivo"       value={counts.false_positive} color="#94a3b8" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            style={{
              padding: "7px 14px", borderRadius: 9, border: "1px solid",
              borderColor: filter === t.value ? "#6366f1" : "#e2e8f0",
              background: filter === t.value ? "#4f46e5" : "#fff",
              color: filter === t.value ? "#fff" : "#374151",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.label}
            <span style={{
              background: filter === t.value ? "rgba(255,255,255,0.25)" : "#f1f5f9",
              color: filter === t.value ? "#fff" : "#64748b",
              borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 7px",
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spinner size={32} />
        </div>
      ) : error ? (
        <EmptyState
          icon={WifiOff}
          title="Error de conexión"
          sub="No se pudo obtener la información del servidor"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sin alertas"
          sub={filter ? `No hay alertas con estado "${filter}"` : "No hay alertas registradas"}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAck}
              onResolve={handleRes}
              onFalsePositive={handleFP}
            />
          ))}
        </div>
      )}
    </div>
  );
}
