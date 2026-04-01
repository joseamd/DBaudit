import { useState, useEffect } from "react";
import {
  Activity, User, Database, Lock, Shield, Zap, FileText,
  AlertTriangle, Download, Calendar, RefreshCw, CheckCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

import { EventService, DatabaseService } from "../services/api";
import { SEVERITY_COLOR, OP_COLOR, unwrap, fmtDate } from "../constants/constants";
import { fakeEvents, fakeDbs, fakeChartData } from "../mocks/mockData";
import { Card, StatCard, SectionHeader, Btn, Select, Spinner } from "../components/ui";

// ─── Report type definitions ──────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    id: "activity_summary",
    label: "Resumen de Actividad",
    icon: Activity,
    color: "#6366f1",
    desc: "Visión general de operaciones, usuarios y tablas más activas en el período seleccionado.",
  },
  {
    id: "user_activity",
    label: "Actividad por Usuario",
    icon: User,
    color: "#8b5cf6",
    desc: "Detalle completo de acciones por cada usuario de base de datos, con ranking y desglose.",
  },
  {
    id: "sensitive_access",
    label: "Acceso a Datos Sensibles",
    icon: Shield,
    color: "#f59e0b",
    desc: "Registro de accesos a tablas marcadas como sensibles (datos personales, pagos, roles).",
  },
  {
    id: "privilege_changes",
    label: "Cambios de Privilegios",
    icon: Lock,
    color: "#ef4444",
    desc: "Todos los GRANT y REVOKE ejecutados: quién, cuándo, sobre qué objetos.",
  },
  {
    id: "schema_changes",
    label: "Cambios de Esquema (DDL)",
    icon: Database,
    color: "#f97316",
    desc: "CREATE, ALTER y DROP registrados — impacto en estructura de la base de datos.",
  },
  {
    id: "anomaly_report",
    label: "Reporte de Anomalías",
    icon: Zap,
    color: "#ec4899",
    desc: "Patrones inusuales, volúmenes fuera de rango y actividad sospechosa detectada.",
  },
  {
    id: "compliance_gdpr",
    label: "GDPR / Privacidad",
    icon: Shield,
    color: "#22c55e",
    desc: "Trazabilidad de acceso a datos personales para cumplimiento con regulaciones de privacidad.",
  },
  {
    id: "compliance_sox",
    label: "SOX Compliance",
    icon: CheckCircle,
    color: "#3b82f6",
    desc: "Controles financieros: cambios en tablas críticas, segregación de funciones, accesos privilegiados.",
  },
  {
    id: "compliance_hipaa",
    label: "HIPAA Compliance",
    icon: FileText,
    color: "#06b6d4",
    desc: "Acceso a datos de salud protegidos (PHI), con usuario, timestamp y operación.",
  },
];

// ─── Activity Summary Report ──────────────────────────────────────────────────

