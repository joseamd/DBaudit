import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, AlertTriangle, Bell, Wifi, Download,
  ChevronRight, TrendingUp,
} from "lucide-react";

import { EventService, AgentService, AlertService } from "../services/api";
import { SEVERITY_COLOR, OP_COLOR, STATUS_AGENT, relTime, unwrap } from "../constants/constants";
import { fakeEvents, fakeAlerts, fakeAgents, fakeChartData } from "../mocks/mockData";
import {
  Card, StatCard, SeverityBadge, SectionHeader, Btn, Spinner,
} from "../components/ui";
import { COLORS, FONTS } from "../theme";

// ─── Chart helpers ────────────────────────────────────────────────────────────

function buildChartData(events) {
  if (!events.length) return fakeChartData;

  // by_day
  const byDayMap = {};
  events.forEach(e => {
    const d = e.occurred_at?.slice(0, 10);
    if (d) byDayMap[d] = (byDayMap[d] || 0) + 1;
  });
  const by_day = Object.entries(byDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([day, count]) => ({ day, count }));

  // by_operation
  const byOpMap = {};
  events.forEach(e => { byOpMap[e.operation] = (byOpMap[e.operation] || 0) + 1; });
  const by_operation = Object.entries(byOpMap).map(([operation, count]) => ({ operation, count }));

  // by_severity
  const bySevMap = {};
  events.forEach(e => { bySevMap[e.severity] = (bySevMap[e.severity] || 0) + 1; });
  const by_severity = Object.entries(bySevMap).map(([severity, count]) => ({ severity, count }));

  return { by_day, by_operation, by_severity };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ onNavigate }) {
  const [events, setEvents]   = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [ev, al, ag] = await Promise.all([
          EventService.getEvents({ limit: 200 }),
          AlertService.getAlerts(),
          AgentService.getAgents(),
        ]);
        if (cancelled) return;
        setEvents(unwrap(ev, fakeEvents));
        setAlerts(unwrap(al, fakeAlerts));
        setAgents(unwrap(ag, fakeAgents));
        setUseMock(false);
      } catch {
        if (cancelled) return;
        setEvents(fakeEvents);
        setAlerts(fakeAlerts);
        setAgents(fakeAgents);
        setUseMock(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const chart       = buildChartData(events);
  const openAlerts  = alerts.filter(a => a.status === "open").length;
  const critEvents  = events.filter(e => e.severity === "critical").length;
  const healthyAg   = agents.filter(a => a.is_healthy).length;
  const recentEvs   = [...events].slice(0, 6);
  const recentAlerts= [...alerts].slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <SectionHeader
        title="Security Overview"
        subtitle={useMock
          ? "⚠ Backend no disponible — mostrando datos de demostración"
          : `Últimas 24h · ${agents.filter(a => a.status === "active").length} BDs activas · ${healthyAg}/${agents.length} agentes online`
        }
        action={
          <Btn variant="secondary">
            <Download size={14} /> Exportar
          </Btn>
        }
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard icon={Activity}       label="Total Eventos"          value={events.length.toLocaleString()} color="#6366f1" />
        <StatCard icon={AlertTriangle}  label="Eventos Críticos"       value={critEvents}  color="#ef4444"  onClick={() => onNavigate("events")} />
        <StatCard icon={Bell}           label="Alertas Abiertas"       value={openAlerts}  color="#f97316"  onClick={() => onNavigate("alerts")} />
        <StatCard icon={Wifi}           label="Agentes Saludables"     value={`${healthyAg}/${agents.length}`} color="#22c55e" onClick={() => onNavigate("agents")} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Area chart */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>
            Volumen de Eventos — 7 días
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chart.by_day}>
              <defs>
                <linearGradient id="ev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#ev-grad)" name="Eventos" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Operations bar chart */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Por Operación</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chart.by_operation} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="operation" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Eventos">
                {chart.by_operation.map((e, i) => (
                  <Cell key={i} fill={OP_COLOR[e.operation] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Severity pie */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Por Severidad</div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={chart.by_severity} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={70} innerRadius={36} paddingAngle={3}>
                {chart.by_severity.map((e, i) => <Cell key={i} fill={SEVERITY_COLOR[e.severity] || "#94a3b8"} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Legend formatter={v => <span style={{ fontSize: 11, textTransform: "capitalize" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
        {/* Agents strip */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Estado de Agentes</div>
            <button onClick={() => onNavigate("agents")} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              Ver todos <ChevronRight size={13} />
            </button>
          </div>
          {agents.slice(0, 4).map((a, i) => {
            const st = STATUS_AGENT[a.status] || STATUS_AGENT.offline;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, boxShadow: `0 0 0 2px ${st.color}30`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{a.server_host}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: "2px 7px", borderRadius: 20 }}>{st.label}</span>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{relTime(a.last_heartbeat)}</div>
                </div>
              </div>
            );
          })}
          {!loading && agents.length === 0 && (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: 20 }}>Sin agentes registrados</div>
          )}
        </Card>

        {/* Recent alerts */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Alertas Recientes</div>
            <button onClick={() => onNavigate("alerts")} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              Ver todas <ChevronRight size={13} />
            </button>
          </div>
          {recentAlerts.map((al, i) => (
            <div key={al.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < recentAlerts.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <SeverityBadge severity={al.severity} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{al.title}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{al.database_name || al.database} · {relTime(al.triggered_at)}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                background: al.status === "open" ? "#fef2f2" : al.status === "acknowledged" ? "#fffbeb" : "#f0fdf4",
                color: al.status === "open" ? "#dc2626" : al.status === "acknowledged" ? "#d97706" : "#16a34a",
                textTransform: "uppercase", flexShrink: 0,
              }}>
                {al.status}
              </span>
            </div>
          ))}
          {!loading && recentAlerts.length === 0 && (
            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: 20 }}>Sin alertas recientes</div>
          )}
        </Card>
      </div>

      {/* Recent events mini-table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Eventos Recientes</div>
          <button onClick={() => onNavigate("events")} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
            Ver todos <ChevronRight size={13} />
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Tiempo", "BD", "Operación", "Usuario", "Tabla", "IP", "Estado"].map(h => (
                <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentEvs.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                <td style={{ padding: "9px 16px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                  {new Date(e.occurred_at).toLocaleString("es", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </td>
                <td style={{ padding: "9px 16px", fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{e.database_name || e.database}</td>
                <td style={{ padding: "9px 16px" }}><span style={{ background: `${OP_COLOR[e.operation] || "#94a3b8"}12`, color: OP_COLOR[e.operation] || "#94a3b8", border: `1px solid ${OP_COLOR[e.operation] || "#94a3b8"}30`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{e.operation}</span></td>
                <td style={{ padding: "9px 16px", fontFamily: "'DM Mono', monospace", color: "#374151" }}>{e.db_user}</td>
                <td style={{ padding: "9px 16px", fontFamily: "'DM Mono', monospace", color: "#374151" }}>{e.table_name || "—"}</td>
                <td style={{ padding: "9px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#94a3b8" }}>{e.client_host || "—"}</td>
                <td style={{ padding: "9px 16px" }}>
                  {e.success
                    ? <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>✓ OK</span>
                    : <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>✗ Error</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner /></div>
        )}
      </Card>
    </div>
  );
}
