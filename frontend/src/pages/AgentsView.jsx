import { useState, useEffect } from "react";
import {
  Wifi, WifiOff, Radio, Globe, HardDrive, Terminal,
  Copy, Eye, EyeOff, Plus, Shield, Clock, XCircle, RefreshCw,
} from "lucide-react";

import { AgentService } from "../services/api";
import { STATUS_AGENT, relTime, unwrap } from "../constants/constants";
import { fakeAgents } from "../mocks/mockData";
import { Card, StatCard, SectionHeader, Btn, Input, Spinner, EmptyState } from "../components/ui";

// ─── Install Script Modal ─────────────────────────────────────────────────────

function InstallModal({ agent, onClose }) {
  const [copied, setCopied] = useState(false);

  const script = `#!/bin/bash
# ── DBaudit Agent — Script de instalación ──
# Servidor: ${agent.server_host}  |  Agente: ${agent.name}

set -e

echo "📦 Descargando agente..."
curl -fsSL "http://TU_SERVIDOR:8000/download/dbaudit-agent.py" \\
     -o /usr/local/bin/dbaudit-agent.py
chmod +x /usr/local/bin/dbaudit-agent.py

echo "📁 Creando directorios..."
mkdir -p /etc/dbaudit /var/lib/dbaudit

echo "⚙️  Escribiendo configuración..."
cat > /etc/dbaudit/agent.env << 'ENV'
AUDIT_SERVER_URL=http://TU_SERVIDOR:8000
AGENT_TOKEN=${agent.token}
AGENT_ID=${agent.id}
DB_ENGINE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=NOMBRE_DE_TU_BD
DB_USER=dbaudit_agent
DB_PASSWORD=CAMBIAR_ESTO
POLL_INTERVAL=30
BATCH_SIZE=200
ENV
chmod 600 /etc/dbaudit/agent.env

echo "🗄  Instalando schema de auditoría en la BD..."
python3 /usr/local/bin/dbaudit-agent.py --setup-db

echo "🔧 Instalando servicio systemd..."
python3 /usr/local/bin/dbaudit-agent.py --install

systemctl daemon-reload
systemctl enable dbaudit-agent
systemctl start  dbaudit-agent

echo "✅ Agente iniciado. Verificar:"
echo "   systemctl status dbaudit-agent"
echo "   journalctl -u dbaudit-agent -f"`;

  const copy = () => {
    navigator.clipboard?.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 720, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Script de Instalación</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{agent.name} — {agent.server_host}</div>
          </div>
          <Btn variant="secondary" size="sm" onClick={onClose}>✕ Cerrar</Btn>
        </div>

        {/* Warning */}
        <div style={{ padding: "12px 24px", background: "#fffbeb", borderBottom: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
          ⚡ <strong>Ejecutar como root</strong> en <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 4 }}>{agent.server_host}</code>. Edita <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 4 }}>DB_PASSWORD</code>, <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 4 }}>DB_NAME</code> y la URL del servidor antes de ejecutar.
        </div>

        {/* Script */}
        <div style={{ flex: 1, overflow: "auto", background: "#0d1117", padding: "20px 24px", position: "relative" }}>
          <Btn
            variant="primary" size="sm"
            style={{ position: "absolute", top: 14, right: 14, background: copied ? "#22c55e" : "#4f46e5" }}
            onClick={copy}
          >
            <Copy size={12} /> {copied ? "¡Copiado!" : "Copiar todo"}
          </Btn>
          <pre style={{ color: "#e6edf3", fontFamily: "'DM Mono', 'Fira Code', monospace", fontSize: 11, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
            {script}
          </pre>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #e8ecf0", display: "flex", gap: 20, fontSize: 11, color: "#64748b" }}>
          <span>📋 Logs: <code style={{ fontFamily: "monospace" }}>journalctl -u dbaudit-agent -f</code></span>
          <span>📊 Estado: <code style={{ fontFamily: "monospace" }}>systemctl status dbaudit-agent</code></span>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, onShowScript, onToggle }) {
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied]       = useState(false);
  const st = STATUS_AGENT[agent.status] || STATUS_AGENT.offline;

  const copyToken = () => {
    navigator.clipboard?.writeText(agent.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf0", boxShadow: "0 1px 3px rgba(15,23,42,0.06)", overflow: "hidden" }}>
      {/* Status header strip */}
      <div style={{ background: st.bg, borderBottom: "1px solid #e8ecf0", padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: st.color, boxShadow: `0 0 0 3px ${st.color}25` }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{agent.name}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: "#fff", border: `1px solid ${st.color}30`, borderRadius: 20, padding: "2px 10px" }}>{st.label}</span>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Grid info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12 }}>
          {[
            ["Servidor",     agent.server_host, true],
            ["Sistema OS",   agent.server_os || "—", false],
            ["Versión",      agent.agent_version || "—", false],
            ["Agente ID",    agent.id?.slice(0, 8) + "…", true],
          ].map(([label, value, mono]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
              <div style={{ color: "#0f172a", fontWeight: 600, fontFamily: mono ? "'DM Mono', monospace" : "inherit" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", background: "#f8fafc", borderRadius: 12, overflow: "hidden" }}>
          {[
            { label: "Cola pendiente", value: agent.queue_size ?? 0, color: (agent.queue_size ?? 0) > 500 ? "#ef4444" : (agent.queue_size ?? 0) > 50 ? "#f97316" : "#22c55e" },
            { label: "Último heartbeat", value: relTime(agent.last_heartbeat), color: agent.is_healthy ? "#22c55e" : "#ef4444", small: true },
            { label: "Último evento", value: relTime(agent.last_event_at), color: "#6366f1", small: true },
          ].map((m, i) => (
            <div key={i} style={{ padding: "10px 8px", textAlign: "center", borderRight: i < 2 ? "1px solid #e8ecf0" : "none" }}>
              <div style={{ fontSize: m.small ? 12 : 18, fontWeight: 800, color: m.color, lineHeight: 1.1 }}>{m.value}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Token display */}
        <div style={{ background: "#0d1117", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
              🔑 Token de autenticación
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowToken(t => !t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2, display: "flex" }}>
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={copyToken} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#22c55e" : "#64748b", padding: 2, display: "flex" }}>
                <Copy size={13} />
              </button>
            </div>
          </div>
          <code style={{ fontSize: 10, color: showToken ? "#7dd3fc" : "#334155", fontFamily: "'DM Mono', monospace", wordBreak: "break-all", display: "block", lineHeight: 1.6 }}>
            {showToken ? agent.token : "•".repeat(48)}
          </code>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onShowScript(agent)}>
            <Terminal size={13} /> Ver Script
          </Btn>
          <Btn
            variant={agent.status === "disabled" ? "ghost" : "danger"}
            style={{ flex: 1, justifyContent: "center", borderColor: agent.status === "disabled" ? "#bbf7d0" : "#fecaca" }}
            onClick={() => onToggle(agent)}
          >
            {agent.status === "disabled" ? "✓ Activar" : "⊘ Desactivar"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Architecture Diagram ─────────────────────────────────────────────────────

function ArchDiagram({ agents }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#0d1117 0%,#0f2744 100%)", borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
        Arquitectura — Flujo de Eventos
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 0, rowGap: 16 }}>
        {agents.slice(0, 5).map((a) => {
          const st = STATUS_AGENT[a.status] || STATUS_AGENT.offline;
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: `${st.color}15`, border: `2px solid ${st.color}50`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                  <HardDrive size={18} color={st.color} />
                </div>
                <div style={{ fontSize: 9, color: "#64748b", maxWidth: 70, lineHeight: 1.3, fontFamily: "'DM Mono', monospace" }}>{a.server_host}</div>
                <div style={{ fontSize: 8, color: st.color, fontWeight: 700, marginTop: 2, textTransform: "uppercase" }}>{st.label}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 8px", marginBottom: 20 }}>
                <div style={{ fontSize: 8, color: a.is_healthy ? "#22c55e" : "#ef4444", fontWeight: 700, marginBottom: 2 }}>
                  {a.is_healthy ? "HTTPS →" : "✗"}
                </div>
                <div style={{ height: 2, width: 36, background: a.is_healthy ? "#22c55e30" : "#ef444430" }} />
              </div>
            </div>
          );
        })}
        {/* Central node */}
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", boxShadow: "0 0 24px #4f46e540" }}>
            <Shield size={24} color="#fff" />
          </div>
          <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700 }}>DBaudit</div>
          <div style={{ fontSize: 9, color: "#475569", fontFamily: "'DM Mono', monospace" }}>Central Server</div>
        </div>
      </div>
    </div>
  );
}

// ─── Agents View ──────────────────────────────────────────────────────────────

export default function AgentsView() {
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [scriptAgent, setScript]  = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [newName, setNewName]     = useState("");
  const [newHost, setNewHost]     = useState("");
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await AgentService.getAgents();
      setAgents(unwrap(data, fakeAgents));
    } catch {
      setAgents(fakeAgents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (agent) => {
    try {
      const updated = await AgentService.toggleAgent(agent);
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, ...updated } : a));
    } catch {
      // optimistic UI
      setAgents(prev => prev.map(a => a.id === agent.id
        ? { ...a, status: a.status === "disabled" ? "active" : "disabled" }
        : a));
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newHost.trim()) return;
    setSaving(true);
    try {
      const created = await AgentService.createAgent({ name: newName, server_host: newHost });
      setAgents(prev => [created, ...prev]);
    } catch {
      // local fallback
      const fake = {
        id: `tmp-${Date.now()}`, name: newName, server_host: newHost,
        status: "pending", is_healthy: false, queue_size: 0,
        last_heartbeat: null, last_event_at: null, agent_version: "", server_os: "",
        token: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      };
      setAgents(prev => [fake, ...prev]);
    } finally {
      setNewName(""); setNewHost(""); setShowForm(false); setSaving(false);
    }
  };

  const healthy  = agents.filter(a => a.is_healthy).length;
  const warning  = agents.filter(a => a.status === "warning").length;
  const offline  = agents.filter(a => a.status === "offline").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {scriptAgent && <InstallModal agent={scriptAgent} onClose={() => setScript(null)} />}

      <SectionHeader
        title="Agentes Remotos"
        subtitle="Agentes instalados en servidores con bases de datos distribuidas"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={load}><RefreshCw size={13} /></Btn>
            <Btn variant="primary" onClick={() => setShowForm(true)}><Plus size={13} /> Registrar Agente</Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon={Globe}  label="Agentes totales"       value={agents.length}  color="#6366f1" />
        <StatCard icon={Wifi}   label="Activos y saludables"  value={healthy}        color="#22c55e" />
        <StatCard icon={Radio}  label="Con advertencia"       value={warning}        color="#f59e0b" />
        <StatCard icon={WifiOff}label="Offline"               value={offline}        color="#ef4444" />
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "#eff6ff", border: "2px dashed #6366f1", borderRadius: 14, padding: "18px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4338ca", marginBottom: 14 }}>➕ Registrar nuevo agente</div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Nombre del agente</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="prod-postgres-01 agent" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>IP / Hostname del servidor</label>
              <Input value={newHost} onChange={e => setNewHost(e.target.value)} placeholder="10.0.1.10" />
            </div>
            <Btn variant="primary" onClick={handleCreate} disabled={saving}>{saving ? "Creando…" : "Crear"}</Btn>
            <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "10px 0 0" }}>
            💡 Después de crear el agente, usa <strong>"Ver Script"</strong> para obtener el comando de instalación listo para copiar en el servidor remoto.
          </p>
        </div>
      )}

      {/* Architecture diagram */}
      {agents.length > 0 && <ArchDiagram agents={agents} />}

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={32} /></div>
      ) : agents.length === 0 ? (
        <EmptyState icon={Radio} title="Sin agentes registrados" sub='Haz clic en "Registrar Agente" para añadir el primero' />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onShowScript={setScript} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