function ActivitySummaryReport({ events, dbs }) {
  // By operation
  const byOp = {};
  events.forEach(e => { byOp[e.operation] = (byOp[e.operation] || 0) + 1; });
  const opData = Object.entries(byOp).map(([operation, count]) => ({ operation, count }))
    .sort((a, b) => b.count - a.count);

  // By user
  const byUser = {};
  events.forEach(e => { byUser[e.db_user] = (byUser[e.db_user] || 0) + 1; });
  const userData = Object.entries(byUser).map(([user, count]) => ({ user, count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  // By table
  const byTable = {};
  events.forEach(e => { if (e.table_name) byTable[e.table_name] = (byTable[e.table_name] || 0) + 1; });
  const tableData = Object.entries(byTable).map(([table, count]) => ({ table, count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  // By severity
  const bySev = {};
  events.forEach(e => { bySev[e.severity] = (bySev[e.severity] || 0) + 1; });
  const sevData = Object.entries(bySev).map(([severity, count]) => ({ severity, count }));

  const errors = events.filter(e => !e.success).length;
  const criticals = events.filter(e => e.severity === "critical").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon={Activity}      label="Total eventos"    value={events.length}   color="#6366f1" />
        <StatCard icon={AlertTriangle} label="Críticos"         value={criticals}       color="#ef4444" />
        <StatCard icon={User}          label="Usuarios únicos"  value={Object.keys(byUser).length} color="#8b5cf6" />
        <StatCard icon={Database}      label="Errores"          value={errors}          color="#f97316" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* By operation */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Eventos por Operación</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={opData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="operation" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Eventos">
                {opData.map((e, i) => <Cell key={i} fill={OP_COLOR[e.operation] || "#6366f1"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* By severity */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Distribución por Severidad</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sevData} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={3}>
                {sevData.map((e, i) => <Cell key={i} fill={SEVERITY_COLOR[e.severity] || "#94a3b8"} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Legend formatter={v => <span style={{ fontSize: 11, textTransform: "capitalize" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top users */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Usuarios más Activos</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="user" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Eventos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top tables */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Tablas más Accedidas</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tableData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="table" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Accesos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── Generic event table ──────────────────────────────────────────────────────

function EventTable({ events, title }) {
  const cols = ["Tiempo", "BD", "Operación", "Usuario", "Tabla", "Filas", "Estado"];
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {cols.map(h => <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 50).map((e, i) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(e.occurred_at)}</td>
                <td style={{ padding: "8px 14px", fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{e.database_name || e.database}</td>
                <td style={{ padding: "8px 14px" }}>
                  <span style={{ background: `${OP_COLOR[e.operation]||"#94a3b8"}12`, color: OP_COLOR[e.operation]||"#94a3b8", border: `1px solid ${OP_COLOR[e.operation]||"#94a3b8"}30`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{e.operation}</span>
                </td>
                <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", color: "#374151" }}>{e.db_user}</td>
                <td style={{ padding: "8px 14px", fontFamily: "'DM Mono', monospace", color: "#374151" }}>{e.table_name || "—"}</td>
                <td style={{ padding: "8px 14px", color: "#64748b", textAlign: "right" }}>{e.rows_affected ?? "—"}</td>
                <td style={{ padding: "8px 14px" }}>
                  {e.success ? <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 11 }}>✓</span> : <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 11 }}>✗</span>}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Sin eventos en el período seleccionado</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {events.length > 50 && (
        <div style={{ padding: "10px 18px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
          Mostrando 50 de {events.length} eventos. Exporta a CSV para ver todos.
        </div>
      )}
    </Card>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

export default function ReportsView() {
  const [events, setEvents]           = useState([]);
  const [dbs, setDbs]                 = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeReport, setActiveReport] = useState(null);
  const [dbFilter, setDbFilter]       = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evData, dbData] = await Promise.all([
          EventService.getEvents({ limit: 1000 }),
          DatabaseService.getDatabases(),
        ]);
        setEvents(unwrap(evData, fakeEvents));
        setDbs(unwrap(dbData, fakeDbs));
      } catch {
        setEvents(fakeEvents);
        setDbs(fakeDbs);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter events
  const filteredEvents = dbFilter
    ? events.filter(e => e.database === dbFilter || e.database_name === dbFilter)
    : events;

  // Report-specific event subsets
  const reportEvents = {
    activity_summary: filteredEvents,
    user_activity:    filteredEvents,
    sensitive_access: filteredEvents.filter(e => ["critical","high"].includes(e.severity)),
    privilege_changes:filteredEvents.filter(e => ["GRANT","REVOKE"].includes(e.operation)),
    schema_changes:   filteredEvents.filter(e => ["CREATE","ALTER","DROP"].includes(e.operation)),
    anomaly_report:   filteredEvents.filter(e => e.severity === "critical" || !e.success),
    compliance_gdpr:  filteredEvents.filter(e => ["SELECT","UPDATE","DELETE"].includes(e.operation)),
    compliance_sox:   filteredEvents.filter(e => ["INSERT","UPDATE","DELETE","GRANT","REVOKE"].includes(e.operation)),
    compliance_hipaa: filteredEvents,
  };

  // Export CSV
  const exportCSV = (type) => {
    const evs = reportEvents[type] || filteredEvents;
    const cols = ["occurred_at","database_name","operation","severity","db_user","table_name","rows_affected","client_host","success","query"];
    const csv  = [cols.join(","), ...evs.map(e => cols.map(c => `"${(e[c]??"")}"`).join(","))].join("\n");
    const a    = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `dbaudit-${type}-${new Date().toISOString().slice(0,10)}.csv`,
    });
    a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        title="Reportes & Cumplimiento"
        subtitle="Generación de reportes de auditoría, seguridad y compliance"
        action={
          activeReport ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => exportCSV(activeReport)}>
                <Download size={13} /> Exportar CSV
              </Btn>
              <Btn variant="ghost" onClick={() => setActiveReport(null)}>← Volver</Btn>
            </div>
          ) : null
        }
      />

      {/* Filters */}
      <Card style={{ padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Calendar size={15} color="#94a3b8" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Filtrar por BD:</span>
          <Select value={dbFilter} onChange={e => setDbFilter(e.target.value)}>
            <option value="">Todas las bases de datos</option>
            {dbs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {filteredEvents.length.toLocaleString()} eventos cargados
          </span>
        </div>
      </Card>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={32} /></div>
      ) : activeReport ? (
        // ── Active report ──
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          {(() => {
            const rt = REPORT_TYPES.find(r => r.id === activeReport);
            const evCount = (reportEvents[activeReport] || []).length;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", background: `${rt.color}08`, borderRadius: 14, border: `1px solid ${rt.color}20` }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${rt.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <rt.icon size={22} color={rt.color} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{rt.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{evCount.toLocaleString()} eventos · {rt.desc}</div>
                </div>
              </div>
            );
          })()}

          {/* Report content */}
          {activeReport === "activity_summary" && (
            <ActivitySummaryReport events={filteredEvents} dbs={dbs} />
          )}
          {activeReport === "user_activity" && (
            <EventTable events={filteredEvents} title="Actividad completa por usuario" />
          )}
          {activeReport === "privilege_changes" && (
            <EventTable events={reportEvents.privilege_changes} title="GRANT / REVOKE registrados" />
          )}
          {activeReport === "schema_changes" && (
            <EventTable events={reportEvents.schema_changes} title="Cambios de esquema (DDL)" />
          )}
          {activeReport === "sensitive_access" && (
            <EventTable events={reportEvents.sensitive_access} title="Accesos a datos sensibles (critical + high)" />
          )}
          {activeReport === "anomaly_report" && (
            <EventTable events={reportEvents.anomaly_report} title="Anomalías — críticos y errores" />
          )}
          {["compliance_gdpr","compliance_sox","compliance_hipaa"].includes(activeReport) && (
            <EventTable events={reportEvents[activeReport]} title={REPORT_TYPES.find(r => r.id === activeReport)?.label} />
          )}
        </div>
      ) : (
        // ── Report type grid ──
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {REPORT_TYPES.map(r => {
            const evCount = (reportEvents[r.id] || []).length;
            return (
              <Card key={r.id} hover style={{ cursor: "pointer" }} onClick={() => setActiveReport(r.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: `${r.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <r.icon size={20} color={r.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{evCount.toLocaleString()} eventos</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>{r.desc}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: r.color, color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <FileText size={12} /> Ver Reporte
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); exportCSV(r.id); }}
                    style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", color: "#64748b" }}
                    title="Exportar CSV"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
