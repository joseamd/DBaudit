import { useState } from "react";
import {
  Shield, TrendingUp, Radio, Activity, Bell, Database, FileText,
} from "lucide-react";

import Dashboard     from "./pages/Dashboard";
import AgentsView    from "./pages/AgentsView";
import EventsView    from "./pages/EventsView";
import AlertsView    from "./pages/AlertsView";
import DatabasesView from "./pages/DatabasesView";
import ReportsView   from "./pages/ReportsView";
import { NavItem }   from "./components/ui";
import Login from "./pages/Login/Login";
import Topbar from "./components/Topbar";

// ─── Inline global styles (keyframe for spinner) ──────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; -webkit-font-smoothing: antialiased; }
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  #root {
    width: 100%;
    max-width: 100%;
  }
`;

// ─── Nav config ───────────────────────────────────────────────────────────────

const VIEWS = {
  dashboard: { label: "Overview",        icon: TrendingUp, component: Dashboard     },
  agents:    { label: "Agentes",          icon: Radio,      component: AgentsView    },
  events:    { label: "Audit Events",     icon: Activity,   component: EventsView    },
  alerts:    { label: "Alertas",          icon: Bell,       component: AlertsView    },
  databases: { label: "Bases de Datos",   icon: Database,   component: DatabasesView },
  reports:   { label: "Reportes",         icon: FileText,   component: ReportsView   },
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {  
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const token = localStorage.getItem("auth_token");

  if (!token) {
    return <Login />;
  }

  const ViewComponent = VIEWS[view]?.component || Dashboard;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{
        display: "flex", minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: collapsed ? 72 : 228, 
          background: "#0d1117",
          display: "flex", 
          flexDirection: "column",
          padding: "0 12px 24px", 
          flexShrink: 0,
          position: "sticky", top: 0, height: "100vh", overflowY: "auto",
          borderRight: "1px solid rgba(255,255,255,0.04)", 
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}>
          {/* Logo */}
          <div style={{ padding: "22px 8px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px #4f46e530",
              }}>
                <Shield size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.3px" }}>DBaudit</div>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>v1.0 · Enterprise</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              margin: "10px",
              padding: "6px",
              borderRadius: 8,
              background: "#111827",
              border: "none",
              cursor: "pointer",
              color: "#fff"
            }}
          >
            {collapsed ? "→" : "←"}
          </button>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Object.entries(VIEWS).map(([id, { label, icon }]) => (
              <NavItem
                collapsed={collapsed}
                key={id}
                icon={icon}
                label={label}
                active={view === id}
                onClick={() => setView(id)}
              />
            ))}
          </nav>

          {/* User chip */}
          <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                AM
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>&copy; 2026 Alex Muñoz</div>
                <div style={{ fontSize: 10, color: "#e2e8f0" }}> Todos los derechos reservados.</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Header */}
          <Topbar />

          {/* Contenido */}
          <div style={{
            flex: 1,
            padding: "28px 32px",
            overflowY: "auto",
          }}>
            <ViewComponent onNavigate={setView} />
          </div>

        </main>
      </div>
    </>
  );
}
