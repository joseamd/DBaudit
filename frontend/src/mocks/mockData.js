// ─── Mock / Fallback Data ─────────────────────────────────────────────────────
// Used when the backend is unreachable. Mirrors real Django model shapes.

export const fakeAgents = [
  {
    id: "ag-1", name: "prod-postgres-01 agent", server_host: "10.0.1.10",
    server_os: "Ubuntu 22.04 LTS", agent_version: "1.0.0",
    status: "active", is_healthy: true, queue_size: 0,
    last_heartbeat: new Date(Date.now() - 45_000).toISOString(),
    last_event_at:  new Date(Date.now() - 75_000).toISOString(),
    token: "tok_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
    database: "db-1",
  },
  {
    id: "ag-2", name: "mysql-billing agent", server_host: "10.0.1.20",
    server_os: "CentOS 7", agent_version: "1.0.0",
    status: "active", is_healthy: true, queue_size: 12,
    last_heartbeat: new Date(Date.now() - 30_000).toISOString(),
    last_event_at:  new Date(Date.now() - 30_000).toISOString(),
    token: "tok_b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f600",
    database: "db-2",
  },
  {
    id: "ag-3", name: "legacy-pg-erp agent", server_host: "10.0.2.5",
    server_os: "Debian 10", agent_version: "0.9.2",
    status: "warning", is_healthy: false, queue_size: 847,
    last_heartbeat: new Date(Date.now() - 360_000).toISOString(),
    last_event_at:  new Date(Date.now() - 380_000).toISOString(),
    token: "tok_c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60000",
    database: "db-3",
  },
  {
    id: "ag-4", name: "mysql-crm-v2 agent", server_host: "10.0.1.30",
    server_os: "Ubuntu 20.04", agent_version: "1.0.0",
    status: "offline", is_healthy: false, queue_size: 0,
    last_heartbeat: new Date(Date.now() - 7_200_000).toISOString(),
    last_event_at:  new Date(Date.now() - 7_200_000).toISOString(),
    token: "tok_d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6000000",
    database: "db-4",
  },
];

export const fakeDbs = [
  { id: "db-1", name: "prod-postgres-01", engine: "postgresql", host: "10.0.1.10", port: 5432, database_name: "prod_db", username: "audit_user", status: "active", connection_mode: "agent", last_checked: new Date(Date.now() - 45_000).toISOString() },
  { id: "db-2", name: "prod-mysql-billing", engine: "mysql", host: "10.0.1.20", port: 3306, database_name: "billing", username: "billing_user", status: "active", connection_mode: "agent", last_checked: new Date(Date.now() - 30_000).toISOString() },
  { id: "db-3", name: "legacy-pg-erp", engine: "postgresql", host: "10.0.2.5", port: 5432, database_name: "erp_legacy", username: "erp_reader", status: "active", connection_mode: "agent", last_checked: new Date(Date.now() - 380_000).toISOString() },
  { id: "db-4", name: "mysql-crm-v2", engine: "mysql", host: "10.0.1.30", port: 3306, database_name: "crm", username: "crm_user", status: "error", connection_mode: "agent", last_checked: new Date(Date.now() - 7_200_000).toISOString() },
];

const OPS   = ["SELECT","INSERT","UPDATE","DELETE","CREATE","DROP","ALTER","GRANT"];
const USERS = ["admin","app_user","etl_job","bi_reader","deploy_bot","root"];
const TABS  = ["users","orders","payments","invoices","products","sessions","roles"];

export const fakeEvents = Array.from({ length: 80 }, (_, i) => {
  const db  = fakeDbs[i % fakeDbs.length];
  const op  = OPS[i % OPS.length];
  const sev = op === "DROP" || op === "GRANT" ? "critical"
            : op === "DELETE" || op === "ALTER" ? "high"
            : op === "INSERT" || op === "UPDATE" ? "medium" : "low";
  return {
    id: `evt-${i}`, database: db.id, database_name: db.name, database_engine: db.engine,
    operation: op, severity: sev, db_user: USERS[i % USERS.length],
    table_name: TABS[i % TABS.length], schema_name: "public",
    query: `${op} ${op === "SELECT" ? "* FROM" : "INTO"} ${TABS[i % TABS.length]} WHERE id=${1000+i}`,
    rows_affected: Math.floor(Math.random() * 200),
    client_host: `192.168.1.${(i % 20) + 10}`,
    occurred_at: new Date(Date.now() - i * 180_000).toISOString(),
    success: i % 12 !== 0,
    duration_ms: Math.random() * 500,
  };
});

export const fakeAlerts = [
  { id: "a1", title: "Mass Delete Detected", description: "User etl_job deleted 1,204 rows from orders", severity: "critical", status: "open", triggered_at: new Date(Date.now()-3_600_000).toISOString(), database_name: "prod-postgres-01" },
  { id: "a2", title: "Privilege Modification", description: "GRANT ALL ejecutado por deploy_bot en payments", severity: "critical", status: "open", triggered_at: new Date(Date.now()-7_200_000).toISOString(), database_name: "prod-mysql-billing" },
  { id: "a3", title: "Off-Hours Access", description: "root realizó SELECT en users a las 03:14 AM", severity: "medium", status: "acknowledged", triggered_at: new Date(Date.now()-86_400_000).toISOString(), database_name: "legacy-pg-erp" },
  { id: "a4", title: "Agente sin conexión", description: "El agente mysql-crm-v2 lleva más de 2h sin heartbeat", severity: "high", status: "open", triggered_at: new Date(Date.now()-7_100_000).toISOString(), database_name: "mysql-crm-v2" },
];

export const fakeChartData = {
  by_day: Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    return { day: d.toISOString().split("T")[0], count: Math.floor(2000 + Math.random() * 1500) };
  }),
  by_operation: [
    { operation: "SELECT", count: 9821 }, { operation: "INSERT", count: 4210 },
    { operation: "UPDATE", count: 2841 }, { operation: "DELETE", count: 987 },
    { operation: "ALTER",  count: 312  }, { operation: "CREATE", count: 198 },
    { operation: "DROP",   count: 43   }, { operation: "GRANT",  count: 20  },
  ],
  by_severity: [
    { severity: "low", count: 9821 }, { severity: "medium", count: 7051 },
    { severity: "high", count: 1533 }, { severity: "critical", count: 27 },
  ],
};
